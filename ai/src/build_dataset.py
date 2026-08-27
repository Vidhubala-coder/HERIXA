import os
import sys
import json
import random
import shutil
import logging
from collections import Counter, defaultdict

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json, load_json

CLEANED_DIR = get_path("dataset", "cleaned")
TRAIN_DIR = get_path("dataset", "train")
VAL_DIR = get_path("dataset", "validation")
TEST_DIR = get_path("dataset", "test")
METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")
QUARANTINE_DIR = get_path("dataset", "quarantine")
HARD_NEGATIVES_DIR = get_path("dataset", "hard_negatives")
LOG_FILE = get_path("results", "splitting.log")

logger = setup_logger("build_dataset", log_file=LOG_FILE)

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    """Computes Hamming distance between two hex perceptual hash strings."""
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    
    # Standard 8x8 hash has 64 bits = 16 hex chars
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def cluster_session_images(records: list) -> list:
    """
    Groups records into clusters representing the same photo session, sequence, or burst.
    This prevents data leakage during splitting.
    Grouping criteria:
    - Same class AND
    - EITHER: Similar filename prefix (e.g. sharing first 12 characters)
    - OR: Low perceptual hash distance (Hamming distance <= 10)
    - OR: Same uploader/author and close metadata similarity
    """
    # Initialize Union-Find structure
    parent = list(range(len(records)))
    
    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]
        
    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    logger.info("Clustering related images to prevent split leakage...")
    
    # Compare all pairs within the same class
    class_groups = defaultdict(list)
    for idx, r in enumerate(records):
        class_groups[r["class"]].append((idx, r))
        
    for class_slug, items in class_groups.items():
        n = len(items)
        for i in range(n):
            idx_i, r_i = items[i]
            name_i = r_i["local_filename"]
            phash_i = r_i.get("phash", "")
            author_i = r_i.get("author", "")
            
            for j in range(i + 1, n):
                idx_j, r_j = items[j]
                name_j = r_j["local_filename"]
                phash_j = r_j.get("phash", "")
                author_j = r_j.get("author", "")
                
                # Check 1: String prefix similarity (first 15 chars)
                common_prefix = os.path.commonprefix([name_i, name_j])
                is_similar_name = len(common_prefix) >= 15
                
                # Check 2: Perceptual hash similarity (Hamming distance <= 10)
                is_similar_hash = False
                if phash_i and phash_j:
                    h_dist = get_hamming_distance(phash_i, phash_j)
                    if h_dist <= 10:
                        is_similar_hash = True
                        
                # Check 3: Same photographer sequence (similar names uploaded by same author)
                is_same_author_seq = (author_i and author_j and author_i == author_j and len(common_prefix) >= 8)
                
                if is_similar_name or is_similar_hash or is_same_author_seq:
                    union(idx_i, idx_j)
                    
    # Group records by root parent
    clusters = defaultdict(list)
    for idx, r in enumerate(records):
        root = find(idx)
        clusters[root].append(r)
        
    logger.info(f"Grouped {len(records)} images into {len(clusters)} distinct photo-session clusters.")
    return list(clusters.values())

def split_and_copy_dataset(seed: int = 42):
    """Partitions the clusters into train, val, and test splits and copies the files."""
    random.seed(seed)
    
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    
    if not os.path.exists(deduped_meta_path):
        logger.error(f"Deduplicated metadata file missing at {deduped_meta_path}.")
        return
        
    records = []
    with open(deduped_meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
                
    # 1. Group into clusters
    clusters = cluster_session_images(records)
    
    # 2. Shuffle clusters deterministically
    random.shuffle(clusters)
    
    # 3. Distribute clusters to targets (70% train, 15% val, 15% test)
    train_records = []
    val_records = []
    test_records = []
    
    total_images = len(records)
    target_train = int(total_images * 0.70)
    target_val = int(total_images * 0.15)
    
    current_train = 0
    current_val = 0
    
    for cluster in clusters:
        cluster_size = len(cluster)
        
        # Decide split placement based on counts
        if current_train < target_train:
            train_records.extend(cluster)
            current_train += cluster_size
            split_name = "train"
        elif current_val < target_val:
            val_records.extend(cluster)
            current_val += cluster_size
            split_name = "validation"
        else:
            test_records.extend(cluster)
            split_name = "test"
            
        for r in cluster:
            r["split"] = split_name
            
    # 4. Clean existing split directories
    for d in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        
    # Copy images to splits
    def copy_records(records_list, target_dir):
        for r in records_list:
            class_slug = r["class"]
            local_filename = r["local_filename"]
            
            src_path = os.path.join(CLEANED_DIR, class_slug, local_filename)
            dest_dir = os.path.join(target_dir, class_slug)
            os.makedirs(dest_dir, exist_ok=True)
            
            shutil.copy2(src_path, os.path.join(dest_dir, local_filename))
            
    copy_records(train_records, TRAIN_DIR)
    copy_records(val_records, VAL_DIR)
    copy_records(test_records, TEST_DIR)
    
    # Save partitioned metadata
    partitioned_meta = train_records + val_records + test_records
    save_json(partitioned_meta, os.path.join(METADATA_DIR, "partitioned_metadata.json"))
    
    logger.info(f"Split results:")
    logger.info(f"Train: {len(train_records)} images ({len(train_records)/total_images*100:.1f}%)")
    logger.info(f"Validation: {len(val_records)} images ({len(val_records)/total_images*100:.1f}%)")
    logger.info(f"Test: {len(test_records)} images ({len(test_records)/total_images*100:.1f}%)")
    
    # Generate reports
    generate_reports(partitioned_meta)
    # Generate visual review sheet
    generate_review_html(partitioned_meta)

def generate_reports(meta_list: list):
    """Generates json and txt dataset summary reports."""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    
    total_cleaned = len(meta_list)
    
    # Count quarantine files
    quarantine_files = []
    if os.path.exists(QUARANTINE_DIR):
        for root, _, files in os.walk(QUARANTINE_DIR):
            for file in files:
                if file.endswith(".reason.json"):
                    with open(os.path.join(root, file), "r", encoding="utf-8") as rf:
                        quarantine_files.append(json.load(rf))
                        
    total_quarantined = len(quarantine_files)
    total_candidates = total_cleaned + total_quarantined
    
    # Count duplicates from quarantine reasons
    exact_duplicates = sum(1 for q in quarantine_files if "SHA-256 duplicate" in q.get("rejection_reason", ""))
    near_duplicates = sum(1 for q in quarantine_files if "Near-duplicate" in q.get("rejection_reason", ""))
    corrupted_count = sum(1 for q in quarantine_files if "corruption" in q.get("rejection_reason", ""))
    low_res_count = sum(1 for q in quarantine_files if "Resolution too low" in q.get("rejection_reason", ""))
    license_quarantine = sum(1 for q in quarantine_files if "license" in q.get("rejection_reason", "") or "reuse license" in q.get("rejection_reason", ""))
    
    other_reasons = total_quarantined - (exact_duplicates + near_duplicates + corrupted_count + low_res_count + license_quarantine)
    
    # Images per class
    class_counts = Counter(r["class"] for r in meta_list)
    
    # Source & License distribution
    source_dist = Counter(r.get("source_category", "Unknown") for r in meta_list)
    license_dist = Counter(r.get("license", "Unknown") for r in meta_list)
    
    # Split counts
    split_counts = Counter(r["split"] for r in meta_list)
    
    # Uploader/Author concentration check
    uploader_dist = defaultdict(int)
    class_uploader_dist = defaultdict(lambda: defaultdict(int))
    for r in meta_list:
        author = r.get("author", "Unknown")
        c = r["class"]
        uploader_dist[author] += 1
        class_uploader_dist[c][author] += 1
        
    # Analyze photographer imbalance
    warnings = []
    for c, uploaders in class_uploader_dist.items():
        class_total = class_counts[c]
        if class_total > 0:
            top_uploader, top_count = max(uploaders.items(), key=lambda x: x[1])
            percentage = (top_count / class_total) * 100
            if percentage > 40.0 and top_uploader != "Unknown":
                warnings.append(f"Class '{c}' photographer concentration: '{top_uploader}' contributes {percentage:.1f}% ({top_count}/{class_total} images).")

    # Hard negatives count
    hard_negatives_count = 0
    if os.path.exists(HARD_NEGATIVES_DIR):
        hard_negatives_count = sum(1 for f in os.listdir(HARD_NEGATIVES_DIR) if os.path.isfile(os.path.join(HARD_NEGATIVES_DIR, f)) and not f.endswith(".json"))

    report_data = {
        "dataset_version": "v1.0",
        "timestamp": "2026-08-21T05:25:00Z",
        "candidate_count": total_candidates,
        "valid_cleaned_count": total_cleaned,
        "rejected_quarantine_count": total_quarantined,
        "hard_negatives_count": hard_negatives_count,
        "rejection_statistics": {
            "exact_duplicates": exact_duplicates,
            "near_duplicates": near_duplicates,
            "corrupted_images": corrupted_count,
            "low_resolution": low_res_count,
            "unacceptable_license": license_quarantine,
            "other_filters": other_reasons
        },
        "split_statistics": dict(split_counts),
        "class_distribution": dict(class_counts),
        "license_distribution": dict(license_dist),
        "source_category_distribution": dict(source_dist),
        "warnings": warnings,
        "real_world_test_performance": "NOT_MEASURED"
    }
    
    # Save JSON report
    save_json(report_data, os.path.join(RESULTS_DIR, "dataset_report.json"))
    
    # Build text report
    txt_report_path = os.path.join(RESULTS_DIR, "dataset_report.txt")
    with open(txt_report_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MONUMENT DATASET REPORT CARD - v1.0\n")
        f.write("==================================================\n\n")
        f.write(f"Candidate Count discovered: {total_candidates}\n")
        f.write(f"Valid/Cleaned Count: {total_cleaned}\n")
        f.write(f"Quarantined/Rejected Count: {total_quarantined}\n")
        f.write(f"Hard Negatives Count: {hard_negatives_count}\n\n")
        
        f.write("REJECTION REASON BREAKDOWN:\n")
        for reason, count in report_data["rejection_statistics"].items():
            f.write(f"  - {reason.replace('_', ' ').title()}: {count}\n")
        f.write("\n")
        
        f.write("DATASET SPLITS:\n")
        for split, count in split_counts.items():
            pct = (count / total_cleaned) * 100
            f.write(f"  - {split.title()}: {count} ({pct:.1f}%)\n")
        f.write("\n")
        
        f.write("IMAGES PER CLASS:\n")
        for c, count in class_counts.items():
            f.write(f"  - {c}: {count}\n")
        f.write("\n")
        
        f.write("LICENSE DISTRIBUTION:\n")
        for lic, count in license_dist.items():
            f.write(f"  - {lic}: {count}\n")
        f.write("\n")
        
        f.write("SOURCE DIVERSITY WARNINGS:\n")
        if warnings:
            for w in warnings:
                f.write(f"  [WARNING] {w}\n")
        else:
            f.write("  No significant photographer dominance detected.\n")
        f.write("\n")
        
        f.write("REAL-WORLD VALIDATION STATUS:\n")
        f.write("  - Phone captures: NOT MEASURED\n")
        f.write("  - Status: NEEDS REAL-WORLD VALIDATION\n")
        f.write("\n==================================================\n")
        
    logger.info(f"Dataset reports written to results/dataset_report.json and .txt")

def generate_review_html(meta_list: list):
    """Generates an HTML contact sheet for visual dataset review."""
    html_path = os.path.join(RESULTS_DIR, "review_contact_sheet.html")
    
    # Group by class
    class_images = defaultdict(list)
    for r in meta_list:
        class_images[r["class"]].append(r)
        
    # Read quarantined files
    quarantine_files = []
    if os.path.exists(QUARANTINE_DIR):
        for root, _, files in os.walk(QUARANTINE_DIR):
            for file in files:
                if file.endswith(".reason.json"):
                    with open(os.path.join(root, file), "r", encoding="utf-8") as rf:
                        quarantine_files.append(json.load(rf))
                        
    html_content = """<!DOCTYPE html>
<html>
<head>
    <title>HERIXA Monument Dataset Review</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f8f9fa; color: #333; }
        h1, h2 { color: #2c3e50; }
        .section { margin-bottom: 40px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px; background: #fff; display: flex; flex-direction: column; }
        .card img { max-width: 100%; height: 150px; object-fit: cover; border-radius: 4px; background: #eee; }
        .card-info { margin-top: 8px; font-size: 11px; line-height: 1.4; word-break: break-all; }
        .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 10px; font-weight: bold; color: #fff; }
        .badge-train { background-color: #27ae60; }
        .badge-val { background-color: #2980b9; }
        .badge-test { background-color: #e67e22; }
        .badge-reject { background-color: #c0392b; }
        .rejection-reason { color: #c0392b; font-weight: bold; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>HERIXA Monument Dataset Review (v1.0)</h1>
    <p>Use this contact sheet to review the cleaned training splits and inspect quarantined files.</p>
    
    <div class="section">
        <h2>Cleaned Dataset (Total: """ + str(len(meta_list)) + """ images)</h2>
    """
    
    for class_slug, items in class_images.items():
        html_content += f"<h3>Class: {class_slug} ({len(items)} images)</h3><div class='grid'>"
        for r in items:
            # We reference path relative to the workspace root or copy it, 
            # but using relative path relative to 'ai' or direct files works in local viewing.
            # We'll use relative path to cleaned folder
            rel_img = f"../dataset/cleaned/{r['class']}/{r['local_filename']}"
            badge_class = f"badge-{r['split']}"
            html_content += f"""
            <div class='card'>
                <img src='{rel_img}' alt='{r['local_filename']}'>
                <div class='card-info'>
                    <strong>{r['local_filename']}</strong><br>
                    Dim: {r.get('width', 0)}x{r.get('height', 0)} | size: {r.get('file_size', 0)//1024} KB<br>
                    License: {r.get('license', 'Unknown')}<br>
                    Split: <span class='badge {badge_class}'>{r['split'].upper()}</span>
                </div>
            </div>
            """
        html_content += "</div>"
        
    html_content += f"""
    </div>
    
    <div class="section">
        <h2>Quarantined Files ({len(quarantine_files)} images)</h2>
        <div class="grid">
    """
    
    for q in quarantine_files:
        rel_img = f"../dataset/quarantine/{q['class']}/{q['filename']}"
        html_content += f"""
        <div class='card'>
            <img src='{rel_img}' alt='{q['filename']}'>
            <div class='card-info'>
                <strong>{q['filename']}</strong><br>
                Class: {q['class']}<br>
                License: {q.get('license', 'Unknown')}<br>
                Status: <span class='badge badge-reject'>REJECTED</span><br>
                <div class='rejection-reason'>Reason: {q['rejection_reason']}</div>
            </div>
        </div>
        """
        
    html_content += """
        </div>
    </div>
</body>
</html>
"""
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    logger.info(f"Visual review HTML contact sheet written to results/review_contact_sheet.html")

if __name__ == "__main__":
    split_and_copy_dataset()
