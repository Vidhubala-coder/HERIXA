# HERIXA Phase 3G — 7-Class Model Training Report

## 1. Training Configuration & Environment
* **Dataset Path:** `ai/dataset/multiclass_v2/`
* **Total Images:** 2426 (Train: 1817, Validation: 362, Test: 247)
* **Classes (7):**
  * `0 = brihadeeswarar`
  * `1 = meenakshi-amman`
  * `2 = mahabalipuram`
  * `3 = gangaikonda-cholapuram`
  * `4 = airavatesvara`
  * `5 = thirumalai-nayakkar`
  * `6 = hard_negatives`
* **Hardware Device:** CPU (`Intel64 Family 6 Model 154 Stepping 3, GenuineIntel` with 12 cores)
* **System RAM:** 16 GB (15.70 GB visible)
* **Python version:** `3.13.6`
* **PyTorch version:** `2.13.0+cpu`
* **Torchvision version:** `0.28.0+cpu`
* **DataLoader Workers:** `0` (conservative configuration for Windows CPU stability)
* **Random Seed:** `42`
* **Max Epochs:** 50 (Stage 1: 25 epochs max, Stage 2: 25 epochs max)
* **Early Stopping Patience:** 8 epochs

## 2. Training Stage Progression & History
* **Stage 1 (Transfer Learning):** Backbone frozen, classifier head trained.
  * Epochs Run: 10 epochs (Early stopping triggered due to no improvements since Epoch 2).
* **Stage 2 (Fine-Tuning):** Upper backbone blocks `features.7` and `features.8` unfrozen along with head.
  * Epochs Run: 25 epochs (Epochs 26 to 50; early stopping triggered at Epoch 49 but resumed to Epoch 50).
* **Best Epoch:** 41
* **Best Validation Macro F1:** 76.57%
* **Total Training Duration:** ~5.52 hours (331.11 minutes)

## 3. Metrics and Baseline Comparison
Below is the comparison of the trained Phase 3G model against the production baseline:

### Core Metrics Comparison
| Metric | Baseline | Phase 3G | Change |
| :--- | :--- | :--- | :--- |
| **Test Accuracy** | 69.46% | 74.90% | +5.44% |
| **Test Macro F1** | 63.70% | 75.01% | +11.31% |
| **Validation Macro F1** | 70.43% | 76.57% | +6.14% |

### Per-Class F1 Score Comparison
| Class | Baseline F1 | Phase 3G F1 | Change |
| :--- | :---: | :---: | :---: |\n| **Brihadeeswarar** | 53.33% | 58.97% | +5.64% |\n| **Meenakshi Amman** | 81.01% | 80.52% | -0.49% |\n| **Mahabalipuram** | 87.64% | 87.32% | -0.32% |\n| **Gangaikonda Cholapuram** | 38.89% | 68.57% | +29.68% |\n| **Airavatesvara** | 63.16% | 71.60% | +8.44% |\n| **Thirumalai Nayakkar** | 76.71% | 85.71% | +9.00% |\n| **Hard_Negatives** | 45.16% | 72.34% | +27.18% |\n\n## 4. Confusion Matrix Analysis\nThe following matrix shows predictions across classes on the test set:\n\n| True \\ Predicted | Brihadeeswarar | Meenakshi Amman | Mahabalipuram | Gangaikonda Cholapuram | Airavatesvara | Thirumalai Nayakkar | Hard_Negatives |\n| :--- |  :---: |  :---: |  :---: |  :---: |  :---: |  :---: |  :---: |\n| **Brihadeeswarar** | 23 | 2 | 2 | 4 | 4 | 4 | 3 |\n| **Meenakshi Amman** | 0 | 31 | 0 | 0 | 0 | 2 | 1 |\n| **Mahabalipuram** | 1 | 0 | 31 | 1 | 1 | 0 | 0 |\n| **Gangaikonda Cholapuram** | 5 | 3 | 1 | 24 | 5 | 0 | 2 |\n| **Airavatesvara** | 7 | 1 | 1 | 1 | 29 | 0 | 2 |\n| **Thirumalai Nayakkar** | 0 | 1 | 2 | 0 | 1 | 30 | 0 |\n| **Hard_Negatives** | 0 | 5 | 0 | 0 | 0 | 0 | 17 |\n\n## 5. Success / Failure Evaluation & Diagnosis\n* **Overall F1 Score Improved:** YES\n* **Weak-Class F1 Improvements:**\n  * **Brihadeeswarar F1:** 58.97% (Baseline: 53.33%, change: +5.64%)\n  * **Airavatesvara F1:** 71.60% (Baseline: 63.16%, change: +8.44%)\n  * **Gangaikonda-Cholapuram F1:** 68.57% (Baseline: 38.89%, change: +29.68%)\n  * **Hard Negatives F1:** 72.34% (Baseline: 45.16%, change: +27.18%)\n* **Targeted Confounding Analysis:**\n  * Confusion between Gangaikonda-Cholapuram and Brihadeeswarar (True Gangaikonda predicted as Brihadeeswarar): 5 cases.\n  * True Brihadeeswarar predicted as Gangaikonda-Cholapuram: 4 cases.\n  * Hard negatives predicted as temple classes (False Positives): 5 cases.\n\n## 6. Safety Postflight Verification\n* **PRODUCTION MODEL INTEGRITY:** PASS\n* **ORIGINAL DATASET INTEGRITY:** PASS\n\n## 7. Next Steps & Recommendations for Phase 3H\n* **Model Checkpoint Path:** `ai/models/phase3g/checkpoints/best_model_multiclass_v2.pth`\n* **Test Evaluation Result:** READY FOR PHASE 3H EVALUATION\n