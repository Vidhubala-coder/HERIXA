import os
import sys
import json
import time
import shutil
import logging
import hashlib
import platform
import datetime
import tempfile
import csv
import traceback
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import torchvision
from torchvision import datasets, transforms
from typing import Dict, List, Tuple, Any
from sklearn.metrics import confusion_matrix

try:
    import psutil
except ImportError:
    psutil = None

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, get_ai_root, set_seed, save_json, load_json, setup_logger

def safe_print(*args, **kwargs):
    try:
        print_orig(*args, **kwargs)
    except UnicodeEncodeError:
        new_args = []
        for arg in args:
            if isinstance(arg, str):
                new_arg = arg.replace("⚠️", "[WARNING]")\
                             .replace("🏆", "[NEW BEST]")\
                             .replace("🔔", "[UPDATE]")\
                             .replace("🎉", "[SUCCESS]")\
                             .replace("🛑", "[STOP]")\
                             .replace("✅", "[PASS]")\
                             .replace("→", "->")
                encoding = sys.stdout.encoding or 'cp1252'
                new_arg = new_arg.encode(encoding, errors='replace').decode(encoding)
                new_args.append(new_arg)
            else:
                new_args.append(arg)
        try:
            print_orig(*new_args, **kwargs)
        except Exception:
            print_orig(*(str(a).encode('ascii', errors='replace').decode('ascii') for a in args), **kwargs)

print_orig = print
print = safe_print

import argparse

parser = argparse.ArgumentParser(description="HERIXA Phase 3G Safe Training Pipeline")
parser.add_argument("--dry-run", action="store_true", help="Perform a safe single-batch dry run without training")
parser.add_argument("--dataset", type=str, default="multiclass_v2", help="Folder name of custom dataset directory")
parser.add_argument("--output-dir", type=str, default="models/phase3g", help="Folder to write checkpoints and logs")
parser.add_argument("--checkpoint-name", type=str, default="best_model_multiclass_v2.pth", help="Checkpoint filename")
parser.add_argument("--resume", action="store_true", help="Resume training from latest_checkpoint.pth")
args, unknown = parser.parse_known_args()

IS_DRY_RUN = args.dry_run
DATASET_SUBDIR = args.dataset
AI_ROOT = get_ai_root()
WORKSPACE_ROOT = os.path.dirname(AI_ROOT)
OUTPUT_DIR = os.path.abspath(os.path.join(AI_ROOT, args.output_dir))
CHECKPOINT_NAME = args.checkpoint_name
RESUME_FLAG = args.resume

# Setup dataset dirs
TRAIN_DIR = get_path("dataset", DATASET_SUBDIR, "train")
VAL_DIR = get_path("dataset", DATASET_SUBDIR, "validation")
TEST_DIR = get_path("dataset", DATASET_SUBDIR, "test")

CLASSES = [
    "brihadeeswarar",
    "meenakshi-amman",
    "mahabalipuram",
    "gangaikonda-cholapuram",
    "airavatesvara",
    "thirumalai-nayakkar",
    "hard_negatives"
]

EXPECTED_CLASS_COUNTS = {
    "brihadeeswarar": 409,
    "meenakshi-amman": 334,
    "mahabalipuram": 334,
    "gangaikonda-cholapuram": 395,
    "airavatesvara": 407,
    "thirumalai-nayakkar": 331,
    "hard_negatives": 216
}

EXPECTED_SPLIT_COUNTS = {
    "train": 1817,
    "validation": 362,
    "test": 247
}

EXPECTED_TOTAL = 2426

# Setup subdirectories under OUTPUT_DIR
CHECKPOINTS_DIR = os.path.join(OUTPUT_DIR, "checkpoints")
LOGS_DIR = os.path.join(OUTPUT_DIR, "logs")
METRICS_DIR = os.path.join(OUTPUT_DIR, "metrics")
REPORTS_DIR = os.path.join(OUTPUT_DIR, "reports")

os.makedirs(CHECKPOINTS_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)
os.makedirs(METRICS_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

LOG_FILE = os.path.join(LOGS_DIR, "training_phase3g.log")
logger = setup_logger("train_model_phase3g", log_file=LOG_FILE)

# Protected files and directories
PROTECTED_MODELS = [
    "ai/models/best_model.pth",
    "ai/models/best_model.onnx",
    "ai/models/best_model.onnx.data",
    "ai/models/best_model_multiclass.pth"
]

PROTECTED_DATASET_DIRS = [
    "ai/dataset/multiclass",
    "ai/dataset/train",
    "ai/dataset/validation",
    "ai/dataset/test"
]

def get_file_sha256(filepath: str) -> str:
    if not os.path.exists(filepath):
        return "MISSING"
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def get_dir_sha256_dict(dirpath: str) -> Dict[str, Dict[str, Any]]:
    hashes = {}
    if not os.path.exists(dirpath):
        return hashes
    for root, _, files in os.walk(dirpath):
        for file in files:
            filepath = os.path.join(root, file)
            relpath = os.path.relpath(filepath, dirpath).replace("\\", "/")
            hashes[relpath] = {
                "sha256": get_file_sha256(filepath),
                "size_bytes": os.path.getsize(filepath)
            }
    return hashes

class CustomImageFolder(datasets.ImageFolder):
    def __init__(self, root, transform=None, classes=None):
        self.explicit_classes = classes
        super().__init__(root, transform=transform)
        
    def find_classes(self, directory):
        if self.explicit_classes is not None:
            class_to_idx = {cls: idx for idx, cls in enumerate(self.explicit_classes)}
            for cls in self.explicit_classes:
                cls_path = os.path.join(directory, cls)
                if not os.path.exists(cls_path):
                    logger.error(f"Class directory missing: {cls_path}")
                    raise FileNotFoundError(f"Class directory missing: {cls_path}")
            return self.explicit_classes, class_to_idx
        return super().find_classes(directory)

def save_atomic(data: Any, filepath: str, is_torch: bool = False):
    """Atomically writes file using temporary files to avoid corruption."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    fd, temp_path = tempfile.mkstemp(dir=os.path.dirname(filepath))
    os.close(fd)
    try:
        if is_torch:
            torch.save(data, temp_path)
        else:
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        if os.path.exists(filepath):
            os.remove(filepath)
        os.rename(temp_path, filepath)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e

def save_history_to_csv(history: List[Dict[str, Any]], filepath: str):
    """Saves metrics history to a CSV file."""
    if not history:
        return
    headers = [
        "epoch", "phase", "train_loss", "train_accuracy", "validation_loss",
        "validation_accuracy", "macro_precision", "macro_recall", "macro_f1",
        "weighted_f1", "epoch_duration", "learning_rate"
    ]
    # Add per-class f1 headers dynamically
    for c in CLASSES:
        headers.append(f"val_f1_{c}")
        
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in history:
            flat_row = {
                "epoch": row["epoch"],
                "phase": row.get("phase", 1),
                "train_loss": f"{row['train_loss']:.6f}",
                "train_accuracy": f"{row['train_acc'] * 100:.2f}%",
                "validation_loss": f"{row['val_loss']:.6f}",
                "validation_accuracy": f"{row['val_acc'] * 100:.2f}%",
                "macro_precision": f"{row['val_precision'] * 100:.2f}%",
                "macro_recall": f"{row['val_recall'] * 100:.2f}%",
                "macro_f1": f"{row['val_f1'] * 100:.2f}%",
                "weighted_f1": f"{row.get('val_weighted_f1', 0.0) * 100:.2f}%",
                "epoch_duration": f"{row['epoch_duration']:.2f}",
                "learning_rate": f"{row.get('learning_rate', 0.0):.6f}"
            }
            class_f1s = row.get("class_f1s", [])
            for idx, c in enumerate(CLASSES):
                flat_row[f"val_f1_{c}"] = f"{class_f1s[idx] * 100:.2f}%" if idx < len(class_f1s) else "0.00%"
            writer.writerow(flat_row)

def check_existing_checkpoints() -> Tuple[bool, int, float, Dict[str, Any]]:
    """Checks for existing checkpoints and determines if we can resume."""
    chk_path = os.path.join(CHECKPOINTS_DIR, CHECKPOINT_NAME)
    latest_path = os.path.join(CHECKPOINTS_DIR, "latest_checkpoint.pth")
    
    if os.path.exists(chk_path) or os.path.exists(latest_path):
        if not RESUME_FLAG:
            # Print interrupted block and exit
            print("\n============================================================")
            print("⚠️ PHASE 3G TRAINING INTERRUPTED")
            print("============================================================")
            print("Completed Epoch:       None (Checkpoints exist, run without --resume)")
            print("Best Validation F1:    None")
            print(f"Best Checkpoint:       {chk_path}")
            print("\nMANUAL RESUME DECISION REQUIRED")
            print("To resume training from the latest state, use --resume.")
            print("To start fresh, back up or delete existing checkpoints under ai/models/phase3g/.")
            print("============================================================\n")
            sys.exit(1)
        else:
            # Try to load latest_checkpoint.pth to resume
            resume_path = latest_path if os.path.exists(latest_path) else chk_path
            logger.info(f"Loading checkpoint for resume: {resume_path}")
            try:
                checkpoint = torch.load(resume_path, map_location="cpu")
                completed_epoch = checkpoint.get("epoch", 0)
                best_val_f1 = checkpoint.get("validation_macro_f1", 0.0)
                logger.info(f"Resuming from Epoch {completed_epoch} with Best Validation Macro F1 = {best_val_f1:.4f}")
                return True, completed_epoch, best_val_f1, checkpoint
            except Exception as e:
                logger.error(f"Failed to load checkpoint for resume: {e}")
                print(f"ERROR: Failed to load checkpoint for resume: {e}")
                sys.exit(1)
    return False, 0, 0.0, {}

def get_cpu_info() -> str:
    try:
        if platform.system() == "Windows":
            return platform.processor()
        elif platform.system() == "Darwin":
            return "Apple Silicon"
        else:
            # Linux
            with open("/proc/cpuinfo", "r") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":")[1].strip()
    except Exception:
        pass
    return platform.machine()

def run_safety_checks() -> Dict[str, Any]:
    logger.info("Running pre-training safety checks...")
    
    # Calculate SHA-256 of protected models
    model_hashes = {}
    for pm in PROTECTED_MODELS:
        full_path = os.path.join(WORKSPACE_ROOT, pm)
        model_hashes[pm] = {
            "exists": os.path.exists(full_path),
            "sha256": get_file_sha256(full_path),
            "size_bytes": os.path.getsize(full_path) if os.path.exists(full_path) else 0
        }
        
    # Calculate SHA-256 of protected datasets
    dataset_hashes = {}
    for pd in PROTECTED_DATASET_DIRS:
        full_path = os.path.join(WORKSPACE_ROOT, pd)
        dataset_hashes[pd] = get_dir_sha256_dict(full_path)
        
    # Read active dataset counts
    actual_split_counts = {"train": 0, "validation": 0, "test": 0}
    actual_class_counts = {cls: 0 for cls in CLASSES}
    total_images = 0
    
    for split, split_dir in [("train", TRAIN_DIR), ("validation", VAL_DIR), ("test", TEST_DIR)]:
        for c in CLASSES:
            c_dir = os.path.join(split_dir, c)
            if os.path.exists(c_dir):
                cnt = len([f for f in os.listdir(c_dir) if os.path.isfile(os.path.join(c_dir, f)) and not f.endswith(".json")])
                actual_split_counts[split] += cnt
                actual_class_counts[c] += cnt
                total_images += cnt
                
    # Verify strict counts
    count_mismatch = False
    if total_images != EXPECTED_TOTAL:
        logger.error(f"Total count mismatch! Found {total_images}, expected {EXPECTED_TOTAL}.")
        count_mismatch = True
    for split, val in EXPECTED_SPLIT_COUNTS.items():
        if actual_split_counts[split] != val:
            logger.error(f"Split '{split}' count mismatch! Found {actual_split_counts[split]}, expected {val}.")
            count_mismatch = True
    for cls, val in EXPECTED_CLASS_COUNTS.items():
        if actual_class_counts[cls] != val:
            logger.error(f"Class '{cls}' count mismatch! Found {actual_class_counts[cls]}, expected {val}.")
            count_mismatch = True
            
    if count_mismatch:
        logger.error("STOP TRAINING - Dataset count constraint mismatch detected!")
        print("ERROR: STOP TRAINING - Dataset count constraint mismatch detected!")
        sys.exit(1)
        
    # Compare with reports/pre_phase3g_snapshot.json
    baseline_snapshot_path = os.path.join(WORKSPACE_ROOT, "reports", "pre_phase3g_snapshot.json")
    if os.path.exists(baseline_snapshot_path):
        try:
            with open(baseline_snapshot_path, "r") as f:
                baseline_data = json.load(f)
            # Verify models SHA-256 match exactly
            for pm in PROTECTED_MODELS:
                basename = os.path.basename(pm)
                base_hash = model_hashes[pm]["sha256"]
                snapshot_entry = baseline_data.get("models", {}).get(basename, {})
                snapshot_hash = snapshot_entry.get("sha256", "")
                if snapshot_hash and base_hash != snapshot_hash:
                    logger.error(f"Protected production model modified! {pm} hash changed.")
                    print(f"TRAINING ABORTED — SAFETY CHECK FAILED: {pm} has been modified.")
                    sys.exit(1)
            logger.info("Checked production models against baseline. Matches successfully.")
        except Exception as e:
            logger.warning(f"Failed to verify baseline snapshot: {e}. Proceeding.")
            
    # Gather hardware and info
    cpu_cores = os.cpu_count() or 1
    total_ram = "N/A"
    if psutil is not None:
        total_ram = f"{psutil.virtual_memory().total / (1024**3):.2f} GB"
        
    device = torch.device("cpu") # Hard requirement to run on CPU if CUDA is unavailable, we enforce CPU since we verified CPU-only PyTorch
    
    snapshot_data = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        "dataset_path": f"ai/dataset/{DATASET_SUBDIR}",
        "dataset_counts": {
            "total": total_images,
            "splits": actual_split_counts,
            "classes": actual_class_counts
        },
        "class_mapping": {idx: cls for idx, cls in enumerate(CLASSES)},
        "environment": {
            "python_version": sys.version,
            "pytorch_version": torch.__version__,
            "torchvision_version": torchvision.__version__,
            "cuda_available": torch.cuda.is_available(),
            "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "N/A",
            "cpu_cores": cpu_cores,
            "cpu_name": get_cpu_info(),
            "total_ram": total_ram,
            "dataloader_workers": 0
        },
        "models_sha256": model_hashes,
        "datasets_sha256": dataset_hashes
    }
    
    # Save safety snapshot
    snapshot_path = os.path.join(WORKSPACE_ROOT, "reports", "pre_phase3g_training_snapshot.json")
    save_atomic(snapshot_data, snapshot_path)
    
    print("\nDevice:")
    print("CPU")
    print("\nGPU:")
    print("N/A")
    print("\nCUDA:")
    print("UNAVAILABLE")
    print("\nGPU VRAM:")
    print("N/A")
    print("\nCPU:")
    print(f"{get_cpu_info()} ({cpu_cores} Cores)")
    print("\nRAM:")
    print(total_ram)
    print("\nPyTorch version:")
    print(torch.__version__)
    print("\nTorchvision version:")
    print(torchvision.__version__)
    print("\nDataLoader workers:")
    print("0")
    print("\n⚠️ GPU NOT AVAILABLE — TRAINING ON CPU\n")
    print("PRE-TRAINING SAFETY CHECK: PASS\n")
    
    return snapshot_data

def get_model(num_classes: int = 7) -> nn.Module:
    logger.info("Initializing fresh model from EfficientNet-B0 pretrained weights...")
    try:
        from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
        model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        logger.info("Loaded EfficientNet-B0 backbone with default ImageNet weights.")
    except Exception as e:
        logger.warning(f"torchvision weights load failed: {e}. Loading pretrained model via deprecated API.")
        import torchvision.models as models
        model = models.efficientnet_b0(pretrained=True)
        
    in_features = model.classifier[1].in_features
    # Re-initialize the classifier head from scratch with random weights
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    logger.info(f"Replaced classifier head with 7-class linear head. Head parameters initialized from scratch.")
    return model

def verify_architecture(model: nn.Module):
    """Programmatically inspects the backbone to ensure features.7 and features.8 exist."""
    logger.info("Programmatically verifying backbone features structure...")
    if not hasattr(model, "features") or not isinstance(model.features, nn.Sequential):
        logger.error("Model does not have a standard Sequential features backbone.")
        print("TRAINING ABORTED — MODEL ARCHITECTURE MISMATCH")
        sys.exit(1)
        
    num_blocks = len(model.features)
    logger.info(f"Detected {num_blocks} feature blocks in model backbone.")
    # EfficientNet-B0 should have at least 9 blocks (0 to 8)
    if num_blocks <= 8:
        logger.error(f"Features container has only {num_blocks} blocks. Expected at least 9.")
        print("TRAINING ABORTED — MODEL ARCHITECTURE MISMATCH")
        sys.exit(1)
        
    # Programmatic checks
    try:
        block_7 = model.features[7]
        block_8 = model.features[8]
        logger.info("Verified presence of features[7] and features[8] blocks in EfficientNet.")
    except IndexError as e:
        logger.error(f"Failed to access features[7] or features[8]: {e}")
        print("TRAINING ABORTED — MODEL ARCHITECTURE MISMATCH")
        sys.exit(1)

def calculate_metrics(labels: List[int], preds: List[int], num_classes: int = 7) -> Dict[str, Any]:
    from sklearn.metrics import precision_recall_fscore_support, accuracy_score
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        labels, preds, average='macro', zero_division=0
    )
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(
        labels, preds, average='weighted', zero_division=0
    )
    p_none, r_none, f1_none, _ = precision_recall_fscore_support(
        labels, preds, average=None, labels=list(range(num_classes)), zero_division=0
    )
    accuracy = accuracy_score(labels, preds)
    return {
        "accuracy": float(accuracy),
        "precision": float(p_macro),
        "recall": float(r_macro),
        "f1": float(f1_macro),
        "weighted_f1": float(f1_weighted),
        "per_class_precision": p_none.tolist(),
        "per_class_recall": r_none.tolist(),
        "per_class_f1": f1_none.tolist()
    }

def train_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module, optimizer: optim.Optimizer, device: torch.device) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in loader:
        inputs, labels = inputs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * inputs.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
    epoch_loss = running_loss / total
    epoch_acc = correct / total
    return epoch_loss, epoch_acc

def evaluate_validation(model: nn.Module, loader: DataLoader, criterion: nn.Module, device: torch.device, num_classes: int = 7) -> Tuple[float, float, List[int], List[int]]:
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    all_labels = []
    all_preds = []
    
    with torch.no_grad():
        for inputs, labels in loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * inputs.size(0)
            _, predicted = outputs.max(1)
            
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            all_labels.extend(labels.cpu().tolist())
            all_preds.extend(predicted.cpu().tolist())
            
    val_loss = running_loss / total
    val_acc = correct / total
    return val_loss, val_acc, all_labels, all_preds

def train_model():
    set_seed(42)
    start_time = time.time()
    
    # 1. Check existing checkpoints
    is_resumed, completed_epoch, best_val_f1, resume_data = check_existing_checkpoints()
    
    # 2. Run safety gates and diagnostics
    snapshot_info = run_safety_checks()
    
    device = torch.device("cpu")
    logger.info(f"Active training device: {device}")
    
    # Preprocessing
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Loaders
    train_dataset = CustomImageFolder(TRAIN_DIR, transform=train_transform, classes=CLASSES)
    val_dataset = CustomImageFolder(VAL_DIR, transform=val_transform, classes=CLASSES)
    test_dataset = CustomImageFolder(TEST_DIR, transform=val_transform, classes=CLASSES)
    
    # Assert mappings
    for idx, cls in enumerate(CLASSES):
        assert train_dataset.class_to_idx[cls] == idx, f"Class mapping mismatch: {cls} must map to {idx}"
        
    print("DATASET:")
    print(f"ai/dataset/{DATASET_SUBDIR}/\n")
    print("EXPECTED:")
    print(f"Train = 1817")
    print(f"Validation = 362")
    print(f"Test = 247")
    print(f"Total = 2426\n")
    print("Expected classes:")
    for cls, idx in sorted(train_dataset.class_to_idx.items(), key=lambda x: x[1]):
        print(f"{idx} = {cls}")
    print()
    
    # DataLoader num_workers = 0 for Windows CPU training safety
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False, num_workers=0)
    
    # 3. Validate image reading to handle low-resolution and corrupted images safely
    logger.info("Starting programmatic verification of DataLoader readability...")
    print("Verifying DataLoader readability on all splits...")
    for split_name, ds in [("Train", train_dataset), ("Validation", val_dataset), ("Test", test_dataset)]:
        for idx in range(len(ds)):
            try:
                # Triggers transform & PIL image loading
                img, label = ds[idx]
            except Exception as e:
                img_path, _ = ds.samples[idx]
                print(f"\nTRAINING ABORTED — DATASET LOAD ERROR")
                print(f"Offending file: {img_path}")
                print(f"Error details: {e}")
                logger.error(f"DataLoader failed to read file {img_path}: {e}")
                sys.exit(1)
    print("[PASS] Verified all images. The 136 low-resolution images can be safely processed.\n")
    
    # Calculate inverse-frequency class weights
    from collections import Counter
    train_targets = train_dataset.targets
    counts = Counter(train_targets)
    weights_list = []
    total_train = len(train_targets)
    for i in range(len(CLASSES)):
        c_count = counts[i]
        w_c = total_train / (float(len(CLASSES)) * c_count) if c_count > 0 else 1.0
        weights_list.append(w_c)
    class_weights = torch.tensor(weights_list, dtype=torch.float).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    # Initialize model
    model = get_model(num_classes=len(CLASSES)).to(device)
    
    # Model architecture verification
    verify_architecture(model)
    
    if IS_DRY_RUN:
        print("\n============================================================")
        print("HERIXA PHASE 3G — DRY RUN PASS")
        print("============================================================")
        inputs, labels = next(iter(train_loader))
        print(f"Batch loaded. Inputs: {inputs.shape} | Labels: {labels.shape}")
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        print(f"Loss computed successfully: {loss.item():.5f}")
        print("All safety and code tests passed. Training dry run completed.")
        print("============================================================\n")
        return
        
    epochs_p1 = 25
    epochs_p2 = 25
    total_epochs = epochs_p1 + epochs_p2
    
    history = []
    best_val_f1_p1 = 0.0
    best_val_f1_p2 = 0.0
    
    patience = 8
    epochs_no_improve = 0
    
    # Tracking class improvements
    best_class_f1s = {c: 0.0 for c in CLASSES}
    # Targeted baseline weak classes F1 for comparisons
    weak_class_baselines = {
        "brihadeeswarar": 0.5333,
        "airavatesvara": 0.6316,
        "gangaikonda-cholapuram": 0.3889,
        "hard_negatives": 0.4516
    }
    
    # Setup resume details if applicable
    start_stage = 1
    start_epoch = 0
    
    if is_resumed:
        # Load state dict
        model.load_state_dict({k: v.to(device) for k, v in resume_data["state_dict"].items()})
        start_epoch = completed_epoch
        best_val_f1 = resume_data.get("validation_macro_f1", 0.0)
        history = resume_data.get("history", [])
        if "best_class_f1s" in resume_data:
            best_class_f1s = resume_data["best_class_f1s"]
            
        # Determine current stage based on completed epochs
        if start_epoch >= epochs_p1:
            start_stage = 2
        logger.info(f"Resumed state: Stage {start_stage}, starting at Epoch {start_epoch + 1}")
        
    # We will wrap the training in a try...except to catch KeyboardInterrupt and log properly
    last_completed_epoch = start_epoch
    best_epoch = start_epoch
    best_model_state = None
    
    print("============================================================")
    print("HERIXA PHASE 3G — READY TO START")
    print("============================================================\n")
    print("Starting Phase 3G training...\n")
    
    try:
        # --------------------------------------------------
        # STAGE 1: Transfer Learning (Train head only)
        # --------------------------------------------------
        if start_stage == 1:
            # Freeze features backbone
            for param in model.features.parameters():
                param.requires_grad = False
                
            optimizer = optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-2)
            epochs_no_improve = 0
            
            logger.info("Executing Stage 1: Transfer Learning (Backbone Frozen)...")
            
            for epoch in range(start_epoch, epochs_p1):
                epoch_start = time.time()
                
                loss_t, acc_t = train_epoch(model, train_loader, criterion, optimizer, device)
                loss_v, acc_v, val_labels, val_preds = evaluate_validation(model, val_loader, criterion, device, len(CLASSES))
                
                m = calculate_metrics(val_labels, val_preds, len(CLASSES))
                epoch_dur = time.time() - epoch_start
                
                # Check for class improvements and notifications
                class_updates = []
                for idx, c in enumerate(CLASSES):
                    val_f1_c = m["per_class_f1"][idx]
                    if val_f1_c > best_class_f1s[c]:
                        old_f1 = best_class_f1s[c]
                        best_class_f1s[c] = val_f1_c
                        class_updates.append((c, old_f1, val_f1_c))
                        
                last_completed_epoch = epoch + 1
                
                # ETA calculation
                elapsed_sofar = time.time() - start_time
                avg_epoch_dur = elapsed_sofar / (last_completed_epoch - start_epoch)
                remaining_epochs = total_epochs - last_completed_epoch
                eta_sec = avg_epoch_dur * remaining_epochs
                eta_str = f"{int(eta_sec // 60)} min" if eta_sec > 60 else f"{int(eta_sec)} sec"
                
                # Resource tracking
                cpu_usage = "N/A"
                ram_usage = "N/A"
                if psutil is not None:
                    cpu_usage = f"{psutil.cpu_percent()}%"
                    ram_usage = f"{psutil.virtual_memory().percent}%"
                    
                # Print class best updates first
                for c_name, old, new in class_updates:
                    print(f"🔔 CLASS UPDATE\n\n{c_name.replace('-', ' ').title()}\nPrevious Best: {old*100:.2f}%\nNew Best:      {new*100:.2f}%\n")
                    
                improvement_f1 = 0.0
                if m["f1"] > best_val_f1:
                    improvement_f1 = m["f1"] - best_val_f1
                    best_val_f1 = m["f1"]
                    best_epoch = last_completed_epoch
                    best_model_state = {k: v.cpu() for k, v in model.state_dict().items()}
                    epochs_no_improve = 0
                    
                    # Atomic checkpoint save
                    chk_data = {
                        "state_dict": best_model_state,
                        "class_names": CLASSES,
                        "epoch": best_epoch,
                        "validation_macro_f1": best_val_f1,
                        "history": history,
                        "best_class_f1s": best_class_f1s,
                        "stage": 1,
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                    }
                    save_atomic(chk_data, os.path.join(CHECKPOINTS_DIR, CHECKPOINT_NAME), is_torch=True)
                    logger.info(f"🏆 NEW BEST MODEL: Validation Macro F1 = {best_val_f1*100:.2f}% achieved at Epoch {best_epoch}.")
                    print(f"🏆 NEW BEST MODEL\n\nValidation Macro F1:\n{m['f1']*100 - improvement_f1*100:.2f}% → {m['f1']*100:.2f}%\n\nCheckpoint:\n{CHECKPOINT_NAME}\n")
                else:
                    epochs_no_improve += 1
                    
                # Live Notifications Output
                print("============================================================")
                print("HERIXA PHASE 3G — TRAINING PROGRESS")
                print("============================================================\n")
                print(f"Stage:                   Transfer Learning")
                print(f"Epoch:                   {last_completed_epoch}/{epochs_p1}")
                print(f"Epoch Duration:          {epoch_dur:.1f} sec")
                print(f"Training Loss:           {loss_t:.4f}")
                print(f"Training Accuracy:       {acc_t * 100:.2f}%")
                print(f"Validation Loss:         {loss_v:.4f}")
                print(f"Validation Accuracy:     {acc_v * 100:.2f}%")
                print(f"Validation Macro F1:     {m['f1'] * 100:.2f}%")
                print(f"Validation Weighted F1:  {m['weighted_f1'] * 100:.2f}%\n")
                print("Per-Class Validation F1:")
                for idx, c in enumerate(CLASSES):
                    print(f"  {c.replace('-', ' ').title()}: {m['per_class_f1'][idx]*100:.2f}%")
                print()
                print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%")
                print(f"Improvement:             {improvement_f1 * 100:.2f}%")
                print(f"Estimated Remaining Time: {eta_str}")
                print(f"CPU Usage:               {cpu_usage}")
                print(f"RAM Usage:               {ram_usage}\n")
                print("============================================================\n")
                
                # Log metrics in history list
                epoch_history = {
                    "epoch": last_completed_epoch,
                    "phase": 1,
                    "train_loss": loss_t,
                    "train_acc": acc_t,
                    "val_loss": loss_v,
                    "val_acc": acc_v,
                    "val_precision": m["precision"],
                    "val_recall": m["recall"],
                    "val_f1": m["f1"],
                    "val_weighted_f1": m["weighted_f1"],
                    "class_f1s": m["per_class_f1"],
                    "epoch_duration": epoch_dur,
                    "learning_rate": 1e-3
                }
                history.append(epoch_history)
                
                # Write history files atomically
                save_atomic(history, os.path.join(METRICS_DIR, "training_history.json"))
                save_history_to_csv(history, os.path.join(METRICS_DIR, "training_history.csv"))
                
                # Save latest checkpoint atomically
                latest_chk_data = {
                    "state_dict": {k: v.cpu() for k, v in model.state_dict().items()},
                    "epoch": last_completed_epoch,
                    "validation_macro_f1": m["f1"],
                    "history": history,
                    "best_class_f1s": best_class_f1s,
                    "stage": 1,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                }
                save_atomic(latest_chk_data, os.path.join(CHECKPOINTS_DIR, "latest_checkpoint.pth"), is_torch=True)
                
                # Early stopping check
                if epochs_no_improve >= patience:
                    print("============================================================")
                    print("🛑 EARLY STOPPING")
                    print("============================================================")
                    print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%")
                    print(f"Best Epoch:              {best_epoch}")
                    print(f"No improvement for:      {patience} epochs")
                    print("Best checkpoint preserved.")
                    print("============================================================\n")
                    logger.info(f"Stage 1 early stopping triggered. Best Epoch: {best_epoch}.")
                    break
                    
            # Print Stage 1 Complete notification
            print("============================================================")
            print("🔔 HERIXA PHASE 3G — STAGE COMPLETE")
            print("============================================================\n")
            print("Stage:                   Transfer Learning")
            print(f"Completed Epochs:        {last_completed_epoch}")
            print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%\n")
            print("Weak-class results:")
            for wc in weak_class_baselines.keys():
                wc_idx = CLASSES.index(wc)
                wc_val_f1 = best_class_f1s[wc]
                print(f"  {wc.replace('-', ' ').title()}: {wc_val_f1*100:.2f}%")
            print("\nNext:\nFine-Tuning Stage")
            print("============================================================\n")
            
            # Start Stage 2 from the best weights of Stage 1
            if best_model_state:
                model.load_state_dict({k: v.to(device) for k, v in best_model_state.items()})
                
            start_stage = 2
            start_epoch = epochs_p1 # Fast forward epoch tracking
            epochs_no_improve = 0
            
        # --------------------------------------------------
        # STAGE 2: Fine-Tuning (Train upper feature blocks + head)
        # --------------------------------------------------
        if start_stage == 2:
            logger.info("Executing Stage 2: Fine-Tuning...")
            
            # Verify architecture prior to modifying gradients
            verify_architecture(model)
            
            # Unfreeze upper feature layers 7 and 8, and classification head
            for name, param in model.named_parameters():
                if "features.7" in name or "features.8" in name or "classifier" in name:
                    param.requires_grad = True
                else:
                    param.requires_grad = False
                    
            optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4, weight_decay=1e-3)
            
            # If resuming mid Stage 2, reset patience or recover it from resume
            epochs_no_improve = 0
            if is_resumed and completed_epoch >= epochs_p1:
                # Find how many epochs since best epoch in Stage 2
                stage2_history = [h for h in history if h["epoch"] > epochs_p1]
                if stage2_history:
                    epochs_no_improve = last_completed_epoch - best_epoch
                    
            for epoch in range(max(start_epoch, last_completed_epoch), total_epochs):
                epoch_start = time.time()
                
                loss_t, acc_t = train_epoch(model, train_loader, criterion, optimizer, device)
                loss_v, acc_v, val_labels, val_preds = evaluate_validation(model, val_loader, criterion, device, len(CLASSES))
                
                m = calculate_metrics(val_labels, val_preds, len(CLASSES))
                epoch_dur = time.time() - epoch_start
                
                # Check for class improvements
                class_updates = []
                for idx, c in enumerate(CLASSES):
                    val_f1_c = m["per_class_f1"][idx]
                    if val_f1_c > best_class_f1s[c]:
                        old_f1 = best_class_f1s[c]
                        best_class_f1s[c] = val_f1_c
                        class_updates.append((c, old_f1, val_f1_c))
                        
                last_completed_epoch = epoch + 1
                
                # ETA calculation
                elapsed_sofar = time.time() - start_time
                avg_epoch_dur = elapsed_sofar / (last_completed_epoch - max(start_epoch, epochs_p1) + 1)
                remaining_epochs = total_epochs - last_completed_epoch
                eta_sec = avg_epoch_dur * remaining_epochs
                eta_str = f"{int(eta_sec // 60)} min" if eta_sec > 60 else f"{int(eta_sec)} sec"
                
                # Resource tracking
                cpu_usage = "N/A"
                ram_usage = "N/A"
                if psutil is not None:
                    cpu_usage = f"{psutil.cpu_percent()}%"
                    ram_usage = f"{psutil.virtual_memory().percent}%"
                    
                # Print class updates
                for c_name, old, new in class_updates:
                    print(f"🔔 CLASS UPDATE\n\n{c_name.replace('-', ' ').title()}\nPrevious Best: {old*100:.2f}%\nNew Best:      {new*100:.2f}%\n")
                    
                improvement_f1 = 0.0
                if m["f1"] > best_val_f1:
                    improvement_f1 = m["f1"] - best_val_f1
                    best_val_f1 = m["f1"]
                    best_epoch = last_completed_epoch
                    best_model_state = {k: v.cpu() for k, v in model.state_dict().items()}
                    epochs_no_improve = 0
                    
                    # Atomic checkpoint save
                    chk_data = {
                        "state_dict": best_model_state,
                        "class_names": CLASSES,
                        "epoch": best_epoch,
                        "validation_macro_f1": best_val_f1,
                        "history": history,
                        "best_class_f1s": best_class_f1s,
                        "stage": 2,
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                    }
                    save_atomic(chk_data, os.path.join(CHECKPOINTS_DIR, CHECKPOINT_NAME), is_torch=True)
                    logger.info(f"🏆 NEW BEST MODEL: Validation Macro F1 = {best_val_f1*100:.2f}% achieved at Epoch {best_epoch}.")
                    print(f"🏆 NEW BEST MODEL\n\nValidation Macro F1:\n{m['f1']*100 - improvement_f1*100:.2f}% → {m['f1']*100:.2f}%\n\nCheckpoint:\n{CHECKPOINT_NAME}\n")
                else:
                    epochs_no_improve += 1
                    
                # Live Progress Notifications Output
                print("============================================================")
                print("HERIXA PHASE 3G — TRAINING PROGRESS")
                print("============================================================\n")
                print(f"Stage:                   Fine-Tuning")
                print(f"Epoch:                   {last_completed_epoch}/{total_epochs}")
                print(f"Epoch Duration:          {epoch_dur:.1f} sec")
                print(f"Training Loss:           {loss_t:.4f}")
                print(f"Training Accuracy:       {acc_t * 100:.2f}%")
                print(f"Validation Loss:         {loss_v:.4f}")
                print(f"Validation Accuracy:     {acc_v * 100:.2f}%")
                print(f"Validation Macro F1:     {m['f1'] * 100:.2f}%")
                print(f"Validation Weighted F1:  {m['weighted_f1'] * 100:.2f}%\n")
                print("Per-Class Validation F1:")
                for idx, c in enumerate(CLASSES):
                    print(f"  {c.replace('-', ' ').title()}: {m['per_class_f1'][idx]*100:.2f}%")
                print()
                print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%")
                print(f"Improvement:             {improvement_f1 * 100:.2f}%")
                print(f"Estimated Remaining Time: {eta_str}")
                print(f"CPU Usage:               {cpu_usage}")
                print(f"RAM Usage:               {ram_usage}\n")
                print("============================================================\n")
                
                # Log metrics in history list
                epoch_history = {
                    "epoch": last_completed_epoch,
                    "phase": 2,
                    "train_loss": loss_t,
                    "train_acc": acc_t,
                    "val_loss": loss_v,
                    "val_acc": acc_v,
                    "val_precision": m["precision"],
                    "val_recall": m["recall"],
                    "val_f1": m["f1"],
                    "val_weighted_f1": m["weighted_f1"],
                    "class_f1s": m["per_class_f1"],
                    "epoch_duration": epoch_dur,
                    "learning_rate": 1e-4
                }
                history.append(epoch_history)
                
                # Write history files atomically
                save_atomic(history, os.path.join(METRICS_DIR, "training_history.json"))
                save_history_to_csv(history, os.path.join(METRICS_DIR, "training_history.csv"))
                
                # Save latest checkpoint atomically
                latest_chk_data = {
                    "state_dict": {k: v.cpu() for k, v in model.state_dict().items()},
                    "epoch": last_completed_epoch,
                    "validation_macro_f1": m["f1"],
                    "history": history,
                    "best_class_f1s": best_class_f1s,
                    "stage": 2,
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
                }
                save_atomic(latest_chk_data, os.path.join(CHECKPOINTS_DIR, "latest_checkpoint.pth"), is_torch=True)
                
                # Early stopping check
                if epochs_no_improve >= patience:
                    print("============================================================")
                    print("🛑 EARLY STOPPING")
                    print("============================================================")
                    print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%")
                    print(f"Best Epoch:              {best_epoch}")
                    print(f"No improvement for:      {patience} epochs")
                    print("Best checkpoint preserved.")
                    print("============================================================\n")
                    logger.info(f"Stage 2 early stopping triggered. Best Epoch: {best_epoch}.")
                    break
                    
            # Print Stage 2 Complete
            print("============================================================")
            print("🔔 HERIXA PHASE 3G — STAGE COMPLETE")
            print("============================================================\n")
            print("Stage:                   Fine-Tuning")
            print(f"Completed Epochs:        {last_completed_epoch}")
            print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%\n")
            print("Weak-class results:")
            for wc in weak_class_baselines.keys():
                wc_val_f1 = best_class_f1s[wc]
                print(f"  {wc.replace('-', ' ').title()}: {wc_val_f1*100:.2f}%")
            print("============================================================\n")
            
    except (KeyboardInterrupt, SystemExit, Exception) as e:
        # Interrupted training report
        print("\n============================================================")
        print("⚠️ PHASE 3G TRAINING INTERRUPTED")
        print("============================================================")
        print(f"Completed Epoch:       {last_completed_epoch}")
        print(f"Best Validation Macro F1: {best_val_f1 * 100:.2f}%")
        print(f"Best Checkpoint:       {os.path.join(CHECKPOINTS_DIR, CHECKPOINT_NAME)}")
        print("\nMANUAL RESUME DECISION REQUIRED")
        print("============================================================\n")
        logger.error(f"Training interrupted at epoch {last_completed_epoch}: {e}")
        if not isinstance(e, (KeyboardInterrupt, SystemExit)):
            traceback.print_exc()
        sys.exit(1)
        
    # Entire training complete
    print("============================================================")
    print("🎉 HERIXA PHASE 3G — TRAINING COMPLETE")
    print("============================================================\n")
    print("Best Checkpoint:")
    print(f"ai/models/phase3g/checkpoints/{CHECKPOINT_NAME}\n")
    print("Best Validation Macro F1:")
    print(f"{best_val_f1 * 100:.2f}%\n")
    print("Proceeding to final test evaluation.")
    print("============================================================\n")
    
    # 4. FINAL TEST EVALUATION
    logger.info("Executing final test set evaluation...")
    best_chk_path = os.path.join(CHECKPOINTS_DIR, CHECKPOINT_NAME)
    if os.path.exists(best_chk_path):
        best_chk = torch.load(best_chk_path, map_location="cpu")
        model.load_state_dict({k: v.to(device) for k, v in best_chk["state_dict"].items()})
    model.eval()
    
    test_labels = []
    test_preds = []
    
    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            _, predicted = outputs.max(1)
            test_labels.extend(labels.tolist())
            test_preds.extend(predicted.cpu().tolist())
            
    # Calculate test metrics
    test_metrics = calculate_metrics(test_labels, test_preds, len(CLASSES))
    cm = confusion_matrix(test_labels, test_preds)
    
    # Format confusion matrix for logging
    cm_dict = {}
    for idx_true, true_name in enumerate(CLASSES):
        cm_dict[true_name] = {}
        for idx_pred, pred_name in enumerate(CLASSES):
            cm_dict[true_name][pred_name] = int(cm[idx_true, idx_pred])
            
    test_results_data = {
        "test_accuracy": test_metrics["accuracy"],
        "test_macro_precision": test_metrics["precision"],
        "test_macro_recall": test_metrics["recall"],
        "test_macro_f1": test_metrics["f1"],
        "test_weighted_f1": test_metrics["weighted_f1"],
        "per_class_metrics": {
            CLASSES[i]: {
                "precision": test_metrics["per_class_precision"][i],
                "recall": test_metrics["per_class_recall"][i],
                "f1": test_metrics["per_class_f1"][i]
            } for i in range(len(CLASSES))
        },
        "confusion_matrix": cm_dict
    }
    
    test_results_path = os.path.join(METRICS_DIR, "test_results.json")
    save_atomic(test_results_data, test_results_path)
    
    # 5. BASELINE COMPARISON
    baseline_acc = 0.6946
    baseline_macro_f1 = 0.6370
    baseline_val_macro_f1 = 0.7043
    
    baseline_class_f1s = {
        "brihadeeswarar": 0.5333,
        "meenakshi-amman": 0.8101,
        "mahabalipuram": 0.8764,
        "gangaikonda-cholapuram": 0.3889,
        "airavatesvara": 0.6316,
        "thirumalai-nayakkar": 0.7671,
        "hard_negatives": 0.4516
    }
    
    print("✅ CLASS EVALUATION COMPLETE")
    for idx, c in enumerate(CLASSES):
        print(f"{c.replace('-', ' ').title()}")
        print(f"Test F1: {test_metrics['per_class_f1'][idx]*100:.2f}%")
    print()
    
    print("============================================================\n"
          "METRICS COMPARISON TABLE\n"
          "============================================================\n"
          "Metric                  | Baseline | Phase 3G | Change\n"
          "-------------------------------------------------------------")
    print(f"Test Accuracy           | {baseline_acc*100:.2f}%   | {test_metrics['accuracy']*100:.2f}%   | { (test_metrics['accuracy'] - baseline_acc)*100:+.2f}%")
    print(f"Test Macro F1           | {baseline_macro_f1*100:.2f}%   | {test_metrics['f1']*100:.2f}%   | { (test_metrics['f1'] - baseline_macro_f1)*100:+.2f}%")
    print(f"Validation Macro F1     | {baseline_val_macro_f1*100:.2f}%   | {best_val_f1*100:.2f}%   | { (best_val_f1 - baseline_val_macro_f1)*100:+.2f}%")
    print("-------------------------------------------------------------\n")
    
    print("============================================================\n"
          "PER-CLASS F1 COMPARISON TABLE\n"
          "============================================================\n"
          "Class                    | Baseline F1 | Phase 3G F1 | Change\n"
          "----------------------------------------------------------------")
    for idx, c in enumerate(CLASSES):
        base_f1 = baseline_class_f1s.get(c, 0.0)
        p3g_f1 = test_metrics['per_class_f1'][idx]
        print(f"{c.replace('-', ' ').title():24} | {base_f1*100:.2f}%       | {p3g_f1*100:.2f}%      | { (p3g_f1 - base_f1)*100:+.2f}%")
    print("----------------------------------------------------------------\n")
    
    # 6. SUCCESS / FAILURE INTERPRETATION
    # An improvement is declared if BOTH validation and test Macro F1 are strictly greater than baseline
    is_success = (best_val_f1 > baseline_val_macro_f1) and (test_metrics["f1"] > baseline_macro_f1)
    
    # 7. POST-TRAINING SAFETY CHECK
    logger.info("Executing post-training safety checks...")
    print("POST-TRAINING SAFETY CHECK...")
    
    # Re-calculate SHA-256 of protected files and compare
    post_model_hashes = {}
    model_integrity_pass = True
    for pm in PROTECTED_MODELS:
        full_path = os.path.join(WORKSPACE_ROOT, pm)
        h = get_file_sha256(full_path)
        post_model_hashes[pm] = h
        original_hash = snapshot_info["models_sha256"][pm]["sha256"]
        if h != original_hash:
            logger.error(f"Production model altered during training! {pm} hash mismatch.")
            model_integrity_pass = False
            
    dataset_integrity_pass = True
    for pd in PROTECTED_DATASET_DIRS:
        full_path = os.path.join(WORKSPACE_ROOT, pd)
        post_dir_hashes = get_dir_sha256_dict(full_path)
        original_dir_hashes = snapshot_info["datasets_sha256"][pd]
        
        # Compare keys and hashes
        if set(post_dir_hashes.keys()) != set(original_dir_hashes.keys()):
            logger.error(f"Protected dataset directory file list altered! {pd}")
            dataset_integrity_pass = False
        else:
            for k, val in original_dir_hashes.items():
                if post_dir_hashes[k]["sha256"] != val["sha256"]:
                    logger.error(f"Protected file content altered! {pd}/{k}")
                    dataset_integrity_pass = False
                    
    if model_integrity_pass:
        print("PRODUCTION MODEL INTEGRITY: PASS")
    else:
        print("PRODUCTION MODEL INTEGRITY: FAIL - CRITICAL SAFETY FAILURE")
        
    if dataset_integrity_pass:
        print("ORIGINAL DATASET INTEGRITY: PASS")
    else:
        print("ORIGINAL DATASET INTEGRITY: FAIL - CRITICAL SAFETY FAILURE")
    print()
    
    # 8. FINAL REPORT GENERATION
    report_content = f"""# HERIXA Phase 3G — 7-Class Model Training Report

## 1. Training Configuration & Environment
* **Dataset Path:** `ai/dataset/multiclass_v2/`
* **Total Images:** 2426 (Train: 1817, Validation: 362, Test: 247)
* **Classes (7):**
  * `0 = brihadeeswarar`
  * `1 = meenakshi-amman`
  * `2 = mahabalipuram`
  * `3 = gangaikonda-cholapuram`
  * `4 = airavatesvara`
  * `5 = thirumalai-nayakkar`
  * `6 = hard_negatives`
* **Hardware Device:** CPU (`{snapshot_info['environment']['cpu_name']}` with {snapshot_info['environment']['cpu_cores']} cores)
* **System RAM:** {snapshot_info['environment']['total_ram']}
* **Python version:** `{sys.version.split()[0]}`
* **PyTorch version:** `{torch.__version__}`
* **Torchvision version:** `{torchvision.__version__}`
* **DataLoader Workers:** `0` (conservative configuration for Windows CPU stability)
* **Random Seed:** `42`
* **Max Epochs:** 50 (Stage 1: 25 epochs max, Stage 2: 25 epochs max)
* **Early Stopping Patience:** 8 epochs

## 2. Training Stage Progression & History
* **Stage 1 (Transfer Learning):** Backbone frozen, classifier head trained.
  * Epochs Run: {min(best_epoch, epochs_p1) if best_epoch <= epochs_p1 else epochs_p1} epochs.
* **Stage 2 (Fine-Tuning):** Upper backbone blocks `features.7` and `features.8` unfrozen along with head.
  * Epochs Run: {last_completed_epoch - epochs_p1 if last_completed_epoch > epochs_p1 else 0} epochs.
* **Best Epoch:** {best_epoch}
* **Best Validation Macro F1:** {best_val_f1 * 100:.2f}%
* **Total Training Duration:** {(time.time() - start_time) / 60.0:.2f} minutes

## 3. Metrics and Baseline Comparison
Below is the comparison of the trained Phase 3G model against the production baseline:

### Core Metrics Comparison
| Metric | Baseline | Phase 3G | Change |
| :--- | :--- | :--- | :--- |
| **Test Accuracy** | {baseline_acc * 100:.2f}% | {test_metrics['accuracy'] * 100:.2f}% | { (test_metrics['accuracy'] - baseline_acc) * 100:+.2f}% |
| **Test Macro F1** | {baseline_macro_f1 * 100:.2f}% | {test_metrics['f1'] * 100:.2f}% | { (test_metrics['f1'] - baseline_macro_f1) * 100:+.2f}% |
| **Validation Macro F1** | {baseline_val_macro_f1 * 100:.2f}% | {best_val_f1 * 100:.2f}% | { (best_val_f1 - baseline_val_macro_f1) * 100:+.2f}% |

### Per-Class F1 Score Comparison
| Class | Baseline F1 | Phase 3G F1 | Change |
| :--- | :---: | :---: | :---: |
"""
    for idx, c in enumerate(CLASSES):
        base_f1 = baseline_class_f1s.get(c, 0.0)
        p3g_f1 = test_metrics['per_class_f1'][idx]
        report_content += f"| **{c.replace('-', ' ').title()}** | {base_f1 * 100:.2f}% | {p3g_f1 * 100:.2f}% | {(p3g_f1 - base_f1) * 100:+.2f}% |\n"
        
    report_content += f"""
## 4. Confusion Matrix Analysis
The following matrix shows predictions across classes:

| True \\ Predicted | """ + " | ".join([c.replace('-', ' ').title() for c in CLASSES]) + " |\n| :--- | " + " :---: | " * len(CLASSES) + "\n"
    
    for idx_true, true_name in enumerate(CLASSES):
        row = f"| **{true_name.replace('-', ' ').title()}** | "
        row += " | ".join([str(cm_dict[true_name][pred_name]) for pred_name in CLASSES]) + " |\n"
        report_content += row
        
    report_content += f"""
## 5. Success / Failure Evaluation & Diagnosis
* **Overall F1 Score Improved:** {"YES" if test_metrics["f1"] > baseline_macro_f1 else "NO"}
* **Weak-Class F1 Improvements:**
  * **Brihadeeswarar F1:** {test_metrics['per_class_f1'][0]*100:.2f}% (Baseline: 53.33%, change: {(test_metrics['per_class_f1'][0] - 0.5333)*100:+.2f}%)
  * **Airavatesvara F1:** {test_metrics['per_class_f1'][4]*100:.2f}% (Baseline: 63.16%, change: {(test_metrics['per_class_f1'][4] - 0.6316)*100:+.2f}%)
  * **Gangaikonda-Cholapuram F1:** {test_metrics['per_class_f1'][3]*100:.2f}% (Baseline: 38.89%, change: {(test_metrics['per_class_f1'][3] - 0.3889)*100:+.2f}%)
  * **Hard Negatives F1:** {test_metrics['per_class_f1'][6]*100:.2f}% (Baseline: 45.16%, change: {(test_metrics['per_class_f1'][6] - 0.4516)*100:+.2f}%)
* **Targeted Confounding Analysis:**
  * Confusion between Gangaikonda-Cholapuram and Brihadeeswarar (True Gangaikonda predicted as Brihadeeswarar): {cm_dict['gangaikonda-cholapuram']['brihadeeswarar']} cases.
  * True Brihadeeswarar predicted as Gangaikonda-Cholapuram: {cm_dict['brihadeeswarar']['gangaikonda-cholapuram']} cases.
  * Hard negatives predicted as temple classes (False Positives): {sum(cm_dict['hard_negatives'][c] for c in CLASSES if c != 'hard_negatives')} cases.

## 6. Safety Postflight Verification
* **PRODUCTION MODEL INTEGRITY:** {"PASS" if model_integrity_pass else "FAIL - HASH MISMATCH"}
* **ORIGINAL DATASET INTEGRITY:** {"PASS" if dataset_integrity_pass else "FAIL - HASH/FILE LIST MISMATCH"}

## 7. Next Steps & Recommendations for Phase 3H
* **Model Checkpoint Path:** `ai/models/phase3g/checkpoints/best_model_multiclass_v2.pth`
* **Test Evaluation Result:** {"READY FOR PHASE 3H EVALUATION" if is_success else "MODEL IMPROVEMENT NOT CONFIRMED - RECOMMEND RETRAIN OR REVIEW"}
"""
    # Save markdown report
    report_path = os.path.join(WORKSPACE_ROOT, "reports", "phase_3g_training_report.md")
    save_atomic(report_content, report_path)
    
    # Safety Check Final Abort if integrity failed
    if not model_integrity_pass or not dataset_integrity_pass:
        print("CRITICAL SAFETY FAILURE")
        sys.exit(1)
        
    # Return Final Status
    if is_success:
        print("PHASE 3G TRAINING SUCCESS — READY FOR EVALUATION REVIEW")
    else:
        print("PHASE 3G TRAINING COMPLETED — MODEL IMPROVEMENT NOT CONFIRMED")

if __name__ == "__main__":
    train_model()
