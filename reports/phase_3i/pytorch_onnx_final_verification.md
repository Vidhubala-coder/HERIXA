# HERIXA Phase 3I — PyTorch vs ONNX Numerical Equivalence Verification Report

This report documents the numerical equivalence tests performed between the PyTorch trained candidate model and the compiled ONNX model.

## 1. Test Overview
* **PyTorch Model Checkpoint:** `best_model_multiclass_v2.pth`
* **ONNX Target Model:** `herixa_phase3g.onnx`
* **Test Dataset subset:** 14 validation images (2 per class)

## 2. Equivalence Verification Results
| File | PyTorch Class | ONNX Class | PyTorch Confidence | ONNX Confidence | Max Logit Diff | Max Prob Diff | Agreement |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `1-Brihadeeswara_Temp` | Brihadeeswarar | Brihadeeswarar | 96.60% | 96.60% | `6.080e-06` | `5.960e-08` | **YES** |
| `1-Brihadeeswara_Temp` | Gangaikonda-Cholapuram | Gangaikonda-Cholapuram | 64.84% | 64.84% | `4.768e-06` | `5.960e-08` | **YES** |
| `01MaduraiMeenakshiTe` | Meenakshi-Amman | Meenakshi-Amman | 55.61% | 55.61% | `4.768e-06` | `1.490e-07` | **YES** |
| `03_sunrise_view_of_M` | Brihadeeswarar | Brihadeeswarar | 45.28% | 45.28% | `1.097e-05` | `8.941e-07` | **YES** |
| `10Shore_Temple_Mahav` | Mahabalipuram | Mahabalipuram | 99.88% | 99.88% | `1.240e-05` | `1.100e-08` | **YES** |
| `Compound_Wall_of_Sho` | Mahabalipuram | Mahabalipuram | 69.37% | 69.37% | `4.292e-06` | `4.768e-07` | **YES** |
| `10.Gangai_konda_chol` | Gangaikonda-Cholapuram | Gangaikonda-Cholapuram | 99.73% | 99.73% | `4.053e-06` | `1.164e-09` | **YES** |
| `23.Gangaikonda_Chola` | Airavatesvara | Airavatesvara | 37.28% | 37.28% | `8.106e-06` | `1.460e-06` | **YES** |
| `1-Airavatesvara_Temp` | Airavatesvara | Airavatesvara | 53.96% | 53.96% | `5.364e-06` | `1.013e-06` | **YES** |
| `1-Airavatesvara_Temp` | Airavatesvara | Airavatesvara | 90.33% | 90.33% | `8.106e-06` | `7.749e-07` | **YES** |
| `A_monochrome_palace.` | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.95% | 99.95% | `4.768e-06` | `1.281e-09` | **YES** |
| `Center_Hall_ceiling.` | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.81% | 99.81% | `6.199e-06` | `6.286e-09` | **YES** |
| `Alaghar_Koil_in_Madu` | Meenakshi-Amman | Meenakshi-Amman | 90.04% | 90.04% | `8.345e-06` | `1.013e-06` | **YES** |
| `Arunachalam_big_temp` | Meenakshi-Amman | Meenakshi-Amman | 88.59% | 88.59% | `5.722e-06` | `1.192e-07` | **YES** |

## 3. Equivalence Verdict
* **Top-1 Class Agreement Rate:** **100.00%** (Expected: 100%)
* **Maximum Logit Discrepancy:** `1.2398e-05` (floating point precision error margin)
* **Maximum Probability Discrepancy:** `1.4603e-06`
* **Verdict:** **ONNX EQUIVALENCE: PASS**
