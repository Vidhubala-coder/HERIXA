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
from typing import List, Optional

# Configure path and logging
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger

LOG_FILE = get_path("results", "service.log")
logger = setup_logger("service", log_file=LOG_FILE)

app = FastAPI(title="HERIXA Monument Recognition ONNX Hybrid Service", version="2.0")

# Global variables for model sessions and config
ort_session_3g = None
ort_session_3l = None
ort_session = None # Primary handle alias for health checks
input_name_3g = None
output_name_3g = None
input_name_3l = None
output_name_3l = None

ai_service_state = "INITIALIZING"
HYBRID_ENABLED = True
HYBRID_MARGIN = 0.10  # Hybrid 3G Preferred (0.10) Strategy

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
    "uncertainty_policy": "reject_low_confidence",
    "model_version": "hybrid_3g_3l",
    "hybrid_strategy": "3G Preferred (0.10)"
}

def load_onnx_model_globally():
    """Loads Phase 3G and Phase 3L ONNX models once into memory for hybrid inference."""
    global ort_session_3g, ort_session_3l, ort_session, input_name_3g, output_name_3g, input_name_3l, output_name_3l, CONFIG, ai_service_state
    
    ai_service_state = "INITIALIZING"
    print("[HERIXA-AI] Hybrid Model initialization started", flush=True)
    
    from pathlib import Path
    dir_path = Path(__file__).resolve().parent
    ai_root = dir_path.parent
    onnx_path_3g = str(ai_root / "models" / "integration" / "onnx" / "herixa_phase3g.onnx")
    onnx_path_3l = str(ai_root / "models" / "integration" / "onnx" / "phase3l" / "phase3l_candidate.onnx")
    config_path = str(ai_root / "models" / "integration" / "recognition_config.json")
    
    # Load config
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                CONFIG.update(json.load(f))
            CONFIG["model_version"] = "hybrid_3g_3l"
            CONFIG["hybrid_strategy"] = "3G Preferred (0.10)"
            logger.info(f"Successfully loaded recognition config: {CONFIG}")
        except Exception as e:
            logger.error(f"Failed to load recognition config: {e}")
            
    # Structured diagnostic logs
    print(f"[HERIXA-AI] Resolved Phase 3G path: {onnx_path_3g}", flush=True)
    print(f"[HERIXA-AI] Resolved Phase 3L path: {onnx_path_3l}", flush=True)
    
    g_exists = os.path.exists(onnx_path_3g)
    l_exists = os.path.exists(onnx_path_3l)
    
    print(f"[HERIXA-AI] Phase 3G model exists: {str(g_exists).lower()}", flush=True)
    print(f"[HERIXA-AI] Phase 3L model exists: {str(l_exists).lower()}", flush=True)
    
    if not (g_exists and l_exists):
        logger.error(f"ONNX models missing. 3G: {g_exists}, 3L: {l_exists}. Service failed.")
        ai_service_state = "FAILED"
        print("[HERIXA-AI] MODEL_INITIALIZATION_FAILED", flush=True)
        return False
        
    try:
        # Load Phase 3G
        ort_session_3g = onnxruntime.InferenceSession(onnx_path_3g, providers=["CPUExecutionProvider"])
        input_name_3g = ort_session_3g.get_inputs()[0].name
        output_name_3g = ort_session_3g.get_outputs()[0].name
        
        # Load Phase 3L
        ort_session_3l = onnxruntime.InferenceSession(onnx_path_3l, providers=["CPUExecutionProvider"])
        input_name_3l = ort_session_3l.get_inputs()[0].name
        output_name_3l = ort_session_3l.get_outputs()[0].name
        
        ort_session = ort_session_3g # Alias for health check compatibility
        
        providers = ort_session_3g.get_providers()
        device_provider = providers[0] if providers else "CPUExecutionProvider"
        
        print(f"[HERIXA-MODEL] Execution provider/device: {device_provider}", flush=True)
        print(f"[HERIXA-MODEL] Phase 3G input/output: {input_name_3g} / {output_name_3g}", flush=True)
        print(f"[HERIXA-MODEL] Phase 3L input/output: {input_name_3l} / {output_name_3l}", flush=True)
        print(f"[HERIXA-MODEL] Class count: {len(CLASSES)}", flush=True)
        print(f"[HERIXA-MODEL] Hybrid Strategy: 3G Preferred (0.10)", flush=True)
        
        logger.info("Phase 3G and Phase 3L ONNX sessions loaded globally successfully.")
        print("[HERIXA-AI] Model loaded successfully", flush=True)
        print("[HERIXA-AI] Model status: READY", flush=True)
        ai_service_state = "READY"
        return True
    except Exception as e:
        import traceback
        logger.error(f"Failed to load ONNX sessions: {e}")
        ai_service_state = "FAILED"
        print("[HERIXA-AI] MODEL_INITIALIZATION_FAILED", flush=True)
        print(f"[HERIXA-AI] Reason: {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        return False

@app.on_event("startup")
def startup_event():
    load_onnx_model_globally()
    print("[HERIXA-AI] MODEL=hybrid_3g_3l.onnx", flush=True)
    print("[HERIXA-AI] STRATEGY=3G Preferred (0.10)", flush=True)
    print("[HERIXA-AI] CLASSES=7", flush=True)
    print("[HERIXA-AI] SERVICE=multiclass", flush=True)
    print("[HERIXA-AI] VERSION=hybrid_3g_3l", flush=True)
    print(f"[HERIXA-AI] Status: {ai_service_state}", flush=True)

@app.get("/health")
def health():
    """Returns health status indicating model readiness."""
    global ai_service_state, ort_session_3g, ort_session_3l
    
    loaded_val = (ort_session_3g is not None) and (ort_session_3l is not None)
    status_val = ai_service_state
    
    response_content = {
        "status": status_val,
        "modelLoaded": loaded_val,
        "hybrid_mode": HYBRID_ENABLED
    }
    
    if status_val == "READY" and loaded_val:
        return JSONResponse(status_code=200, content=response_content)
    elif status_val == "INITIALIZING":
        return JSONResponse(status_code=200, content=response_content)
    else:
        return JSONResponse(status_code=503, content=response_content)

@app.get("/model_info")
def model_info():
    """Returns metadata about the registered hybrid ONNX models."""
    if ort_session_3g is None or ort_session_3l is None:
        load_onnx_model_globally()
        if ort_session_3g is None or ort_session_3l is None:
            raise HTTPException(status_code=503, detail="ONNX model sessions not initialized.")
            
    return {
        "success": True,
        "model_version": "hybrid_3g_3l",
        "hybrid_strategy": "3G Preferred (0.10)",
        "models": ["herixa_phase3g.onnx", "phase3l_candidate.onnx"],
        "class_mapping": CONFIG.get("class_mapping", {str(i): c for i, c in enumerate(CLASSES)}),
        "confidence_threshold": CONFIG.get("confidence_threshold", 0.65),
        "uncertainty_policy": CONFIG.get("uncertainty_policy", "reject_low_confidence")
    }

@app.post("/predict")
async def predict(
    image: Optional[UploadFile] = File(None),
    images: Optional[List[UploadFile]] = File(None)
):
    """
    Accepts one or more images under 'image' or 'images', preprocesses them,
    runs Phase 3G and Phase 3L ONNX inference, applies Hybrid 3G Preferred (0.10) decision logic,
    averages probability vectors across views (multi-view fusion),
    and executes confidence threshold policy.
    """
    global ort_session_3g, ort_session_3l, CONFIG, HYBRID_ENABLED, HYBRID_MARGIN
    
    if ort_session_3g is None or ort_session_3l is None:
        if not load_onnx_model_globally():
            return JSONResponse(
                status_code=503,
                content={"success": False, "error": "ONNX model sessions not initialized."}
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
    hybrid_winners = []
    processed_count = 0
    
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
                
            img = ImageOps.exif_transpose(img)
            img = img.convert("RGB")
            
            tensor = val_trans(img).unsqueeze(0)
            input_np = tensor.numpy()
            
            # Phase 3G Inference
            outputs_3g = ort_session_3g.run([output_name_3g], {input_name_3g: input_np})
            logits_3g = outputs_3g[0][0]
            exp_3g = np.exp(logits_3g - np.max(logits_3g))
            probs_3g = exp_3g / np.sum(exp_3g)
            idx_3g = int(np.argmax(probs_3g))
            conf_3g = float(probs_3g[idx_3g])
            
            if HYBRID_ENABLED:
                # Phase 3L Inference
                outputs_3l = ort_session_3l.run([output_name_3l], {input_name_3l: input_np})
                logits_3l = outputs_3l[0][0]
                exp_3l = np.exp(logits_3l - np.max(logits_3l))
                probs_3l = exp_3l / np.sum(exp_3l)
                idx_3l = int(np.argmax(probs_3l))
                conf_3l = float(probs_3l[idx_3l])
                
                # Hybrid 3G Preferred (0.10) Strategy Logic
                if conf_3l > conf_3g + HYBRID_MARGIN:
                    final_probs = probs_3l
                    winner = "Phase 3L"
                else:
                    final_probs = probs_3g
                    winner = "Phase 3G"
            else:
                final_probs = probs_3g
                winner = "Phase 3G Standalone"
                
            probs_list.append(final_probs)
            hybrid_winners.append(winner)
            processed_count += 1
            
        except Exception as e:
            logger.error(f"Error processing uploaded image '{file.filename}': {e}")
            
    if processed_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No valid image files provided. Supported formats: JPEG, JPG, PNG, WEBP."
        )
        
    # Multi-view fusion (average probabilities vector across views)
    mean_probs = np.mean(probs_list, axis=0)
    pred_idx = int(np.argmax(mean_probs))
    max_prob = float(mean_probs[pred_idx])
    predicted_class = CLASSES[pred_idx]
    
    sorted_probs = np.sort(mean_probs)[::-1]
    margin = float(sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
    second_confidence = float(sorted_probs[1]) if len(sorted_probs) > 1 else 0.0
    
    # Confidence Policy validation
    class_thresholds = CONFIG.get("class_thresholds", {})
    threshold = class_thresholds.get(predicted_class, CONFIG.get("confidence_threshold", 0.65))
    
    is_accepted = (max_prob >= threshold) and (predicted_class != "Hard_Negatives") and (margin >= 0.08)
    
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
    class_probs_dict = {CLASSES[i]: float(mean_probs[i]) for i in range(len(CLASSES))}
    p_brihadeeswarar = float(mean_probs[0])
    
    most_common_winner = max(set(hybrid_winners), key=hybrid_winners.count) if hybrid_winners else "Phase 3G"
    
    response = {
        "success": True,
        "predicted_class": predicted_class,
        "predicted_class_name": predicted_class_name,
        "confidence": max_prob,
        "second_confidence": second_confidence,
        "margin": margin,
        "probabilities": class_probs_dict,
        "model_version": "hybrid_3g_3l",
        "hybrid_strategy": "3G Preferred (0.10)",
        "hybrid_winner": most_common_winner,
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
    
    logger.info(f"ONNX Hybrid Prediction: views={processed_count}, winner={most_common_winner}, predicted={predicted_class} (accepted={is_accepted}, conf={max_prob:.3f}, margin={margin:.3f})")
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("service:app", host="127.0.0.1", port=8001, reload=False)
