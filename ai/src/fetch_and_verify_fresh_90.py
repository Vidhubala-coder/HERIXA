import os
import sys
import json
import hashlib
import requests
from PIL import Image, ImageOps
import io

AI_ROOT = r"C:\Users\LENOVO\Desktop\AR model\ai"
MANIFEST_PATH = os.path.join(AI_ROOT, "dataset", "multiclass_v2", "dataset_manifest.json")
DATASET_ROOT = os.path.join(AI_ROOT, "dataset")
OUT_DIR = os.path.join(DATASET_ROOT, "fresh_mobile_90_test")

CLASSES = [
    "Brihadeeswarar",
    "Meenakshi-Amman",
    "Mahabalipuram",
    "Gangaikonda-Cholapuram",
    "Airavatesvara",
    "Thirumalai-Nayakkar"
]

SEARCH_QUERIES = {
    "Brihadeeswarar": "Brihadisvara Temple Thanjavur",
    "Meenakshi-Amman": "Meenakshi Amman Temple Madurai",
    "Mahabalipuram": "Shore Temple Mahabalipuram",
    "Gangaikonda-Cholapuram": "Gangaikonda Cholapuram Temple",
    "Airavatesvara": "Airavatesvara Temple Darasuram",
    "Thirumalai-Nayakkar": "Thirumalai Nayakkar Palace Madurai"
}

SLUG_MAP = {
    "Brihadeeswarar": "brihadeeswarar",
    "Meenakshi-Amman": "meenakshi-amman",
    "Mahabalipuram": "mahabalipuram",
    "Gangaikonda-Cholapuram": "gangaikonda-cholapuram",
    "Airavatesvara": "airavatesvara",
    "Thirumalai-Nayakkar": "thirumalai-nayakkar"
}

def get_bytes_sha256(b_data):
    return hashlib.sha256(b_data).hexdigest()

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

def build_known_database():
    known_sha = set()
    print("[SHIELD] Loading SHA256 hashes from dataset manifest...", flush=True)

    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            mdata = json.load(f)
            for img_info in mdata.get("images", []):
                if "sha256" in img_info:
                    known_sha.add(img_info["sha256"])

    print(f"[SHIELD COMPLETE] Indexed dataset manifest. Unique SHA256 Count: {len(known_sha)}", flush=True)
    return known_sha

def fetch_wikimedia_images(query, limit=70):
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        'action': 'query',
        'format': 'json',
        'generator': 'search',
        'gsrsearch': query,
        'gsrnamespace': 6,
        'gsrlimit': limit,
        'prop': 'imageinfo',
        'iiprop': 'url|mime|size'
    }
    headers = {'User-Agent': 'HERIXA-FreshValidation/1.0 (academic; heritage-research)'}
    try:
        r = requests.get(url, params=params, headers=headers, timeout=15)
        if r.status_code == 200:
            res = r.json()
            pages = res.get('query', {}).get('pages', {})
            urls = []
            for p_id, p_info in pages.items():
                iinfo = p_info.get('imageinfo', [])
                if iinfo and len(iinfo) > 0:
                    img_url = iinfo[0].get('url')
                    mime = iinfo[0].get('mime', '')
                    size = iinfo[0].get('size', 0)
                    if img_url and 'image' in mime and size > 50000:
                        urls.append((img_url, p_info.get('title', '')))
            return urls
    except Exception as e:
        print(f"[WARN] Wikimedia query failed for '{query}': {e}", flush=True)
    return []

def main():
    known_sha = build_known_database()

    os.makedirs(OUT_DIR, exist_ok=True)
    final_manifest = []

    for cls in CLASSES:
        slug = SLUG_MAP[cls]
        query = SEARCH_QUERIES[cls]
        cls_out_dir = os.path.join(OUT_DIR, slug)
        os.makedirs(cls_out_dir, exist_ok=True)

        print(f"\n==================================================", flush=True)
        print(f"FETCHING & VERIFYING 15 FRESH IMAGES: {cls}", flush=True)
        print(f"==================================================", flush=True)

        urls = fetch_wikimedia_images(query, limit=70)
        print(f"Found {len(urls)} candidate URLs from Wikimedia for '{query}'.", flush=True)

        selected_count = 0
        cls_selected_hashes = set()
        cls_selected_ahashes = []

        headers = {'User-Agent': 'HERIXA-FreshValidation/1.0 (academic; heritage-research)'}

        for img_url, title in urls:
            if selected_count >= 15:
                break
            try:
                r = requests.get(img_url, headers=headers, timeout=12)
                if r.status_code != 200:
                    continue

                b_data = r.content
                sha = get_bytes_sha256(b_data)

                # Filter 1: SHA256 match against training/val/test dataset
                if sha in known_sha or sha in cls_selected_hashes:
                    print(f"  [REJECT - SHA256 LEAK] {title[:30]}...", flush=True)
                    continue

                # Filter 2: Image decoding and perceptual hashing
                pil_img = Image.open(io.BytesIO(b_data))
                if pil_img.width < 300 or pil_img.height < 300:
                    continue

                ah = get_ahash_from_pil(pil_img)
                if not ah:
                    continue

                # Filter 3: Perceptual duplicate check against currently selected set
                is_p_leak = False
                for fah in cls_selected_ahashes:
                    if hamming_dist(ah, fah) <= 3:
                        is_p_leak = True
                        break

                if is_p_leak:
                    continue

                # Accept fresh image!
                selected_count += 1
                fname = f"{slug}_fresh_{selected_count:02d}.jpg"
                dest_path = os.path.join(cls_out_dir, fname)

                # Save as clean RGB JPEG
                pil_rgb = ImageOps.exif_transpose(pil_img).convert('RGB')
                pil_rgb.save(dest_path, format="JPEG", quality=92)

                final_sha = get_file_sha256(dest_path)

                final_manifest.append({
                    "id": len(final_manifest) + 1,
                    "class": cls,
                    "slug": slug,
                    "filename": fname,
                    "local_path": dest_path,
                    "sha256": final_sha,
                    "source_title": title,
                    "source_url": img_url
                })

                cls_selected_hashes.add(sha)
                cls_selected_hashes.add(final_sha)
                cls_selected_ahashes.append(ah)

                print(f"  [ACCEPTED {selected_count}/15] {fname} ({pil_img.width}x{pil_img.height})", flush=True)

            except Exception as err:
                continue

        if selected_count < 15:
            print(f"[ERROR] Failed to obtain 15 fresh images for {cls}. Got {selected_count}.", flush=True)
            sys.exit(1)

    # Save manifest
    m_path = os.path.join(OUT_DIR, "fresh_90_manifest.json")
    with open(m_path, 'w', encoding='utf-8') as f:
        json.dump(final_manifest, f, indent=2)

    print("\n==================================================", flush=True)
    print(f"FRESH TEST SET PREPARATION COMPLETE: 90/90 IMAGES", flush=True)
    print(f"Manifest written to: {m_path}", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    main()
