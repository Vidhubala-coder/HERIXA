import requests
import base64
import os
from PIL import Image
import io

ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
brih_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation", "brihadeeswarar")
img_files = sorted([f for f in os.listdir(brih_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])[10:13]

backend_url = "http://localhost:5000/api/monuments/recognize"

print("=" * 100)
print("SPECIAL BRIHADEESWARAR END-TO-END DATABASE MAPPING VERIFICATION (3 FRESH IMAGES)")
print("=" * 100)

for idx, fname in enumerate(img_files, 1):
    fpath = os.path.join(brih_dir, fname)
    img = Image.open(fpath)
    w, h = img.size
    new_w = 1024
    new_h = int(h * (1024 / w))
    img_resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    buf = io.BytesIO()
    img_resized.save(buf, format="JPEG", quality=80)
    base64_str = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    payload = {
        "image": base64_str,
        "latitude": 10.7828,
        "longitude": 79.1318
    }

    r = requests.post(backend_url, json=payload)
    res = r.json()
    
    print(f"[{idx}] Fresh Image: {fname}")
    print(f"    Backend Status Code: {r.status_code}")
    print(f"    Success:             {res.get('success')}")
    print(f"    Status:              {res.get('status')}")
    print(f"    Recognized:          {res.get('recognized')}")
    print(f"    Monument Name:       {res.get('monumentName')}")
    print(f"    Confidence:          {res.get('confidence')}")
    print("-" * 100)
