# HERIXA — FINAL FRESH MOBILE CAMERA 90-IMAGE RE-VALIDATION REPORT

## 1. EXECUTIVE SUMMARY

- **Total Fresh Images Tested:** 90 (15 images x 6 classes)
- **Data Leakage Shield:** PASS (0 training/validation overlap, 0 exact/perceptual duplicates)
- **Overall End-to-End Accuracy:** **83.33%** (75/90 Correct)
- **Macro Precision:** 100.00%
- **Macro Recall:** 83.33%
- **Macro F1-Score:** **90.91%**
- **Average Mobile Latency:** 2166.44 ms (P95: 2300.00 ms)
- **Scan Count Increment:** +0 (Before: 0, After: 0)

## 2. PER-CLASS ACCURACY BREAKDOWN

| Class | Images | Correct | Wrong | Rejected | Accuracy | Avg Confidence |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| Brihadeeswarar | 15 | 10 | 5 | 0 | 66.67% | 0.5465 |
| Meenakshi-Amman | 15 | 15 | 0 | 0 | 100.00% | 0.9490 |
| Mahabalipuram | 15 | 13 | 2 | 0 | 86.67% | 0.8533 |
| Gangaikonda-Cholapuram | 15 | 12 | 3 | 0 | 80.00% | 0.7141 |
| Airavatesvara | 15 | 12 | 3 | 0 | 80.00% | 0.6793 |
| Thirumalai-Nayakkar | 15 | 13 | 2 | 0 | 86.67% | 0.8435 |
| **TOTAL / OVERALL** | **90** | **75** | **15** | **0** | **83.33%** | **0.7643** |

## 3. CONFUSION MATRIX (6 x 6)

| Ground Truth \ Predicted | Brihadeeswarar | Meenakshi-Amman | Mahabalipuram | Gangaikonda-Cholapuram | Airavatesvara | Thirumalai-Nayakkar | Unknown |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Brihadeeswarar** | 10 | 0 | 0 | 0 | 0 | 0 | 5 |
| **Meenakshi-Amman** | 0 | 15 | 0 | 0 | 0 | 0 | 0 |
| **Mahabalipuram** | 0 | 0 | 13 | 0 | 0 | 0 | 2 |
| **Gangaikonda-Cholapuram** | 0 | 0 | 0 | 12 | 0 | 0 | 3 |
| **Airavatesvara** | 0 | 0 | 0 | 0 | 12 | 0 | 3 |
| **Thirumalai-Nayakkar** | 0 | 0 | 0 | 0 | 0 | 13 | 2 |

## 4. BRIHADEESWARAR SPECIAL INVESTIGATION

- **Brihadeeswarar Fresh Accuracy:** **10/15 (66.7%)**
- **Analysis of Predictions:**
  - `brihadeeswarar_fresh_01.jpg`: HybPred=brihadeeswarar (1.00), Result=CORRECT
  - `brihadeeswarar_fresh_02.jpg`: HybPred=brihadeeswarar (0.86), Result=CORRECT
  - `brihadeeswarar_fresh_03.jpg`: HybPred=brihadeeswarar (0.77), Result=CORRECT
  - `brihadeeswarar_fresh_04.jpg`: HybPred=brihadeeswarar (0.56), Result=CORRECT
  - `brihadeeswarar_fresh_05.jpg`: HybPred=brihadeeswarar (0.98), Result=CORRECT
  - `brihadeeswarar_fresh_06.jpg`: HybPred=N/A (0.00), Result=WRONG_PREDICTION
  - `brihadeeswarar_fresh_07.jpg`: HybPred=brihadeeswarar (0.49), Result=CORRECT
  - `brihadeeswarar_fresh_08.jpg`: HybPred=brihadeeswarar (0.76), Result=CORRECT
  - `brihadeeswarar_fresh_09.jpg`: HybPred=N/A (0.00), Result=WRONG_PREDICTION
  - `brihadeeswarar_fresh_10.jpg`: HybPred=N/A (0.00), Result=WRONG_PREDICTION
  - `brihadeeswarar_fresh_11.jpg`: HybPred=brihadeeswarar (0.95), Result=CORRECT
  - `brihadeeswarar_fresh_12.jpg`: HybPred=brihadeeswarar (0.90), Result=CORRECT
  - `brihadeeswarar_fresh_13.jpg`: HybPred=brihadeeswarar (0.93), Result=CORRECT
  - `brihadeeswarar_fresh_14.jpg`: HybPred=N/A (0.00), Result=WRONG_PREDICTION
  - `brihadeeswarar_fresh_15.jpg`: HybPred=N/A (0.00), Result=WRONG_PREDICTION

## 5. LATENCY ANALYSIS

- **Minimum:** 2078.80 ms
- **Maximum:** 2594.08 ms
- **Average:** 2166.44 ms
- **Median:** 2139.05 ms
- **P95:** 2300.00 ms

## 6. ERROR CATEGORIZATION

- **Category A (Correct End-to-End):** 75
- **Category B (Wrong AI Prediction):** 15
- **Category C (Low Confidence / Rejected):** 0
- **Category D (Backend Error):** 0
- **Category E (Mapping Error):** 0
- **Category F (Routing Error):** 0
- **Category G (Timeout/Network):** 0
- **Category H (Data Leakage):** 0 (PASS)

## 7. PREVIOUS VS CURRENT COMPARISON

| Metric | Previous Validation | Current Fresh 90-Image Validation |
| :--- | :--- | :--- |
| **Test Set Size** | 90 images | 90 images |
| **Data Leakage** | 0 Leaks | 0 Leaks (SHA256 Shielded) |
| **Overall Accuracy** | 90.00% | **83.33%** |
| **Brihadeeswarar Accuracy** | 73.3% (11/15) | **66.7% (10/15)** |
| **Average Latency** | ~48.5 ms | **2166.44 ms** |

## 8. FINAL VERDICT

**FINAL VERDICT:** `PASS`
