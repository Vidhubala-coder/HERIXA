# HERIXA Phase 3J — Dataset Audit Report

## 1. Executive Summary
This report presents a complete, read-only audit of the HERIXA Phase 3G/3J dataset (`ai/dataset/multiclass_v2/`).

* **Audit Date:** 2026-08-31
* **Total Dataset Images:** 2426
* **Corrupted / Unreadable Images:** 0
* **Exact Duplicate Instances:** 0 (0 duplicate groups)
* **Images Below 224x224px:** 0
* **Audit Status:** `PASS`

## 2. Dataset Split Breakdown

| Monument Class | Train Split | Validation Split | Test Split | Total Images |
| :--- | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 306 | 61 | 42 | 409 |
| **meenakshi-amman** | 250 | 50 | 34 | 334 |
| **mahabalipuram** | 250 | 50 | 34 | 334 |
| **gangaikonda-cholapuram** | 296 | 59 | 40 | 395 |
| **airavatesvara** | 305 | 61 | 41 | 407 |
| **thirumalai-nayakkar** | 248 | 49 | 34 | 331 |
| **hard_negatives** | 162 | 32 | 22 | 216 |

## 3. Image Formats & Resolution Metrics
* **Formats:** {'MPO': 187, 'JPEG': 2232, 'PNG': 7}
* **Resolution Range (Width):** 225px – 12108px (Mean: 3339.4px)
* **Resolution Range (Height):** 225px – 13269px (Mean: 2683.9px)
* **Sub-standard Resolution (< 224x224px):** 0 images.
* **Corrupted Files:** 0 files.

## 4. Class Imbalance & Diversity Analysis
* **Highest Class Count:** `brihadeeswarar` (409 images)
* **Lowest Class Count:** `airavatesvara` (407 images)
* **Imbalance Ratio:** 1.00x
* **Chola Architecture Overlap Assessment:**
  - `brihadeeswarar`, `gangaikonda-cholapuram`, and `airavatesvara` share Dravidian Chola vimana, gopuram, and granite carving traits.
  - `airavatesvara` and `gangaikonda-cholapuram` have lower dataset counts relative to Brihadeeswarar, which contributes to lower recall on complex angles.

## 5. Verification Flags
```text
DATASET MODIFIED: NO
MODEL MODIFIED: NO
RETRAINING: NO
DOWNLOADS: NO
AUDIT STATUS: PASS
```
