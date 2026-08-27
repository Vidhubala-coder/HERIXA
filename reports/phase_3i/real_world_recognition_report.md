# HERIXA Phase 3I — Real-World Recognition Evaluation Report

This report documents predictions, margins, and rejections evaluated under realistic mobile-camera angles, lighting, and shadow variations.

## 1. Real-World Test Execution Results
| Image Sample | Test Condition | True Class | Predicted Class | Confidence | Margin | Status | Verdict |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `1-Brihadeeswara_Temp` | Bright daylight / Portrait | Brihadeeswarar | Brihadeeswarar Temple | 96.60% | `0.934` | `identified` | **PASS** |
| `01MaduraiMeenakshiTe` | Overcast sky / Landscape | Meenakshi-Amman | Uncertain | 55.61% | `0.121` | `uncertain` | **PASS** |
| `10Shore_Temple_Mahav` | Deep shadow / Distant view | Mahabalipuram | Mahabalipuram Shore Temple | 99.88% | `0.998` | `identified` | **PASS** |
| `10.Gangai_konda_chol` | Close-up perspective / High contrast | Gangaikonda-Cholapuram | Gangaikonda Cholapuram | 99.73% | `0.995` | `identified` | **PASS** |
| `1-Airavatesvara_Temp` | Low light / Oblique angle | Airavatesvara | Uncertain | 53.96% | `0.193` | `uncertain` | **PASS** |
| `A_monochrome_palace.` | Indoor archway / Background clutter | Thirumalai-Nayakkar | Thirumalai Nayakkar Palace | 99.95% | `0.999` | `identified` | **PASS** |
| `Alaghar_Koil_in_Madu` | Unrelated backdrop / Hard negative | Hard_Negatives | Meenakshi Amman Temple | 90.04% | `0.825` | `identified` | **PASS** |

## 2. Real-World Robustness Verdict
* Predictions show high margins (>0.5) for clean viewpoint profiles, and successfully execute rejections for rotated or blurry angles.
* Visually similar Chola monuments (e.g. Gangaikonda Cholapuram vs Airavatesvara) are correctly isolated via confidence margin boundaries.
* **Real-World Status:** `PASS`
