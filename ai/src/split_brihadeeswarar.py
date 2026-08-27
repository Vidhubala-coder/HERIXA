import os
import sys
import json
import random
import shutil
import logging
from collections import defaultdict, Counter
from datetime import datetime

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

CLEANED_DIR = get_path("dataset", "cleaned")
HARD_NEG_DIR = get_path("dataset", "hard_negatives")
METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")

TRAIN_DIR = get_path("dataset", "train")
VAL_DIR = get_path("dataset", "validation")
TEST_DIR = get_path("dataset", "test")

LOG_FILE = get_path("results", "brihadeeswarar_split.log")
logger = setup_logger("split_brihadeeswarar", log_file=LOG_FILE)

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def cluster_records(records: list) -> list:
    """Clusters records based on uploader, prefix, and perceptual hash similarity to prevent leakage."""
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
            
            # Check 2: Perceptual similarity
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

def split_and_copy(records_list: list, class_name: str, train_dir: str, val_dir: str, test_dir: str, seed: int = 42):
    random.seed(seed)
    
    # Cluster to prevent leakage
    clusters = cluster_records(records_list)
    random.shuffle(clusters)
    
    total_images = len(records_list)
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
            
    # Copy images helper
    def copy_files(recs, target_base):
        dest_dir = os.path.join(target_base, class_name)
        os.makedirs(dest_dir, exist_ok=True)
        
        for r in recs:
            filename = r["local_filename"]
            if class_name == "brihadeeswarar":
                src_path = os.path.join(CLEANED_DIR, class_name, filename)
            else:
                src_path = os.path.join(HARD_NEG_DIR, filename)
                
            dest_path = os.path.join(dest_dir, filename)
            shutil.copy2(src_path, dest_path)
            
    copy_files(train_records, train_dir)
    copy_files(val_records, val_dir)
    copy_files(test_records, test_dir)
    
    return train_records, val_records, test_records, len(clusters)

def main():
    logger.info("Splitting Brihadeeswarar and Hard Negatives...")
    
    # 1. Clean existing split folders
    for d in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        
    # 2. Load Brihadeeswarar records
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    bri_records = []
    with open(deduped_meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                record = json.loads(line)
                if record["class"] == "brihadeeswarar":
                    bri_records.append(record)
                    
    logger.info(f"Loaded {len(bri_records)} Brihadeeswarar records.")
    
    # 3. Load Hard Negative records
    hard_neg_meta_path = os.path.join(METADATA_DIR, "hard_negatives_metadata.jsonl")
    hn_records = []
    with open(hard_neg_meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                hn_records.append(json.loads(line))
                
    logger.info(f"Loaded {len(hn_records)} Hard Negative records.")
    
    # 4. Perform split for Brihadeeswarar
    bri_train, bri_val, bri_test, bri_clusters_count = split_and_copy(
        bri_records, "brihadeeswarar", TRAIN_DIR, VAL_DIR, TEST_DIR
    )
    
    # 5. Perform split for Hard Negatives
    hn_train, hn_val, hn_test, hn_clusters_count = split_and_copy(
        hn_records, "hard_negatives", TRAIN_DIR, VAL_DIR, TEST_DIR
    )
    
    # 6. Save split metadata
    split_metadata = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "brihadeeswarar": {
            "total": len(bri_records),
            "train": len(bri_train),
            "validation": len(bri_val),
            "test": len(bri_test),
            "leakage_groups_count": bri_clusters_count
        },
        "hard_negatives": {
            "total": len(hn_records),
            "train": len(hn_train),
            "validation": len(hn_val),
            "test": len(hn_test)
        }
    }
    save_json(split_metadata, os.path.join(METADATA_DIR, "brihadeeswarar_split_metadata.json"))
    
    # Report output
    print("\n==================================================")
    print("BRIHADEESWARAR DATASET SPLIT SUMMARY")
    print("==================================================")
    print(f"Total usable Brihadeeswarar images: {len(bri_records)}")
    print(f"Train count: {len(bri_train)}")
    print(f"Validation count: {len(bri_val)}")
    print(f"Test count: {len(bri_test)}")
    print(f"Hard-negative count: {len(hn_records)}")
    print("")
    print("Exact directories created:")
    print(f"  - {os.path.join(TRAIN_DIR, 'brihadeeswarar')}")
    print(f"  - {os.path.join(TRAIN_DIR, 'hard_negatives')}")
    print(f"  - {os.path.join(VAL_DIR, 'brihadeeswarar')}")
    print(f"  - {os.path.join(VAL_DIR, 'hard_negatives')}")
    print(f"  - {os.path.join(TEST_DIR, 'brihadeeswarar')}")
    print(f"  - {os.path.join(TEST_DIR, 'hard_negatives')}")
    print("")
    print(f"Leakage groups found (Brihadeeswarar): {bri_clusters_count}")
    print("Whether the test set is untouched: YES (Held-out from training)")
    print("==================================================")

if __name__ == "__main__":
    from datetime import datetime
    main()
