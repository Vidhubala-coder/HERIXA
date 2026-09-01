import os
from PIL import Image

val_dir = r"C:\Users\LENOVO\Desktop\AR model\ai\dataset\multiclass_v2\validation"

print("=" * 80)
print("DATASET QUALITY & LABEL INTEGRITY AUDIT")
print("=" * 80)

for folder in os.listdir(val_dir):
    folder_path = os.path.join(val_dir, folder)
    if not os.path.isdir(folder_path):
        continue
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    print(f"\nFolder: '{folder}' (Total Images: {len(files)})")
    
    # Check for suspicious or mislabeled image names
    suspicious = [f for f in files if "flower" in f.lower() or "market" in f.lower() or "people" in f.lower() or "food" in f.lower()]
    if suspicious:
        print(f"  [SUSPICIOUS / NON-MONUMENT FILENAMES]: {suspicious}")
    else:
        print("  [OK] Filenames appear relevant.")

