import os
import sys
import json
import hashlib
import urllib.request

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192 * 1024):
            h.update(chunk)
    return h.hexdigest()

def http_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=3) as resp:
        return resp.status, resp.read().decode('utf-8')

def main():
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    backend_root = r"C:\Users\LENOVO\Desktop\AR model\backend"

    print("=" * 100)
    print("HERIXA COMPLETE READ-ONLY END-TO-END SYSTEM AUDIT")
    print("=" * 100)

    # 1. Model Artifact Integrity Check
    artifacts = [
        ("Phase 3G ONNX", os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")),
        ("Phase 3L ONNX", os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")),
        ("Phase 3G PyTorch Checkpoint", os.path.join(ai_root, "models", "best_model_multiclass.pth")),
        ("Phase 3L PyTorch Checkpoint", os.path.join(ai_root, "models", "phase3l", "checkpoints", "best_model_phase3l.pth"))
    ]

    print("\n--- 11. MODEL ARTIFACT INTEGRITY CHECK ---")
    for name, path in artifacts:
        if os.path.exists(path):
            size = os.path.getsize(path)
            sha256 = get_sha256(path)
            print(f"  [OK] {name:<28} | Size: {size:>10,} bytes | SHA256: {sha256}")
        else:
            print(f"  [FAIL] {name:<28} | Missing file: {path}")

    # 2. FastAPI Service Audit
    print("\n--- 4. FASTAPI SERVICE HEALTH & CONFIG AUDIT ---")
    try:
        code, body = http_get("http://127.0.0.1:8001/health")
        print(f"  FastAPI /health Status: {code} -> {body}")
        code, body = http_get("http://127.0.0.1:8001/model_info")
        print(f"  FastAPI /model_info Status: {code} -> {body}")
    except Exception as e:
        print(f"  [WARNING/FAIL] FastAPI Service Unreachable: {e}")

    # 3. Backend Health Check
    print("\n--- 2. EXPRESS BACKEND SERVICE AUDIT ---")
    try:
        code, body = http_get("http://localhost:5000/api/health")
        print(f"  Backend /api/health Status: {code} -> {body[:100]}")
    except Exception as e:
        print(f"  [WARNING/FAIL] Backend Unreachable: {e}")

    # 4. Read seed.ts to inspect static MongoDB monument definitions
    print("\n--- 3. MONGODB DATABASE AUDIT (SEED INSPECTION) ---")
    seed_path = os.path.join(backend_root, "src", "utils", "seed.ts")
    if os.path.exists(seed_path):
        with open(seed_path, "r", encoding="utf-8") as f:
            content = f.read()
        required_slugs = ["brihadeeswarar", "meenakshi-amman", "mahabalipuram", "gangaikonda-cholapuram", "airavatesvara", "thirumalai-nayakkar"]
        for slug in required_slugs:
            if f"slug: '{slug}'" in content or f'slug: "{slug}"' in content:
                print(f"  [OK] Slug '{slug}' found in seed.ts definitions.")
            else:
                print(f"  [FAIL] Slug '{slug}' missing from seed.ts definitions.")
    else:
        print(f"  [FAIL] seed.ts not found at {seed_path}")

if __name__ == "__main__":
    main()
