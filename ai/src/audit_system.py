import os
import sys
import json
import time
import requests
import numpy as np
import onnxruntime
from PIL import Image, ImageOps

CLASSES = [
    "Brihadeeswarar",
    "Meenakshi-Amman",
    "Mahabalipuram",
    "Gangaikonda-Cholapuram",
    "Airavatesvara",
    "Thirumalai-Nayakkar",
    "Hard_Negatives"
]

EXPECTED_SLUGS = {
    "Brihadeeswarar": "brihadeeswarar",
    "Meenakshi-Amman": "meenakshi-amman",
    "Mahabalipuram": "mahabalipuram",
    "Gangaikonda-Cholapuram": "gangaikonda-cholapuram",
    "Airavatesvara": "airavatesvara",
    "Thirumalai-Nayakkar": "thirumalai-nayakkar"
}

def audit_database():
    print("=" * 80)
    print("1. DATABASE INTEGRITY AUDIT")
    print("=" * 80)
    try:
        r = requests.get("http://localhost:5000/api/monuments")
        if r.status_code != 200:
            print(f"[FAIL] Backend API returned HTTP status {r.status_code}")
            return False
            
        res = r.json()
        monuments = res.get("data", [])
        print(f"Total Monuments retrieved from MongoDB: {len(monuments)}")
        
        db_slugs = {m.get("slug"): m for m in monuments}
        
        all_passed = True
        for cls_name, expected_slug in EXPECTED_SLUGS.items():
            if expected_slug in db_slugs:
                m = db_slugs[expected_slug]
                print(f"[PASS] Class '{cls_name}' -> Slug '{expected_slug}' EXISTS.")
                print(f"       Name: {m.get('name')}")
                print(f"       Coords: ({m.get('latitude')}, {m.get('longitude')})")
                print(f"       Has Description: {bool(m.get('description'))}, Has Images: {len(m.get('images', []))}")
            else:
                print(f"[FAIL] Class '{cls_name}' -> Slug '{expected_slug}' MISSING IN DATABASE!")
                all_passed = False
                
        return all_passed
    except Exception as e:
        print(f"[FAIL] Error querying backend database: {e}")
        return False

def audit_models():
    print("\n" + "=" * 80)
    print("2. MODEL INTEGRITY AUDIT")
    print("=" * 80)
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    g_path = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    l_path = os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")

    for name, path in [("Phase 3G ONNX", g_path), ("Phase 3L ONNX", l_path)]:
        if not os.path.exists(path):
            print(f"[FAIL] {name} missing at {path}")
            continue
            
        size = os.path.getsize(path)
        try:
            sess = onnxruntime.InferenceSession(path, providers=["CPUExecutionProvider"])
            inp = sess.get_inputs()[0]
            outp = sess.get_outputs()[0]
            print(f"[PASS] {name} loaded cleanly ({size:,} bytes).")
            print(f"       Input Name: '{inp.name}', Shape: {inp.shape}, Type: {inp.type}")
            print(f"       Output Name: '{outp.name}', Shape: {outp.shape}, Type: {outp.type}")
        except Exception as e:
            print(f"[FAIL] {name} corrupted or failed to load: {e}")

def main():
    audit_database()
    audit_models()

if __name__ == "__main__":
    main()
