import os
import sys
import time
import json
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

CONFIDENCE_THRESHOLD = 0.35
MARGIN_THRESHOLD = 0.08
HYBRID_MARGIN = 0.10

def preprocess(img_path):
    img = Image.open(img_path)
    w, h = img.size
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = (img_data - MEAN) / STD
    img_data = img_data.transpose(2, 0, 1)
    img_data = np.expand_dims(img_data, axis=0)
    return img_data, w, h

def softmax(logits):
    exp_l = np.exp(logits - np.max(logits))
    return exp_l / np.sum(exp_l)

def run_onnx(sess, in_name, out_name, tensor):
    t0 = time.perf_counter()
    logits = sess.run([out_name], {in_name: tensor})[0][0]
    lat_ms = (time.perf_counter() - t0) * 1000.0
    probs = softmax(logits)
    idx = int(np.argmax(probs))
    conf = float(probs[idx])
    return idx, CLASSES[idx], conf, probs, lat_ms

def main():
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    g_path = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    l_path = os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")

    sess_g = onnxruntime.InferenceSession(g_path, providers=["CPUExecutionProvider"])
    sess_l = onnxruntime.InferenceSession(l_path, providers=["CPUExecutionProvider"])

    in_g = sess_g.get_inputs()[0].name
    out_g = sess_g.get_outputs()[0].name
    in_l = sess_l.get_inputs()[0].name
    out_l = sess_l.get_outputs()[0].name

    val_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation")

    records = []
    
    for cls_folder in os.listdir(val_dir):
        folder_path = os.path.join(val_dir, cls_folder)
        if not os.path.isdir(folder_path):
            continue
            
        cls_name = None
        for c in CLASSES:
            if c.lower() == cls_folder.lower():
                cls_name = c
                break
        if not cls_name:
            continue

        files = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
        for fname in files:
            fpath = os.path.join(folder_path, fname)
            try:
                tensor, w, h = preprocess(fpath)
            except Exception:
                continue

            idx_g, pred_g, conf_g, probs_g, lat_g = run_onnx(sess_g, in_g, out_g, tensor)
            idx_l, pred_l, conf_l, probs_l, lat_l = run_onnx(sess_l, in_l, out_l, tensor)

            # Hybrid 3G Preferred (0.10)
            t_hyb = time.perf_counter()
            if conf_l > conf_g + HYBRID_MARGIN:
                pred_h = pred_l
                conf_h = conf_l
                probs_h = probs_l
                winner_h = "Phase 3L"
            else:
                pred_h = pred_g
                conf_h = conf_g
                probs_h = probs_g
                winner_h = "Phase 3G"
            lat_h = (time.perf_counter() - t_hyb) * 1000.0 + lat_g + lat_l

            sorted_g = np.sort(probs_g)[::-1]
            margin_g = float(sorted_g[0] - sorted_g[1]) if len(sorted_g) > 1 else 0.0
            acc_g = (conf_g >= CONFIDENCE_THRESHOLD) and (pred_g != "Hard_Negatives") and (margin_g >= MARGIN_THRESHOLD)

            sorted_l = np.sort(probs_l)[::-1]
            margin_l = float(sorted_l[0] - sorted_l[1]) if len(sorted_l) > 1 else 0.0
            acc_l = (conf_l >= CONFIDENCE_THRESHOLD) and (pred_l != "Hard_Negatives") and (margin_l >= MARGIN_THRESHOLD)

            sorted_h = np.sort(probs_h)[::-1]
            margin_h = float(sorted_h[0] - sorted_h[1]) if len(sorted_h) > 1 else 0.0
            acc_h = (conf_h >= CONFIDENCE_THRESHOLD) and (pred_h != "Hard_Negatives") and (margin_h >= MARGIN_THRESHOLD)

            if cls_name == "Hard_Negatives":
                correct_g = not acc_g or pred_g == "Hard_Negatives"
                correct_l = not acc_l or pred_l == "Hard_Negatives"
                correct_h = not acc_h or pred_h == "Hard_Negatives"
            else:
                correct_g = acc_g and (pred_g == cls_name)
                correct_l = acc_l and (pred_l == cls_name)
                correct_h = acc_h and (pred_h == cls_name)

            # Bucket classification
            bucket = "UNKNOWN"
            if cls_name == "Hard_Negatives" and not correct_h:
                bucket = "G" # Hard-negative false positive
            elif correct_g and not correct_l and correct_h:
                bucket = "A" # 3G correct / 3L wrong
            elif not correct_g and correct_l and correct_h:
                bucket = "B" # 3G wrong / 3L correct
            elif not correct_g and not correct_l:
                bucket = "C" # Both wrong
            elif correct_g and correct_l and not correct_h:
                bucket = "D" # Both correct / Hybrid wrong
            elif correct_h and conf_h < 0.65:
                bucket = "E" # Correct prediction but low confidence
            elif not correct_h and conf_h > 0.70:
                bucket = "F" # Wrong prediction with high confidence
            else:
                bucket = "L" # Ambiguous view

            records.append({
                "filename": fname,
                "ground_truth": cls_name,
                "pred_g": pred_g, "conf_g": conf_g, "correct_g": correct_g, "lat_g": lat_g,
                "pred_l": pred_l, "conf_l": conf_l, "correct_l": correct_l, "lat_l": lat_l,
                "pred_h": pred_h, "conf_h": conf_h, "correct_h": correct_h, "lat_h": lat_h,
                "winner_h": winner_h, "margin_h": margin_h, "bucket": bucket
            })

    tot = len(records)
    print("=" * 100)
    print(f"FORENSIC EVALUATION SUMMARY (Total Images: {tot})")
    print("=" * 100)

    bucket_counts = {}
    for r in records:
        b = r["bucket"]
        bucket_counts[b] = bucket_counts.get(b, 0) + 1

    print("\nERROR & PERFORMANCE BUCKET BREAKDOWN:")
    for b_code, b_name in [
        ("A", "3G correct / 3L wrong"),
        ("B", "3G wrong / 3L correct"),
        ("C", "Both wrong"),
        ("D", "Both correct / Hybrid wrong"),
        ("E", "Correct prediction but low confidence (<0.65)"),
        ("F", "Wrong prediction with high confidence (>0.70)"),
        ("G", "Hard-negative false positive"),
        ("L", "Ambiguous view")
    ]:
        cnt = bucket_counts.get(b_code, 0)
        pct = (cnt / tot) * 100.0
        print(f"  Bucket {b_code:<2} ({b_name:<45}): {cnt:<4} ({pct:.1f}%)")

    # Hard-Negative Detailed Breakdown
    hn_recs = [r for r in records if r["ground_truth"] == "Hard_Negatives"]
    hn_tot = len(hn_recs)
    hn_fp = [r for r in hn_recs if not r["correct_h"]]
    
    print("\n" + "=" * 100)
    print(f"HARD-NEGATIVE DETAILED FORENSIC ANALYSIS ({len(hn_fp)} False Positives out of {hn_tot} Hard Negatives)")
    print("=" * 100)
    for i, r in enumerate(hn_fp, 1):
        print(f"  [{i:02d}] {r['filename']:<50} -> Pred: {r['pred_h']:<22} (Conf: {r['conf_h']:.4f}) [3G: {r['pred_g']} {r['conf_g']:.3f} | 3L: {r['pred_l']} {r['conf_l']:.3f}]")

if __name__ == "__main__":
    main()
