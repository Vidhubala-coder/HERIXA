# HERIXA Phase 3I — Preprocessing Verification Report

This report summarizes the verification of the candidate checkpoint model's architecture, class mapping, and preprocessing configurations.

## 1. Candidate Checkpoint Verification
* **Model Checkpoint Path:** `ai/models/phase3g/checkpoints/best_model_multiclass_v2.pth`
* **Model Type:** EfficientNet-B0
* **Feature Blocks:** Verified existence of sequential blocks `features.7` and `features.8`.
* **Output Classification Head:** Checked output head. Output features dimension = **7**.
* **Model Load Status:** `PASS` (State dict successfully maps to the architecture).

## 2. Preprocessing Parameters
The verified training preprocessing parameters are recorded below:

* **Input Image Size:** 224 x 224 pixels
* **Color Mode:** RGB (3 channels)
* **Resize Method:** Bilinear interpolation (`Resize((224, 224))`)
* **Normalisation Mean:** `[0.485, 0.456, 0.406]`
* **Normalisation Std:** `[0.229, 0.224, 0.225]`
* **Tensor Format:** Float32 standard PyTorch tensor shape `[N, 3, 224, 224]`
* **Datatype:** Float32

## 3. Class Mapping
The model uses the exact class indexing order listed below:

| Index | Class Name | Slug Mapping |
| :--- | :--- | :--- |
| **0** | Brihadeeswarar | `brihadeeswarar` |
| **1** | Meenakshi-Amman | `meenakshi-amman` |
| **2** | Mahabalipuram | `mahabalipuram` |
| **3** | Gangaikonda-Cholapuram | `gangaikonda-cholapuram` |
| **4** | Airavatesvara | `airavatesvara` |
| **5** | Thirumalai-Nayakkar | `thirumalai-nayakkar` |
| **6** | Hard_Negatives | `hard_negatives` |

*Class indexing order has been confirmed against training scripts. No classes have been reordered.*

## 4. Verification Status
* **Status:** `PASS`
* **Configuration Written:** `ai/models/integration/recognition_config.json`
