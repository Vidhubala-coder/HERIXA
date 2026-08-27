import os
import sys
import time
import urllib.request
import urllib.parse
import json
import re
import logging
from typing import Dict, List, Set, Any
from datetime import datetime

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

HARD_NEG_DIR = get_path("dataset", "hard_negatives")
METADATA_DIR = get_path("dataset", "metadata")
LOG_FILE = get_path("results", "hard_negatives_collection.log")

logger = setup_logger("collect_hard_negatives", log_file=LOG_FILE)

WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "HerixaHardNegativesCollector/1.0 (contact@herixa.org; Research Project)"

HARD_NEG_CATEGORIES = [
    "Category:Dravidian_architecture",
    "Category:Temples_in_Tamil_Nadu",
    "Category:Gopurams_in_Tamil_Nadu",
    "Category:Nandi_sculptures",
    "Category:Monolithic_temples"
]

def make_wikimedia_request(params: Dict[str, Any]) -> Dict[str, Any]:
    params["format"] = "json"
    query_string = urllib.parse.urlencode(params)
    url = f"{WIKIMEDIA_API_URL}?{query_string}"
    
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(3):
        try:
            time.sleep(0.35)  # Rate limiting
            with urllib.request.urlopen(req, timeout=20) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.warning(f"Request failed (attempt {attempt + 1}/3): {e}")
            time.sleep(2 ** attempt)
            
    raise Exception(f"Failed to fetch from API: {url}")

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return "Unknown"
    cleanr = re.compile('<.*?>')
    return re.sub(r'\s+', ' ', re.sub(cleanr, '', raw_html)).strip()

def get_category_files(category_name: str, limit: int = 100) -> List[str]:
    logger.info(f"Listing files in category: {category_name}")
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": category_name,
        "cmlimit": str(limit),
        "cmtype": "file"
    }
    
    try:
        data = make_wikimedia_request(params)
        members = data.get("query", {}).get("categorymembers", [])
        return [m.get("title") for m in members if m.get("ns") == 6]
    except Exception as e:
        logger.error(f"Failed to fetch category members for {category_name}: {e}")
        return []

def fetch_batch_metadata(titles_batch: List[str]) -> List[Dict[str, Any]]:
    titles_str = "|".join(titles_batch)
    params = {
        "action": "query",
        "prop": "imageinfo",
        "titles": titles_str,
        "iiprop": "url|size|mime|extmetadata"
    }
    
    try:
        data = make_wikimedia_request(params)
        pages = data.get("query", {}).get("pages", {})
        results = []
        for page_id, page_data in pages.items():
            title = page_data.get("title", "")
            imageinfo_list = page_data.get("imageinfo", [])
            if imageinfo_list:
                info = imageinfo_list[0]
                ext_meta = info.get("extmetadata", {})
                
                artist = clean_html(ext_meta.get("Artist", {}).get("value", ""))
                license_name = clean_html(ext_meta.get("LicenseShortName", {}).get("value", ""))
                
                results.append({
                    "title": title,
                    "original_url": info.get("url", ""),
                    "file_page_url": info.get("descriptionurl", ""),
                    "width": info.get("width", 0),
                    "height": info.get("height", 0),
                    "file_size": info.get("size", 0),
                    "format": info.get("mime", "").split("/")[-1] if info.get("mime") else "",
                    "author": artist,
                    "license": license_name,
                    "download_timestamp": datetime.utcnow().isoformat() + "Z"
                })
        return results
    except Exception as e:
        logger.error(f"Batch metadata query failed: {e}")
        return []

def download_image(url: str, dest_path: str) -> bool:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            with open(dest_path, 'wb') as out_file:
                out_file.write(response.read())
        return True
    except Exception as e:
        logger.warning(f"Download failed for {url}: {e}")
        return False

def collect_hard_negatives(target_count: int = 150):
    logger.info(f"Targeting {target_count} hard negative downloads...")
    os.makedirs(HARD_NEG_DIR, exist_ok=True)
    os.makedirs(METADATA_DIR, exist_ok=True)
    
    metadata_file_path = os.path.join(METADATA_DIR, "hard_negatives_metadata.jsonl")
    
    # Load existing metadata to support resume
    existing_metadata = {}
    if os.path.exists(metadata_file_path):
        with open(metadata_file_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    existing_metadata[item["title"]] = item
                    
    downloaded_count = len(existing_metadata)
    logger.info(f"Loaded {downloaded_count} existing hard negative metadata entries.")
    
    if downloaded_count >= target_count:
        logger.info("Hard negatives count already met. Skipping collection.")
        print(f"HARD NEGATIVES COLLECTED: {downloaded_count}")
        return
        
    # 1. Discover potential files across categories
    discovered_titles = []
    # Fetch up to 100 per category to have a large enough candidate pool to bypass timeouts
    files_needed_per_cat = 100
    
    for category in HARD_NEG_CATEGORIES:
        titles = get_category_files(category, limit=files_needed_per_cat)
        discovered_titles.extend([(t, category) for t in titles])
        
    logger.info(f"Discovered {len(discovered_titles)} candidate files for hard negatives.")
    
    # Remove duplicate titles and already downloaded titles
    seen_titles = set()
    unique_candidates = []
    for title, cat in discovered_titles:
        if title not in seen_titles and title not in existing_metadata:
            seen_titles.add(title)
            unique_candidates.append((title, cat))
            
    logger.info(f"Unique candidates list (new files only): {len(unique_candidates)}")
    
    # 2. Batch fetch metadata and filter
    valid_metadata = []
    batch_size = 50
    
    for i in range(0, len(unique_candidates), batch_size):
        batch = unique_candidates[i:i+batch_size]
        batch_titles = [item[0] for item in batch]
        
        batch_meta = fetch_batch_metadata(batch_titles)
        
        # Map source category back
        cat_map = {item[0]: item[1] for item in batch}
        
        for meta in batch_meta:
            title = meta["title"]
            ext = os.path.splitext(title.lower())[1]
            
            # Simple validity checks
            if ext in ['.jpg', '.jpeg', '.png', '.webp'] and meta.get("width", 0) >= 224 and meta.get("height", 0) >= 224:
                meta["class"] = "hard_negative"
                meta["source_category"] = cat_map.get(title, "Unknown")
                valid_metadata.append(meta)
                
            if len(valid_metadata) + downloaded_count >= target_count + 30:  # Fetch a few extra
                break
        if len(valid_metadata) + downloaded_count >= target_count + 30:
            break
            
    logger.info(f"Pre-filtered {len(valid_metadata)} valid new hard negative metadata records.")
    
    # 3. Download files and save metadata
    with open(metadata_file_path, "a", encoding="utf-8") as meta_file:
        for idx, meta in enumerate(valid_metadata):
            if downloaded_count >= target_count:
                break
                
            title = meta["title"]
            safe_filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', title.replace("File:", ""))
            dest_path = os.path.join(HARD_NEG_DIR, safe_filename)
            
            # Additional safety check
            if os.path.exists(dest_path):
                downloaded_count += 1
                if title not in existing_metadata:
                    meta["local_filename"] = safe_filename
                    meta["relative_path"] = f"dataset/hard_negatives/{safe_filename}"
                    meta_file.write(json.dumps(meta, ensure_ascii=False) + "\n")
                    meta_file.flush()
                continue
                
            logger.info(f"Downloading hard negative {downloaded_count+1}/{target_count}: {title}")
            ok = download_image(meta["original_url"], dest_path)
            
            if ok:
                meta["local_filename"] = safe_filename
                meta["relative_path"] = f"dataset/hard_negatives/{safe_filename}"
                meta_file.write(json.dumps(meta, ensure_ascii=False) + "\n")
                meta_file.flush()
                downloaded_count += 1
                time.sleep(0.3)  # Polite sleep between downloads
                
    logger.info(f"Successfully collected {downloaded_count} hard negatives.")
    print(f"HARD NEGATIVES COLLECTED: {downloaded_count}")

if __name__ == "__main__":
    collect_hard_negatives(150)
