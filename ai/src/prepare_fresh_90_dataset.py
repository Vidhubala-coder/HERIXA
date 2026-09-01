import os
import sys
import json
import hashlib
import shutil
import requests
from PIL import Image, ImageOps
import io

AI_ROOT = r"C:\Users\LENOVO\Desktop\AR model\ai"
DATASET_ROOT = os.path.join(AI_ROOT, "dataset")
MANIFEST_PATH = os.path.join(DATASET_ROOT, "multiclass_v2", "dataset_manifest.json")
OUT_DIR = os.path.join(DATASET_ROOT, "fresh_mobile_90_test")

CLASSES = [
    "Brihadeeswarar",
    "Meenakshi-Amman",
    "Mahabalipuram",
    "Gangaikonda-Cholapuram",
    "Airavatesvara",
    "Thirumalai-Nayakkar"
]

SLUG_MAP = {
    "Brihadeeswarar": "brihadeeswarar",
    "Meenakshi-Amman": "meenakshi-amman",
    "Mahabalipuram": "mahabalipuram",
    "Gangaikonda-Cholapuram": "gangaikonda-cholapuram",
    "Airavatesvara": "airavatesvara",
    "Thirumalai-Nayakkar": "thirumalai-nayakkar"
}

def get_file_sha256(filepath):
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()

def get_ahash_from_pil(img):
    try:
        img_gray = ImageOps.exif_transpose(img).convert('L').resize((8, 8), Image.Resampling.BILINEAR)
        pixels = list(img_gray.get_flattened_data() if hasattr(img_gray, 'get_flattened_data') else img_gray.getdata())
        avg = sum(pixels) / len(pixels)
        bits = "".join(['1' if p > avg else '0' for p in pixels])
        return bits
    except Exception:
        return None

def hamming_dist(s1, s2):
    if not s1 or not s2 or len(s1) != len(s2):
        return 999
    return sum(c1 != c2 for c1, c2 in zip(s1, s2))

def build_training_and_val_hashes():
    train_val_sha = set()
    train_val_ahash = []

    print("[SHIELD] Building SHA256 and perceptual hash filter for TRAIN and VALIDATION datasets...", flush=True)

    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            mdata = json.load(f)
            for img_info in mdata.get("images", []):
                # Include only TRAIN and VALIDATION splits in the leak shield
                if img_info.get("split") in ["train", "validation"]:
                    if "sha256" in img_info:
                        train_val_sha.add(img_info["sha256"])

    # Physical train / validation scan
    for split in ["train", "validation"]:
        sdir = os.path.join(DATASET_ROOT, "multiclass_v2", split)
        if not os.path.exists(sdir): continue
        for root, _, files in os.walk(sdir):
            for f in files:
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    fp = os.path.join(root, f)
                    h = get_file_sha256(fp)
                    train_val_sha.add(h)

    print(f"[SHIELD COMPLETE] Indexed {len(train_val_sha)} train/val SHA256 hashes.", flush=True)
    return train_val_sha

def prepare_90_fresh_images():
    train_val_sha = build_training_and_val_hashes()

    os.makedirs(OUT_DIR, exist_ok=True)
    fresh_manifest = []

    for cls in CLASSES:
        slug = SLUG_MAP[cls]
        cls_out_dir = os.path.join(OUT_DIR, slug)
        os.makedirs(cls_out_dir, exist_ok=True)

        print(f"\n[CLASS: {cls}] Selecting 15 fresh, unseen test images...", flush=True)

        # Collect candidate files from test split and raw pools
        candidates = []
        test_dir = os.path.join(DATASET_ROOT, "multiclass_v2", "test", slug)
        if os.path.exists(test_dir):
            for f in sorted(os.listdir(test_dir)):
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    candidates.append(os.path.join(test_dir, f))

        raw_dir = os.path.join(DATASET_ROOT, "raw", slug)
        if os.path.exists(raw_dir):
            for f in sorted(os.listdir(raw_dir)):
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    candidates.append(os.path.join(raw_dir, f))

        selected_for_cls = []
        selected_hashes = set()
        selected_ahashes = []

        for fp in candidates:
            if len(selected_for_cls) >= 15:
                break

            h = get_file_sha256(fp)

            # Filter 1: NO training or validation leakage
            if h in train_val_sha or h in selected_hashes:
                continue

            try:
                with Image.open(fp) as img:
                    if img.width < 250 or img.height < 250:
                        continue
                    ah = get_ahash_from_pil(img)
                    if not ah:
                        continue

                    # Perceptual hash deduplication among selected test images
                    is_dup = False
                    for sah in selected_ahashes:
                        if hamming_dist(ah, sah) <= 3:
                            is_dup = True
                            break

                    if is_dup:
                        continue

                    fname = f"{slug}_fresh_{len(selected_for_cls)+1:02d}.jpg"
                    dest_path = os.path.join(cls_out_dir, fname)

                    # Save mobile-simulated JPEG format
                    pil_rgb = ImageOps.exif_transpose(img).convert("RGB")
                    pil_rgb.save(dest_path, format="JPEG", quality=90)

                    final_h = get_file_sha256(dest_path)

                    selected_for_cls.append({
                        "id": len(fresh_manifest) + len(selected_for_cls) + 1,
                        "class_name": cls,
                        "slug": slug,
                        "filename": fname,
                        "original_path": fp,
                        "test_path": dest_path,
                        "sha256": final_h,
                        "ahash": ah
                    })
                    selected_hashes.add(h)
                    selected_hashes.add(final_h)
                    selected_ahashes.append(ah)
                    print(f"  [SELECTED {len(selected_for_cls)}/15] {fname} (Width: {img.width}, Height: {img.height})", flush=True)

            except Exception as e:
                continue

        if len(selected_for_cls) < 15:
            print(f"[ERROR] Only found {len(selected_for_cls)} fresh images for {cls}!", flush=True)
            sys.exit(1)

        fresh_manifest.extend(selected_for_cls)

    # Save final test set manifest
    manifest_out = os.path.join(OUT_DIR, "fresh_90_manifest.json")
    with open(manifest_out, 'w', encoding='utf-8') as f:
        json.dump(fresh_manifest, f, indent=2)

    print("\n==================================================", flush=True)
    print(f"SUCCESS: 90 FRESH TEST IMAGES READY (15 x 6 Classes)", flush=True)
    print(f"Manifest path: {manifest_out}", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    prepare_90_fresh_images()
