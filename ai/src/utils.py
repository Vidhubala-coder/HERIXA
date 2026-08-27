import os
import random
import logging
import json
import numpy as np
import torch

def setup_logger(name: str, log_file: str = None, level=logging.INFO):
    """Sets up a logger with a standard formatting."""
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Avoid duplicate handlers if setup multiple times
    if not logger.handlers:
        # Console handler
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        # File handler if specified
        if log_file:
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            fh = logging.FileHandler(log_file, encoding='utf-8')
            fh.setFormatter(formatter)
            logger.addHandler(fh)
            
    return logger

logger = setup_logger("herixa_ai")

def get_ai_root() -> str:
    """Returns the absolute path to the 'ai' directory."""
    # This file is in ai/src/utils.py, so parent of parent is 'ai'
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def get_path(*paths) -> str:
    """Gets a path relative to the 'ai' root directory."""
    return os.path.abspath(os.path.join(get_ai_root(), *paths))

def set_seed(seed: int = 42):
    """Sets random seeds for reproducibility."""
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    # Enable deterministic behavior in PyTorch
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    logger.info(f"Random seed set to {seed} (PyTorch determinism enabled)")

def get_device() -> torch.device:
    """Checks and returns the available device (CUDA or CPU)."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Using GPU device: {torch.cuda.get_device_name(0)}")
    else:
        device = torch.device("cpu")
        logger.info("CUDA GPU not available. Using CPU.")
    return device

def save_json(data, filepath: str):
    """Saves data to a JSON file with pretty printing."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_json(filepath: str):
    """Loads data from a JSON file."""
    if not os.path.exists(filepath):
        return None
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)
