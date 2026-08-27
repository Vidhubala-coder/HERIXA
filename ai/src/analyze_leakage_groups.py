import os
import sys
import json
import logging
from collections import defaultdict, Counter

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")
HARD_NEG_DIR = get_path("dataset", "hard_negatives")
LOG_FILE = get_path("results", "leakage_analysis_detail.log")

logger = setup_logger("analyze_leakage", log_file=LOG_FILE)

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def main():
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    if not os.path.exists(deduped_meta_path):
        logger.error(f"Deduplicated metadata missing: {deduped_meta_path}")
        print("ERROR: Run Phase 2 validation/deduplication first.")
        return
        
    records = []
    with open(deduped_meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
                
    # Reconstruct Union-Find clustering
    parent = list(range(len(records)))
    
    def find_parent(i):
        if parent[i] == i:
            return i
        parent[i] = find_parent(parent[i])
        return parent[i]
        
    def union_parent(i, j):
        root_i = find_parent(i)
        root_j = find_parent(j)
        if root_i != root_j:
            parent[root_i] = root_j
            
    # Group within same class
    for i in range(len(records)):
        rec_i = records[i]
        phash_i = rec_i.get("phash", "")
        author_i = rec_i.get("author", "")
        name_i = rec_i["local_filename"]
        
        for j in range(i + 1, len(records)):
            rec_j = records[j]
            if rec_i["class"] != rec_j["class"]:
                continue
                
            phash_j = rec_j.get("phash", "")
            author_j = rec_j.get("author", "")
            name_j = rec_j["local_filename"]
            
            # Check 1: Perceptual similarity (distance <= 10)
            is_leakage_hash = False
            if phash_i and phash_j:
                dist = get_hamming_distance(phash_i, phash_j)
                if dist <= 10:
                    is_leakage_hash = True
                    
            # Check 2: Sequential prefix and same author
            common_prefix = os.path.commonprefix([name_i, name_j])
            is_seq_leakage = (author_i and author_j and author_i == author_j and len(common_prefix) >= 12)
            
            if is_leakage_hash or is_seq_leakage:
                union_parent(i, j)
                
    grouped_leakage = defaultdict(list)
    for idx, r in enumerate(records):
        root = find_parent(idx)
        grouped_leakage[root].append((idx, r))
        
    leakage_groups = [g for g in grouped_leakage.values() if len(g) > 1]
    
    analyzed_groups = []
    
    exact_same_scene = 0
    burst_seq = 0
    resized_recompressed = 0
    different_viewpoints = 0
    
    for group in leakage_groups:
        filenames = [item[1]["local_filename"] for item in group]
        class_slug = group[0][1]["class"]
        
        # Analyze hashes within the group
        hashes = [item[1].get("phash", "") for item in group if item[1].get("phash")]
        max_dist = 0
        min_dist = 999
        
        for i in range(len(hashes)):
            for j in range(i + 1, len(hashes)):
                dist = get_hamming_distance(hashes[i], hashes[j])
                max_dist = max(max_dist, dist)
                min_dist = min(min_dist, dist)
                
        # Categorize
        if max_dist == 0:
            category = "Resized/Recompressed Copies (Same original image)"
            resized_recompressed += 1
            action = "Same-split assignment mandatory (Treat as single image)"
        elif max_dist <= 4:
            category = "Exact same scene / burst copies"
            exact_same_scene += 1
            action = "Same-split assignment mandatory"
        elif max_dist <= 7:
            category = "Burst/sequential photographs from slightly different angles/distances"
            burst_seq += 1
            action = "Same-split assignment mandatory"
        else:
            category = "Genuinely different viewpoints of the same structure / category"
            different_viewpoints += 1
            action = "Group-split assignment recommended for maximum safety, or keep viewpoints separate if balanced"
            
        analyzed_groups.append({
            "class": class_slug,
            "size": len(group),
            "filenames": filenames,
            "max_hash_distance": max_dist,
            "category": category,
            "action": action
        })
        
    analysis_report = {
        "total_leakage_groups_reviewed": len(leakage_groups),
        "categories_breakdown": {
            "resized_recompressed_copies": resized_recompressed,
            "exact_same_scene_burst_copies": exact_same_scene,
            "burst_sequential_photographs": burst_seq,
            "genuinely_different_viewpoints": different_viewpoints
        },
        "groups_requiring_same_split": resized_recompressed + exact_same_scene + burst_seq,
        "detailed_groups": analyzed_groups
    }
    
    save_json(analysis_report, os.path.join(RESULTS_DIR, "leakage_groups_analysis.json"))
    
    # Write a clean analysis txt report
    txt_path = os.path.join(RESULTS_DIR, "leakage_groups_analysis.txt")
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MONUMENT DATASET LEAKAGE ANALYSIS REPORT\n")
        f.write("==================================================\n\n")
        f.write(f"Total Leakage Groups Reviewed: {len(leakage_groups)}\n")
        f.write(f"Groups Requiring Same-Split Assignment: {analysis_report['groups_requiring_same_split']}\n\n")
        
        f.write("BREAKDOWN BY CATEGORY:\n")
        f.write(f"  - Resized/Recompressed Copies: {resized_recompressed}\n")
        f.write(f"  - Exact Same Scene / Burst:    {exact_same_scene}\n")
        f.write(f"  - Burst/Sequential Photos:     {burst_seq}\n")
        f.write(f"  - Different Viewpoints:        {different_viewpoints}\n\n")
        
        f.write("REPRESENTATIVE GROUP SAMPLES:\n")
        for i, group in enumerate(analyzed_groups[:10]):
            f.write(f"Group {i+1} (Class: {group['class']}, Size: {group['size']}):\n")
            f.write(f"  Category: {group['category']}\n")
            f.write(f"  Files: {', '.join(group['filenames'][:3])}...\n\n")
            
        f.write("==================================================\n")
        
    logger.info("Leakage detailed analysis complete.")
    print("LEAKAGE ANALYSIS COMPLETE!")

if __name__ == "__main__":
    main()
