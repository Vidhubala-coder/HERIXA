import os
import sys
import json
import shutil
import logging
from PIL import Image

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger

RAW_DIR = get_path("dataset", "raw")
CLEANED_DIR = get_path("dataset", "cleaned")
QUARANTINE_DIR = get_path("dataset", "quarantine")
METADATA_DIR = get_path("dataset", "metadata")
LOG_FILE = get_path("results", "validation.log")

logger = setup_logger("validate_dataset", log_file=LOG_FILE)

# Heuristic list of words indicating irrelevant images (maps, posters, floorplans)
IRRELEVANT_KEYWORDS = [
    "map", "floorplan", "floor_plan", "sketch", "diagram", "plan",
    "drawing", "poster", "text", "coin", "ticket", "stamp", "document",
    "inscription_rubbing", "rubbing", "architectural_drawing", "blueprint"
]

def check_license_validity(license_name: str, usage_terms: str) -> (bool, str):
    """
    Checks if the license and usage terms allow reuse.
    Wikimedia Commons images are generally reusable under CC, GFDL, PD.
    If license details are completely missing or specify forbidden terms, return False.
    """
    lic = str(license_name).lower()
    terms = str(usage_terms).lower()
    
    if not lic and not terms:
        return False, "Missing license and usage terms metadata"
        
    # Standard acceptable licenses on Commons
    acceptable_patterns = [
        "cc", "creative commons", "pd", "public domain", "gfdl", "copyrighted free use",
        "attribution", "share alike", "sharealike", "gpl", "lgpl", "bsd", "mit", "cc0"
    ]
    
    combined = f"{lic} {terms}"
    
    # Check if there is any indication of an acceptable open-source or free license
    has_acceptable = any(p in combined for p in acceptable_patterns)
    
    # Restricted terms (some non-commercial licenses might be on Commons, though rare and usually allowed for educational use. 
    # But if we can't identify a clean reuse term, we flag it.)
    if not has_acceptable:
        return False, f"Unknown reuse license terms: license='{license_name}', terms='{usage_terms}'"
        
    return True, ""

def validate_image_file(file_path: str, meta: dict) -> (bool, str):
    """
    Validates a single image file for corruption, resolution, format, and content anomalies.
    """
    # 1. Format/Extension check
    ext = os.path.splitext(file_path.lower())[1]
    if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff']:
        return False, f"Unsupported file extension: {ext}"
        
    # 2. Check for irrelevant keywords in filename
    filename_lower = os.path.basename(file_path).lower()
    for kw in IRRELEVANT_KEYWORDS:
        if kw in filename_lower:
            return False, f"Filename contains irrelevant keyword: '{kw}' (possible map, plan, diagram, or document)"
            
    # 3. Size check on disk
    try:
        file_size = os.path.getsize(file_path)
        if file_size < 5120:  # < 5 KB
            return False, f"File size too small ({file_size} bytes). Likely corrupted or thumbnail."
    except Exception as e:
        return False, f"Cannot read file size: {e}"
        
    # 4. Image reading validation (Pillow)
    try:
        with Image.open(file_path) as img:
            img.verify()  # Verifies the file contents (doesn't load pixel data)
    except Exception as e:
        return False, f"Image corruption check failed: {e}"
        
    # 5. Image dimensions & blank check
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            
            # Check minimum resolution
            if width < 224 or height < 224:
                return False, f"Resolution too low ({width}x{height}). Minimum is 224x224."
                
            # Check if image is blank (extremely low pixel variance)
            # Load small grayscale version to compute standard deviation
            gray_img = img.convert("L").resize((32, 32))
            pixels = list(gray_img.getdata())
            std_dev = np.std(pixels) if 'np' in globals() or 'numpy' in sys.modules else (max(pixels) - min(pixels))
            
            if std_dev < 2:  # extremely uniform, likely blank/monochromatic
                return False, "Image appears to be blank or monochromatic"
                
            # Update width and height in meta if missing
            meta["width"] = width
            meta["height"] = height
    except Exception as e:
        return False, f"Image loading/pixel validation failed: {e}"
        
    # 6. License validity
    license_ok, license_reason = check_license_validity(meta.get("license", ""), meta.get("usage_terms", ""))
    if not license_ok:
        return False, license_reason
        
    return True, ""

def run_validation():
    """Reads raw metadata, runs checks, and splits images into cleaned or quarantined folders."""
    logger.info("Starting dataset validation...")
    
    raw_meta_path = os.path.join(METADATA_DIR, "raw_metadata.jsonl")
    cleaned_meta_path = os.path.join(METADATA_DIR, "cleaned_metadata.jsonl")
    
    if not os.path.exists(raw_meta_path):
        logger.error(f"Raw metadata file not found at {raw_meta_path}. Run collection first.")
        return
        
    # Remove existing outputs for clean start
    if os.path.exists(CLEANED_DIR):
        shutil.rmtree(CLEANED_DIR)
    if os.path.exists(QUARANTINE_DIR):
        shutil.rmtree(QUARANTINE_DIR)
        
    os.makedirs(CLEANED_DIR, exist_ok=True)
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    
    cleaned_count = 0
    quarantined_count = 0
    
    with open(raw_meta_path, "r", encoding="utf-8") as raw_file, \
         open(cleaned_meta_path, "w", encoding="utf-8") as clean_file:
         
        for line in raw_file:
            if not line.strip():
                continue
                
            meta = json.loads(line)
            class_slug = meta["class"]
            local_filename = meta["local_filename"]
            
            raw_image_path = os.path.join(RAW_DIR, class_slug, local_filename)
            
            if not os.path.exists(raw_image_path):
                logger.warning(f"Raw image file missing: {raw_image_path}")
                continue
                
            # Validate
            is_valid, reason = validate_image_file(raw_image_path, meta)
            
            if is_valid:
                # Copy to cleaned
                dest_dir = os.path.join(CLEANED_DIR, class_slug)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, local_filename)
                shutil.copy2(raw_image_path, dest_path)
                
                # Update relative path
                meta["relative_path"] = os.path.join("dataset", "cleaned", class_slug, local_filename).replace("\\", "/")
                
                clean_file.write(json.dumps(meta, ensure_ascii=False) + "\n")
                cleaned_count += 1
            else:
                # Copy to quarantine
                dest_dir = os.path.join(QUARANTINE_DIR, class_slug)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, local_filename)
                shutil.copy2(raw_image_path, dest_path)
                
                # Save quarantine reason
                reason_path = dest_path + ".reason.json"
                with open(reason_path, "w", encoding="utf-8") as reason_file:
                    json.dump({
                        "filename": local_filename,
                        "class": class_slug,
                        "rejection_reason": reason,
                        "wikimedia_url": meta.get("file_page_url", ""),
                        "license": meta.get("license", ""),
                        "usage_terms": meta.get("usage_terms", "")
                    }, reason_file, indent=2)
                    
                quarantined_count += 1
                logger.info(f"Quarantined {local_filename} for class {class_slug}: {reason}")
                
    logger.info(f"Dataset validation completed. Cleaned: {cleaned_count}, Quarantined: {quarantined_count}")

if __name__ == "__main__":
    import numpy as np  # Ensure numpy is imported if run as script
    run_validation()
