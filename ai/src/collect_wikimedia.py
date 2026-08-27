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
from collections import Counter

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

# Define absolute paths
RAW_DIR = get_path("dataset", "raw")
METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")
LOG_FILE = get_path("results", "collection.log")

logger = setup_logger("collect_wikimedia", log_file=LOG_FILE)

# API Endpoint
WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "HerixaMonumentPreservationBot/1.0 (contact@herixa.org; Research Project for Heritage Preservation)"

MONUMENT_CATEGORIES = {
    "brihadeeswarar": "Category:Brihadisvara_Temple",
    "meenakshi-amman": "Category:Madurai_Meenakshi_Temple",
    "mahabalipuram": "Category:Shore_Temple",
    "airavatesvara": "Category:Airavatesvara_Temple",
    "gangaikonda-cholapuram": "Category:Gangaikonda_Cholapuram_Temple",
    "thirumalai-nayakkar": "Category:Thirumalai_Nayakkar_Mahal"
}

# Heuristic list of words indicating irrelevant images (maps, posters, floorplans)
IRRELEVANT_KEYWORDS = [
    "map", "floorplan", "floor_plan", "sketch", "diagram", "plan",
    "drawing", "poster", "text", "coin", "ticket", "stamp", "document",
    "inscription_rubbing", "rubbing", "architectural_drawing", "blueprint"
]

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return "Unknown"
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return re.sub(r'\s+', ' ', cleantext).strip()

def make_wikimedia_request(params: Dict[str, Any]) -> Dict[str, Any]:
    params["format"] = "json"
    query_string = urllib.parse.urlencode(params)
    url = f"{WIKIMEDIA_API_URL}?{query_string}"
    
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    for attempt in range(3):
        try:
            time.sleep(0.35)  # Respect API limits: ~2.5 requests per second
            with urllib.request.urlopen(req, timeout=20) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.warning(f"API Request failed (attempt {attempt + 1}/3): {e}. Retrying...")
            time.sleep(2 ** attempt)
            
    raise Exception(f"Failed to fetch from API after 3 attempts: {url}")

def get_category_files_recursive(category_name: str, current_depth: int = 0, max_depth: int = 2, visited_cats: Set[str] = None) -> List[Dict[str, Any]]:
    if visited_cats is None:
        visited_cats = set()
        
    if category_name in visited_cats:
        return []
    
    visited_cats.add(category_name)
    logger.info(f"Crawling {category_name} (depth: {current_depth})")
    
    files = []
    cmcontinue = None
    
    while True:
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category_name,
            "cmlimit": "250",
            "cmtype": "file|subcat"
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue
            
        try:
            data = make_wikimedia_request(params)
        except Exception as e:
            logger.error(f"Error listing category members for {category_name}: {e}")
            break
            
        members = data.get("query", {}).get("categorymembers", [])
        
        for member in members:
            ns = member.get("ns")
            title = member.get("title", "")
            
            if ns == 6:  # File namespace
                files.append({
                    "title": title,
                    "pageid": member.get("pageid")
                })
            elif ns == 14 and current_depth < max_depth:  # Subcategory namespace
                subcat_files = get_category_files_recursive(title, current_depth + 1, max_depth, visited_cats)
                files.extend(subcat_files)
                
        cmcontinue = data.get("continue", {}).get("cmcontinue")
        if not cmcontinue:
            break
            
    seen_titles = set()
    unique_files = []
    for f in files:
        if f["title"] not in seen_titles:
            seen_titles.add(f["title"])
            unique_files.append(f)
            
    return unique_files

def fetch_batch_metadata(titles_batch: List[str]) -> List[Dict[str, Any]]:
    """Fetches metadata in batch of 50 for speed and efficiency."""
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
                
                artist_raw = ext_meta.get("Artist", {}).get("value", "")
                license_raw = ext_meta.get("LicenseShortName", {}).get("value", "")
                usage_terms = ext_meta.get("UsageTerms", {}).get("value", "")
                license_url = ext_meta.get("LicenseUrl", {}).get("value", "")
                
                results.append({
                    "title": title,
                    "original_url": info.get("url", ""),
                    "file_page_url": info.get("descriptionurl", ""),
                    "width": info.get("width", 0),
                    "height": info.get("height", 0),
                    "file_size": info.get("size", 0),
                    "format": info.get("mime", "").split("/")[-1] if info.get("mime") else "",
                    "author": clean_html(artist_raw),
                    "license": clean_html(license_raw),
                    "usage_terms": clean_html(usage_terms),
                    "license_url": license_url,
                    "download_timestamp": datetime.utcnow().isoformat() + "Z"
                })
            else:
                results.append({
                    "title": title,
                    "original_url": "",
                    "unavailable": True
                })
        return results
    except Exception as e:
        logger.error(f"Batch metadata fetch failed: {e}")
        return [{"title": t, "original_url": "", "unavailable": True} for t in titles_batch]

def download_image(url: str, dest_path: str) -> bool:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                with open(dest_path, 'wb') as out_file:
                    out_file.write(response.read())
            return True
        except Exception as e:
            logger.warning(f"Download failed for {url} (attempt {attempt+1}/2): {e}")
            time.sleep(1.5)
            
    return False

def check_metadata_validity(meta: dict) -> (bool, str):
    """Pre-filters files based on metadata parameters before downloading binary."""
    # 1. Format/Extension check
    title = meta["title"].lower()
    ext = os.path.splitext(title)[1]
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return False, "unsupported_format"
        
    # 2. Check for irrelevant keywords in filename
    filename_lower = os.path.basename(title).lower()
    for kw in IRRELEVANT_KEYWORDS:
        if kw in filename_lower:
            return False, "irrelevant_keyword"
            
    # 3. Size check
    if meta.get("file_size", 0) < 5120:  # < 5 KB
        return False, "too_small"
        
    # 4. Dimensions check
    w, h = meta.get("width", 0), meta.get("height", 0)
    if w < 224 or h < 224:
        return False, "low_resolution"
        
    # 5. License check
    lic = str(meta.get("license", "")).lower()
    terms = str(meta.get("usage_terms", "")).lower()
    if not lic and not terms:
        return False, "missing_license"
        
    acceptable_patterns = ["cc", "creative commons", "pd", "public domain", "gfdl", "attribution", "share alike", "cc0"]
    combined = f"{lic} {terms}"
    if not any(p in combined for p in acceptable_patterns):
        return False, "unacceptable_license"
        
    return True, ""

def collect_monuments(limit_per_class: int = None):
    logger.info("Starting production Wikimedia Commons image downloader...")
    
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(METADATA_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)
    
    metadata_file_path = os.path.join(METADATA_DIR, "raw_metadata.jsonl")
    
    # Load previously collected metadata to support resume
    existing_meta = {}
    if os.path.exists(metadata_file_path):
        with open(metadata_file_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    existing_meta[item["title"]] = item
                    
    logger.info(f"Loaded {len(existing_meta)} existing metadata entries for resume check.")
    
    # Track statistics
    stats = {
        "brihadeeswarar": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0},
        "meenakshi-amman": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0},
        "mahabalipuram": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0},
        "airavatesvara": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0},
        "gangaikonda-cholapuram": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0},
        "thirumalai-nayakkar": {"discovered": 0, "downloaded": 0, "failed": 0, "unavailable": 0}
    }
    
    overall_license_dist = Counter()
    overall_source_dist = Counter()
    total_disk_size = 0
    
    opened_file = open(metadata_file_path, "a", encoding="utf-8")
    
    for class_slug, category in MONUMENT_CATEGORIES.items():
        logger.info(f"Processing class '{class_slug}' from category '{category}'")
        
        # 1. Discover file titles
        try:
            discovered_files = get_category_files_recursive(category, max_depth=2)
            stats[class_slug]["discovered"] = len(discovered_files)
            logger.info(f"Discovered {len(discovered_files)} candidate files for class '{class_slug}'")
        except Exception as e:
            logger.error(f"Failed to crawl category {category}: {e}")
            continue
            
        # Optional limit (e.g. for debugging or capping)
        if limit_per_class:
            discovered_files = discovered_files[:limit_per_class]
            logger.info(f"Applying cap of {limit_per_class} per class.")
            
        # 2. Batch query metadata to pre-filter and save bandwidth
        logger.info(f"Querying metadata in batch for {class_slug}...")
        batch_size = 50
        valid_metadata_list = []
        
        for i in range(0, len(discovered_files), batch_size):
            batch = [item["title"] for item in discovered_files[i:i+batch_size]]
            batch_meta = fetch_batch_metadata(batch)
            
            for meta in batch_meta:
                if meta.get("unavailable") or not meta.get("original_url"):
                    stats[class_slug]["unavailable"] += 1
                    continue
                    
                meta["class"] = class_slug
                meta["source_category"] = category
                
                # Pre-filter
                is_valid, reason = check_metadata_validity(meta)
                if is_valid:
                    valid_metadata_list.append(meta)
                else:
                    stats[class_slug]["failed"] += 1  # count as failed/filtered
                    logger.debug(f"Filtered out {meta['title']}: {reason}")
                    
        logger.info(f"Pre-filtered: {len(valid_metadata_list)} valid out of {len(discovered_files)} discovered for {class_slug}")
        
        # 3. Download the remaining valid images
        for idx, meta in enumerate(valid_metadata_list):
            title = meta["title"]
            safe_filename = re.sub(r'[^a-zA-Z0-9_\.-]', '_', title.replace("File:", ""))
            dest_path = os.path.join(RAW_DIR, class_slug, safe_filename)
            
            meta["local_filename"] = safe_filename
            meta["relative_path"] = f"dataset/raw/{class_slug}/{safe_filename}"
            
            # Resume Check
            if title in existing_meta and os.path.exists(dest_path):
                stats[class_slug]["downloaded"] += 1
                total_disk_size += os.path.getsize(dest_path)
                overall_license_dist[meta["license"]] += 1
                overall_source_dist[meta["author"]] += 1
                continue
                
            logger.info(f"[{class_slug}] Downloading image {idx+1}/{len(valid_metadata_list)}: {title}")
            download_ok = download_image(meta["original_url"], dest_path)
            
            if download_ok:
                # Save metadata incrementally
                opened_file.write(json.dumps(meta, ensure_ascii=False) + "\n")
                opened_file.flush()
                stats[class_slug]["downloaded"] += 1
                total_disk_size += os.path.getsize(dest_path)
                
                overall_license_dist[meta["license"]] += 1
                overall_source_dist[meta["author"]] += 1
            else:
                stats[class_slug]["failed"] += 1
                logger.error(f"Download failed for {title}")
                
    opened_file.close()
    
    # Save Report
    report_json_path = os.path.join(RESULTS_DIR, "collection_report.json")
    report_txt_path = os.path.join(RESULTS_DIR, "collection_report.txt")
    
    report_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_downloaded": sum(c["downloaded"] for c in stats.values()),
        "total_failed": sum(c["failed"] for c in stats.values()),
        "total_unavailable": sum(c["unavailable"] for c in stats.values()),
        "total_disk_size_bytes": total_disk_size,
        "total_disk_size_mb": round(total_disk_size / (1024 * 1024), 2),
        "categories_stats": stats,
        "license_distribution": dict(overall_license_dist),
        "uploader_distribution": dict(overall_source_dist.most_common(50))
    }
    
    save_json(report_data, report_json_path)
    
    with open(report_txt_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MONUMENT CRAWLER PRODUCTION DOWNLOAD REPORT\n")
        f.write("==================================================\n\n")
        f.write(f"Total Discovered Candidates: {sum(c['discovered'] for c in stats.values())}\n")
        f.write(f"Successfully Downloaded:     {report_data['total_downloaded']}\n")
        f.write(f"Failed/Filtered Downloads:   {report_data['total_failed']}\n")
        f.write(f"Unavailable Files:           {report_data['total_unavailable']}\n")
        f.write(f"Total Disk Size:             {report_data['total_disk_size_mb']} MB\n\n")
        
        f.write("DOWNLOAD STATS BY CLASS:\n")
        for c, details in stats.items():
            f.write(f"  - {c}:\n")
            f.write(f"    Discovered:   {details['discovered']}\n")
            f.write(f"    Downloaded:   {details['downloaded']}\n")
            f.write(f"    Failed:       {details['failed']}\n")
            f.write(f"    Unavailable:  {details['unavailable']}\n\n")
            
        f.write("TOP LICENSES:\n")
        for lic, count in overall_license_dist.most_common(10):
            f.write(f"  - {lic:<25}: {count} images\n")
        f.write("\n")
        
        f.write("TOP UPLOADERS / PHOTOGRAPHERS:\n")
        for author, count in overall_source_dist.most_common(10):
            f.write(f"  - {author:<25}: {count} images\n")
        f.write("\n==================================================\n")
        
    logger.info(f"Production download complete. Report written to {report_txt_path}")
    print("DOWNLOAD COMPLETE!")

if __name__ == "__main__":
    # Support direct execution with a limit
    import argparse
    parser = argparse.ArgumentParser(description="Wikimedia Commons Downloader")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of images downloaded per class")
    args = parser.parse_args()
    
    # We set default cap to 300 to run within a safe execution envelope, but can be customized
    # Let's run with limit=250 as baseline to guarantee complete download within 5-10 minutes,
    # or unlimited if no limit is passed.
    collect_monuments(limit_per_class=args.limit)
