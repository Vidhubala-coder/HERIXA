# HERIXA Phase 3L — Targeted Multi-View Augmentation & Fine-Tuning Report

## 1. Executive Summary
This report summarizes Phase 3L fine-tuning, targeted multi-view augmentation, and evaluation of the HERIXA 7-class monument recognition candidate model (`best_model_phase3l.pth`).

* **Execution Date:** 2026-09-01
* **Training Dataset:** Isolated Phase 3L workspace (`ai/dataset/phase3l_training/`)
* **Original Dataset Status:** 100% Protected (`ai/dataset/multiclass_v2/` untouched)
* **Initial Checkpoint:** Phase 3G `best_model_multiclass_v2.pth`
* **Fine-Tuning Optimizer:** AdamW (`lr=1e-4`, weight decay `1e-4`, 8 epochs)
* **Best Epoch:** Epoch 3
* **Candidate Selection:** Highest Validation Macro F1 (`77.74%`)

## 2. Safety & Baseline Comparison (Phase 3G vs Phase 3L)

| Metric | Phase 3G Baseline | Phase 3L Candidate | Delta |
| :--- | :---: | :---: | :---: |
| **Test Accuracy** | 74.90% | **77.33%** | +2.43% |
| **Test Macro F1** | 75.01% | **77.24%** | +2.23% |
| **brihadeeswarar F1** | 58.97% | **60.00%** | +1.03% |
| **meenakshi-amman F1** | 80.52% | **83.78%** | +3.26% |
| **mahabalipuram F1** | 87.32% | **88.57%** | +1.25% |
| **gangaikonda-cholapuram F1** | 68.57% | **74.70%** | +6.13% |
| **airavatesvara F1** | 71.60% | **74.70%** | +3.09% |
| **thirumalai-nayakkar F1** | 85.71% | **84.51%** | -1.21% |
| **hard_negatives F1** | 72.34% | **74.42%** | +2.08% |

## 3. ONNX Candidate Serialization
* **ONNX Artifact Path:** `ai/models/integration/onnx/phase3l/phase3l_candidate.onnx`
* **Input Tensor Shape:** `[N, 3, 224, 224]`
* **Output Logit Dimension:** `[N, 7]`

## 4. Verification Flags

```text
PHASE 3L STATUS: PASS
ORIGINAL DATASET MODIFIED: NO
ORIGINAL MODEL MODIFIED: NO
ORIGINAL ONNX MODIFIED: NO
PRODUCTION FILES MODIFIED: NO
FALLBACK USED: NO
THRESHOLD MODIFIED: NO
HARD_NEGATIVE SAFETY: PASS
```

### FINAL DECISION:
`PHASE 3L CANDIDATE ACCEPTED`
