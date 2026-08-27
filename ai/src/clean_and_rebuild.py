import os
import sys
import json
import shutil
from PIL import Image

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, save_json

HARD_NEG_DIR = get_path("dataset", "hard_negatives")
METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")
QUARANTINE_DIR = get_path("dataset", "quarantine", "hard_negatives_corrupted")

def clean_and_quarantine_hard_negatives():
    print("Initializing hard-negative validation and quarantine...")
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    os.makedirs(RESULTS_DIR, exist_ok=True)
    
    corrupt_report = []
    corrupted_filenames = set()
    
    # 1. Scan primary hard negatives folder
    for f in os.listdir(HARD_NEG_DIR):
        path = os.path.join(HARD_NEG_DIR, f)
        if os.path.isdir(path):
            continue
            
        try:
            with Image.open(path) as img:
                img.verify()
        except Exception as e:
            print(f"Quarantining corrupted hard negative: {f}")
            dest_path = os.path.join(QUARANTINE_DIR, f)
            shutil.move(path, dest_path)
            
            corrupt_report.append({
                "filename": f,
                "original_path": path,
                "reason": str(e)
            })
            corrupted_filenames.add(f)
            
    # 2. Scan split directories for any residual corrupted copies (if split was run earlier)
    splits = ["train", "validation", "test"]
    for s in splits:
        split_hn_dir = get_path("dataset", s, "hard_negatives")
        if os.path.exists(split_hn_dir):
            for f in os.listdir(split_hn_dir):
                path = os.path.join(split_hn_dir, f)
                try:
                    with Image.open(path) as img:
                        img.verify()
                except Exception as e:
                    # Move to quarantine if not already there, else remove split copy
                    dest_path = os.path.join(QUARANTINE_DIR, f)
                    if not os.path.exists(dest_path):
                        shutil.move(path, dest_path)
                    else:
                        os.remove(path)
                        
                    if f not in corrupted_filenames:
                        corrupt_report.append({
                            "filename": f,
                            "original_path": path,
                            "reason": str(e)
                        })
                        corrupted_filenames.add(f)

    # 3. Save validation report
    report_path = os.path.join(RESULTS_DIR, "hard_negative_validation_report.json")
    save_json(corrupt_report, report_path)
    print(f"Quarantine report saved to: {report_path}")
    
    # 4. Filter metadata file to keep only valid entries
    metadata_file_path = os.path.join(METADATA_DIR, "hard_negatives_metadata.jsonl")
    valid_meta_entries = []
    
    if os.path.exists(metadata_file_path):
        with open(metadata_file_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    if item["local_filename"] not in corrupted_filenames:
                        valid_meta_entries.append(item)
                        
        # Write back filtered metadata
        with open(metadata_file_path, "w", encoding="utf-8") as f:
            for m in valid_meta_entries:
                f.write(json.dumps(m, ensure_ascii=False) + "\n")
                
    print(f"Metadata filtered. Remaining valid hard negatives in metadata: {len(valid_meta_entries)}")
    
    # 5. Rebuild the dataset split by calling split_brihadeeswarar.py
    print("Rebuilding dataset splits using only valid hard negatives...")
    from src import split_brihadeeswarar
    split_brihadeeswarar.main()

if __name__ == "__main__":
    clean_and_quarantine_hard_negatives()
