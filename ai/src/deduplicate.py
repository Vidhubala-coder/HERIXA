import os
import sys
import json
import hashlib
import logging
from PIL import Image

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger

CLEANED_DIR = get_path("dataset", "cleaned")
QUARANTINE_DIR = get_path("dataset", "quarantine")
METADATA_DIR = get_path("dataset", "metadata")
LOG_FILE = get_path("results", "deduplication.log")

logger = setup_logger("deduplicate", log_file=LOG_FILE)

# Import imagehash only inside functions or gracefully fallback if not fully installed yet
# since pip is running in the background.
def get_image_hashes(file_path: str) -> (str, str, str):
    """Computes SHA-256 and Perceptual hashes for a given file."""
    import imagehash
    
    # 1. SHA-256 exact hash
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    sha_str = sha256_hash.hexdigest()
    
    # 2. Perceptual hashes (pHash and dHash)
    try:
        with Image.open(file_path) as img:
            phash_str = str(imagehash.phash(img))
            dhash_str = str(imagehash.dhash(img))
            return sha_str, phash_str, dhash_str
    except Exception as e:
        logger.error(f"Failed to calculate perceptual hashes for {file_path}: {e}")
        return sha_str, "", ""

def run_deduplication(hamming_threshold: int = 4):
    """
    Finds exact and near-duplicates per class.
    Moves duplicates to quarantine and removes them from cleaned metadata.
    """
    import imagehash # Check if import works
    
    logger.info(f"Starting deduplication (Hamming Distance Threshold: {hamming_threshold})...")
    
    cleaned_meta_path = os.path.join(METADATA_DIR, "cleaned_metadata.jsonl")
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    
    if not os.path.exists(cleaned_meta_path):
        logger.error(f"Cleaned metadata file not found at {cleaned_meta_path}. Run validation first.")
        return
        
    # Read all cleaned records
    records = []
    with open(cleaned_meta_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                records.append(json.loads(line))
                
    logger.info(f"Loaded {len(records)} records for deduplication.")
    
    # Track hashes to find duplicates
    exact_hashes = set()
    # Dict mapping class_slug -> list of (record, phash, dhash)
    class_hashes = {}
    
    deduped_records = []
    exact_dup_count = 0
    near_dup_count = 0
    
    for idx, record in enumerate(records):
        class_slug = record["class"]
        local_filename = record["local_filename"]
        cleaned_image_path = os.path.join(CLEANED_DIR, class_slug, local_filename)
        
        if not os.path.exists(cleaned_image_path):
            logger.warning(f"Cleaned image file missing: {cleaned_image_path}")
            continue
            
        # Compute hashes
        sha_str, phash_str, dhash_str = get_image_hashes(cleaned_image_path)
        
        # Save hashes in metadata record
        record["sha256"] = sha_str
        record["phash"] = phash_str
        record["dhash"] = dhash_str
        
        # 1. Exact duplicate check
        if sha_str in exact_hashes:
            exact_dup_count += 1
            quarantine_duplicate(cleaned_image_path, record, "Exact SHA-256 duplicate image found.")
            continue
            
        exact_hashes.add(sha_str)
        
        # 2. Near duplicate check (Per class to avoid cross-monument matching errors)
        if class_slug not in class_hashes:
            class_hashes[class_slug] = []
            
        # Check against existing files in this class using Hamming distance of pHash & dHash
        is_near_dup = False
        dup_reason = ""
        
        if phash_str and dhash_str:
            phash_obj = imagehash.hex_to_hash(phash_str)
            dhash_obj = imagehash.hex_to_hash(dhash_str)
            
            for prev_record, prev_phash_str, prev_dhash_str in class_hashes[class_slug]:
                prev_phash_obj = imagehash.hex_to_hash(prev_phash_str)
                prev_dhash_obj = imagehash.hex_to_hash(prev_dhash_str)
                
                # Check distances
                p_dist = phash_obj - prev_phash_obj
                d_dist = dhash_obj - prev_dhash_obj
                
                # If both hashes are extremely close, it is a redundant duplicate (same frame, burst)
                if p_dist <= hamming_threshold and d_dist <= hamming_threshold:
                    is_near_dup = True
                    dup_reason = f"Near-duplicate of {prev_record['local_filename']} (pHash dist: {p_dist}, dHash dist: {d_dist})"
                    break
                    
        if is_near_dup:
            near_dup_count += 1
            quarantine_duplicate(cleaned_image_path, record, dup_reason)
        else:
            # Not a duplicate, keep it
            class_hashes[class_slug].append((record, phash_str, dhash_str))
            deduped_records.append(record)
            
    # Save deduped metadata
    with open(deduped_meta_path, "w", encoding="utf-8") as f:
        for r in deduped_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    logger.info(f"Deduplication completed.")
    logger.info(f"Total Kept: {len(deduped_records)}")
    logger.info(f"Exact Duplicates Pruned: {exact_dup_count}")
    logger.info(f"Near-Duplicates Pruned: {near_dup_count}")

def quarantine_duplicate(file_path: str, meta: dict, reason: str):
    """Helper to move a duplicate file to quarantine and save the reason."""
    class_slug = meta["class"]
    local_filename = meta["local_filename"]
    
    dest_dir = os.path.join(QUARANTINE_DIR, class_slug)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, local_filename)
    
    try:
        # Move file from cleaned to quarantine
        shutil.move(file_path, dest_path)
        
        # Save quarantine reason
        reason_path = dest_path + ".reason.json"
        with open(reason_path, "w", encoding="utf-8") as reason_file:
            json.dump({
                "filename": local_filename,
                "class": class_slug,
                "rejection_reason": reason,
                "wikimedia_url": meta.get("file_page_url", ""),
                "license": meta.get("license", ""),
                "sha256": meta.get("sha256", ""),
                "phash": meta.get("phash", "")
            }, reason_file, indent=2)
    except Exception as e:
        logger.error(f"Failed to quarantine duplicate {local_filename}: {e}")

if __name__ == "__main__":
    import shutil
    run_deduplication()
