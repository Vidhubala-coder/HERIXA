import os
import sys
import json
import hashlib
import requests
import time

AI_ROOT = r"C:\Users\LENOVO\Desktop\AR model\ai"
MANIFEST_PATH = os.path.join(AI_ROOT, "dataset", "multiclass_v2", "dataset_manifest.json")

def get_known_sha():
    known = set()
    if os.path.exists(MANIFEST_PATH):
        with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for item in data.get('images', []):
                if 'sha256' in item:
                    known.add(item['sha256'])
    print(f"Loaded {len(known)} known SHA256 hashes from manifest.")
    return known

SEARCH_CONFIG = {
    "Brihadeeswarar": [
        "Thanjavur Big Temple gopuram",
        "Peruvudaiyar Kovil Thanjavur",
        "Thanjavur temple Chola",
        "Brihadisvara Thanjavur 2023",
        "Brihadisvara 2024"
    ],
    "Meenakshi-Amman": [
        "Madurai Meenakshi Kovil gopuram",
        "Meenakshi Sundareswarar Temple",
        "Madurai temple tank Golden Lotus",
        "Meenakshi Amman Madurai 2023"
    ],
    "Mahabalipuram": [
        "Shore Temple Mamallapuram",
        "Mahabalipuram Pancha Rathas",
        "Mahabalipuram granite temple",
        "Mamallapuram UNESCO 2023"
    ],
    "Gangaikonda-Cholapuram": [
        "Gangaikondacholapuram sanctum",
        "Rajendra Chola temple vimana",
        "Gangaikonda Chola Kovil",
        "Gangaikonda Cholapuram 2023"
    ],
    "Airavatesvara": [
        "Darasuram temple stone chariot",
        "Airavatesvara Kovil Kumbakonam",
        "Darasuram Chola carvings",
        "Airavatesvara Darasuram 2023"
    ],
    "Thirumalai-Nayakkar": [
        "Thirumalai Nayakkar Mahal court",
        "Madurai Nayakkar Palace pillars",
        "Thirumalai Nayakkar hall",
        "Thirumalai Nayakkar Palace 2023"
    ]
}

def main():
    known_sha = get_known_sha()
    headers = {'User-Agent': 'HerixaValidationApp/1.0 (academic; thangarajvidhubala@gmail.com)'}

    for cls, queries in SEARCH_CONFIG.items():
        print(f"\n--- Class: {cls} ---")
        fresh_found = []
        for q in queries:
            if len(fresh_found) >= 15:
                break
            url = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch={requests.utils.quote(q)}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url|mime|size"
            try:
                r = requests.get(url, headers=headers, timeout=10)
                if r.status_code != 200: continue
                res = r.json()
                pages = res.get('query', {}).get('pages', {})
                for p in pages.values():
                    if len(fresh_found) >= 15: break
                    iinfo = p.get('imageinfo', [])
                    if not iinfo: continue
                    iurl = iinfo[0].get('url')
                    size = iinfo[0].get('size', 0)
                    if not iurl or size < 50000: continue

                    time.sleep(0.1)
                    img_resp = requests.get(iurl, headers=headers, timeout=10)
                    if img_resp.status_code == 200:
                        sha = hashlib.sha256(img_resp.content).hexdigest()
                        if sha not in known_sha and sha not in fresh_found:
                            fresh_found.append(sha)
                            print(f"  [FRESH UNSEEN IMAGE {len(fresh_found)}/15] {p.get('title')} ({size} bytes)")
            except Exception as e:
                print("  Query error:", e)

        print(f"Total fresh images for {cls}: {len(fresh_found)} / 15")

if __name__ == "__main__":
    main()
