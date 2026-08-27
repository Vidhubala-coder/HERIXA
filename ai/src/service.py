import os
import sys
import io
import json
import logging
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps
from torchvision import transforms
import onnxruntime
from typing import List

# Configure path and logging
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger

LOG_FILE = get_path("results", "service.log")
logger = setup_logger("service", log_file=LOG_FILE)

app = FastAPI(title="HERIXA Monument Recognition ONNX Service", version="1.1")

# Global variables for model session and config
ort_session = None
input_name = None
output_name = None
ai_service_state = "INITIALIZING"

CLASSES = [
    "Brihadeeswarar",
    "Meenakshi-Amman",
    "Mahabalipuram",
    "Gangaikonda-Cholapuram",
    "Airavatesvara",
    "Thirumalai-Nayakkar",
    "Hard_Negatives"
]

CONFIG = {
    "confidence_threshold": 0.65,
    "uncertainty_policy": "reject_low_confidence"
}

def load_onnx_model_globally():
    """Loads the ONNX model and recognition configurations once into memory."""
    global ort_session, input_name, output_name, CONFIG, ai_service_state
    
    ai_service_state = "INITIALIZING"
    onnx_path = get_path("models", "integration", "onnx", "herixa_phase3g.onnx")
    config_path = get_path("models", "integration", "recognition_config.json")
    
    # Load config
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                CONFIG = json.load(f)
            logger.info(f"Successfully loaded recognition config: {CONFIG}")
        except Exception as e:
            logger.error(f"Failed to load recognition config: {e}")
            
    # Structured diagnostic logs
    print("[HERIXA-MODEL] Loading recognition model...", flush=True)
    print(f"[HERIXA-MODEL] Model path: {onnx_path}", flush=True)
    model_exists = os.path.exists(onnx_path)
    print(f"[HERIXA-MODEL] Model exists: {model_exists}", flush=True)
    
    if model_exists:
        try:
            model_size = os.path.getsize(onnx_path)
            print(f"[HERIXA-MODEL] Model size: {model_size} bytes", flush=True)
        except Exception:
            print("[HERIXA-MODEL] Model size: N/A", flush=True)
    else:
        print("[HERIXA-MODEL] Model size: N/A", flush=True)
        
    print("[HERIXA-MODEL] Model format: ONNX", flush=True)
    
    # Load ONNX session
    if not model_exists:
        logger.error(f"ONNX model not found at {onnx_path}. Service starting without model loaded.")
        ai_service_state = "MODEL_UNAVAILABLE"
        print("[HERIXA-MODEL] MODEL_LOAD_FAILED", flush=True)
        print("[HERIXA-MODEL] Error type: FileNotFoundError", flush=True)
        print(f"[HERIXA-MODEL] Error message: ONNX model file not found at {onnx_path}", flush=True)
        print(f"[HERIXA-MODEL] Model path: {onnx_path}", flush=True)
        return False
        
    try:
        ort_session = onnxruntime.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        input_name = ort_session.get_inputs()[0].name
        output_name = ort_session.get_outputs()[0].name
        
        # Get shape info
        input_shape = ort_session.get_inputs()[0].shape
        output_shape = ort_session.get_outputs()[0].shape
        
        providers = ort_session.get_providers()
        device_provider = providers[0] if providers else "CPUExecutionProvider"
        
        # Class count and mapping
        class_count = len(CLASSES)
        class_mapping = CONFIG.get("class_mapping", {str(i): c for i, c in enumerate(CLASSES)})
        
        print(f"[HERIXA-MODEL] Execution provider/device: {device_provider}", flush=True)
        print(f"[HERIXA-MODEL] Input shape: {input_shape}", flush=True)
        print(f"[HERIXA-MODEL] Output shape: {output_shape}", flush=True)
        print(f"[HERIXA-MODEL] Class count: {class_count}", flush=True)
        print(f"[HERIXA-MODEL] Class mapping: {class_mapping}", flush=True)
        
        logger.info(f"ONNX model loaded globally. Input: {input_name}, Output: {output_name}")
        print("[HERIXA-MODEL] Model loaded successfully", flush=True)
        ai_service_state = "READY"
        return True
    except Exception as e:
        logger.error(f"Failed to load ONNX session: {e}")
        ai_service_state = "ERROR"
        print("[HERIXA-MODEL] MODEL_LOAD_FAILED", flush=True)
        print(f"[HERIXA-MODEL] Error type: {type(e).__name__}", flush=True)
        print(f"[HERIXA-MODEL] Error message: {str(e)}", flush=True)
        print(f"[HERIXA-MODEL] Model path: {onnx_path}", flush=True)
        return False

@app.on_event("startup")
def startup_event():
    # Force multiclass loading
    load_onnx_model_globally()
    # Diagnostic Flush stdout
    print("[HERIXA-AI] MODEL=herixa_phase3g.onnx", flush=True)
    print("[HERIXA-AI] CLASSES=7", flush=True)
    print("[HERIXA-AI] SERVICE=multiclass", flush=True)
    print("[HERIXA-AI] VERSION=phase3g", flush=True)
    print(f"[HERIXA-AI] Status: {ai_service_state}", flush=True)

@app.get("/health")
def health():
    """Returns health status indicating model readiness."""
    global ai_service_state, ort_session
    if ort_session is None:
        load_onnx_model_globally()
        
    status = "READY" if (ai_service_state == "READY" and ort_session is not None) else "MODEL_UNAVAILABLE"
    
    return {
        "status": status,
        "modelLoaded": ort_session is not None
    }

@app.get("/model_info")
def model_info():
    """Returns metadata about the currently registered ONNX model."""
    if ort_session is None:
        load_onnx_model_globally()
        if ort_session is None:
            raise HTTPException(status_code=503, detail="ONNX model session not initialized.")
            
    return {
        "success": True,
        "model_version": CONFIG.get("model_version", "phase3g"),
        "model_format": "onnx",
        "class_mapping": CONFIG.get("class_mapping", {str(i): c for i, c in enumerate(CLASSES)}),
        "confidence_threshold": CONFIG.get("confidence_threshold", 0.65),
        "uncertainty_policy": CONFIG.get("uncertainty_policy", "reject_low_confidence")
    }

from typing import List, Optional

@app.post("/predict")
async def predict(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None)
):
    """
    Accepts one or more images under 'image' or 'images', preprocesses them, runs ONNX inference,
    averages probability vectors across views (multi-view fusion),
    and executes confidence threshold policy.
    """
    global ort_session, input_name, output_name, CONFIG
    
    if ort_session is None:
        if not load_onnx_model_globally():
            return JSONResponse(
                status_code=503,
                content={"success": False, "error": "ONNX model session not initialized."}
            )
            
    input_files = []
    if image is not None:
        input_files.append(image)
    if images is not None:
        input_files.extend(images)
        
    val_trans = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    probs_list = []
    processed_count = 0
    
    # Store primary image dimensions
    primary_width = 0
    primary_height = 0
    primary_orientation = 0
    primary_format = "unknown"
    
    for file in input_files:
        mime = file.content_type
        if mime not in ["image/jpeg", "image/jpg", "image/png", "image/webp"]:
            logger.warning(f"Rejected upload with invalid MIME type: {mime}")
            continue
            
        try:
            content = await file.read()
            img = Image.open(io.BytesIO(content))
            
            # Read EXIF orientation (tag 274 is Orientation)
            orientation_val = 1
            try:
                exif = img.getexif()
                if exif and 274 in exif:
                    orientation_val = exif.get(274)
            except Exception as e_exif:
                logger.warning(f"Could not parse EXIF: {e_exif}")
                
            w, h = img.size
            if processed_count == 0:
                primary_width = w
                primary_height = h
                primary_orientation = orientation_val or 1
                primary_format = img.format or "unknown"
                
            # Apply EXIF transpose to auto-rotate image upright
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            
            # Preprocess to tensor
            tensor = val_trans(img).unsqueeze(0)
            input_np = tensor.numpy()
            
            # Run ONNX Runtime session inference
            onnx_outputs = ort_session.run([output_name], {input_name: input_np})
            logits = onnx_outputs[0][0]
            
            # Stable Softmax calculation
            exp_logits = np.exp(logits - np.max(logits))
            probs = exp_logits / np.sum(exp_logits)
            
            probs_list.append(probs)
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error processing uploaded image '{file.filename}': {e}")
            
    if processed_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid image files provided. Supported formats: JPEG, JPG, PNG, WEBP."
        )
        
    # Multi-view fusion (average probabilities vector)
    mean_probs = np.mean(probs_list, axis=0)
    pred_idx = int(np.argmax(mean_probs))
    max_prob = float(mean_probs[pred_idx])
    predicted_class = CLASSES[pred_idx]
    
    # Calculate margins
    sorted_probs = np.sort(mean_probs)[::-1]
    margin = float(sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
    second_confidence = float(sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
    
    # Confidence Policy validation
    class_thresholds = CONFIG.get("class_thresholds", {})
    threshold = class_thresholds.get(predicted_class, CONFIG.get("confidence_threshold", 0.35))
    
    # If prediction is Hard_Negatives or has low margin, reject it
    is_accepted = (max_prob >= threshold) and (predicted_class != "Hard_Negatives") and (margin >= 0.08)
    
    # Class friendly display names mapping
    class_names_friendly = {
        "Brihadeeswarar": "Brihadeeswarar Temple",
        "Meenakshi-Amman": "Meenakshi Amman Temple",
        "Mahabalipuram": "Mahabalipuram Shore Temple",
        "Gangaikonda-Cholapuram": "Gangaikonda Cholapuram",
        "Airavatesvara": "Airavatesvara Temple",
        "Thirumalai-Nayakkar": "Thirumalai Nayakkar Palace",
        "Hard_Negatives": "Hard Negatives"
    }
    predicted_class_name = class_names_friendly.get(predicted_class, predicted_class)
    
    # Class probabilities dictionary mapping
    class_probs_dict = {CLASSES[i]: float(mean_probs[i]) for i in range(len(CLASSES))}
    
    # Also add standard p_brihadeeswarar for backward compatibility
    p_brihadeeswarar = float(mean_probs[0])
    
    response = {
        "success": True,
        "predicted_class": predicted_class,
        "predicted_class_name": predicted_class_name,
        "confidence": max_prob,
        "second_confidence": second_confidence,
        "margin": margin,
        "probabilities": class_probs_dict,
        "model_version": CONFIG.get("model_version", "phase3g"),
        "class_count": len(CLASSES),
        "original_width": int(primary_width),
        "original_height": int(primary_height),
        "original_orientation": int(primary_orientation),
        "processed_width": 224,
        "processed_height": 224,
        "format": primary_format,
        
        # Backward compatibility fields
        "prediction": predicted_class if is_accepted else None,
        "monument": predicted_class if is_accepted else None,
        "accepted": is_accepted,
        "isKnown": is_accepted,
        "status": "recognized" if is_accepted else "uncertain",
        "p_brihadeeswarar": p_brihadeeswarar,
        "fallbackUsed": not is_accepted
    }
    
    logger.info(f"ONNX Prediction: views={processed_count}, predicted={predicted_class} (accepted={is_accepted}, conf={max_prob:.3f}, margin={margin:.3f})")
    return response

if __name__ == "__main__":
    import uvicorn
    # Local dev uvicorn uvicorn.run("service:app", host="127.0.0.1", port=8001, reload=False)
    # The port during local running should match what backend calls (e.g. 8001 or 8000)
    uvicorn.run("service:app", host="127.0.0.1", port=8001, reload=False)
