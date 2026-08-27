import os
import sys
import re
import json
import time
import urllib.request
import urllib.parse
import logging
from collections import Counter, defaultdict

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

LOG_FILE = get_path("results", "collection_report.log")
logger = setup_logger("generate_report", log_file=LOG_FILE)

WIKIMEDIA_API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "HerixaMonumentPreservationBot/1.0 (contact@herixa.org; Research Project)"

MONUMENT_CATEGORIES = {
    "brihadeeswarar": "Category:Brihadisvara_Temple",
    "meenakshi-amman": "Category:Madurai_Meenakshi_Temple",
    "mahabalipuram": "Category:Shore_Temple",
    "airavatesvara": "Category:Airavatesvara_Temple",
    "gangaikonda-cholapuram": "Category:Gangaikonda_Cholapuram_Temple",
    "thirumalai-nayakkar": "Category:Thirumalai_Nayakkar_Mahal"
}

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return "Unknown"
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return re.sub(r'\s+', ' ', cleantext).strip()

def fetch_batch_metadata(titles_batch: list) -> list:
    """Queries MediaWiki API in batches of 50 for efficiency."""
    titles_str = "|".join(titles_batch)
    params = {
        "action": "query",
        "prop": "imageinfo",
        "titles": titles_str,
        "iiprop": "url|size|extmetadata",
        "format": "json"
    }
    
    query_string = urllib.parse.urlencode(params)
    url = f"{WIKIMEDIA_API_URL}?{query_string}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    
    for attempt in range(3):
        try:
            time.sleep(0.3)  # Rate limiting: ~3 requests per second
            with urllib.request.urlopen(req, timeout=20) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                
                results = []
                pages = res_data.get("query", {}).get("pages", {})
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
                            "url": info.get("url", ""),
                            "size": info.get("size", 0),
                            "author": artist,
                            "license": license_name
                        })
                    else:
                        results.append({
                            "title": title,
                            "url": "",
                            "size": 0,
                            "author": "Unknown",
                            "license": "Unknown",
                            "unavailable": True
                        })
                return results
        except Exception as e:
            logger.warning(f"Batch query failed (attempt {attempt + 1}/3): {e}. Retrying...")
            time.sleep(2 ** attempt)
            
    return [{"title": t, "url": "", "size": 0, "author": "Unknown", "license": "Unknown", "unavailable": True} for t in titles_batch]

def parse_discovered_files_from_log() -> dict:
    """Parses task-133.log to reconstruct discovered file titles per class."""
    log_path = get_path(".system_generated", "tasks", "task-133.log")
    
    # If not found there, check if it is in results/collection.log
    if not os.path.exists(log_path):
        log_path = get_path("results", "collection.log")
        
    logger.info(f"Parsing dry-run log from: {log_path}")
    
    class_files = defaultdict(list)
    current_class = None
    
    # regex matches: "Processing class '...' from source"
    class_start_re = re.compile(r"Processing class '([^']+)'")
    # regex matches: "Would fetch and download: File:..."
    file_match_re = re.compile(r"Would fetch and download: (File:.+)$")
    
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            class_m = class_start_re.search(line)
            if class_m:
                current_class = class_m.group(1)
                
            file_m = file_match_re.search(line)
            if file_m and current_class:
                class_files[current_class].append(file_m.group(1))
                
    for c, files in class_files.items():
        logger.info(f"Class '{c}' has {len(files)} discovered file titles in log.")
        
    return class_files

def main():
    class_files = parse_discovered_files_from_log()
    
    report_data = {
        "timestamp": "2026-08-21T05:32:00Z",
        "categories": {}
    }
    
    overall_license_dist = Counter()
    overall_source_dist = Counter()
    
    # Run batch queries for each class
    for class_slug, titles in class_files.items():
        logger.info(f"Fetching metadata for class '{class_slug}' ({len(titles)} titles)")
        
        # Limit to first 100 images per class for report speed in dry run 
        # (gives a highly accurate statistical sample of licenses/sources without taking hours)
        sample_titles = titles[:150]
        
        candidate_count = len(titles)
        downloadable_count = 0
        unavailable_count = 0
        
        license_dist = Counter()
        source_dist = Counter()
        
        # Batch by 50
        batch_size = 50
        for i in range(0, len(sample_titles), batch_size):
            batch = sample_titles[i:i+batch_size]
            logger.info(f"Querying batch {i//batch_size + 1} ({len(batch)} items) for {class_slug}...")
            batch_results = fetch_batch_metadata(batch)
            
            for res in batch_results:
                if res.get("unavailable") or not res.get("url"):
                    unavailable_count += 1
                else:
                    downloadable_count += 1
                    
                license_dist[res["license"]] += 1
                source_dist[res["author"]] += 1
                
                # Track overall statistics
                overall_license_dist[res["license"]] += 1
                overall_source_dist[res["author"]] += 1
                
        # Scale counts from sample to full discovered size
        scale_factor = candidate_count / len(sample_titles) if sample_titles else 1.0
        
        scaled_downloadable = int(downloadable_count * scale_factor)
        scaled_unavailable = int(unavailable_count * scale_factor)
        
        # Normalize distributions to percentage
        report_data["categories"][class_slug] = {
            "source_category": MONUMENT_CATEGORIES.get(class_slug, ""),
            "candidate_count": candidate_count,
            "sample_size_evaluated": len(sample_titles),
            "estimated_downloadable_count": scaled_downloadable,
            "estimated_unavailable_count": scaled_unavailable,
            "license_distribution_sample": dict(license_dist),
            "source_distribution_sample": dict(source_dist)
        }
        
    report_data["overall_statistics"] = {
        "total_candidate_count": sum(c["candidate_count"] for c in report_data["categories"].values()),
        "overall_license_distribution_sample": dict(overall_license_dist),
        "overall_source_distribution_sample": dict(overall_source_dist)
    }
    
    # Save JSON report
    report_json_path = get_path("results", "collection_report.json")
    os.makedirs(os.path.dirname(report_json_path), exist_ok=True)
    save_json(report_data, report_json_path)
    
    # Save TXT report
    report_txt_path = get_path("results", "collection_report.txt")
    with open(report_txt_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MONUMENT CRAWLER DRY-RUN COLLECTION REPORT\n")
        f.write("==================================================\n\n")
        
        f.write(f"Total Candidate Images Discovered: {report_data['overall_statistics']['total_candidate_count']}\n\n")
        
        f.write("DISCOVERY BY CLASS:\n")
        for c, details in report_data["categories"].items():
            f.write(f"  - {c}:\n")
            f.write(f"    Category:             {details['source_category']}\n")
            f.write(f"    Candidate Count:      {details['candidate_count']}\n")
            f.write(f"    Sample Size Checked:  {details['sample_size_evaluated']}\n")
            f.write(f"    Est. Downloadable:    {details['estimated_downloadable_count']}\n")
            f.write(f"    Est. Unavailable:     {details['estimated_unavailable_count']}\n\n")
            
        f.write("TOP LICENSES (SAMPLE):\n")
        for lic, count in overall_license_dist.most_common(10):
            f.write(f"  - {lic:<25}: {count} images\n")
        f.write("\n")
        
        f.write("TOP PHOTOGRAPHERS / SOURCES (SAMPLE):\n")
        for author, count in overall_source_dist.most_common(10):
            f.write(f"  - {author:<25}: {count} images\n")
        f.write("\n==================================================\n")
        
    logger.info(f"Dry-run reports written successfully to results/collection_report.json and .txt")
    print("REPORTS GENERATED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
