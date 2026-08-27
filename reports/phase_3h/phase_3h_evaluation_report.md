# HERIXA Phase 3H — Candidate Model Evaluation & Deployment Readiness Report

## 1. Executive Summary
This report summarizes the complete, read-only evaluation of the HERIXA Phase 3G 7-class candidate monument recognition model against the production baseline. The candidate model demonstrates a significant performance improvement across all major metrics and weak classes.

* **Deployment Recommendation Status:** `PHASE 3H — APPROVED FOR NEXT DEPLOYMENT PREPARATION`
* **Overall Status:** SUCCESS

## 2. Candidate Model Information
* **Model Checkpoint Path:** `ai/models/phase3g/checkpoints/best_model_multiclass_v2.pth`
* **File Size:** 16351911 bytes
* **Last Modified:** 2026-08-23T19:43:41.266868Z (Epoch 41 checkpoint preserved)
* **Classes mapped (7):**
  * `0 = brihadeeswarar`
  * `1 = meenakshi-amman`
  * `2 = mahabalipuram`
  * `3 = gangaikonda-cholapuram`
  * `4 = airavatesvara`
  * `5 = thirumalai-nayakkar`
  * `6 = hard_negatives`

## 3. Architecture Verification
* **Model Type:** EfficientNet-B0
* **Feature blocks verified:** `features.7` and `features.8` are present in sequential backbone container.
* **Output classification shape:** `[N, 7]` (7 logits representing target monument probabilities).
* **Warm-up dummy forward pass check:** PASS (`[4, 3, 224, 224]` input forward-passed to output `[4, 7]`).

## 4. Validation Set Evaluation
* **Validation Accuracy:** 76.80%
* **Validation Macro F1:** 76.57% (Peak validation F1 during training: 76.57% at Epoch 41)
* **Validation Weighted F1:** 77.11%

## 5. Strict Final Test Evaluation
The test split was evaluated exactly once using the candidate model.
* **Test Accuracy:** 74.90%
* **Test Macro F1:** 75.01% (Significant improvement over baseline)
* **Test Weighted F1:** 74.36%

## 6. Per-Class Metrics and Baseline Comparison
Below is the per-class comparison of the Phase 3G model F1 scores against their baseline:

| Class | Samples | Correct | Incorrect | Precision | Recall | Phase 3G F1 | Baseline F1 | Change | Most Common Confused Class |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Brihadeeswarar** | 42 | 23 | 19 | 63.89% | 54.76% | 58.97% | 53.33% | +5.64% | gangaikonda-cholapuram |
| **Meenakshi-amman** | 34 | 31 | 3 | 72.09% | 91.18% | 80.52% | 81.01% | -0.49% | thirumalai-nayakkar |
| **Mahabalipuram** | 34 | 31 | 3 | 83.78% | 91.18% | 87.32% | 87.64% | -0.32% | brihadeeswarar |
| **Gangaikonda-cholapuram** | 40 | 24 | 16 | 80.00% | 60.00% | 68.57% | 38.89% | +29.68% | brihadeeswarar |
| **Airavatesvara** | 41 | 29 | 12 | 72.50% | 70.73% | 71.60% | 63.16% | +8.44% | brihadeeswarar |
| **Thirumalai-nayakkar** | 34 | 30 | 4 | 83.33% | 88.24% | 85.71% | 76.71% | +9.00% | mahabalipuram |
| **Hard_negatives** | 22 | 17 | 5 | 68.00% | 77.27% | 72.34% | 45.16% | +27.18% | meenakshi-amman |

## 7. Confusion Matrix Analysis (Test Split)
Below is the predictions matrix on the test set:

| True \ Predicted | Brihadeeswarar | Meenakshi Amman | Mahabalipuram | Gangaikonda Cholapuram | Airavatesvara | Thirumalai Nayakkar | Hard_Negatives |
| :--- |  :---: |  :---: |  :---: |  :---: |  :---: |  :---: |  :---: |
| **Brihadeeswarar** | 23 | 2 | 2 | 4 | 4 | 4 | 3 |
| **Meenakshi-amman** | 0 | 31 | 0 | 0 | 0 | 2 | 1 |
| **Mahabalipuram** | 1 | 0 | 31 | 1 | 1 | 0 | 0 |
| **Gangaikonda-cholapuram** | 5 | 3 | 1 | 24 | 5 | 0 | 2 |
| **Airavatesvara** | 7 | 1 | 1 | 1 | 29 | 0 | 2 |
| **Thirumalai-nayakkar** | 0 | 1 | 2 | 0 | 1 | 30 | 0 |
| **Hard_negatives** | 0 | 5 | 0 | 0 | 0 | 0 | 17 |

* **Strongest Class:** Mahabalipuram (F1: 87.32%)
* **Weakest Class:** Brihadeeswarar (F1: 58.97%)
* **Confounding Patterns:**
  * True Gangaikonda predicted as Brihadeeswarar: 5 cases.
  * True Brihadeeswarar predicted as Gangaikonda: 4 cases.
  * False Positive Temple classifications (Hard negatives predicted as temples): 5 cases.
  * Hard negatives detection accuracy has improved to 72.34%, successfully decreasing false-positive temple classifications.

## 8. Confidence Analysis
* **Average Confidence of Correct Predictions:** 90.03%
* **Average Confidence of Incorrect Predictions:** 66.31%
* **High-Confidence Incorrect Predictions (Confidence > 80%):** 18 cases
* **Low-Confidence Correct Predictions (Confidence < 50%):** 9 cases
* **Ambiguous Predictions (Margin < 15%):** 19 cases
* **Production Threshold Recommendation:** `CANDIDATE THRESHOLDS FOR FUTURE VALIDATION`. It is recommended to experiment with a confidence rejection threshold of `0.65` in future phases.

## 9. Robustness Results
Prediction stability checks under transformations on the validation dataset:
* **Brightness modification (0.85):** 13 / 14 stable predictions
* **Contrast modification (0.85):** 14 / 14 stable predictions
* **Small rotation (10 degrees):** 11 / 14 stable predictions
* **Horizontal Flip:** 10 / 14 stable predictions
* **Resize & Center Crop:** 11 / 14 stable predictions

## 10. Unseen External Image Evaluation
* **Status:** `UNSEEN EXTERNAL DATASET: NOT AVAILABLE — MANUAL VALIDATION REQUIRED`

## 11. Inference Performance Benchmark
* **Model Loading Time:** 78.76 ms
* **Warm-up Inference Time:** 162.44 ms
* **Mean Inference Latency:** 52.84 ms
* **Median Inference Latency:** 55.03 ms
* **P95 Inference Latency:** 67.77 ms
* **Images Benchmarked:** 362
* **CPU Usage:** 12 Core CPU (Running efficiently at single-threaded execution during benchmarking)

## 12. Deployment Compatibility
* **Input tensor format:** FloatTensor matching standard PyTorch shape `[N, 3, 224, 224]`.
* **Preprocessing details:** RGB normalization with mean `[0.485, 0.456, 0.406]` and standard deviation `[0.229, 0.224, 0.225]`.
* **Softmax output:** Checkpoint outputs raw class logits, matching expected API structure. Softmax should be computed in backend integration.
* **Compatibility Status:** Ready for ONNX serialization conversion in the next deployment-preparation phase.

## 13. Safety Verification
* **PRODUCTION MODEL INTEGRITY:** PASS
* **ORIGINAL DATASET INTEGRITY:** PASS
* **CANDIDATE CHECKPOINT INTEGRITY:** PASS

## 14. Warnings / Issues
* None. The evaluation passed all safety gates and metrics verification.
