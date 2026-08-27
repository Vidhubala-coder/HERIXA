import os
import sys
import json
import shutil
import hashlib
import logging
import re
from collections import Counter, defaultdict
from datetime import datetime
from PIL import Image

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

RAW_DIR = get_path("dataset", "raw")
CLEANED_DIR = get_path("dataset", "cleaned")
QUARANTINE_DIR = get_path("dataset", "quarantine")
METADATA_DIR = get_path("dataset", "metadata")
RESULTS_DIR = get_path("results")
HARD_NEGATIVES_DIR = get_path("dataset", "hard_negatives")
LOG_FILE = get_path("results", "phase2.log")

logger = setup_logger("run_phase2", log_file=LOG_FILE)

# Heuristic list of words indicating irrelevant images (maps, posters, floorplans)
IRRELEVANT_KEYWORDS = [
    "map", "floorplan", "floor_plan", "sketch", "diagram", "plan",
    "drawing", "poster", "text", "coin", "ticket", "stamp", "document",
    "inscription_rubbing", "rubbing", "architectural_drawing", "blueprint"
]

def check_license_validity(license_name: str, usage_terms: str) -> (bool, str):
    lic = str(license_name).lower()
    terms = str(usage_terms).lower()
    
    if not lic and not terms:
        return False, "Missing license and usage terms metadata"
        
    acceptable_patterns = [
        "cc", "creative commons", "pd", "public domain", "gfdl", "copyrighted free use",
        "attribution", "share alike", "sharealike", "gpl", "lgpl", "bsd", "mit", "cc0"
    ]
    
    combined = f"{lic} {terms}"
    has_acceptable = any(p in combined for p in acceptable_patterns)
    if not has_acceptable:
        return False, f"Unknown reuse license: license='{license_name}', terms='{usage_terms}'"
        
    return True, ""

def validate_image_file(file_path: str, meta: dict) -> (bool, str):
    # 1. Format/Extension check
    ext = os.path.splitext(file_path.lower())[1]
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        return False, f"Unsupported file extension: {ext}"
        
    # 2. Check for irrelevant keywords in filename
    filename_lower = os.path.basename(file_path).lower()
    for kw in IRRELEVANT_KEYWORDS:
        if kw in filename_lower:
            return False, f"Filename contains keyword: '{kw}'"
            
    # 3. Size check on disk
    try:
        file_size = os.path.getsize(file_path)
        if file_size < 5120:  # < 5 KB
            return False, f"File size too small ({file_size} bytes)"
    except Exception as e:
        return False, f"Cannot read file size: {e}"
        
    # 4. Image reading validation (Pillow)
    try:
        with Image.open(file_path) as img:
            img.verify()  # Check corruption
    except Exception as e:
        return False, f"Image corruption check failed: {e}"
        
    # 5. Image dimensions & blank check
    try:
        with Image.open(file_path) as img:
            width, height = img.size
            
            # Check minimum resolution
            if width < 224 or height < 224:
                return False, f"Resolution too low ({width}x{height})"
                
            # Check if image is blank (extremely low pixel variance)
            if file_size < 200 * 1024:
                gray_img = img.convert("L").resize((32, 32))
                pixels = list(gray_img.getdata())
                # Calculate standard deviation
                mean = sum(pixels) / len(pixels)
                variance = sum((x - mean) ** 2 for x in pixels) / len(pixels)
                std_dev = variance ** 0.5
                
                if std_dev < 2:  # extremely uniform
                    return False, "Image is blank or monochromatic"
                
            meta["width"] = width
            meta["height"] = height
    except Exception as e:
        return False, f"Image loading validation failed: {e}"
        
    # 6. License validity
    license_ok, license_reason = check_license_validity(meta.get("license", ""), meta.get("usage_terms", ""))
    if not license_ok:
        return False, license_reason
        
    return True, ""

def get_hamming_distance(h1_str: str, h2_str: str) -> int:
    if not h1_str or not h2_str or len(h1_str) != len(h2_str):
        return 999
    h1 = int(h1_str, 16)
    h2 = int(h2_str, 16)
    return bin(h1 ^ h2).count('1')

def run_phase2():
    logger.info("Executing Phase 2: Dataset Validation and Deduplication...")
    
    raw_meta_path = os.path.join(METADATA_DIR, "raw_metadata.jsonl")
    cleaned_meta_path = os.path.join(METADATA_DIR, "cleaned_metadata.jsonl")
    deduped_meta_path = os.path.join(METADATA_DIR, "deduped_metadata.jsonl")
    
    if not os.path.exists(raw_meta_path):
        logger.error(f"Raw metadata file missing: {raw_meta_path}")
        return
        
    # Clean output directories to ensure fresh state
    for d in [CLEANED_DIR, QUARANTINE_DIR, HARD_NEGATIVES_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)
        
    # Track statistics
    original_images_count = 0
    valid_count = 0
    rejected_count = 0
    
    rejections = []
    cleaned_records = []
    
    # --------------------------------------------------
    # PHASE 2A: Image Validation
    # --------------------------------------------------
    logger.info("Running Phase 2A: Image Validation...")
    
    with open(raw_meta_path, "r", encoding="utf-8") as raw_file:
        for line in raw_file:
            if not line.strip():
                continue
                
            meta = json.loads(line)
            class_slug = meta["class"]
            local_filename = meta["local_filename"]
            
            raw_image_path = os.path.join(RAW_DIR, class_slug, local_filename)
            original_images_count += 1
            
            if not os.path.exists(raw_image_path):
                logger.warning(f"Raw image file missing: {raw_image_path}")
                continue
                
            is_valid, reason = validate_image_file(raw_image_path, meta)
            
            if is_valid:
                # Copy to cleaned
                dest_dir = os.path.join(CLEANED_DIR, class_slug)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, local_filename)
                shutil.copy2(raw_image_path, dest_path)
                
                meta["relative_path"] = f"dataset/cleaned/{class_slug}/{local_filename}"
                cleaned_records.append(meta)
                valid_count += 1
            else:
                # Copy to quarantine
                dest_dir = os.path.join(QUARANTINE_DIR, class_slug)
                os.makedirs(dest_dir, exist_ok=True)
                dest_path = os.path.join(dest_dir, local_filename)
                shutil.copy2(raw_image_path, dest_path)
                
                rejections.append({
                    "filename": local_filename,
                    "original_class": class_slug,
                    "reason": reason,
                    "validation_status": "REJECTED"
                })
                rejected_count += 1
                
    # Save rejection_reason.json
    save_json(rejections, os.path.join(QUARANTINE_DIR, "rejection_reason.json"))
    
    # Write intermediate cleaned_metadata
    with open(cleaned_meta_path, "w", encoding="utf-8") as f:
        for r in cleaned_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    # --------------------------------------------------
    # PHASE 2B & 2C: Exact and Near-Duplicate Detection
    # --------------------------------------------------
    logger.info("Running Phase 2B & 2C: Deduplication...")
    import imagehash
    
    exact_duplicates = 0
    near_duplicates = 0
    
    exact_hashes = {}  # sha256 -> canonical filename
    class_hashes = defaultdict(list)  # class -> list of (record, phash, dhash)
    
    duplicate_groups = defaultdict(list)  # canonical filename -> list of duplicate filenames
    deduped_records = []
    seen_filenames = set()
    
    for record in cleaned_records:
        class_slug = record["class"]
        local_filename = record["local_filename"]
        
        # Avoid processing filename duplicates which represent the same file on disk
        local_filename_lower = local_filename.lower()
        if local_filename_lower in seen_filenames:
            exact_duplicates += 1
            duplicate_groups[local_filename].append(local_filename)
            rejections.append({
                "filename": local_filename,
                "original_class": class_slug,
                "reason": "Metadata filename collision (already kept canonical file)",
                "validation_status": "EXACT_DUPLICATE"
            })
            continue
        seen_filenames.add(local_filename_lower)
        
        cleaned_path = os.path.join(CLEANED_DIR, class_slug, local_filename)
        
        # 1. SHA-256 Exact Hash
        sha256 = hashlib.sha256()
        with open(cleaned_path, "rb") as f:
            for block in iter(lambda: f.read(4096), b""):
                sha256.update(block)
        sha_str = sha256.hexdigest()
        
        record["sha256"] = sha_str
        
        # 2. Perceptual hashes
        try:
            with Image.open(cleaned_path) as img:
                phash_str = str(imagehash.phash(img))
                dhash_str = str(imagehash.dhash(img))
        except Exception as e:
            logger.error(f"Perceptual hashing failed for {local_filename}: {e}")
            phash_str, dhash_str = "", ""
            
        record["phash"] = phash_str
        record["dhash"] = dhash_str
        
        # Exact duplicate check
        if sha_str in exact_hashes:
            canonical_file = exact_hashes[sha_str]
            duplicate_groups[canonical_file].append(local_filename)
            exact_duplicates += 1
            
            # Move to quarantine
            dest_dir = os.path.join(QUARANTINE_DIR, class_slug)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, local_filename)
            if os.path.exists(cleaned_path):
                shutil.move(cleaned_path, dest_path)
                
            rejections.append({
                "filename": local_filename,
                "original_class": class_slug,
                "reason": f"Exact SHA-256 duplicate of {canonical_file}",
                "validation_status": "EXACT_DUPLICATE"
            })
            continue
            
        exact_hashes[sha_str] = local_filename
        
        # Near duplicate check (per class)
        is_near_dup = False
        canonical_near_file = ""
        
        if phash_str and dhash_str:
            phash_obj = imagehash.hex_to_hash(phash_str)
            dhash_obj = imagehash.hex_to_hash(dhash_str)
            
            for prev_record, prev_phash_str, prev_dhash_str in class_hashes[class_slug]:
                prev_phash_obj = imagehash.hex_to_hash(prev_phash_str)
                prev_dhash_obj = imagehash.hex_to_hash(prev_dhash_str)
                
                # Check distances (threshold <= 4 for near-duplicates)
                p_dist = phash_obj - prev_phash_obj
                d_dist = dhash_obj - prev_dhash_obj
                
                if p_dist <= 4 and d_dist <= 4:
                    is_near_dup = True
                    canonical_near_file = prev_record["local_filename"]
                    break
                    
        if is_near_dup:
            duplicate_groups[canonical_near_file].append(local_filename)
            near_duplicates += 1
            
            # Move to quarantine
            dest_dir = os.path.join(QUARANTINE_DIR, class_slug)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, local_filename)
            if os.path.exists(cleaned_path):
                shutil.move(cleaned_path, dest_path)
                
            rejections.append({
                "filename": local_filename,
                "original_class": class_slug,
                "reason": f"Near-duplicate of {canonical_near_file}",
                "validation_status": "NEAR_DUPLICATE"
            })
        else:
            class_hashes[class_slug].append((record, phash_str, dhash_str))
            record["relative_path"] = f"dataset/cleaned/{class_slug}/{local_filename}"
            deduped_records.append(record)
            
    # Save updated rejection_reason.json
    save_json(rejections, os.path.join(QUARANTINE_DIR, "rejection_reason.json"))
    
    # Save deduped metadata
    with open(deduped_meta_path, "w", encoding="utf-8") as f:
        for r in deduped_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
            
    # Save duplicate_report.json
    duplicate_report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "exact_duplicate_count": exact_duplicates,
        "near_duplicate_count": near_duplicates,
        "retained_count": len(deduped_records),
        "quarantined_count": rejected_count + exact_duplicates + near_duplicates,
        "duplicate_groups": dict(duplicate_groups)
    }
    save_json(duplicate_report, os.path.join(RESULTS_DIR, "duplicate_report.json"))
    
    # --------------------------------------------------
    # PHASE 2F: Leakage Analysis
    # --------------------------------------------------
    logger.info("Running Phase 2F: Leakage Analysis...")
    
    # Leakage grouping: cluster together sequential images or very close perceptual matches (Hamming <= 10)
    leakage_groups = []
    visited_leakage = set()
    
    # Simple Union-Find for leakage grouping
    parent = list(range(len(deduped_records)))
    def find_parent(i):
        if parent[i] == i:
            return i
        parent[i] = find_parent(parent[i])
        return parent[i]
        
    def union_parent(i, j):
        root_i = find_parent(i)
        root_j = find_parent(j)
        if root_i != root_j:
            parent[root_i] = root_j
            
    # Group within same class
    for i in range(len(deduped_records)):
        rec_i = deduped_records[i]
        phash_i = rec_i.get("phash", "")
        author_i = rec_i.get("author", "")
        name_i = rec_i["local_filename"]
        
        for j in range(i + 1, len(deduped_records)):
            rec_j = deduped_records[j]
            if rec_i["class"] != rec_j["class"]:
                continue
                
            phash_j = rec_j.get("phash", "")
            author_j = rec_j.get("author", "")
            name_j = rec_j["local_filename"]
            
            # Check 1: Perceptual similarity (distance <= 10)
            is_leakage_hash = False
            if phash_i and phash_j:
                dist = get_hamming_distance(phash_i, phash_j)
                if dist <= 10:
                    is_leakage_hash = True
                    
            # Check 2: Sequential prefix and same author
            common_prefix = os.path.commonprefix([name_i, name_j])
            is_seq_leakage = (author_i and author_j and author_i == author_j and len(common_prefix) >= 12)
            
            if is_leakage_hash or is_seq_leakage:
                union_parent(i, j)
                
    grouped_leakage = defaultdict(list)
    for idx, r in enumerate(deduped_records):
        root = find_parent(idx)
        grouped_leakage[root].append(r["local_filename"])
        
    potential_leakage_groups = [g for g in grouped_leakage.values() if len(g) > 1]
    
    # --------------------------------------------------
    # PHASE 2D: Dataset Quality Analysis & Reports
    # --------------------------------------------------
    logger.info("Running Phase 2D: Quality Analysis...")
    
    final_class_counts = Counter(r["class"] for r in deduped_records)
    
    # Aspect ratio and resolution analysis
    resolution_distribution = Counter()
    aspect_ratios = []
    for r in deduped_records:
        w, h = r.get("width", 0), r.get("height", 0)
        resolution_distribution[f"{w}x{h}"] += 1
        
        # Calculate aspect ratio representation
        if h > 0:
            ratio = round(w / h, 2)
            aspect_ratios.append(ratio)
            
    aspect_ratio_counts = Counter(aspect_ratios)
    
    # Photographer dominance warning
    uploader_dist = defaultdict(int)
    class_uploader_dist = defaultdict(lambda: defaultdict(int))
    for r in deduped_records:
        author = r.get("author", "Unknown")
        c = r["class"]
        uploader_dist[author] += 1
        class_uploader_dist[c][author] += 1
        
    photographer_warnings = []
    for c, uploaders in class_uploader_dist.items():
        class_total = final_class_counts[c]
        if class_total > 0:
            top_uploader, top_count = max(uploaders.items(), key=lambda x: x[1])
            pct = (top_count / class_total) * 100
            if pct > 40.0 and top_uploader != "Unknown":
                photographer_warnings.append(
                    f"Class '{c}': Photographer '{top_uploader}' dominates {pct:.1f}% ({top_count}/{class_total} images)."
                )
                
    # Class Imbalance Analysis
    max_class_count = max(final_class_counts.values()) if final_class_counts else 0
    min_class_count = min(final_class_counts.values()) if final_class_counts else 0
    imbalance_ratio = max_class_count / min_class_count if min_class_count > 0 else 0
    
    # License & Source distributions
    final_license_dist = Counter(r.get("license", "Unknown") for r in deduped_records)
    final_source_dist = Counter(r.get("source_category", "Unknown") for r in deduped_records)
    
    # Recommendations based on metrics
    recommendations = []
    if min_class_count < 150:
        recommendations.append("Priority: Collect more images for underrepresented classes (under 150 images).")
    if imbalance_ratio > 1.5:
        recommendations.append(f"Balance: Class imbalance is high ({imbalance_ratio:.2f}). Collect data for classes with fewer images to balance.")
    if photographer_warnings:
        recommendations.append("Diversity: Some classes are dominated by single uploaders. Collect images from other photographers or source directories to ensure style diversity.")
    if not recommendations:
        recommendations.append("Dataset size and balance are optimal. Ready to proceed to training splits.")
        
    dataset_report_data = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "original_image_count": original_images_count,
        "valid_image_count": valid_count,
        "rejected_image_count": rejected_count,
        "exact_duplicate_count": exact_duplicates,
        "near_duplicate_count": near_duplicates,
        "final_usable_image_count": len(deduped_records),
        "class_distribution": dict(final_class_counts),
        "imbalance_ratio": round(imbalance_ratio, 2),
        "resolution_distribution": dict(resolution_distribution.most_common(10)),
        "aspect_ratio_distribution": {str(k): v for k, v in aspect_ratio_counts.most_common(5)},
        "photographer_distribution": dict(uploader_dist),
        "license_distribution": dict(final_license_dist),
        "source_distribution": dict(final_source_dist),
        "photographer_dominance_warnings": photographer_warnings,
        "potential_leakage_groups_count": len(potential_leakage_groups),
        "recommendations": recommendations
    }
    
    save_json(dataset_report_data, os.path.join(RESULTS_DIR, "dataset_report.json"))
    
    # Write dataset_report.txt
    txt_report_path = os.path.join(RESULTS_DIR, "dataset_report.txt")
    with open(txt_report_path, "w", encoding="utf-8") as f:
        f.write("==================================================\n")
        f.write("HERIXA MONUMENT DATASET QUALITY REPORT CARD\n")
        f.write("==================================================\n\n")
        f.write(f"Original Raw Image Count:    {original_images_count}\n")
        f.write(f"Valid Images:                {valid_count}\n")
        f.write(f"Rejected Validation Images:  {rejected_count}\n")
        f.write(f"Exact SHA-256 Duplicates:    {exact_duplicates}\n")
        f.write(f"Near-Duplicates Pruned:      {near_duplicates}\n")
        f.write(f"Final Usable Image Count:    {len(deduped_records)}\n\n")
        
        f.write("IMAGES PER MONUMENT CLASS:\n")
        for c, count in final_class_counts.items():
            f.write(f"  - {c:<30}: {count} images\n")
        f.write(f"  Class Imbalance Ratio:     {round(imbalance_ratio, 2)}\n\n")
        
        f.write("TOP SOURCE LICENSES:\n")
        for lic, count in final_license_dist.most_common(5):
            f.write(f"  - {lic:<30}: {count} images\n")
        f.write("\n")
        
        f.write("DATASET LEAKAGE ANALYSIS:\n")
        f.write(f"  - Potential Leakage Groups Found: {len(potential_leakage_groups)}\n")
        f.write("  - These groups represent bursts/sequences that must be grouped together during splits.\n\n")
        
        f.write("SOURCE DIVERSITY WARNINGS:\n")
        if photographer_warnings:
            for w in photographer_warnings:
                f.write(f"  [WARNING] {w}\n")
        else:
            f.write("  No photographer dominance detected.\n")
        f.write("\n")
        
        f.write("RECOMMENDATIONS:\n")
        for rec in recommendations:
            f.write(f"  - {rec}\n")
        f.write("\n==================================================\n")
        
    # --------------------------------------------------
    # HTML Review Sheet Generation
    # --------------------------------------------------
    logger.info("Generating review contact sheet HTML...")
    generate_review_html(deduped_records, rejections)
    
    # --------------------------------------------------
    # Final Output formatting
    # --------------------------------------------------
    print("\n==================================================")
    print("PHASE 2 WORKFLOW SUMMARY")
    print("==================================================")
    print(f"Original images: {original_images_count}")
    print(f"Valid images: {valid_count}")
    print(f"Rejected images: {rejected_count}")
    print(f"Exact duplicates: {exact_duplicates}")
    print(f"Near duplicates: {near_duplicates}")
    print(f"Final usable images: {len(deduped_records)}")
    print("")
    
    classes_ordered = [
        "brihadeeswarar", "meenakshi-amman", "mahabalipuram", 
        "airavatesvara", "gangaikonda-cholapuram", "thirumalai-nayakkar"
    ]
    for c in classes_ordered:
        display_name = c.replace("-", " ").title()
        print(f"{display_name}: {final_class_counts.get(c, 0)}")
        
    print("")
    # count hard negatives folder
    hn_count = 0
    if os.path.exists(HARD_NEGATIVES_DIR):
        hn_count = len([f for f in os.listdir(HARD_NEGATIVES_DIR) if os.path.isfile(os.path.join(HARD_NEGATIVES_DIR, f))])
    print(f"Hard negatives: {hn_count}")
    print(f"Potential leakage groups: {len(potential_leakage_groups)}")
    print("")
    
    # Determine overall quality
    overall_quality = "GOOD"
    if min_class_count < 100 or imbalance_ratio > 2.0 or len(photographer_warnings) > 1:
        overall_quality = "NEEDS REVIEW"
    if len(deduped_records) < 500:
        overall_quality = "POOR"
        
    print(f"Dataset quality: {overall_quality}")
    print("==================================================")

def generate_review_html(usable_records: list, rejected_records: list):
    html_path = os.path.join(RESULTS_DIR, "review_contact_sheet.html")
    
    # Group usable by class
    class_images = defaultdict(list)
    for r in usable_records:
        class_images[r["class"]].append(r)
        
    # Group rejected by class
    reject_images = defaultdict(list)
    for r in rejected_records:
        reject_images[r["original_class"]].append(r)
        
    html_content = """<!DOCTYPE html>
<html>
<head>
    <title>HERIXA Monument Dataset Quality Review</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #0d1117; color: #c9d1d9; }
        h1, h2, h3 { color: #58a6ff; }
        .section { margin-bottom: 40px; background: #161b22; padding: 20px; border-radius: 8px; border: 1px solid #30363d; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-top: 15px; }
        .card { border: 1px solid #30363d; border-radius: 6px; padding: 10px; background: #21262d; display: flex; flex-direction: column; }
        .card img { max-width: 100%; height: 160px; object-fit: cover; border-radius: 4px; background: #0d1117; }
        .card-info { margin-top: 8px; font-size: 11px; line-height: 1.4; word-break: break-all; color: #8b949e; }
        .badge { display: inline-block; padding: 2px 5px; border-radius: 3px; font-size: 10px; font-weight: bold; color: #fff; }
        .badge-usable { background-color: #238636; }
        .badge-reject { background-color: #da3633; }
        .rejection-reason { color: #f85149; font-weight: bold; margin-top: 5px; }
    </style>
</head>
<body>
    <h1>HERIXA Monument Dataset Quality Review Sheet</h1>
    <p>Review the final usable images and the quarantined/rejected images below.</p>
    
    <div class="section">
        <h2>Final Usable Images (Total: """ + str(len(usable_records)) + """ images)</h2>
    """
    
    for class_slug in sorted(class_images.keys()):
        items = class_images[class_slug]
        # Show a representative sample of up to 15 images per class to prevent loading thousands of images
        display_items = items[:15]
        html_content += f"<h3>Class: {class_slug.replace('-', ' ').title()} (Showing {len(display_items)} of {len(items)} images)</h3><div class='grid'>"
        for r in display_items:
            # Clean relative path for local browser viewing
            rel_img = f"../dataset/cleaned/{r['class']}/{r['local_filename']}"
            html_content += f"""
            <div class='card'>
                <img src='{rel_img}' alt='{r['local_filename']}'>
                <div class='card-info'>
                    <strong>{r['local_filename']}</strong><br>
                    Resolution: {r.get('width', 0)}x{r.get('height', 0)}<br>
                    License: {r.get('license', 'Unknown')}<br>
                    Uploader: {r.get('author', 'Unknown')}<br>
                    Status: <span class='badge badge-usable'>USABLE</span>
                </div>
            </div>
            """
        html_content += "</div>"
        
    html_content += f"""
    </div>
    
    <div class="section">
        <h2>Quarantined / Rejected Images (Total: {len(rejected_records)} images)</h2>
    """
    
    for class_slug in sorted(reject_images.keys()):
        items = reject_images[class_slug]
        # Show a sample of up to 15 rejected images per class
        display_items = items[:15]
        html_content += f"<h3>Class: {class_slug.replace('-', ' ').title()} (Showing {len(display_items)} of {len(items)} rejected)</h3><div class='grid'>"
        for q in display_items:
            rel_img = f"../dataset/quarantine/{q['original_class']}/{q['filename']}"
            html_content += f"""
            <div class='card'>
                <img src='{rel_img}' alt='{q['filename']}'>
                <div class='card-info'>
                    <strong>{q['filename']}</strong><br>
                    Reason: <span class='rejection-reason'>{q['reason']}</span><br>
                    Status: <span class='badge badge-reject'>{q['validation_status']}</span>
                </div>
            </div>
            """
        html_content += "</div>"
        
    html_content += """
    </div>
</body>
</html>
"""
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

if __name__ == "__main__":
    run_phase2()
