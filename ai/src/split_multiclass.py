import os
import sys
import json
import random
import shutil
import hashlib
import logging
from collections import defaultdict, Counter

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

WORKSPACE_DIR = r"c:\Users\LENOVO\Desktop\AR model"
AI_DIR = os.path.join(WORKSPACE_DIR, "ai")
DATASET_DIR = os.path.join(AI_DIR, "dataset")

CLEANED_DIR = os.path.join(DATASET_DIR, "cleaned")
HARD_NEG_DIR = os.path.join(DATASET_DIR, "hard_negatives")
METADATA_DIR = os.path.join(DATASET_DIR, "metadata")
RESULTS_DIR = os.path.join(AI_DIR, "results")

# Multiclass split directories
MULTICLASS_DIR = os.path.join(DATASET_DIR, "multiclass")
TRAIN_DIR = os.path.join(MULTICLASS_DIR, "train")
VAL_DIR = os.path.join(MULTICLASS_DIR, "validation")
TEST_DIR = os.path.join(MULTICLASS_DIR, "test")

LOG_FILE = os.path.join(RESULTS_DIR, "multiclass_split.log")
logger = setup_logger("split_multiclass", log_file=LOG_FILE)

TARGET_CLASSES = [
    "airavatesvara",
    "brihadeeswarar",
    "gangaikonda-cholapuram",
    "mahabalipuram",
    "meenakshi-amman",
    "thirumalai-nayakkar"
]

def calculate_sha256(file_path):
    sha = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha.update(chunk)
        return sha.hexdigest()
    except Exception:
        return None

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def cluster_records_for_class(records: list, class_name: str) -> list:
    """
    Groups records of a single class into clusters representing the same photo session, sequence, or burst.
    Prevents data leakage during splitting.
    """
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

    n = len(records)
    for i in range(n):
        r_i = records[i]
        name_i = r_i["local_filename"]
        phash_i = r_i.get("phash", "")
        author_i = r_i.get("author", "")
        
        for j in range(i + 1, n):
            r_j = records[j]
            name_j = r_j["local_filename"]
            phash_j = r_j.get("phash", "")
            author_j = r_j.get("author", "")
            
            # Check 1: Filename prefix similarity (15 chars)
            common_prefix = os.path.commonprefix([name_i, name_j])
            is_similar_name = len(common_prefix) >= 15
            
            # Check 2: Perceptual similarity (Hamming distance <= 10)
            is_similar_hash = False
            if phash_i and phash_j:
                dist = get_hamming_distance(phash_i, phash_j)
                if dist <= 10:
                    is_similar_hash = True
                    
            # Check 3: Photographer sequence (same author and 8 prefix chars)
            is_same_author_seq = (author_i and author_j and author_i == author_j and len(common_prefix) >= 8)
            
            if is_similar_name or is_similar_hash or is_same_author_seq:
                union(i, j)
                
    clusters = defaultdict(list)
    for idx, r in enumerate(records):
        root = find(idx)
        clusters[root].append(r)
        
    return list(clusters.values())

def main():
    import imagehash
    from PIL import Image

    logger.info("Initializing 7-class leakage-aware split...")
    print("\n==================================================")
    print("CREATING NEW 7-CLASS LEAKAGE-AWARE SPLIT")
    print("==================================================")
    
    # 1. Load targets from deduped_metadata.jsonl
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    target_records = []
    if os.path.exists(deduped_meta_path):
        with open(deduped_meta_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    target_records.append(json.loads(line))
        logger.info(f"Loaded {len(target_records)} target class records.")
    else:
        logger.error(f"Missing deduped metadata at {deduped_meta_path}!")
        print("ERROR: Run Phase 2 deduplication first.")
        return
        
    # 2. Load hard negatives from hard_negatives_metadata.jsonl
    hn_meta_path = os.path.join(METADATA_DIR, "hard_negatives_metadata.jsonl")
    hn_records = []
    if os.path.exists(hn_meta_path):
        with open(hn_meta_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    hn_records.append(json.loads(line))
        logger.info(f"Loaded {len(hn_records)} hard negative records from metadata.")
    else:
        logger.error(f"Missing hard negatives metadata at {hn_meta_path}!")
        print("ERROR: Run hard negatives collection first.")
        return

    # Verify hard negative files actually exist on disk and compute missing hashes
    print("Computing hashes for hard negatives dynamically...")
    valid_hn_records = []
    for r in hn_records:
        fname = r["local_filename"]
        fpath = os.path.join(HARD_NEG_DIR, fname)
        if os.path.exists(fpath):
            # compute SHA-256
            if not r.get("sha256"):
                r["sha256"] = calculate_sha256(fpath)
            # compute perceptual hashes
            if not r.get("phash") or not r.get("dhash"):
                try:
                    with Image.open(fpath) as img:
                        r["phash"] = str(imagehash.phash(img))
                        r["dhash"] = str(imagehash.dhash(img))
                except Exception as e:
                    logger.warning(f"Could not compute perceptual hashes for {fname}: {e}")
                    r["phash"] = ""
                    r["dhash"] = ""
            
            # Map class to 'hard_negatives' (plural) as requested by structure
            r["class"] = "hard_negatives"
            valid_hn_records.append(r)
        else:
            logger.warning(f"Hard negative file {fname} in metadata does not exist on disk!")
            
    print(f"Total valid hard negatives on disk and in metadata: {len(valid_hn_records)}")
    logger.info(f"Using {len(valid_hn_records)} hard negatives after validation.")

    # Combine all records
    all_records = target_records + valid_hn_records
    
    # 3. Clean and recreate multiclass directory
    if os.path.exists(MULTICLASS_DIR):
        logger.info(f"Cleaning existing multiclass directory: {MULTICLASS_DIR}")
        shutil.rmtree(MULTICLASS_DIR)
    os.makedirs(MULTICLASS_DIR, exist_ok=True)
    for s in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
        os.makedirs(s, exist_ok=True)
        # Create directories for all 7 classes
        for cls in TARGET_CLASSES + ["hard_negatives"]:
            os.makedirs(os.path.join(s, cls), exist_ok=True)

    # 4. Perform split class-by-class
    all_split_records = []
    random.seed(42)  # Deterministic splits
    
    # Group by class slug
    class_groups = defaultdict(list)
    for r in all_records:
        # Normalize target class names
        class_groups[r["class"]].append(r)
        
    print("\nSplitting classes...")
    for class_slug, class_recs in class_groups.items():
        # Cluster
        clusters = cluster_records_for_class(class_recs, class_slug)
        # Shuffle clusters
        random.shuffle(clusters)
        
        total_images = len(class_recs)
        target_train = int(total_images * 0.70)
        target_val = int(total_images * 0.15)
        
        train_records = []
        val_records = []
        test_records = []
        
        current_train = 0
        current_val = 0
        
        for cluster in clusters:
            size = len(cluster)
            if current_train < target_train:
                train_records.extend(cluster)
                current_train += size
                split = "train"
            elif current_val < target_val:
                val_records.extend(cluster)
                current_val += size
                split = "validation"
            else:
                test_records.extend(cluster)
                split = "test"
                
            for r in cluster:
                r["split"] = split
                
        all_split_records.extend(train_records + val_records + test_records)
        print(f"  Class '{class_slug}': Total={total_images} | Train={len(train_records)} | Val={len(val_records)} | Test={len(test_records)}")

    # 5. Copy files
    print("\nCopying files to split folders...")
    for r in all_split_records:
        class_slug = r["class"]
        filename = r["local_filename"]
        split = r["split"]
        
        if class_slug == "hard_negatives":
            src_path = os.path.join(HARD_NEG_DIR, filename)
        else:
            src_path = os.path.join(CLEANED_DIR, class_slug, filename)
            
        dest_path = os.path.join(MULTICLASS_DIR, split, class_slug, filename)
        shutil.copy2(src_path, dest_path)
        
    print("Files copied successfully.")
    
    # Save partitioned metadata
    save_json(all_split_records, os.path.join(METADATA_DIR, "multiclass_partitioned_metadata.json"))

    # 6. Verification Checks
    print("\n==================================================")
    print("VERIFYING MULTICLASS SPLITS")
    print("==================================================")
    
    # A. Class counts per split from filesystem
    print("\n1. Filesystem Split Counts:")
    print(f"{'Class':<30} {'Train':<7} {'Val':<7} {'Test':<7} {'Total':<7}")
    print("-" * 62)
    
    grand_total_train = 0
    grand_total_val = 0
    grand_total_test = 0
    
    class_counts_summary = {}
    
    for cls in sorted(TARGET_CLASSES + ["hard_negatives"]):
        tr_c = len([f for f in os.listdir(os.path.join(TRAIN_DIR, cls)) if os.path.isfile(os.path.join(TRAIN_DIR, cls, f))])
        val_c = len([f for f in os.listdir(os.path.join(VAL_DIR, cls)) if os.path.isfile(os.path.join(VAL_DIR, cls, f))])
        te_c = len([f for f in os.listdir(os.path.join(TEST_DIR, cls)) if os.path.isfile(os.path.join(TEST_DIR, cls, f))])
        tot = tr_c + val_c + te_c
        
        print(f"{cls:<30} {tr_c:<7} {val_c:<7} {te_c:<7} {tot:<7}")
        
        grand_total_train += tr_c
        grand_total_val += val_c
        grand_total_test += te_c
        
        class_counts_summary[cls] = {"train": tr_c, "validation": val_c, "test": te_c, "total": tot}
        
    grand_total = grand_total_train + grand_total_val + grand_total_test
    print("-" * 62)
    print(f"{'TOTAL':<30} {grand_total_train:<7} {grand_total_val:<7} {grand_total_test:<7} {grand_total:<7}")
    
    # B. Exact duplicate leakage
    print("\n2. Checking Exact Duplicate Leakage...")
    # Gather SHA-256 of files in each split
    split_hashes = {"train": {}, "validation": {}, "test": {}}
    for split, s_dir in [("train", TRAIN_DIR), ("validation", VAL_DIR), ("test", TEST_DIR)]:
        for cls in os.listdir(s_dir):
            cls_dir = os.path.join(s_dir, cls)
            if os.path.isdir(cls_dir):
                for f in os.listdir(cls_dir):
                    fpath = os.path.join(cls_dir, f)
                    h = calculate_sha256(fpath)
                    if h:
                        split_hashes[split][h] = (cls, f)
                        
    exact_leakage_found = False
    
    # Check train <-> validation
    tr_val_overlap = set(split_hashes["train"].keys()) & set(split_hashes["validation"].keys())
    if tr_val_overlap:
        print(f"  [FAIL] Exact duplicate leakage between Train and Validation! ({len(tr_val_overlap)} files)")
        for h in tr_val_overlap:
            print(f"    Hash: {h} | Train: {split_hashes['train'][h]} | Val: {split_hashes['validation'][h]}")
        exact_leakage_found = True
        
    # Check train <-> test
    tr_test_overlap = set(split_hashes["train"].keys()) & set(split_hashes["test"].keys())
    if tr_test_overlap:
        print(f"  [FAIL] Exact duplicate leakage between Train and Test! ({len(tr_test_overlap)} files)")
        for h in tr_test_overlap:
            print(f"    Hash: {h} | Train: {split_hashes['train'][h]} | Test: {split_hashes['test'][h]}")
        exact_leakage_found = True
        
    # Check validation <-> test
    val_test_overlap = set(split_hashes["validation"].keys()) & set(split_hashes["test"].keys())
    if val_test_overlap:
        print(f"  [FAIL] Exact duplicate leakage between Validation and Test! ({len(val_test_overlap)} files)")
        for h in val_test_overlap:
            print(f"    Hash: {h} | Val: {split_hashes['validation'][h]} | Test: {split_hashes['test'][h]}")
        exact_leakage_found = True
        
    if not exact_leakage_found:
        print("  PASS: No exact duplicate leakage found across splits.")
        
    # C. Near-duplicate / Cluster leakage check
    print("\n3. Checking Cluster Leakage...")
    # Map each filename to its split
    file_to_split = {r["local_filename"]: r["split"] for r in all_split_records}
    
    cluster_leakage_found = False
    for class_slug, class_recs in class_groups.items():
        # Re-run clustering
        clusters = cluster_records_for_class(class_recs, class_slug)
        for cluster in clusters:
            splits_in_cluster = set(file_to_split[r["local_filename"]] for r in cluster)
            if len(splits_in_cluster) > 1:
                print(f"  [FAIL] Cluster split leakage in class '{class_slug}'! Cluster split across: {splits_in_cluster}")
                print(f"    Files: {', '.join(r['local_filename'] for r in cluster)}")
                cluster_leakage_found = True
                
    if not cluster_leakage_found:
        print("  PASS: No cluster / burst leakage found across splits.")

    # D. Class contamination verification
    print("\n4. Checking Class Contamination...")
    contamination_found = False
    for split, s_dir in [("train", TRAIN_DIR), ("validation", VAL_DIR), ("test", TEST_DIR)]:
        for cls in os.listdir(s_dir):
            cls_dir = os.path.join(s_dir, cls)
            if os.path.isdir(cls_dir):
                for f in os.listdir(cls_dir):
                    # Verify this file is associated with this class in metadata
                    # Find record
                    matched_records = [r for r in all_split_records if r["local_filename"] == f]
                    if matched_records:
                        meta_rec = matched_records[0]
                        if meta_rec["class"] != cls:
                            print(f"  [FAIL] Contamination: File {f} is inside '{cls}' directory but belongs to '{meta_rec['class']}' class!")
                            contamination_found = True
                    else:
                        print(f"  [FAIL] Contamination: File {f} in '{split}/{cls}' is untracked in split metadata!")
                        contamination_found = True
                        
    if not contamination_found:
        print("  PASS: No class contamination found.")

    # 7. Write reports
    report_data = {
        "status": "READY",
        "timestamp": "2026-08-23T05:40:00Z",
        "counts": class_counts_summary,
        "totals": {
            "train": grand_total_train,
            "validation": grand_total_val,
            "test": grand_total_test,
            "grand_total": grand_total
        },
        "verification": {
            "exact_duplicate_leakage": "FAIL" if exact_leakage_found else "PASS",
            "cluster_leakage": "FAIL" if cluster_leakage_found else "PASS",
            "contamination": "FAIL" if contamination_found else "PASS"
        }
    }
    
    save_json(report_data, os.path.join(RESULTS_DIR, "multiclass_split_report.json"))
    
    # Txt report
    txt_report_path = os.path.join(RESULTS_DIR, "multiclass_split_report.txt")
    with open(txt_report_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MULTICLASS DATASET SPLIT REPORT\n")
        f.write("==================================================\n\n")
        f.write(f"Grand Total Dataset Count: {grand_total}\n")
        f.write(f"Train Count:      {grand_total_train}\n")
        f.write(f"Validation Count: {grand_total_val}\n")
        f.write(f"Test Count:        {grand_total_test}\n\n")
        
        f.write("CLASS SPLIT DISTRIBUTION:\n")
        f.write(f"{'Class':<30} {'Train':<7} {'Val':<7} {'Test':<7} {'Total':<7}\n")
        f.write("-" * 62 + "\n")
        for cls in sorted(class_counts_summary.keys()):
            s = class_counts_summary[cls]
            f.write(f"{cls:<30} {s['train']:<7} {s['validation']:<7} {s['test']:<7} {s['total']:<7}\n")
        f.write("-" * 62 + "\n\n")
        
        f.write("VERIFICATION CHECKS:\n")
        f.write(f"  - Exact Duplicate Leakage: {'FAIL' if exact_leakage_found else 'PASS'}\n")
        f.write(f"  - Cluster/Burst Leakage:   {'FAIL' if cluster_leakage_found else 'PASS'}\n")
        f.write(f"  - Class Contamination:     {'FAIL' if contamination_found else 'PASS'}\n")
        f.write("==================================================\n")
        
    print(f"\nVerification reports saved to results/multiclass_split_report.json and .txt")
    print("==================================================")

if __name__ == "__main__":
    main()
