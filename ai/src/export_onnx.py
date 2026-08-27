import os
import sys

# Configure stdout and stderr to use UTF-8 to prevent charmap encoding errors on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import torch
import torch.nn as nn

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path

import argparse

parser = argparse.ArgumentParser(description="HERIXA ONNX Export")
parser.add_argument("--multiclass", action="store_true", help="Enable 7-class multiclass mode")
args, unknown = parser.parse_known_args()

IS_MULTICLASS = args.multiclass

if IS_MULTICLASS:
    MODEL_PATH = get_path("models", "best_model_multiclass.pth")
    ONNX_PATH = get_path("models", "best_model_multiclass.onnx")
    NUM_CLASSES = 7
else:
    MODEL_PATH = get_path("models", "best_model.pth")
    ONNX_PATH = get_path("models", "best_model.onnx")
    NUM_CLASSES = 2

def export_to_onnx():
    print(f"Loading checkpoint from: {MODEL_PATH}")
    if not os.path.exists(MODEL_PATH):
        print("ERROR: Checkpoint missing.")
        sys.exit(1)
        
    checkpoint = torch.load(MODEL_PATH, map_location="cpu")
    
    # Instantiate architecture
    try:
        from torchvision.models import efficientnet_b0
        model = efficientnet_b0()
    except Exception:
        import torchvision.models as models
        model = models.efficientnet_b0()
        
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, NUM_CLASSES)
    )
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    
    # Prepare dummy input matching our input dimensions (1, 3, 224, 224)
    dummy_input = torch.randn(1, 3, 224, 224)
    
    # Export parameters
    opset_version = 18
    
    print(f"Exporting model to ONNX format: {ONNX_PATH}")
    try:
        torch.onnx.export(
            model,
            dummy_input,
            ONNX_PATH,
            export_params=True,
            opset_version=opset_version,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={
                "input": {0: "batch_size"},
                "output": {0: "batch_size"}
            }
        )
        print("ONNX model exported successfully.")
    except Exception as e:
        print(f"ERROR: Export failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    export_to_onnx()
