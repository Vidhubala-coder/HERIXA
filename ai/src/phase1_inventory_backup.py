import os
import hashlib
import shutil
import time
import json

def get_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192 * 1024):
            h.update(chunk)
    return h.hexdigest()

def main():
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    backup_dir = os.path.join(ai_root, "models", "backups", f"backup_{int(time.time())}")
    os.makedirs(backup_dir, exist_ok=True)

    artifacts = [
        ("Phase 3G ONNX", os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")),
        ("Phase 3L ONNX", os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")),
        ("Phase 3G PyTorch Checkpoint", os.path.join(ai_root, "models", "best_model_multiclass.pth")),
        ("Phase 3L PyTorch Checkpoint", os.path.join(ai_root, "models", "phase3l", "checkpoints", "best_model_phase3l.pth")),
        ("Recognition Config", os.path.join(ai_root, "models", "integration", "recognition_config.json"))
    ]

    print("=" * 100)
    print("PHASE 1 & 2: INVENTORY & SAFE TIMESTAMPED BACKUP WITH SHA256 HASHES")
    print("=" * 100)

    manifest = []

    for name, path in artifacts:
        if os.path.exists(path):
            size = os.path.getsize(path)
            sha256 = get_sha256(path)
            dest = os.path.join(backup_dir, os.path.basename(path))
            shutil.copy2(path, dest)
            print(f"[BACKUP OK] {name:<28} | Size: {size:>10,} bytes | SHA256: {sha256[:16]}... | Backup: {dest}")
            manifest.append({
                "name": name,
                "path": path,
                "backup_path": dest,
                "size_bytes": size,
                "sha256": sha256
            })
        else:
            print(f"[MISSING]   {name:<28} | Path not found: {path}")

    with open(os.path.join(backup_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("-" * 100)
    print(f"Manifest written to: {os.path.join(backup_dir, 'manifest.json')}")
    print("=" * 100)

if __name__ == "__main__":
    main()
