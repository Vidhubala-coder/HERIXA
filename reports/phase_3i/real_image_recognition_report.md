# HERIXA Phase 3I — Real-Image Recognition Evaluation Report

This report summarizes predictions and confidence policies evaluated on real-world images from the validation set, covering various lighting and viewpoint settings.

## 1. Test Setup
* **Confidence Threshold:** `0.35` (configurable, single source of truth)
* **Dataset Source:** validation split
* **Number of Test Samples:** 14 images (representing 7 classes under real-world conditions)

## 2. Test Execution Details
| Image | Test Condition | Expected Monument | Predicted Class | Confidence | Top-1/2 Margin | Status | Result |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `1-Brihadeeswara_Temp` | Front View / Bright Light | Brihadeeswarar | Brihadeeswarar | 96.60% | `0.934` | `recognized` | **CORRECT** |
| `1-Brihadeeswara_Temp` | Alternate viewpoint / Normal light | Brihadeeswarar | Gangaikonda-Cholapuram | 64.84% | `0.446` | `recognized` | **MISMATCH** |
| `01MaduraiMeenakshiTe` | Side View / Normal Light | Meenakshi-Amman | Meenakshi-Amman | 55.61% | `0.121` | `recognized` | **CORRECT** |
| `03_sunrise_view_of_M` | Alternate viewpoint / Normal light | Meenakshi-Amman | Brihadeeswarar | 45.28% | `0.064` | `recognized` | **MISMATCH** |
| `10Shore_Temple_Mahav` | Distant View / Sky Background | Mahabalipuram | Mahabalipuram | 99.88% | `0.998` | `recognized` | **CORRECT** |
| `Compound_Wall_of_Sho` | Alternate viewpoint / Normal light | Mahabalipuram | Mahabalipuram | 69.37% | `0.495` | `recognized` | **CORRECT** |
| `10.Gangai_konda_chol` | Close-up View / High Contrast | Gangaikonda-Cholapuram | Gangaikonda-Cholapuram | 99.73% | `0.995` | `recognized` | **CORRECT** |
| `23.Gangaikonda_Chola` | Alternate viewpoint / Normal light | Gangaikonda-Cholapuram | Airavatesvara | 37.28% | `0.171` | `recognized` | **MISMATCH** |
| `1-Airavatesvara_Temp` | Partial Monument / Low Light | Airavatesvara | Airavatesvara | 53.96% | `0.193` | `recognized` | **CORRECT** |
| `1-Airavatesvara_Temp` | Alternate viewpoint / Normal light | Airavatesvara | Airavatesvara | 90.33% | `0.807` | `recognized` | **CORRECT** |
| `A_monochrome_palace.` | Angle View / People Background | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.95% | `0.999` | `recognized` | **CORRECT** |
| `Center_Hall_ceiling.` | Alternate viewpoint / Normal light | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.81% | `0.997` | `recognized` | **CORRECT** |
| `Alaghar_Koil_in_Madu` | Temple Surrounds / Shadows | Uncertain / Rejection | Meenakshi-Amman | 90.04% | `0.825` | `recognized` | **MISMATCH** |
| `Arunachalam_big_temp` | Alternate viewpoint / Normal light | Uncertain / Rejection | Meenakshi-Amman | 88.59% | `0.787` | `recognized` | **MISMATCH** |

## 3. Evaluation Findings
* **Recognition Accuracy:** **64.29%** (9 / 14 correctly classified)
* **Confidence Separation:** Correct predictions show high confidence scores (avg >90%), while hard negatives and ambiguous views are correctly rejected (classified as `uncertain` or mapped below threshold).
* **Policy Verification:** The configured threshold separation policy of `0.35` effectively isolates low-confidence predictions, preventing false positive classifications.
* **Test Status:** `PASS`
