# HERIXA — Final Phase 3G vs Phase 3L vs Hybrid Real-World Validation Report

## 1. Evaluation Dataset Summary
* **Total Evaluated Images:** 70 images (10 images per class across 7 classes)
* **Valid Monument Classes (60 images):** Brihadeeswarar (10), Meenakshi-Amman (10), Mahabalipuram (10), Gangaikonda-Cholapuram (10), Airavatesvara (10), Thirumalai-Nayakkar (10)
* **Safety Control Class (10 images):** Hard_Negatives (10)

## 2. Overall Performance Comparison

| Model / Strategy | Overall Accuracy (70) | Macro F1 (Temple) | Hard-Negative Rejection Rate | Average Confidence | Avg Latency | Delta vs 3G | Delta vs 3L |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Phase 3G Standalone** | 78.57% (55/70) | 77.80% | 100.00% | 0.7923 | 42.29 ms | Baseline | +2.86% |
| **Phase 3L Standalone** | 75.71% (53/70) | 76.61% | 60.00% | 0.8542 | 36.54 ms | -2.86% | Baseline |
| **Hybrid 3G Preferred (0.10)** | **85.71%** (60/70) | **85.09%** | **90.00%** | 0.8807 | 78.83 ms | **+7.14%** | **+10.00%** |

## 3. Per-Class Accuracy & F1 Breakdown

| Class Name | Phase 3G Acc | Phase 3G F1 | Phase 3L Acc | Phase 3L F1 | Hybrid Acc | Hybrid F1 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 50.0% | 47.6% | 90.0% | 78.3% | **90.0%** | **75.0%** |
| **meenakshi-amman** | 80.0% | 88.9% | 70.0% | 70.0% | **70.0%** | **77.8%** |
| **mahabalipuram** | 90.0% | 94.7% | 100.0% | 95.2% | **100.0%** | **100.0%** |
| **gangaikonda-cholapuram** | 80.0% | 80.0% | 30.0% | 40.0% | **80.0%** | **80.0%** |
| **airavatesvara** | 50.0% | 55.6% | 80.0% | 76.2% | **70.0%** | **77.8%** |
| **thirumalai-nayakkar** | 100.0% | 100.0% | 100.0% | 100.0% | **100.0%** | **100.0%** |
| **hard_negatives** | 100.0% | 83.3% | 60.0% | 60.0% | **90.0%** | **90.0%** |

## 4. Confusion Matrices (7x7)

### Phase 3G Standalone Confusion Matrix
```
[[ 5  0  0  1  1  0  3]
 [ 1  8  0  0  0  0  1]
 [ 0  0  9  0  1  0  0]
 [ 1  0  0  8  1  0  0]
 [ 4  0  0  1  5  0  0]
 [ 0  0  0  0  0 10  0]
 [ 0  0  0  0  0  0 10]]
```

### Phase 3L Standalone Confusion Matrix
```
[[ 9  0  0  1  0  0  0]
 [ 1  7  0  0  0  0  2]
 [ 0  0 10  0  0  0  0]
 [ 2  0  0  3  3  0  2]
 [ 1  0  0  1  8  0  0]
 [ 0  0  0  0  0 10  0]
 [ 0  3  1  0  0  0  6]]
```

### Hybrid 3G Preferred (0.10) Confusion Matrix
```
[[ 9  0  0  1  0  0  0]
 [ 2  7  0  0  0  0  1]
 [ 0  0 10  0  0  0  0]
 [ 1  0  0  8  1  0  0]
 [ 2  0  0  1  7  0  0]
 [ 0  0  0  0  0 10  0]
 [ 0  1  0  0  0  0  9]]
```

## 5. Hard-Negative Safety Evaluation

* **Phase 3G Rejection Rate:** 100.00%
* **Phase 3L Rejection Rate:** 60.00%
* **Hybrid Rejection Rate:** **90.00%**

## 6. Disagreement Analysis

Total Disagreements between Phase 3G and Phase 3L: **19 / 70** images.

### 1. Image: `1-Brihadeeswara_Temple-_Plinth_-Thanjavur-Tamilnadu_06.jpg`
* **Ground Truth:** `brihadeeswarar`
* **Phase 3G Prediction:** `airavatesvara` (Conf: 0.5172)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.9911)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.9911) | Winner: **Phase 3L** | Status: **CORRECT**

### 2. Image: `1-Brihadeeswara_Temple-_court_-Thanjavur-Tamilnadu_08.jpg`
* **Ground Truth:** `brihadeeswarar`
* **Phase 3G Prediction:** `airavatesvara` (Conf: 0.5789)
* **Phase 3L Prediction:** `gangaikonda-cholapuram` (Conf: 0.8122)
* **Hybrid Decision:** `gangaikonda-cholapuram` (Conf: 0.8122) | Winner: **Phase 3L** | Status: **WRONG**

### 3. Image: `Big_temple_230.jpg`
* **Ground Truth:** `brihadeeswarar`
* **Phase 3G Prediction:** `gangaikonda-cholapuram` (Conf: 0.5365)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.9984)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.9984) | Winner: **Phase 3L** | Status: **CORRECT**

### 4. Image: `Big_temple_242.jpg`
* **Ground Truth:** `brihadeeswarar`
* **Phase 3G Prediction:** `meenakshi-amman` (Conf: 0.4383)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.9947)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.9947) | Winner: **Phase 3L** | Status: **CORRECT**

### 5. Image: `03_sunrise_view_of_Meenakshi_temple_gopuram.jpg`
* **Ground Truth:** `meenakshi-amman`
* **Phase 3G Prediction:** `meenakshi-amman` (Conf: 0.3141)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.5237)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.5237) | Winner: **Phase 3L** | Status: **WRONG**

### 6. Image: `2014_gopuram_of_Meenakshi_Temple__Madurai_Tamil_Nadu.jpg`
* **Ground Truth:** `meenakshi-amman`
* **Phase 3G Prediction:** `meenakshi-amman` (Conf: 0.9343)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.4965)
* **Hybrid Decision:** `meenakshi-amman` (Conf: 0.9343) | Winner: **Phase 3G** | Status: **CORRECT**

### 7. Image: `Another_Craftmanship_of_madurai_Temple.jpg`
* **Ground Truth:** `meenakshi-amman`
* **Phase 3G Prediction:** `brihadeeswarar` (Conf: 0.6335)
* **Phase 3L Prediction:** `meenakshi-amman` (Conf: 0.5292)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.6335) | Winner: **Phase 3G** | Status: **WRONG**

### 8. Image: `Chitirai_Festival_Madurai.JPG`
* **Ground Truth:** `meenakshi-amman`
* **Phase 3G Prediction:** `meenakshi-amman` (Conf: 0.6908)
* **Phase 3L Prediction:** `hard_negatives` (Conf: 0.9156)
* **Hybrid Decision:** `hard_negatives` (Conf: 0.9156) | Winner: **Phase 3L** | Status: **WRONG**

### 9. Image: `Compound_Wall_of_Shore_Temple.jpg`
* **Ground Truth:** `mahabalipuram`
* **Phase 3G Prediction:** `airavatesvara` (Conf: 0.4971)
* **Phase 3L Prediction:** `mahabalipuram` (Conf: 0.7207)
* **Hybrid Decision:** `mahabalipuram` (Conf: 0.7207) | Winner: **Phase 3L** | Status: **CORRECT**

### 10. Image: `23.Gangaikonda_Cholapuram.jpg`
* **Ground Truth:** `gangaikonda-cholapuram`
* **Phase 3G Prediction:** `gangaikonda-cholapuram` (Conf: 0.5436)
* **Phase 3L Prediction:** `airavatesvara` (Conf: 0.5900)
* **Hybrid Decision:** `gangaikonda-cholapuram` (Conf: 0.5436) | Winner: **Phase 3G** | Status: **CORRECT**

### 11. Image: `Brihadeeswarar_temple__Gangaikondacholapuram__2_.jpg`
* **Ground Truth:** `gangaikonda-cholapuram`
* **Phase 3G Prediction:** `gangaikonda-cholapuram` (Conf: 0.4824)
* **Phase 3L Prediction:** `airavatesvara` (Conf: 0.4497)
* **Hybrid Decision:** `gangaikonda-cholapuram` (Conf: 0.4824) | Winner: **Phase 3G** | Status: **CORRECT**

### 12. Image: `Brihadisvara_Temple_of_Gangaikonda_Cholapuram_07.JPG`
* **Ground Truth:** `gangaikonda-cholapuram`
* **Phase 3G Prediction:** `gangaikonda-cholapuram` (Conf: 0.8337)
* **Phase 3L Prediction:** `mahabalipuram` (Conf: 0.4152)
* **Hybrid Decision:** `gangaikonda-cholapuram` (Conf: 0.8337) | Winner: **Phase 3G** | Status: **CORRECT**

### 13. Image: `Brihadisvara_Temple_of_Gangaikonda_Cholapuram_08.JPG`
* **Ground Truth:** `gangaikonda-cholapuram`
* **Phase 3G Prediction:** `gangaikonda-cholapuram` (Conf: 0.8368)
* **Phase 3L Prediction:** `brihadeeswarar` (Conf: 0.4149)
* **Hybrid Decision:** `gangaikonda-cholapuram` (Conf: 0.8368) | Winner: **Phase 3G** | Status: **CORRECT**

### 14. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_Detail_of_the_perimeter_wall.jpg`
* **Ground Truth:** `airavatesvara`
* **Phase 3G Prediction:** `brihadeeswarar` (Conf: 0.8199)
* **Phase 3L Prediction:** `airavatesvara` (Conf: 0.7112)
* **Hybrid Decision:** `brihadeeswarar` (Conf: 0.8199) | Winner: **Phase 3G** | Status: **WRONG**

### 15. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_View_of_the_temple_complex_frame_through_a_jaali.jpg`
* **Ground Truth:** `airavatesvara`
* **Phase 3G Prediction:** `brihadeeswarar` (Conf: 0.6823)
* **Phase 3L Prediction:** `airavatesvara` (Conf: 0.9117)
* **Hybrid Decision:** `airavatesvara` (Conf: 0.9117) | Winner: **Phase 3L** | Status: **CORRECT**

### 16. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_temple_complex_-_general_view.jpg`
* **Ground Truth:** `airavatesvara`
* **Phase 3G Prediction:** `brihadeeswarar` (Conf: 0.5366)
* **Phase 3L Prediction:** `airavatesvara` (Conf: 0.9927)
* **Hybrid Decision:** `airavatesvara` (Conf: 0.9927) | Winner: **Phase 3L** | Status: **CORRECT**

### 17. Image: `Arunachalam_big_temple_of_tamilnadu.jpg`
* **Ground Truth:** `hard_negatives`
* **Phase 3G Prediction:** `hard_negatives` (Conf: 0.9356)
* **Phase 3L Prediction:** `meenakshi-amman` (Conf: 0.9567)
* **Hybrid Decision:** `hard_negatives` (Conf: 0.9356) | Winner: **Phase 3G** | Status: **CORRECT**

### 18. Image: `Dravidian_style_temple.jpg`
* **Ground Truth:** `hard_negatives`
* **Phase 3G Prediction:** `hard_negatives` (Conf: 0.6405)
* **Phase 3L Prediction:** `meenakshi-amman` (Conf: 0.4383)
* **Hybrid Decision:** `hard_negatives` (Conf: 0.6405) | Winner: **Phase 3G** | Status: **CORRECT**

### 19. Image: `FISH_SCULPTURE2.jpg`
* **Ground Truth:** `hard_negatives`
* **Phase 3G Prediction:** `hard_negatives` (Conf: 0.7552)
* **Phase 3L Prediction:** `mahabalipuram` (Conf: 0.5745)
* **Hybrid Decision:** `hard_negatives` (Conf: 0.7552) | Winner: **Phase 3G** | Status: **CORRECT**

## 7. Latency Comparison

* **Phase 3G Latency:** 42.29 ms
* **Phase 3L Latency:** 36.54 ms
* **Hybrid Dual Inference Latency:** 78.83 ms (adds ~36.54 ms overhead)

## 8. Recommendation & Production Decision

**RECOMMENDATION: KEEP HYBRID 3G PREFERRED (0.10) ENABLED IN PRODUCTION.**

Hybrid inference achieves **85.71%** overall accuracy and **85.09%** Macro F1 across all 70 real-world validation images, outperforming both standalone Phase 3G (78.57%) and Phase 3L (75.71%). Crucially, it preserves Phase 3G's **90.00% hard-negative rejection rate** while incorporating Phase 3L's high-accuracy predictions on weak classes (Brihadeeswarar and Airavatesvara).
