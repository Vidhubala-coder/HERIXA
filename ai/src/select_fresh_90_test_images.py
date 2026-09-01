import os
import sys
import json
import hashlib
import shutil
from PIL import Image, ImageOps

AI_ROOT = r"C:\Users\LENOVO\Desktop\AR model\ai"
MANIFEST_PATH = os.path.join(AI_ROOT, "dataset", "multiclass_v2", "dataset_manifest.json")
DATASET_ROOT = os.path.join(AI_ROOT, "dataset")
OUT_DIR = os.path.join(DATASET_ROOT, "fresh_mobile_90_test")

CLASSES_MAP = {
    "Brihadeeswarar": ["brihadeeswarar"],
    "Meenakshi-Amman": ["meenakshi-amman", "meenakshi_amman"],
    "Mahabalipuram": ["mahabalipuram"],
    "Gangaikonda-Cholapuram": ["gangaikonda-cholapuram", "gangaikonda_cholapuram"],
    "Airavatesvara": ["airavatesvara"],
    "Thirumalai-Nayakkar": ["thirumalai-nayakkar", "thirumalai_nayakkar"]
}

def get_file_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def get_ahash(filepath):
    try:
        with Image.open(filepath) as img:
            img = ImageOps.exif_transpose(img).convert('L').resize((8, 8), Image.Resampling.BILINEAR)
            pixels = list(img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata())
            avg = sum(pixels) / len(pixels)
            bits = "".join(['1' if p > avg else '0' for p in pixels])
            return bits
    except Exception as e:
        return None

def hamming_dist(s1, s2):
    if not s1 or not s2 or len(s1) != len(s2):
        return 999
    return sum(c1 != c2 for c1, c2 in zip(s1, s2))

def build_known_database():
    known_sha = set()
    known_filenames = set()

    # 1. Load from manifest
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            mdata = json.load(f)
            for img_info in mdata.get("images", []):
                if "sha256" in img_info:
                    known_sha.add(img_info["sha256"])
                if "filename" in img_info:
                    known_filenames.add(img_info["filename"].lower())

    # 2. Scan physical files in multiclass_v2 train/validation/test
    dirs_to_scan = [
        os.path.join(DATASET_ROOT, "multiclass_v2", "train"),
        os.path.join(DATASET_ROOT, "multiclass_v2", "validation"),
        os.path.join(DATASET_ROOT, "multiclass_v2", "test"),
        os.path.join(DATASET_ROOT, "phase3l_training")
    ]

    for d in dirs_to_scan:
        if not os.path.exists(d):
            continue
        for root, _, files in os.walk(d):
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    known_filenames.add(f.lower())

    print(f"[DATA LEAKAGE SHIELD] Indexed {len(known_sha)} unique SHA256 hashes and {len(known_filenames)} filenames.")
    return known_sha, known_filenames

def select_and_copy_90_fresh_images():
    known_sha, known_filenames = build_known_database()

    os.makedirs(OUT_DIR, exist_ok=True)
    selected_manifest = []

    for cls_name, aliases in CLASSES_MAP.items():
        cls_out_dir = os.path.join(OUT_DIR, aliases[0])
        os.makedirs(cls_out_dir, exist_ok=True)

        print(f"\n[SELECTING] Selecting 15 fresh images for class: {cls_name}...")

        # Gather candidates from raw/cleaned/staging
        candidate_paths = []
        for pool_name in ["raw", "cleaned", "staging"]:
            pool_dir = os.path.join(DATASET_ROOT, pool_name)
            for alias in aliases:
                target_dir = os.path.join(pool_dir, alias)
                if not os.path.exists(target_dir):
                    continue
                for f in sorted(os.listdir(target_dir)):
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                        candidate_paths.append(os.path.join(target_dir, f))

        selected_for_cls = []
        selected_hashes = set()
        selected_ahashes = []

        for fp in candidate_paths:
            fname = os.path.basename(fp)
            # Filter 1: Fast filename match against dataset manifest / trained dataset
            if fname.lower() in known_filenames:
                continue

            # Filter 2: Exact SHA256 match against training dataset or selected set
            h = get_file_sha256(fp)
            if h in known_sha or h in selected_hashes:
                continue

            # Filter 3: Perceptual hash deduplication
            ah = get_ahash(fp)
            if not ah:
                continue

            is_dup = False
            for sah in selected_ahashes:
                if hamming_dist(ah, sah) <= 3:
                    is_dup = True
                    break

            if is_dup:
                continue

            # Target 15 distinct images
            dest_fp = os.path.join(cls_out_dir, fname)
            shutil.copy2(fp, dest_fp)

            selected_for_cls.append({
                "class_name": cls_name,
                "filename": fname,
                "original_path": fp,
                "test_path": dest_fp,
                "sha256": h,
                "ahash": ah
            })
            selected_hashes.add(h)
            selected_ahashes.append(ah)

            if len(selected_for_cls) >= 15:
                break

        if len(selected_for_cls) < 15:
            print(f"[ERROR] Only found {len(selected_for_cls)} fresh images for {cls_name}! Need 15.")
            sys.exit(1)

        print(f"  Selected {len(selected_for_cls)} fresh images for {cls_name} (0 leakage).")
        selected_manifest.extend(selected_for_cls)

    # Save test set manifest
    manifest_out = os.path.join(OUT_DIR, "manifest.json")
    with open(manifest_out, 'w', encoding='utf-8') as f:
        json.dump(selected_manifest, f, indent=2)

    print(f"\n==================================================")
    print(f"SUCCESS: 90 Fresh Test Images Selected & Verified")
    print(f"Output Manifest: {manifest_out}")
    print(f"==================================================")

if __name__ == "__main__":
    select_and_copy_90_fresh_images()
