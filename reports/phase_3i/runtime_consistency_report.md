# HERIXA Phase 3I — Runtime Consistency Report

This report documents the validation of preprocessing and class mapping parameters between all components of the recognition pipeline.

## 1. Parameter Audits
* **Model class names mapping match:** **PASS**
* **Expected Input shape:** `[batch_size, 3, 224, 224]` (Bilinear interpolation resize)
* **Image Normalization Mean:** `[0.485, 0.456, 0.406]`
* **Image Normalization Std:** `[0.229, 0.224, 0.225]`

## 2. Configuration Mappings
Below is the verified mappings loaded from `recognition_config.json`:
```json
{
  "model_version": "phase3g",
  "model_format": "onnx",
  "checkpoint": "best_model_multiclass_v2.pth",
  "class_mapping": {
    "0": "Brihadeeswarar",
    "1": "Meenakshi-Amman",
    "2": "Mahabalipuram",
    "3": "Gangaikonda-Cholapuram",
    "4": "Airavatesvara",
    "5": "Thirumalai-Nayakkar",
    "6": "Hard_Negatives"
  },
  "preprocessing": {
    "image_size": 224,
    "color_mode": "RGB",
    "normalization": {
      "mean": [
        0.485,
        0.456,
        0.406
      ],
      "std": [
        0.229,
        0.224,
        0.225
      ]
    },
    "resize_method": "Resize((224, 224))",
    "tensor_conversion": "ToTensor()"
  },
  "confidence_threshold": 0.65,
  "threshold_status": "configurable_experimental",
  "uncertainty_policy": "reject_low_confidence"
}
```

## 3. Preprocessing Consistency Verdict
* **Classes Ordering Verify:** `PASS`
* **Mean and Standard Deviation Match:** `PASS`
* **Color Channels (RGB):** `PASS` (3 channels, Pillow RGB mode conversion)
* **Consistency status:** `PASS`
