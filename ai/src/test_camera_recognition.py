import os
import sys
import numpy as np
import onnxruntime
from PIL import Image, ImageOps

CLASSES = [
    "brihadeeswarar",
    "meenakshi-amman",
    "mahabalipuram",
    "gangaikonda-cholapuram",
    "airavatesvara",
    "thirumalai-nayakkar",
    "hard_negatives"
]

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def preprocess(img, apply_exif_transpose=True):
    if apply_exif_transpose:
        img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = (img_data - MEAN) / STD
    img_data = img_data.transpose(2, 0, 1)
    img_data = np.expand_dims(img_data, axis=0)
    return img_data

def run_inference(session, img_data):
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    outputs = session.run([output_name], {input_name: img_data})
    logits = outputs[0][0]
    exp_logits = np.exp(logits - np.max(logits))
    probs = exp_logits / np.sum(exp_logits)
    return probs

def format_probs(probs):
    return ", ".join([f"{CLASSES[i]}: {probs[i]:.4f}" for i in range(len(CLASSES))])

def main():
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    onnx_path = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    uploads_dir = r"C:\Users\LENOVO\Desktop\AR model\backend\uploads\monuments"
    val_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation")
    
    if not os.path.exists(onnx_path):
        print(f"Error: ONNX model missing: {onnx_path}")
        return
        
    session = onnxruntime.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
    print(f"Loaded ONNX model: {os.path.basename(onnx_path)}")
    
    # Map upload files to classes
    camera_scans = [
        {"file": "brihadeeswarar.jpeg", "class": "brihadeeswarar", "val_sample": "Big_temple-Thanjavur.JPG"},
        {"file": "meenakshi-amman-1786967984977.jpeg", "class": "meenakshi-amman", "val_sample": "01MaduraiMeenakshiTempleGopuramCloserView.jpg"},
        {"file": "mahabalipuram-1786967943471.jpeg", "class": "mahabalipuram", "val_sample": "10Shore_Temple_Mahavalipuram.jpg"},
        {"file": "gangaikonda-cholapuram-1786967886745.jpeg", "class": "gangaikonda-cholapuram", "val_sample": "10.Gangai_konda_cholapuram.jpg"},
        {"file": "airavatesvara-1786966049222.jpeg", "class": "airavatesvara", "val_sample": "1-Airavatesvara_Temple_-_Darasuram_-_Tamilnadu_-_Gopuram_and_plinth_detail.jpg"},
        {"file": "thirumalai-nayakkar-1786975851978.jpeg", "class": "thirumalai-nayakkar", "val_sample": "A_monochrome_palace.jpg"}
    ]
    
    failures = 0
    
    for scan in camera_scans:
        cam_file_path = os.path.join(uploads_dir, scan["file"])
        val_file_path = os.path.join(val_dir, scan["class"], scan["val_sample"])
        
        if not os.path.exists(cam_file_path):
            print(f"Warning: Camera image file not found: {cam_file_path}")
            continue
        if not os.path.exists(val_file_path):
            print(f"Warning: Validation image file not found: {val_file_path}")
            continue
            
        print("\n" + "="*80)
        print(f"CAMERA IMAGE VS VALIDATION IMAGE: {scan['class'].upper()}")
        print("="*80)
        
        # A: Camera Image prediction
        try:
            cam_img = Image.open(cam_file_path)
            cam_data = preprocess(cam_img, apply_exif_transpose=True)
            cam_probs = run_inference(session, cam_data)
            cam_idx = np.argsort(cam_probs)[::-1]
            cam_pred = CLASSES[cam_idx[0]]
            
            print("CAMERA IMAGE:")
            print(f"  expected={scan['class']}")
            print(f"  predicted={cam_pred}")
            print(f"  probabilities={format_probs(cam_probs)}")
        except Exception as e:
            print(f"  Error reading camera image: {e}")
            cam_pred = "error"
            
        # B: Validation Image prediction
        try:
            val_img = Image.open(val_file_path)
            val_data = preprocess(val_img, apply_exif_transpose=True)
            val_probs = run_inference(session, val_data)
            val_idx = np.argsort(val_probs)[::-1]
            val_pred = CLASSES[val_idx[0]]
            
            print("\nVALIDATION IMAGE:")
            print(f"  expected={scan['class']}")
            print(f"  predicted={val_pred}")
            print(f"  probabilities={format_probs(val_probs)}")
        except Exception as e:
            print(f"  Error reading validation image: {e}")
            val_pred = "error"
            
        # Failure classification
        if cam_pred == scan["class"]:
            failure_mode = "CORRECT"
        else:
            failure_mode = "MODEL_CONFUSION"
            failures += 1
            
        print(f"\nFailure Analysis Mode: {failure_mode}")
        
    print("\n" + "="*80)
    print(f"TEST RUN COMPLETED. Failures: {failures} out of {len(camera_scans)}")
    print("="*80)
    
    if failures > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
