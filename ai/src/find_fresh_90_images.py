import os
import sys
import hashlib

DATASET_ROOT = r"C:\Users\LENOVO\Desktop\AR model\ai\dataset"

CLASSES_MAP = {
    "Brihadeeswarar": ["brihadeeswarar"],
    "Meenakshi-Amman": ["meenakshi-amman", "meenakshi_amman"],
    "Mahabalipuram": ["mahabalipuram"],
    "Gangaikonda-Cholapuram": ["gangaikonda-cholapuram", "gangaikonda_cholapuram"],
    "Airavatesvara": ["airavatesvara"],
    "Thirumalai-Nayakkar": ["thirumalai-nayakkar", "thirumalai_nayakkar"]
}

def get_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def build_known_hashes():
    known_sha = set()

    # Directories that contain trained / validated / test data
    dirs_to_index = [
        os.path.join(DATASET_ROOT, "multiclass_v2", "train"),
        os.path.join(DATASET_ROOT, "multiclass_v2", "validation"),
        os.path.join(DATASET_ROOT, "multiclass_v2", "test"),
        os.path.join(DATASET_ROOT, "phase3l_training"),
    ]

    print("[INDEXING] Building SHA256 set from existing dataset files...")
    indexed_count = 0
    for d in dirs_to_index:
        if not os.path.exists(d):
            continue
        for root, _, files in os.walk(d):
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    fp = os.path.join(root, f)
                    h = get_sha256(fp)
                    known_sha.add(h)
                    indexed_count += 1

    print(f"[INDEXING] Indexed {indexed_count} existing dataset images. SHA256 Set Size: {len(known_sha)}")
    return known_sha

def find_fresh_candidates(known_sha):
    # Candidate pools from raw / cleaned / staging
    candidate_dirs = [
        os.path.join(DATASET_ROOT, "raw"),
        os.path.join(DATASET_ROOT, "cleaned"),
        os.path.join(DATASET_ROOT, "staging"),
        os.path.join(DATASET_ROOT, "quarantine")
    ]

    selected_fresh = {}

    for cls_name, folder_aliases in CLASSES_MAP.items():
        print(f"\n[SEARCHING] Searching fresh candidates for class: {cls_name}...")
        cls_candidates = []

        for cdir in candidate_dirs:
            if not os.path.exists(cdir):
                continue
            for alias in folder_aliases:
                target_folder = os.path.join(cdir, alias)
                if not os.path.exists(target_folder):
                    continue
                for f in sorted(os.listdir(target_folder)):
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        fp = os.path.join(target_folder, f)
                        cls_candidates.append(fp)

        # Filter candidates against known hashes
        fresh_images = []
        fresh_hashes = set()

        for fp in cls_candidates:
            h = get_sha256(fp)
            if h in known_sha or h in fresh_hashes:
                continue # Duplicate SHA256 / Trained image

            fresh_images.append(fp)
            fresh_hashes.add(h)

            if len(fresh_images) >= 15:
                break

        print(f"  Found {len(fresh_images)} 100% fresh, non-leaked images for {cls_name}")
        selected_fresh[cls_name] = fresh_images

    return selected_fresh

if __name__ == "__main__":
    known_sha = build_known_hashes()
    fresh_map = find_fresh_candidates(known_sha)

    total_fresh = sum(len(v) for v in fresh_map.values())
    print(f"\n==================================================")
    print(f"TOTAL FRESH IMAGES IDENTIFIED: {total_fresh} / 90")
    print(f"==================================================")
    for k, v in fresh_map.items():
        print(f"  - {k}: {len(v)} images")
