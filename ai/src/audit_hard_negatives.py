import os
import sys
import hashlib
import json
from collections import defaultdict
from PIL import Image

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger

WORKSPACE_DIR = r"c:\Users\LENOVO\Desktop\AR model"
HN_DIR = os.path.join(WORKSPACE_DIR, "ai", "dataset", "hard_negatives")
CLEANED_DIR = os.path.join(WORKSPACE_DIR, "ai", "dataset", "cleaned")
METADATA_DIR = os.path.join(WORKSPACE_DIR, "ai", "dataset", "metadata")
RESULTS_DIR = os.path.join(WORKSPACE_DIR, "ai", "results")

LOG_FILE = os.path.join(RESULTS_DIR, "contamination_audit.log")
logger = setup_logger("contamination_audit", log_file=LOG_FILE)

TARGET_CLASSES = [
    "airavatesvara",
    "brihadeeswarar",
    "gangaikonda-cholapuram",
    "mahabalipuram",
    "meenakshi-amman",
    "thirumalai-nayakkar"
]

FILENAME_KEYWORDS = {
    "airavatesvara": ["airavatesvara", "darasuram"],
    "brihadeeswarar": ["brihadeeswarar", "tanjore", "brihadisvara", "thanjavur"],
    "gangaikonda-cholapuram": ["gangaikonda", "cholapuram", "jayamkondam"],
    "mahabalipuram": ["mahabalipuram", "mamallapuram"],
    "meenakshi-amman": ["meenakshi", "madurai"],
    "thirumalai-nayakkar": ["thirumalai", "nayakkar", "nayak"]
}

def calculate_sha256(file_path):
    sha = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha.update(chunk)
        return sha.hexdigest()
    except Exception:
        return None

def calculate_md5(file_path):
    md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5.update(chunk)
        return md5.hexdigest()
    except Exception:
        return None

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def main():
    import imagehash
    
    logger.info("Starting post-deletion contamination audit on hard negatives...")
    print("\n==================================================")
    print("RUNNING CONTAMINATION AUDIT ON HARD NEGATIVES")
    print("==================================================")
    
    # 1. Load cleaned records (targets)
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    target_records = []
    if os.path.exists(deduped_meta_path):
        with open(deduped_meta_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    target_records.append(json.loads(line))
    else:
        logger.error("deduped_metadata.jsonl not found!")
        print("ERROR: deduped_metadata.jsonl not found!")
        return

    # Build target indexes for fast lookup
    target_sha_to_rec = {r["sha256"]: r for r in target_records if r.get("sha256")}
    
    # Calculate target MD5s (we don't have them in metadata, so compute if needed, or rely on SHA-256 for exact match)
    # Actually SHA-256 is fully sufficient for exact duplicate check. But we will compute MD5 if any matching is needed.
    
    # 2. Get list of remaining hard negatives on disk
    hn_files = [f for f in os.listdir(HN_DIR) if os.path.isfile(os.path.join(HN_DIR, f)) and not f.endswith(".json")]
    print(f"Total hard negative files remaining on disk: {len(hn_files)}")
    
    suspected_contaminations = []
    
    for idx, f in enumerate(hn_files):
        file_path = os.path.join(HN_DIR, f)
        
        # Calculate hashes
        sha256 = calculate_sha256(file_path)
        md5 = calculate_md5(file_path)
        
        # Calculate perceptual hashes
        try:
            with Image.open(file_path) as img:
                phash_str = str(imagehash.phash(img))
                dhash_str = str(imagehash.dhash(img))
        except Exception as e:
            logger.warning(f"Could not calculate perceptual hashes for {f}: {e}")
            phash_str, dhash_str = "", ""
            
        # Check A: Exact SHA-256 duplicate
        if sha256 in target_sha_to_rec:
            matched_rec = target_sha_to_rec[sha256]
            suspected_contaminations.append({
                "filename": f,
                "path": file_path,
                "suspected_class": matched_rec["class"],
                "hash": sha256,
                "reason": f"Exact SHA-256 match with cleaned/{matched_rec['class']}/{matched_rec['local_filename']}",
                "confidence": "HIGH (Exact binary match)"
            })
            continue
            
        # Check B: Filename keywords
        lower_name = f.lower()
        for class_slug, keywords in FILENAME_KEYWORDS.items():
            for kw in keywords:
                if kw in lower_name:
                    # Flag filename indicator
                    suspected_contaminations.append({
                        "filename": f,
                        "path": file_path,
                        "suspected_class": class_slug,
                        "hash": sha256,
                        "reason": f"Filename '{f}' contains keyword '{kw}' which points to '{class_slug}'",
                        "confidence": "LOW (Filename keyword only)"
                    })
                    break # check next class
                    
        # Check C: Perceptual hash similarity (Hamming distance <= 10)
        if phash_str and dhash_str:
            phash_obj = imagehash.hex_to_hash(phash_str)
            dhash_obj = imagehash.hex_to_hash(dhash_str)
            
            for t_rec in target_records:
                t_phash_str = t_rec.get("phash")
                t_dhash_str = t_rec.get("dhash")
                
                if t_phash_str and t_dhash_str:
                    t_phash_obj = imagehash.hex_to_hash(t_phash_str)
                    t_dhash_obj = imagehash.hex_to_hash(t_dhash_str)
                    
                    p_dist = phash_obj - t_phash_obj
                    d_dist = dhash_obj - t_dhash_obj
                    
                    if p_dist <= 10 and d_dist <= 10:
                        suspected_contaminations.append({
                            "filename": f,
                            "path": file_path,
                            "suspected_class": t_rec["class"],
                            "hash": sha256,
                            "reason": f"Perceptual similarity with cleaned/{t_rec['class']}/{t_rec['local_filename']} (pHash dist: {p_dist}, dHash dist: {d_dist})",
                            "confidence": f"MEDIUM-HIGH (Perceptual match dist={max(p_dist, d_dist)})"
                        })
                        break # break inner loop to avoid multiple match entries for same file

    print("\n---------------- AUDIT RESULTS ----------------")
    if not suspected_contaminations:
        print("PASS: No target monument contamination found in remaining hard negatives.")
        logger.info("PASS: No target monument contamination found.")
    else:
        print(f"SUSPECTED CONTAMINATIONS DETECTED: {len(suspected_contaminations)}")
        for sc in suspected_contaminations:
            print(f"\n- Filename: {sc['filename']}")
            print(f"  Suspected Class: {sc['suspected_class']}")
            print(f"  Confidence: {sc['confidence']}")
            print(f"  Reason: {sc['reason']}")
            print(f"  Hash: {sc['hash']}")
            logger.warning(f"Suspected contamination: {sc}")
            
    # Save results to a report file
    report_file = os.path.join(RESULTS_DIR, "contamination_audit_report.json")
    with open(report_file, "w", encoding="utf-8") as rf:
        json.dump(suspected_contaminations, rf, indent=2)
    print(f"\nAudit report saved to {report_file}")
    print("==================================================")

if __name__ == "__main__":
    main()
