import os
import sys
import argparse
import numpy as np
import onnxruntime
from PIL import Image, ImageOps

CLASSES = [
    "Brihadeeswarar",
    "Meenakshi-Amman",
    "Mahabalipuram",
    "Gangaikonda-Cholapuram",
    "Airavatesvara",
    "Thirumalai-Nayakkar",
    "Hard_Negatives"
]

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def preprocess(img, apply_exif_transpose=True):
    if apply_exif_transpose:
        img = ImageOps.exif_transpose(img)
    # Direct resize (no CenterCrop)
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = (img_data - MEAN) / STD
    img_data = img_data.transpose(2, 0, 1)
    img_data = np.expand_dims(img_data, axis=0)
    return img_data, img.size

def main():
    parser = argparse.ArgumentParser(description="HERIXA Recognition Debugger")
    parser.add_argument("image_path", help="Path to the image to analyze")
    parser.add_argument("--no-exif", action="store_true", help="Disable EXIF transposition")
    args = parser.parse_args()
    
    if not os.path.exists(args.image_path):
        print(f"Error: Image file not found: {args.image_path}")
        sys.exit(1)
        
    ai_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    onnx_path = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    config_path = os.path.join(ai_root, "models", "integration", "recognition_config.json")
    
    if not os.path.exists(onnx_path):
        print(f"Error: ONNX model missing at: {onnx_path}")
        sys.exit(1)
        
    # Load config thresholds
    threshold = 0.35
    class_thresholds = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
                threshold = config_data.get("confidence_threshold", 0.35)
                class_thresholds = config_data.get("class_thresholds", {})
        except Exception:
            pass
            
    # Load image
    try:
        raw_img = Image.open(args.image_path)
        img_format = raw_img.format
        orig_size = raw_img.size
        # Check EXIF orientation
        exif = raw_img._getexif()
        orientation = None
        if exif:
            for tag, val in exif.items():
                from PIL import ExifTags
                decoded = ExifTags.TAGS.get(tag, tag)
                if decoded == 'Orientation':
                    orientation = val
                    break
    except Exception as e:
        print(f"Error loading image: {e}")
        sys.exit(1)
        
    # Preprocess
    apply_exif = not args.no_exif
    img = raw_img.convert("RGB")
    img_data, preprocessed_size = preprocess(img, apply_exif_transpose=apply_exif)
    
    # Run Inference
    session = onnxruntime.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    
    outputs = session.run([output_name], {input_name: img_data})
    logits = outputs[0][0]
    
    # Softmax
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    
    # Argmax
    sorted_indices = np.argsort(probs)[::-1]
    top1_idx = sorted_indices[0]
    top2_idx = sorted_indices[1]
    
    top1_class = CLASSES[top1_idx]
    top2_class = CLASSES[top2_idx]
    
    top1_conf = probs[top1_idx]
    top2_conf = probs[top2_idx]
    margin = top1_conf - top2_conf
    
    # Decision check
    active_threshold = class_thresholds.get(top1_class, threshold)
    
    is_accepted = True
    reason = "None"
    
    if top1_class == "Hard_Negatives":
        is_accepted = False
        reason = "HARD_NEGATIVE"
    elif top1_conf < active_threshold:
        is_accepted = False
        reason = "LOW_CONFIDENCE"
    elif margin < 0.08:
        is_accepted = False
        reason = "INSUFFICIENT_MARGIN"
        
    status = "IDENTIFIED" if is_accepted else "UNCERTAIN"
    
    print("\n================================================")
    print("HERIXA RECOGNITION DEBUG")
    print("================================================")
    print(f"Image:                  {os.path.basename(args.image_path)}")
    print(f"Original Dimensions:    {orig_size[0]}x{orig_size[1]}")
    print(f"Preprocessed Dimensions: {preprocessed_size[0]}x{preprocessed_size[1]}")
    print(f"Format:                 {img_format}")
    print(f"EXIF Orientation Tag:   {orientation if orientation else 'None'}")
    print(f"EXIF Transpose Applied: {apply_exif and orientation is not None}")
    print("\nModel:")
    print("  herixa_phase3g.onnx")
    print("\nPreprocessing:")
    print("  RGB Conversion")
    print("  Bilinear Resize to 224x224")
    print("  ImageNet Normalization (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])")
    print("\nPrediction:")
    print(f"  1. Class:             {top1_class}")
    print(f"     Confidence:        {top1_conf*100:.2f}%")
    print(f"  2. Class:             {top2_class}")
    print(f"     Confidence:        {top2_conf*100:.2f}%")
    print(f"  Margin:               {margin:.4f} (Required: >= 0.08)")
    print(f"  Active Threshold:     {active_threshold:.2f}")
    print("\nAll probabilities:")
    for i in range(len(CLASSES)):
        print(f"  {CLASSES[i]:<25}: {probs[i]*100:.2f}%")
        
    print("\nDecision:")
    print(f"  Status:               {status}")
    print(f"  Reason:               {reason}")
    print("================================================\n")

if __name__ == "__main__":
    main()
