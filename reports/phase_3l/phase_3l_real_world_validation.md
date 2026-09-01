# HERIXA Phase 3L — Real-World Unseen Recognition Validation Report

## 1. Executive Summary
This report presents real-world unseen image validation comparing the baseline Phase 3G ONNX model (`herixa_phase3g.onnx`) with the Phase 3L fine-tuned ONNX candidate model (`phase3l_candidate.onnx`) under the strict `0.65` confidence rejection threshold.

* **Execution Date:** 2026-09-01
* **Total Real-World Test Images:** 76
* **Phase 3G Baseline Real-World Accuracy:** 63.16% (48/76)
* **Phase 3L Candidate Real-World Accuracy:** 72.37% (55/76)
* **Overall Accuracy Improvement:** +9.21%
* **Confidence Rejection Threshold:** `0.65`

## 2. Per-Class Real-World Performance Comparison

| Monument Class | Samples | Phase 3G Accuracy | Phase 3L Candidate Accuracy | Delta |
| :--- | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 11 | 72.73% | **90.91%** | +18.18% |
| **meenakshi-amman** | 11 | 45.45% | **54.55%** | +9.09% |
| **mahabalipuram** | 11 | 81.82% | **81.82%** | +0.00% |
| **gangaikonda-cholapuram** | 11 | 36.36% | **36.36%** | +0.00% |
| **airavatesvara** | 11 | 36.36% | **63.64%** | +27.27% |
| **thirumalai-nayakkar** | 11 | 90.91% | **100.00%** | +9.09% |
| **hard_negatives** | 10 | 80.00% | **80.00%** | +0.00% |

## 3. Hard-Negative Safety Rejection
* **Phase 3G Hard Negative Rejection Rate:** 80.00%
* **Phase 3L Hard Negative Rejection Rate:** 80.00%

## 4. Verification Flags
```text
PHASE 3L REAL-WORLD STATUS: PASS
ORIGINAL DATASET MODIFIED: NO
ORIGINAL MODEL MODIFIED: NO
PRODUCTION SERVICE MODIFIED: NO
REJECTION THRESHOLD: 0.65 (UNCHANGED)
HARD-NEGATIVE SAFETY: PRESERVED
```
