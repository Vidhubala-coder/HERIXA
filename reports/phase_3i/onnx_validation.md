# HERIXA Phase 3I — PyTorch vs ONNX Model Validation Report

This report summarizes the verification of prediction and numerical equivalence between the exported ONNX model and the original PyTorch candidate checkpoint.

## 1. Validation Configuration
* **PyTorch Checkpoint Path:** `ai/models/phase3g/checkpoints/best_model_multiclass_v2.pth`
* **ONNX Model Path:** `ai/models/integration/onnx/herixa_phase3g.onnx`
* **Numerical Comparison Samples:** 14 images (2 per target class)
* **Floating-Point Absolute Logits Tolerance:** `1.000000e-04`

## 2. Comparison Metrics Table
| Image | PyTorch Prediction | ONNX Prediction | PyTorch Conf | ONNX Conf | Max Logit Diff | Match |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| `1-Brihadeeswara_Temple-_P` | Brihadeeswarar | Brihadeeswarar | 96.60% | 96.60% | `6.079674e-06` | YES |
| `1-Brihadeeswara_Temple-_c` | Gangaikonda-Cholapuram | Gangaikonda-Cholapuram | 64.84% | 64.84% | `4.768372e-06` | YES |
| `01MaduraiMeenakshiTempleG` | Meenakshi-Amman | Meenakshi-Amman | 55.61% | 55.61% | `4.768372e-06` | YES |
| `03_sunrise_view_of_Meenak` | Brihadeeswarar | Brihadeeswarar | 45.28% | 45.28% | `1.096725e-05` | YES |
| `10Shore_Temple_Mahavalipu` | Mahabalipuram | Mahabalipuram | 99.88% | 99.88% | `1.239777e-05` | YES |
| `Compound_Wall_of_Shore_Te` | Mahabalipuram | Mahabalipuram | 69.37% | 69.37% | `4.291534e-06` | YES |
| `10.Gangai_konda_cholapura` | Gangaikonda-Cholapuram | Gangaikonda-Cholapuram | 99.73% | 99.73% | `4.053116e-06` | YES |
| `23.Gangaikonda_Cholapuram` | Airavatesvara | Airavatesvara | 37.28% | 37.28% | `8.106232e-06` | YES |
| `1-Airavatesvara_Temple_-_` | Airavatesvara | Airavatesvara | 53.96% | 53.96% | `5.364418e-06` | YES |
| `1-Airavatesvara_Temple_-_` | Airavatesvara | Airavatesvara | 90.33% | 90.33% | `8.106232e-06` | YES |
| `A_monochrome_palace.jpg` | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.95% | 99.95% | `4.768372e-06` | YES |
| `Center_Hall_ceiling.jpg` | Thirumalai-Nayakkar | Thirumalai-Nayakkar | 99.81% | 99.81% | `6.198883e-06` | YES |
| `Alaghar_Koil_in_Madurai.j` | Meenakshi-Amman | Meenakshi-Amman | 90.04% | 90.04% | `8.344650e-06` | YES |
| `Arunachalam_big_temple_of` | Meenakshi-Amman | Meenakshi-Amman | 88.59% | 88.59% | `5.722046e-06` | YES |

## 3. Discrepancy Statistics
* **Maximum Absolute Difference (Logits):** `1.239777e-05`
* **Mean Absolute Difference (Logits):** `3.246400e-06`
* **Prediction Agreement:** **100.00%**
* **Verification Status:** `PASS` (Numerical discrepancy is well within acceptable floating-point ranges and predictions match exactly).

## 4. Preprocessing Equivalence Check
* **PyTorch Preprocessing Pipeline:** Conversion to RGB, Resize `(224, 224)`, division by `255`, normalization with mean `[0.485, 0.456, 0.406]` and standard deviation `[0.229, 0.224, 0.225]`.
* **ONNX Preprocessing Pipeline:** Implements identical scaling, resizing, and normalization steps.
* **Equivalence Status:** `PASS` (Preprocessing pipelines are identical, verified by importing raw images and comparing resulting tensors directly prior to inference).
