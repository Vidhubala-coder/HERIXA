# HERIXA Phase 3I — Real-World Unseen Image Validation Report

## 1. Executive Summary
This report summarizes the strict real-world validation of the HERIXA Phase 3G 7-class monument recognition ONNX model (`herixa_phase3g.onnx`) under the configured confidence rejection threshold of `0.65`.

* **Execution Date:** 2026-08-31
* **Total Images Evaluated:** 76
* **Overall Recognition Accuracy:** 63.16%
* **Model Checkpoint SHA-256:** `1dceac122b0cabeb1b031d11d26e5caf34f7869cc1ee17ffc14a77b8979393fe`
* **Confidence Rejection Threshold:** `0.65`

## 2. Pre-Flight Verification
* **ONNX Model Loading:** PASS (`herixa_phase3g.onnx`)
* **Output Class Dimensions:** 7 (`[N, 7]`)
* **Class Ordering:** Verified (`brihadeeswarar`, `meenakshi-amman`, `mahabalipuram`, `gangaikonda-cholapuram`, `airavatesvara`, `thirumalai-nayakkar`, `hard_negatives`)
* **Preprocessing Pipeline:** RGB 224x224 Bilinear scaling + ImageNet normalization (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).

## 3. Per-Class Performance Summary

| Monument Class | Evaluated Samples | Correct Predictions | Low-Confidence Rejections | Accuracy / Rejection Rate | Avg Confidence |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 11 | 8 | 3 | 72.73% | 0.8204 |
| **meenakshi-amman** | 11 | 5 | 5 | 45.45% | 0.7540 |
| **mahabalipuram** | 11 | 9 | 2 | 81.82% | 0.8515 |
| **gangaikonda-cholapuram** | 11 | 4 | 6 | 36.36% | 0.6330 |
| **airavatesvara** | 11 | 4 | 7 | 36.36% | 0.5953 |
| **thirumalai-nayakkar** | 11 | 10 | 1 | 90.91% | 0.9198 |
| **hard_negatives** | 10 | 8 | 0 | 80.00% | 0.8267 |

## 4. Chola Temple Architecture Confounding Analysis
* **Brihadeeswarar misclassified as Gangaikonda Cholapuram:** 1 cases.
* **Gangaikonda Cholapuram misclassified as Brihadeeswarar:** 2 cases.

## 5. Hard Negative Rejection Policy
* **Configured Rejection Threshold:** `0.65`
* **Hard Negatives Tested:** 10
* **Correctly Rejected Hard Negatives:** 8
* **False Positives:** 2

## 6. Safety Audit
* **Original Checkpoint Unchanged:** YES (`best_model_multiclass_v2.pth` untouched)
* **Original Dataset Unchanged:** YES (`ai/dataset` protected)
* **Fallback Logic Used:** NO
* **Mock Predictions Used:** NO

## 7. Status & Recommendation
* **PHASE 3I STEP 2 STATUS:** `PASS WITH FINDINGS`
* **PHASE 3I STEP 3 STATUS:** `PASS`
