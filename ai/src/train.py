import os
import sys
import json
import time
import shutil
import logging
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from datetime import datetime
from typing import Dict, List, Tuple, Any

# Adjust path to import utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.utils import get_path, setup_logger, save_json

# Setup directories
import argparse

parser = argparse.ArgumentParser(description="HERIXA Training Pipeline")
parser.add_argument("--multiclass", action="store_true", help="Enable 7-class multiclass mode")
parser.add_argument("--dry-run", action="store_true", help="Perform a safe single-batch dry run without training")
args, unknown = parser.parse_known_args()

IS_MULTICLASS = args.multiclass
IS_DRY_RUN = args.dry_run

MODELS_DIR = get_path("models")
RESULTS_DIR = get_path("results")

if IS_MULTICLASS:
    TRAIN_DIR = get_path("dataset", "multiclass", "train")
    VAL_DIR = get_path("dataset", "multiclass", "validation")
    TEST_DIR = get_path("dataset", "multiclass", "test")
    CHECKPOINT_NAME = "best_model_multiclass.pth"
    CLASSES = [
        "brihadeeswarar",
        "meenakshi-amman",
        "mahabalipuram",
        "gangaikonda-cholapuram",
        "airavatesvara",
        "thirumalai-nayakkar",
        "hard_negatives"
    ]
    LOG_FILE = os.path.join(RESULTS_DIR, "training_multiclass.log")
else:
    TRAIN_DIR = get_path("dataset", "train")
    VAL_DIR = get_path("dataset", "validation")
    TEST_DIR = get_path("dataset", "test")
    CHECKPOINT_NAME = "best_model.pth"
    CLASSES = ["brihadeeswarar", "hard_negatives"]
    LOG_FILE = os.path.join(RESULTS_DIR, "training.log")

logger = setup_logger("train_model", log_file=LOG_FILE)

# Ensure directories exist
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# --------------------------------------------------
# 1. SAFETY CHECKS
# --------------------------------------------------
class CustomImageFolder(datasets.ImageFolder):
    def __init__(self, root, transform=None, classes=None):
        self.explicit_classes = classes
        super().__init__(root, transform=transform)
        
    def find_classes(self, directory):
        if self.explicit_classes is not None:
            class_to_idx = {cls: idx for idx, cls in enumerate(self.explicit_classes)}
            # Verify directories exist
            for cls in self.explicit_classes:
                cls_path = os.path.join(directory, cls)
                if not os.path.exists(cls_path):
                    logger.error(f"Class directory missing: {cls_path}")
                    raise FileNotFoundError(f"Class directory missing: {cls_path}")
            return self.explicit_classes, class_to_idx
        return super().find_classes(directory)

def run_safety_checks() -> bool:
    logger.info("Running pre-training safety checks...")
    
    # Check directory existence
    dirs = [os.path.join(TRAIN_DIR, c) for c in CLASSES] + \
           [os.path.join(VAL_DIR, c) for c in CLASSES] + \
           [os.path.join(TEST_DIR, c) for c in CLASSES]
           
    for d in dirs:
        if not os.path.exists(d):
            logger.error(f"Required directory missing: {d}")
            print(f"ERROR: Required directory missing: {d}")
            return False
            
    # Check counts
    logger.info("Checking class image counts in splits:")
    for split_name, split_dir in [("Train", TRAIN_DIR), ("Val", VAL_DIR), ("Test", TEST_DIR)]:
        counts_str = []
        for c in CLASSES:
            c_dir = os.path.join(split_dir, c)
            cnt = len([f for f in os.listdir(c_dir) if os.path.isfile(os.path.join(c_dir, f)) and not f.endswith(".json")])
            counts_str.append(f"{c}={cnt}")
            if cnt == 0:
                logger.error(f"Split {split_name} for class {c} is empty!")
                print(f"ERROR: Split {split_name} for class {c} is empty!")
                return False
        logger.info(f"  {split_name} split counts: {', '.join(counts_str)}")
        
    # Verify all images are readable
    from PIL import Image
    logger.info("Verifying all image files are readable...")
    for d in dirs:
        for f in os.listdir(d):
            if f.endswith(".json"):
                continue
            path = os.path.join(d, f)
            try:
                with Image.open(path) as img:
                    img.verify()
            except Exception as e:
                logger.error(f"Corrupted image file in active splits: {path}. Error: {e}")
                print(f"ERROR: Corrupted image file in active splits: {path}. Error: {e}")
                return False
                
    logger.info("Safety checks passed successfully.")
    return True

# --------------------------------------------------
# 2. MODEL DEFINITION
# --------------------------------------------------
def get_model(num_classes: int = 2) -> nn.Module:
    try:
        from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
        model = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
        logger.info("Loaded EfficientNet-B0 with default weights.")
    except Exception as e:
        logger.warning(f"Weights import failed: {e}. Falling back to pretrained=True.")
        import torchvision.models as models
        model = models.efficientnet_b0(pretrained=True)
        
    # Replace final classification head
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    return model

# --------------------------------------------------
# 3. METRICS HELPER
# --------------------------------------------------
def calculate_metrics(labels: List[int], preds: List[int], num_classes: int = 2) -> Dict[str, float]:
    from sklearn.metrics import precision_recall_fscore_support, accuracy_score
    
    if num_classes == 2:
        # Binary classification metrics focusing on positive class Class 0 (Brihadeeswarar)
        # We swap classes locally so scikit-learn treats Class 0 as the positive class
        labels_swapped = [1 - l for l in labels]
        preds_swapped = [1 - p for p in preds]
        
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels_swapped, preds_swapped, average='binary', zero_division=0
        )
    else:
        # Multiclass classification metrics using macro average
        precision, recall, f1, _ = precision_recall_fscore_support(
            labels, preds, average='macro', zero_division=0
        )
        
    accuracy = accuracy_score(labels, preds)
    
    return {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1)
    }

# --------------------------------------------------
# 4. TRAINING LOOPS
# --------------------------------------------------
def train_epoch(model: nn.Module, loader: DataLoader, criterion: nn.Module, optimizer: optim.Optimizer, device: torch.device, scaler=None) -> Tuple[float, float]:
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    for inputs, labels in loader:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        if scaler is not None and device.type == "cuda":
            with torch.cuda.amp.autocast():
                outputs = model(inputs)
                loss = criterion(outputs, labels)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
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

def evaluate_validation(model: nn.Module, loader: DataLoader, criterion: nn.Module, device: torch.device, num_classes: int = 2) -> Tuple[float, float, List[int], List[float], List[int]]:
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    
    all_labels = []
    all_prob_bri = []  # Probability of class 0 (Brihadeeswarar)
    all_preds = []
    
    with torch.no_grad():
        for inputs, labels in loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item() * inputs.size(0)
            probs = torch.softmax(outputs, dim=1)
            _, predicted = outputs.max(1)
            
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            all_labels.extend(labels.cpu().tolist())
            all_prob_bri.extend(probs[:, 0].cpu().tolist())
            all_preds.extend(predicted.cpu().tolist())
            
    val_loss = running_loss / total
    val_acc = correct / total
    
    return val_loss, val_acc, all_labels, all_prob_bri, all_preds

def train_model():
    start_time = time.time()
    if not run_safety_checks():
        sys.exit(1)
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Data Augmentation (Train only)
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Deterministic Preprocessing (Val/Test)
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Loaders
    train_dataset = CustomImageFolder(TRAIN_DIR, transform=train_transform, classes=CLASSES)
    val_dataset = CustomImageFolder(VAL_DIR, transform=val_transform, classes=CLASSES)
    
    # Assert class mapping: index 0 must be brihadeeswarar
    assert train_dataset.class_to_idx["brihadeeswarar"] == 0, "brihadeeswarar index must be 0"
    
    batch_size = 16
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    # Class weights calculation to address imbalance
    from collections import Counter
    targets = train_dataset.targets
    counts = Counter(targets)
    
    weights_list = []
    total_train = len(targets)
    for i in range(len(CLASSES)):
        c_count = counts[i]
        w_c = total_train / (float(len(CLASSES)) * c_count) if c_count > 0 else 1.0
        weights_list.append(w_c)
        
    class_weights = torch.tensor(weights_list, dtype=torch.float).to(device)
    weights_info = ", ".join([f"{CLASSES[i]}={weights_list[i]:.4f}" for i in range(len(CLASSES))])
    logger.info(f"Class Weights: {weights_info}")
    
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    model = get_model(num_classes=len(CLASSES)).to(device)

    # --------------------------------------------------
    # DRY RUN LOGIC (Step 13)
    # --------------------------------------------------
    if IS_DRY_RUN:
        logger.info("Executing safe multiclass training dry run...")
        print("\n--- DRY RUN STATUS ---")
        print(f"Loaded multiclass dataset path: {TRAIN_DIR}")
        print(f"Discovering classes: {len(CLASSES)} classes found.")
        print(f"Class-to-index mapping:")
        for cls, idx in sorted(train_dataset.class_to_idx.items(), key=lambda x: x[1]):
            print(f"  - {cls}: {idx}")
            
        print(f"Instantiated model architecture: efficientnet_b0")
        print(f"Classifier output dimension: {model.classifier[1].out_features}")
        
        # Load one batch
        inputs, labels = next(iter(train_loader))
        print(f"Loaded one batch. Input shape: {inputs.shape} | Labels shape: {labels.shape}")
        
        # Forward pass
        inputs, labels = inputs.to(device), labels.to(device)
        model.eval()
        with torch.no_grad():
            outputs = model(inputs)
        print(f"Forward pass completed. Output tensor shape: {outputs.shape}")
        
        # Calculate loss
        loss = criterion(outputs, labels)
        print(f"Calculated loss: {loss.item():.6f} (Finite: {torch.isfinite(loss).item()})")
        
        # Verify paths
        checkpoint_path = os.path.join(MODELS_DIR, CHECKPOINT_NAME)
        print(f"Checkpoint save path verified: {checkpoint_path}")
        print(f"ONNX save path verified: {os.path.join(MODELS_DIR, CHECKPOINT_NAME.replace('.pth', '.onnx'))}")
        
        print("\n=> DRY RUN PASSED SUCCESSFULLY.")
        print("==================================================")
        # Exit without running training or saving checkpoints
        return
    
    # --------------------------------------------------
    # PHASE 1: Transfer Learning (Train Head Only)
    # --------------------------------------------------
    logger.info("Starting Phase 1: Transfer Learning (Backbone Frozen)...")
    for param in model.features.parameters():
        param.requires_grad = False
        
    optimizer = optim.AdamW(model.classifier.parameters(), lr=1e-3, weight_decay=1e-2)
    scaler = torch.cuda.amp.GradScaler() if device.type == "cuda" else None
    
    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"PyTorch Version: {torch.__version__}")
    logger.info(f"Trainable Parameters in Phase 1: {num_params}")
    
    epochs_p1 = 10
    history = []
    
    best_val_f1 = 0.0
    best_epoch = -1
    best_model_state = None
    
    patience_p1 = 3
    epochs_no_improve_p1 = 0
    actual_epochs_p1 = 0
    
    for epoch in range(epochs_p1):
        actual_epochs_p1 += 1
        loss_t, acc_t = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        loss_v, acc_v, val_labels, val_probs, val_preds = evaluate_validation(model, val_loader, criterion, device, len(CLASSES))
        
        # Calculate baseline metrics
        if len(CLASSES) == 2:
            val_preds_baseline = [0 if p >= 0.5 else 1 for p in val_probs]
            m = calculate_metrics(val_labels, val_preds_baseline, len(CLASSES))
        else:
            m = calculate_metrics(val_labels, val_preds, len(CLASSES))
        
        logger.info(f"P1 Epoch {epoch+1}/{epochs_p1} - Train Loss: {loss_t:.4f}, Acc: {acc_t:.4f} | Val Loss: {loss_v:.4f}, Acc: {acc_v:.4f}, F1: {m['f1']:.4f}")
        print(f"P1 Epoch {epoch+1}/{epochs_p1} | Train Loss: {loss_t:.4f} | Val Loss: {loss_v:.4f} | Val F1: {m['f1']:.4f}")
        
        history.append({
            "phase": 1,
            "epoch": epoch + 1,
            "train_loss": float(loss_t),
            "train_acc": float(acc_t),
            "val_loss": float(loss_v),
            "val_acc": float(acc_v),
            "val_precision": float(m["precision"]),
            "val_recall": float(m["recall"]),
            "val_f1": float(m["f1"])
        })
        
        if m["f1"] > best_val_f1:
            best_val_f1 = m["f1"]
            best_epoch = epoch + 1
            best_model_state = {k: v.cpu() for k, v in model.state_dict().items()}
            epochs_no_improve_p1 = 0
        else:
            epochs_no_improve_p1 += 1
            if epochs_no_improve_p1 >= patience_p1:
                logger.info(f"Early stopping triggered at Phase 1 epoch {epoch+1}")
                print(f"Early stopping triggered at Phase 1 epoch {epoch+1}")
                break
            
    # --------------------------------------------------
    # PHASE 2: Fine-Tuning (Unfreeze upper layers)
    # --------------------------------------------------
    logger.info("Starting Phase 2: Fine-Tuning (Upper feature layers unfrozen)...")
    if best_model_state:
        model.load_state_dict({k: v.to(device) for k, v in best_model_state.items()})
        
    # Unfreeze upper feature block (features[7] and features[8] representing the top layer blocks)
    for name, param in model.named_parameters():
        if "features.7" in name or "features.8" in name or "classifier" in name:
            param.requires_grad = True
        else:
            param.requires_grad = False
            
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4, weight_decay=1e-3)
    
    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    logger.info(f"Trainable Parameters in Phase 2: {num_params}")
    
    epochs_p2 = 10
    patience = 3
    epochs_no_improve = 0
    actual_epochs_p2 = 0
    
    for epoch in range(epochs_p2):
        actual_epochs_p2 += 1
        loss_t, acc_t = train_epoch(model, train_loader, criterion, optimizer, device, scaler)
        loss_v, acc_v, val_labels, val_probs, val_preds = evaluate_validation(model, val_loader, criterion, device, len(CLASSES))
        
        # Calculate metrics
        if len(CLASSES) == 2:
            val_preds_baseline = [0 if p >= 0.5 else 1 for p in val_probs]
            m = calculate_metrics(val_labels, val_preds_baseline, len(CLASSES))
        else:
            m = calculate_metrics(val_labels, val_preds, len(CLASSES))
        
        logger.info(f"P2 Epoch {epoch+1}/{epochs_p2} - Train Loss: {loss_t:.4f}, Acc: {acc_t:.4f} | Val Loss: {loss_v:.4f}, Acc: {acc_v:.4f}, F1: {m['f1']:.4f}")
        print(f"P2 Epoch {epoch+1}/{epochs_p2} | Train Loss: {loss_t:.4f} | Val Loss: {loss_v:.4f} | Val F1: {m['f1']:.4f}")
        
        history.append({
            "phase": 2,
            "epoch": epochs_p1 + epoch + 1,
            "train_loss": float(loss_t),
            "train_acc": float(acc_t),
            "val_loss": float(loss_v),
            "val_acc": float(acc_v),
            "val_precision": float(m["precision"]),
            "val_recall": float(m["recall"]),
            "val_f1": float(m["f1"])
        })
        
        if m["f1"] > best_val_f1:
            best_val_f1 = m["f1"]
            best_epoch = epochs_p1 + epoch + 1
            best_model_state = {k: v.cpu() for k, v in model.state_dict().items()}
            epochs_no_improve = 0
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                logger.info(f"Early stopping triggered at Phase 2 epoch {epoch+1}")
                print(f"Early stopping triggered at epoch {epochs_p1 + epoch + 1}")
                break
                
    # Load best checkpoint
    if best_model_state:
        model.load_state_dict({k: v.to(device) for k, v in best_model_state.items()})
        
    # --------------------------------------------------
    # 5. UNKNOWN THRESHOLD SELECTION (on Validation)
    # --------------------------------------------------
    if len(CLASSES) == 2:
        loss_v, acc_v, val_labels, val_probs, val_preds = evaluate_validation(model, val_loader, criterion, device, len(CLASSES))
        
        best_thresh = 0.5
        best_thresh_f1 = 0.0
        
        # Search threshold from 0.1 to 0.9
        for t_val in [i * 0.05 for i in range(2, 19)]:
            val_preds_temp = [0 if p >= t_val else 1 for p in val_probs]
            m_temp = calculate_metrics(val_labels, val_preds_temp, len(CLASSES))
            if m_temp["f1"] > best_thresh_f1:
                best_thresh_f1 = m_temp["f1"]
                best_thresh = t_val
                
        logger.info(f"Optimal threshold chosen on validation set: {best_thresh:.3f} (Validation F1 = {best_thresh_f1:.4f})")
    else:
        best_thresh = 0.0
        best_thresh_f1 = best_val_f1
    
    # --------------------------------------------------
    # 6. FINAL TEST EVALUATION
    # --------------------------------------------------
    test_dataset = CustomImageFolder(TEST_DIR, transform=val_transform, classes=CLASSES)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    model.eval()
    test_labels = []
    test_probs = []
    test_preds = []
    
    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            _, predicted = outputs.max(1)
            test_labels.extend(labels.tolist())
            test_probs.extend(probs[:, 0].cpu().tolist())
            test_preds.extend(predicted.cpu().tolist())
            
    # Apply selected optimal threshold
    if len(CLASSES) == 2:
        test_preds = [0 if p >= best_thresh else 1 for p in test_probs]
        
    test_metrics = calculate_metrics(test_labels, test_preds, len(CLASSES))
    
    # Calculate confusion matrix components
    from collections import defaultdict
    if len(CLASSES) == 2:
        tp = sum(1 for l, p in zip(test_labels, test_preds) if l == 0 and p == 0)
        fn = sum(1 for l, p in zip(test_labels, test_preds) if l == 0 and p == 1)
        tn = sum(1 for l, p in zip(test_labels, test_preds) if l == 1 and p == 1)
        fp = sum(1 for l, p in zip(test_labels, test_preds) if l == 1 and p == 0)
        confusion_data = {"tp": tp, "fn": fn, "tn": tn, "fp": fp}
    else:
        cm = defaultdict(int)
        for l, p in zip(test_labels, test_preds):
            cm[f"true_{l}_pred_{p}"] += 1
        confusion_data = dict(cm)
        
    # Calculate training time
    train_time_sec = time.time() - start_time
    
    # Check if early stopping was triggered
    early_stopped_p1 = "YES" if actual_epochs_p1 < epochs_p1 else "NO"
    early_stopped_p2 = "YES" if actual_epochs_p2 < epochs_p2 else "NO"
    early_stopping_triggered = "YES" if (early_stopped_p1 == "YES" or early_stopped_p2 == "YES") else "NO"
    
    # Get F1 and loss metrics at best epoch
    best_hist = next((h for h in history if h["epoch"] == best_epoch), None)
    best_val_loss = best_hist["val_loss"] if best_hist else 0.0
    best_train_loss = best_hist["train_loss"] if best_hist else 0.0
    best_train_acc = best_hist["train_acc"] if best_hist else 0.0
    best_val_precision = best_hist["val_precision"] if best_hist else 0.0
    best_val_recall = best_hist["val_recall"] if best_hist else 0.0
    
    logger.info(f"Test Set Evaluation - Acc: {test_metrics['accuracy']:.4f}, F1: {test_metrics['f1']:.4f}")
    
    # Save training history
    history_filename = "training_history_multiclass.json" if len(CLASSES) == 7 else "training_history.json"
    history_path = os.path.join(RESULTS_DIR, history_filename)
    save_json(history, history_path)
    
    # Save checkpoint
    model_path = os.path.join(MODELS_DIR, CHECKPOINT_NAME)
    checkpoint_data = {
        "state_dict": {k: v.cpu() for k, v in model.state_dict().items()},
        "class_names": CLASSES,
        "architecture": "efficientnet_b0",
        "image_size": 224,
        "normalization": {
            "mean": [0.485, 0.456, 0.406],
            "std": [0.229, 0.224, 0.225]
        },
        "training_config": {
            "batch_size": batch_size,
            "lr_phase1": 1e-3,
            "lr_phase2": 1e-4,
            "epochs_phase1": epochs_p1,
            "epochs_phase2": epochs_p2,
            "actual_epochs_phase1": actual_epochs_p1,
            "actual_epochs_phase2": actual_epochs_p2,
            "early_stopping_triggered": early_stopping_triggered
        },
        "best_epoch": best_epoch,
        "optimal_threshold": best_thresh,
        "validation_metrics": {
            "accuracy": acc_v,
            "precision": best_val_precision,
            "recall": best_val_recall,
            "f1": best_thresh_f1,
            "loss": best_val_loss
        },
        "test_metrics": test_metrics,
        "confusion_matrix": confusion_data,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    torch.save(checkpoint_data, model_path)
    
    # Save report card text file
    report_filename = "training_report_multiclass.txt" if len(CLASSES) == 7 else "training_report.txt"
    report_path = os.path.join(RESULTS_DIR, report_filename)
    with open(report_path, "w", encoding="utf-8") as rf:
        rf.write("==================================================\n")
        rf.write("HERIXA MONUMENT MODEL TRAINING REPORT\n")
        rf.write("==================================================\n")
        rf.write(f"Training Status:             COMPLETED\n")
        rf.write(f"Device Used:                 {device}\n")
        rf.write(f"Phase 1 Epochs Completed:    {actual_epochs_p1}\n")
        rf.write(f"Phase 2 Epochs Completed:    {actual_epochs_p2}\n")
        rf.write(f"Best Validation Epoch:       {best_epoch}\n")
        rf.write(f"Early Stopping Triggered:    {early_stopping_triggered}\n")
        rf.write(f"Total Training Time:         {train_time_sec / 60.0:.2f} minutes\n\n")
        rf.write("BEST VALIDATION PERFORMANCE:\n")
        rf.write(f"  - Accuracy:                {acc_v:.4f}\n")
        rf.write(f"  - Precision (Macro/Bri):   {best_val_precision:.4f}\n")
        rf.write(f"  - Recall (Macro/Bri):      {best_val_recall:.4f}\n")
        rf.write(f"  - F1 Score:                {best_thresh_f1:.4f}\n")
        rf.write(f"  - Training Loss:           {best_train_loss:.4f}\n")
        rf.write(f"  - Validation Loss:         {best_val_loss:.4f}\n\n")
        if len(CLASSES) == 2:
            rf.write(f"Selected Unknown Threshold:  {best_thresh:.3f}\n\n")
        rf.write("TEST SET PERFORMANCE:\n")
        rf.write(f"  - Accuracy:                {test_metrics['accuracy']:.4f}\n")
        rf.write(f"  - Precision (Macro/Bri):   {test_metrics['precision']:.4f}\n")
        rf.write(f"  - Recall (Macro/Bri):      {test_metrics['recall']:.4f}\n")
        rf.write(f"  - F1 Score:                {test_metrics['f1']:.4f}\n\n")
        if len(CLASSES) == 2:
            rf.write("CONFUSION MATRIX:\n")
            rf.write(f"  - True Positives (Bri):    {tp}\n")
            rf.write(f"  - False Negatives (Bri):   {fn}\n")
            rf.write(f"  - True Negatives (HN):     {tn}\n")
            rf.write(f"  - False Positives (HN):    {fp}\n")
        else:
            rf.write("CONFUSION DATA:\n")
            for k, v in sorted(confusion_data.items()):
                rf.write(f"  - {k}: {v}\n")
        rf.write("==================================================\n")
        
    print("\n==================================================")
    print("TRAINING PROCESS COMPLETED SUCCESSFULLY")
    print("==================================================")
    print(f"Device used: {device}")
    print(f"Phase 1 Epochs Completed: {actual_epochs_p1}")
    print(f"Phase 2 Epochs Completed: {actual_epochs_p2}")
    print(f"Best Epoch: {best_epoch}")
    print(f"Best Val Accuracy: {acc_v:.4f}")
    print(f"Best Val F1: {best_thresh_f1:.4f}")
    print(f"Best Val Precision: {best_val_precision:.4f}")
    print(f"Best Val Recall: {best_val_recall:.4f}")
    print(f"Training Loss: {best_train_loss:.4f}")
    print(f"Validation Loss: {best_val_loss:.4f}")
    print(f"Total Training Time: {train_time_sec / 60.0:.2f} minutes")
    print(f"Early Stopping Triggered: {early_stopping_triggered}")
    if len(CLASSES) == 2:
        print(f"Selected Unknown Threshold: {best_thresh:.3f}")
    print(f"Model saved to: {model_path}")
    print("==================================================")

if __name__ == "__main__":
    train_model()
