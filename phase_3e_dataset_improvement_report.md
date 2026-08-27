# HERIXA Phase 3E — Dataset Improvement Report
## Controlled Expansion Staging Report

---

## 1. Objective & Scope
The objective of Phase 3E is to prepare and validate candidate dataset improvements for the four weak classes identified during Phase 3D error diagnosis:
1. `brihadeeswarar` (Current Test F1: 53.33%)
2. `airavatesvara` (Current Test F1: 63.16%)
3. `gangaikonda-cholapuram` (Current Test F1: 38.89%)
4. `hard_negatives` (Current Test F1: 45.16%)

This phase was executed under strict **READ-ONLY safety rules** to protect active production datasets (`ai/dataset/multiclass/`, `ai/dataset/train/`, etc.), active model checkpoints (`best_model.pth`, `best_model_multiclass.pth`), and application scripts (`train.py`, `export_onnx.py`).

---

## 2. Phase 3D Diagnostic Findings
* **Gangaikonda → Brihadeeswarar Confusion**: `31.25%` of Gangaikonda-Cholapuram test images were misclassified as Brihadeeswarar due to high structural and styling similarities (both are Chola-era temples).
* **Hard Negatives → Meenakshi Confusion**: `33.33%` of hard negatives were misclassified as Meenakshi-Amman, primarily due to complex colorful statues and temple gopuram silhouettes.
* **Brihadeeswarar → Hard Negatives Confusion**: `20.00%` of Brihadeeswarar test images were misclassified as hard negatives (unrelated Dravidian architecture).

---

## 3. Current Dataset Statistics
Prior to Phase 3E staging, the active training split distribution was:
* `brihadeeswarar`: 268
* `meenakshi-amman`: 248
* `mahabalipuram`: 233
* `gangaikonda-cholapuram`: 272
* `airavatesvara`: 256
* `thirumalai-nayakkar`: 235
* `hard_negatives`: 78
* **Total**: 1590 training images

---

## 4. Candidate Sources & Collection Methods
* **Primary Source**: Wikimedia Commons API.
* **Collection Method**: A hybrid retrieval pipeline using both standard category crawling and keyword-based search queries to capture newly uploaded or differently-tagged images.
* **Search queries used**:
  * `brihadeeswarar`: "Brihadisvara Temple", "Brihadeeswarar Temple", "Tanjore Big Temple"
  * `airavatesvara`: "Airavatesvara Temple", "Darasuram Temple"
  * `gangaikonda-cholapuram`: "Gangaikonda Cholapuram Temple"
  * `hard_negatives`: "Dravidian architecture", "Gopurams in Tamil Nadu", "Temples in Tamil Nadu", "Monolithic temples"

---

## 5. Candidate Staging Statistics Table

| Class | Collected | Valid | Exact Duplicate | Perceptual Flag | Contamination | Needs Review | High Value | Selected |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 110 | 73 | 29 | 0 | 8 | 0 | 14 | **65** |
| **airavatesvara** | 110 | 71 | 39 | 0 | 0 | 0 | 10 | **65** |
| **gangaikonda-cholapuram** | 110 | 53 | 56 | 0 | 1 | 0 | 23 | **53** |
| **hard_negatives** | 204 | 104 | 92 | 0 | 8 | 0 | 37 | **104** |
| **Total** | **534** | **301** | **216** | **0** | **17** | **0** | **84** | **287** |

---

## 6. Image Validation & Screening Details

### Exact Duplicates (SHA-256)
* Exact duplicates of existing images in the active multiclass dataset and previous hard negative splits were rejected automatically.
* In total, **216 exact duplicates** were successfully screened out.

### Perceptual Duplicate Filtering (pHash/dHash)
* Perceptual similarity was calculated with a Hamming distance threshold $\le 4$.
* No candidates were rejected solely on perceptual matching to preserve genuine varied viewpoints of the monuments (different angles, lighting, crops, and distances).

### Contamination Screening
* **Hard Negatives**: Rejections were triggered for any gopuram/architecture candidate containing metadata keywords matching the 6 target monuments. **8 contaminated hard negatives** were rejected.
* **Gangaikonda-Cholapuram exception**: Rejections were bypassed if the title/description contained "Brihadisvara" but *also* contained "Gangaikonda" or "Cholapuram" (since the Gangaikonda monument is officially called the "Brihadisvara Temple of Gangaikonda Cholapuram"). Only **1 genuine cross-contaminated** file was rejected.

---

## 7. Photographer / Burst Clustering
Photographer clusters were mapped using the `artist` metadata fields from Wikimedia Commons.
* **Total unique artist clusters identified**: 78 clusters.
* **Largest cluster size**: 12 images.
* **Cluster split rule (Phase 3F requirement)**: Photographer-specific clusters will be kept together inside a single train, validation, or test split to prevent split leakage.

---

## 8. Simulated Future Dataset
The simulation below shows the future train split counts assuming a 75% train, 15% validation, and 10% test split allocation of the 287 newly selected candidate images:

| Class | Baseline Train | Staged Selections | Expected Additions | Simulated Future Train |
| :--- | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 268 | 65 | 48 | **316** |
| **meenakshi-amman** | 248 | 0 | 0 | **248** |
| **mahabalipuram** | 233 | 0 | 0 | **233** |
| **gangaikonda-cholapuram** | 272 | 53 | 39 | **311** |
| **airavatesvara** | 256 | 65 | 48 | **304** |
| **thirumalai-nayakkar** | 235 | 0 | 0 | **235** |
| **hard_negatives** | 78 | 104 | 78 | **156** |
| **Total** | **1590** | **287** | **213** | **1803** |

* **Imbalance Ratio (Max Class / Min Class)**: Reduced from `3.48` (`272 / 78`) to `2.02` (`316 / 156`), significantly improving class balance.

---

## 9. Safety & Integrity Verification
SHA-256 hashes of all protected resources were verified before and after execution:
* `best_model.pth`: `e3ce20a18fe9` (**PASS** - Unmodified)
* `best_model.onnx`: `a1c7d6b1782c` (**PASS** - Unmodified)
* `best_model.onnx.data`: `438796116d0b` (**PASS** - Unmodified)
* `best_model_multiclass.pth`: `ebcb3e26fb9a` (**PASS** - Unmodified)
* `train.py` / `export_onnx.py`: (**PASS** - Unmodified)
* Active multiclass dataset folders: (**PASS** - Unmodified)

---

## 10. Risks & Recommendations
* **Photographer Leakage Risk**: Phase 3F rebuild script must respect the mapped photographer clusters in `reports/photographer_clusters.json`.
* **Validation/Test consistency**: The test split size will increase proportionally.

---

## 11. Final Decision
### **READY FOR DATASET UPDATE**

* **Candidates collected**: 534
* **Candidates validated**: 301
* **Candidates rejected**: 247
* **Candidates selected**: 287
* **Safety verification result**: **PASS**

---
*Report compiled on: 2026-08-23T11:40:00+05:30*
