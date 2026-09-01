# HERIXA Phase 3G + Phase 3L Hybrid Evaluation Report

## 1. Executive Summary
* **Phase 3G Standalone Accuracy:** 78.33% (Macro F1: 78.65%)
* **Phase 3L Standalone Accuracy:** 80.00% (Macro F1: 79.80%)
* **Best Hybrid Strategy (50/50 Probability Fusion):** 83.33% (Macro F1: 84.12%)

## 2. Per-Temple Accuracy Comparison Table

| Temple Class | Phase 3G Standalone | Phase 3L Standalone | Hybrid 50/50 Fusion | Hybrid Conf Winner |
| :--- | :---: | :---: | :---: | :---: |
| **brihadeeswarar** | 6/10 (60.0%) | 9/10 (90.0%) | 9/10 (90.0%) | 9/10 (90.0%) |
| **meenakshi-amman** | 9/10 (90.0%) | 7/10 (70.0%) | 7/10 (70.0%) | 7/10 (70.0%) |
| **mahabalipuram** | 9/10 (90.0%) | 10/10 (100.0%) | 10/10 (100.0%) | 10/10 (100.0%) |
| **gangaikonda-cholapuram** | 8/10 (80.0%) | 4/10 (40.0%) | 7/10 (70.0%) | 7/10 (70.0%) |
| **airavatesvara** | 5/10 (50.0%) | 8/10 (80.0%) | 7/10 (70.0%) | 7/10 (70.0%) |
| **thirumalai-nayakkar** | 10/10 (100.0%) | 10/10 (100.0%) | 10/10 (100.0%) | 10/10 (100.0%) |

## 3. Disagreement Breakdown

Total Disagreements between 3G and 3L: **16 / 60** images.

### 1. Image: `1-Brihadeeswara_Temple-_Plinth_-Thanjavur-Tamilnadu_06.jpg`
* **True Class:** `brihadeeswarar`
* **Phase 3G:** `airavatesvara` (Confidence: 0.5172)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.9911)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 2. Image: `1-Brihadeeswara_Temple-_court_-Thanjavur-Tamilnadu_08.jpg`
* **True Class:** `brihadeeswarar`
* **Phase 3G:** `airavatesvara` (Confidence: 0.5789)
* **Phase 3L:** `gangaikonda-cholapuram` (Confidence: 0.8122)
* **Hybrid 50/50 Fusion:** `gangaikonda-cholapuram` | **Confidence Winner:** `gangaikonda-cholapuram`

### 3. Image: `Big_temple_230.jpg`
* **True Class:** `brihadeeswarar`
* **Phase 3G:** `gangaikonda-cholapuram` (Confidence: 0.5365)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.9984)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 4. Image: `Big_temple_242.jpg`
* **True Class:** `brihadeeswarar`
* **Phase 3G:** `meenakshi-amman` (Confidence: 0.4383)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.9947)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 5. Image: `03_sunrise_view_of_Meenakshi_temple_gopuram.jpg`
* **True Class:** `meenakshi-amman`
* **Phase 3G:** `meenakshi-amman` (Confidence: 0.3141)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.5237)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 6. Image: `2014_gopuram_of_Meenakshi_Temple__Madurai_Tamil_Nadu.jpg`
* **True Class:** `meenakshi-amman`
* **Phase 3G:** `meenakshi-amman` (Confidence: 0.9343)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.4965)
* **Hybrid 50/50 Fusion:** `meenakshi-amman` | **Confidence Winner:** `meenakshi-amman`

### 7. Image: `Another_Craftmanship_of_madurai_Temple.jpg`
* **True Class:** `meenakshi-amman`
* **Phase 3G:** `brihadeeswarar` (Confidence: 0.6335)
* **Phase 3L:** `meenakshi-amman` (Confidence: 0.5292)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 8. Image: `Chitirai_Festival_Madurai.JPG`
* **True Class:** `meenakshi-amman`
* **Phase 3G:** `meenakshi-amman` (Confidence: 0.6908)
* **Phase 3L:** `hard_negatives` (Confidence: 0.9156)
* **Hybrid 50/50 Fusion:** `hard_negatives` | **Confidence Winner:** `hard_negatives`

### 9. Image: `Compound_Wall_of_Shore_Temple.jpg`
* **True Class:** `mahabalipuram`
* **Phase 3G:** `airavatesvara` (Confidence: 0.4971)
* **Phase 3L:** `mahabalipuram` (Confidence: 0.7207)
* **Hybrid 50/50 Fusion:** `mahabalipuram` | **Confidence Winner:** `mahabalipuram`

### 10. Image: `23.Gangaikonda_Cholapuram.jpg`
* **True Class:** `gangaikonda-cholapuram`
* **Phase 3G:** `gangaikonda-cholapuram` (Confidence: 0.5436)
* **Phase 3L:** `airavatesvara` (Confidence: 0.5900)
* **Hybrid 50/50 Fusion:** `airavatesvara` | **Confidence Winner:** `airavatesvara`

### 11. Image: `Brihadeeswarar_temple__Gangaikondacholapuram__2_.jpg`
* **True Class:** `gangaikonda-cholapuram`
* **Phase 3G:** `gangaikonda-cholapuram` (Confidence: 0.4824)
* **Phase 3L:** `airavatesvara` (Confidence: 0.4497)
* **Hybrid 50/50 Fusion:** `gangaikonda-cholapuram` | **Confidence Winner:** `gangaikonda-cholapuram`

### 12. Image: `Brihadisvara_Temple_of_Gangaikonda_Cholapuram_07.JPG`
* **True Class:** `gangaikonda-cholapuram`
* **Phase 3G:** `gangaikonda-cholapuram` (Confidence: 0.8337)
* **Phase 3L:** `mahabalipuram` (Confidence: 0.4152)
* **Hybrid 50/50 Fusion:** `gangaikonda-cholapuram` | **Confidence Winner:** `gangaikonda-cholapuram`

### 13. Image: `Brihadisvara_Temple_of_Gangaikonda_Cholapuram_08.JPG`
* **True Class:** `gangaikonda-cholapuram`
* **Phase 3G:** `gangaikonda-cholapuram` (Confidence: 0.8368)
* **Phase 3L:** `brihadeeswarar` (Confidence: 0.4149)
* **Hybrid 50/50 Fusion:** `gangaikonda-cholapuram` | **Confidence Winner:** `gangaikonda-cholapuram`

### 14. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_Detail_of_the_perimeter_wall.jpg`
* **True Class:** `airavatesvara`
* **Phase 3G:** `brihadeeswarar` (Confidence: 0.8199)
* **Phase 3L:** `airavatesvara` (Confidence: 0.7112)
* **Hybrid 50/50 Fusion:** `brihadeeswarar` | **Confidence Winner:** `brihadeeswarar`

### 15. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_View_of_the_temple_complex_frame_through_a_jaali.jpg`
* **True Class:** `airavatesvara`
* **Phase 3G:** `brihadeeswarar` (Confidence: 0.6823)
* **Phase 3L:** `airavatesvara` (Confidence: 0.9117)
* **Hybrid 50/50 Fusion:** `airavatesvara` | **Confidence Winner:** `airavatesvara`

### 16. Image: `1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_temple_complex_-_general_view.jpg`
* **True Class:** `airavatesvara`
* **Phase 3G:** `brihadeeswarar` (Confidence: 0.5366)
* **Phase 3L:** `airavatesvara` (Confidence: 0.9927)
* **Hybrid 50/50 Fusion:** `airavatesvara` | **Confidence Winner:** `airavatesvara`

## 4. Production Recommendation

**RECOMMENDATION:** **DEPLOY HYBRID 50/50 FUSION**. Hybrid probability fusion achieves **83.33%** overall accuracy, outperforming both standalone Phase 3G (78.33%) and Phase 3L (80.00%).
