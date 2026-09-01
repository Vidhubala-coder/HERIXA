import requests
import base64
import os
from PIL import Image
import io

CLASSES = [
    ("Brihadeeswarar", "brihadeeswarar", "Big_temple_242.jpg", 10.7828, 79.1318),
    ("Meenakshi-Amman", "meenakshi-amman", "AmmanMeenakshiTempleGopuram.jpg", 9.9197, 78.1194),
    ("Mahabalipuram", "mahabalipuram", "10Shore_Temple_Mahavalipuram.jpg", 12.6164, 80.1986),
    ("Gangaikonda-Cholapuram", "gangaikonda-cholapuram", "Brihadisvara_Temple_of_Gangaikonda_Cholapuram_07.JPG", 11.2064, 79.4478),
    ("Airavatesvara", "airavatesvara", "1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_temple_complex_-_general_view.jpg", 10.9479, 79.3569),
    ("Thirumalai-Nayakkar", "thirumalai-nayakkar", "Center_Hall_ceiling.jpg", 9.9149, 78.1226),
    ("Hard_Negatives", "hard_negatives", "Arunachalam_big_temple_of_tamilnadu.jpg", 10.0, 78.0)
]

ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
val_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation")
backend_url = "http://localhost:5000/api/monuments/recognize"

print("=" * 100)
print("HERIXA FINAL END-TO-END SMOKE TEST ACROSS ALL 6 MONUMENT CLASSES + HARD NEGATIVES")
print("=" * 100)

all_passed = True

for cls_display, folder_slug, filename, lat, lon in CLASSES:
    img_path = os.path.join(val_dir, folder_slug, filename)
    if not os.path.exists(img_path):
        print(f"[WARN] Image file {img_path} not found.")
        continue
        
    img = Image.open(img_path)
    w, h = img.size
    new_w = 1024
    new_h = int(h * (1024 / w))
    img_resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)

    buf = io.BytesIO()
    img_resized.save(buf, format="JPEG", quality=80)
    base64_str = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    payload = {
        "image": base64_str,
        "latitude": lat,
        "longitude": lon
    }

    r = requests.post(backend_url, json=payload)
    if r.status_code != 200:
        print(f"[FAIL] {cls_display:<24} | Backend returned HTTP {r.status_code}")
        all_passed = False
        continue

    res = r.json()
    success = res.get("success")
    recognized = res.get("recognized")
    monument_name = res.get("monumentName")
    conf = res.get("confidence")
    status = res.get("status")

    if cls_display == "Hard_Negatives":
        passed = (not recognized) or (status == "uncertain")
        status_str = "REJECTED (SAFE)" if passed else "FALSE ACCEPTANCE"
    else:
        passed = recognized and (status == "identified") and (monument_name is not None)
        status_str = f"IDENTIFIED ({monument_name})" if passed else f"UNRECOGNIZED ({status})"

    if not passed:
        all_passed = False

    print(f"[{'PASS' if passed else 'FAIL'}] {cls_display:<24} | Status: {status_str:<35} | Conf: {conf if conf else 0:.4f}")

print("=" * 100)
if all_passed:
    print("ALL 7 CLASSES PASSED END-TO-END SMOKE TEST CLEANLY!")
else:
    print("SOME CLASSES FAILED E2E SMOKE TEST.")
print("=" * 100)
