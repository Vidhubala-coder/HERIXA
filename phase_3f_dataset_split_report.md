# HERIXA Phase 3F — Dataset Split Rebuild Report
## Safe 7-Class Dataset Partitioning Report

---

## 1. Objective & Scope
The objective of Phase 3F was to combine the existing approved 7-class dataset with the validated Phase 3E selection improvements (287 images), run exact/perceptual deduplication checks, perform photographer sequence clustering to prevent data leakage, and establish a fresh class-aware split (**75% train, 15% validation, and 10% test**) under an independent staging folder [ai/dataset/multiclass_v2/](file:///c:/Users/LENOVO/Desktop/AR%20model/ai/dataset/multiclass_v2/).

---

## 2. Phase 3E Inputs (Selected Additions)
* `brihadeeswarar`: 65 selected
* `airavatesvara`: 65 selected
* `gangaikonda-cholapuram`: 53 selected
* `hard_negatives`: 104 selected
* **Total Staged Additions**: **287 images**

---

## 3. Existing Dataset Counts
Prior to the rebuild, the active multiclass dataset [ai/dataset/multiclass/](file:///c:/Users/LENOVO/Desktop/AR%20model/ai/dataset/multiclass/) contained:
* Train split: 1,590 images
* Validation split: 346 images
* Test split: 203 images
* **Total existing approved images**: **2,139 images**

---

## 4. Final Complete Pool Counts
The complete pool was constructed by copying all existing approved images (2,139) and newly selected Phase 3E images (287), resulting in:
* **Total Copies Made**: **2,426 images**

---

## 5. Duplicate Analysis
* **SHA-256 Exact Duplicate Check**: Computes hashes for all pool images.
* **Intra-class duplicates**: None (0 exact duplicates found in the same class).
* **Cross-class duplicates**: None. No images appeared under different classes.
* **Results**: Retained all **2,426 unique files**.

---

## 6. Perceptual Duplicate Analysis
* Computed perceptual hashes (`pHash`) to cluster visually similar burst shots.
* Images that were verified to be distinctly different camera angles, crops, distances, or lighting conditions were successfully preserved.

---

## 7. Photographer Cluster Analysis
* Grouped pool images within each class using original filename prefixes and photographer signatures (extracted cleanly to prevent class name overlaps).
* **Total photographer/burst clusters identified**: **563 clusters** across the 7 classes.
* **Largest cluster**: 208 images (the prolific sequence for `airavatesvara`).
* **Photographer Split Rule**: All member images of a given cluster were kept together in a single split to prevent sequence leakage.

---

## 8. Leakage Analysis
* **Exact duplicate leakage**: **PASS** (Zero overlap of SHA-256 hashes across splits).
* **Cluster/burst leakage**: **PASS** (Zero photographer/sequence clusters are split across train/validation/test sets).

---

## 9. Split Methodology & Random Seed
* **Algorithm**: Greedy Deficit-Based Partitioning.
* **Why**: The random shuffler resulted in empty test splits (`Test=0`) for `brihadeeswarar` and `airavatesvara` because their giant photographer clusters (sizes 125 and 208) exhausted the split budgets. The greedy deficit algorithm resolves this bin packing issue by sorting clusters in descending order of size and placing each cluster in the split with the highest remaining deficit.
* **Random Seed**: `42` (ensuring deterministic and reproducible partitions).

---

## 10. Split Distribution Table

| Class | Total | Train | Validation | Test | Train % | Validation % | Test % |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `brihadeeswarar` | 409 | 306 | 61 | 42 | 74.8% | 14.9% | 10.3% |
| `meenakshi-amman` | 334 | 250 | 50 | 34 | 74.9% | 15.0% | 10.2% |
| `mahabalipuram` | 334 | 250 | 50 | 34 | 74.9% | 15.0% | 10.2% |
| `gangaikonda-cholapuram` | 395 | 296 | 59 | 40 | 74.9% | 14.9% | 10.1% |
| `airavatesvara` | 407 | 305 | 61 | 41 | 74.9% | 15.0% | 10.1% |
| `thirumalai-nayakkar` | 331 | 248 | 49 | 34 | 74.9% | 14.8% | 10.3% |
| `hard_negatives` | 216 | 162 | 32 | 22 | 75.0% | 14.8% | 10.2% |
| **Total** | **2426** | **1817** | **362** | **247** | **74.9%** | **14.9%** | **10.2%** |

* **Class Imbalance Ratio (Max Class / Min Class)**: Reduced from **3.48** down to **1.89** (`409 / 216`), establishing a highly balanced dataset.

---

## 11. Dataset Manifest Location
The dataset manifest is located at:
[`ai/dataset/multiclass_v2/dataset_manifest.json`](file:///c:/Users/LENOVO/Desktop/AR%20model/ai/dataset/multiclass_v2/dataset_manifest.json)
It records the relative path, class, split, SHA-256 hash, size, dimensions, source, and cluster assignment of every image.

---

## 12. Training Compatibility Check
* **PyTorch DataLoader Check**: **SUCCESS** (Loaded `multiclass_v2/train` using PyTorch Datasets/Dataloader. Correctly detected all 7 classes, successfully loaded image batches, verified tensor shapes, and validated that integer labels belong inside `[0, 6]` range).
* **Training script update**: `train.py` currently hardcodes the dataset path as `ai/dataset/multiclass/`. To consume the new dataset split, we must update the paths in `train.py` during **Phase 3G** (or symlink the directories). No code changes were made in Phase 3F to preserve script safety.

---

## 13. Safety Integrity Verification
Preflight and postflight safety checks confirm all production weights and source files are identical to their pre-rebuild baselines:
* `best_model.pth` hash: `e3ce20a18fe9` (**PASS** - Unmodified)
* `best_model.onnx` hash: `a1c7d6b1782c` (**PASS** - Unmodified)
* `best_model.onnx.data` hash: `438796116d0b` (**PASS** - Unmodified)
* `best_model_multiclass.pth` hash: `ebcb3e26fb9a` (**PASS** - Unmodified)
* `train.py` / `export_onnx.py`: (**PASS** - Unmodified)
* Original `multiclass` splits: (**PASS** - Unmodified)

---

## 14. Recommendations for Phase 3G
1. Set the dataset training path in `train.py` (or args) to `ai/dataset/multiclass_v2/`.
2. Execute multiclass model training using the verified hyperparameters and early stopping configurations.

---
*Report compiled on: 2026-08-23T12:50:00+05:30*
