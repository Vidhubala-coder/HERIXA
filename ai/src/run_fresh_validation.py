import os
import sys
import io
import time
import csv
import requests
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

TEMPLE_CLASSES = CLASSES[:6]

SLUG_MAP = {
    "Brihadeeswarar": "brihadeeswarar",
    "Meenakshi-Amman": "meenakshi-amman",
    "Mahabalipuram": "mahabalipuram",
    "Gangaikonda-Cholapuram": "gangaikonda-cholapuram",
    "Airavatesvara": "airavatesvara",
    "Thirumalai-Nayakkar": "thirumalai-nayakkar"
}

GPS_MAP = {
    "Brihadeeswarar": (10.7828, 79.1318),
    "Meenakshi-Amman": (9.9197, 78.1194),
    "Mahabalipuram": (12.6164, 80.1986),
    "Gangaikonda-Cholapuram": (11.2064, 79.4478),
    "Airavatesvara": (10.9479, 79.3569),
    "Thirumalai-Nayakkar": (9.9149, 78.1226),
    "Hard_Negatives": (10.0, 78.0)
}

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

    # Select 10 FRESH images per class (skipping the first 10 used in earlier subset)
    dataset = []
    for cls_display in CLASSES:
        folder_slug = SLUG_MAP.get(cls_display, "hard_negatives")
        folder_path = os.path.join(val_dir, folder_slug)
        if not os.path.exists(folder_path):
            continue
            
        files = sorted([f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])
        # Pick images 10..20 for fresh unseen testing (or slice [-10:] if fewer)
        if len(files) >= 20:
            fresh_files = files[10:20]
        else:
            fresh_files = files[-10:]
            
        for f in fresh_files:
            dataset.append({
                "filename": f,
                "path": os.path.join(folder_path, f),
                "ground_truth": cls_display
            })

    print("=" * 100)
    print(f"HERIXA FRESH-IMAGE VALIDATION BENCHMARK (Total Fresh Images: {len(dataset)})")
    print("=" * 100)

    records = []

    for item in dataset:
        img_data, w, h = preprocess(item["path"])
        
        idx_g, pred_g, conf_g, probs_g, lat_g = run_onnx(sess_g, in_g, out_g, img_data)
        idx_l, pred_l, conf_l, probs_l, lat_l = run_onnx(sess_l, in_l, out_l, img_data)

        t_hyb_0 = time.perf_counter()
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
        lat_h = (time.perf_counter() - t_hyb_0) * 1000.0 + lat_g + lat_l

        sorted_g = np.sort(probs_g)[::-1]
        margin_g = float(sorted_g[0] - sorted_g[1]) if len(sorted_g) > 1 else 0.0
        acc_g = (conf_g >= CONFIDENCE_THRESHOLD) and (pred_g != "Hard_Negatives") and (margin_g >= MARGIN_THRESHOLD)

        sorted_l = np.sort(probs_l)[::-1]
        margin_l = float(sorted_l[0] - sorted_l[1]) if len(sorted_l) > 1 else 0.0
        acc_l = (conf_l >= CONFIDENCE_THRESHOLD) and (pred_l != "Hard_Negatives") and (margin_l >= MARGIN_THRESHOLD)

        sorted_h = np.sort(probs_h)[::-1]
        margin_h = float(sorted_h[0] - sorted_h[1]) if len(sorted_h) > 1 else 0.0
        acc_h = (conf_h >= CONFIDENCE_THRESHOLD) and (pred_h != "Hard_Negatives") and (margin_h >= MARGIN_THRESHOLD)

        gt = item["ground_truth"]
        if gt == "Hard_Negatives":
            correct_g = not acc_g or pred_g == "Hard_Negatives"
            correct_l = not acc_l or pred_l == "Hard_Negatives"
            correct_h = not acc_h or pred_h == "Hard_Negatives"
        else:
            correct_g = acc_g and (pred_g == gt)
            correct_l = acc_l and (pred_l == gt)
            correct_h = acc_h and (pred_h == gt)

        records.append({
            "filename": item["filename"],
            "ground_truth": gt,
            "pred_g": pred_g, "conf_g": conf_g, "acc_g": acc_g, "correct_g": correct_g, "lat_g": lat_g,
            "pred_l": pred_l, "conf_l": conf_l, "acc_l": acc_l, "correct_l": correct_l, "lat_l": lat_l,
            "pred_h": pred_h, "conf_h": conf_h, "acc_h": acc_h, "winner_h": winner_h, "correct_h": correct_h, "lat_h": lat_h,
            "disagreement": (pred_g != pred_l)
        })

    # Generate Scorecard Table
    print("\n" + "=" * 100)
    print("REQUIRED FRESH-IMAGE PER-CLASS SCORECARD")
    print("=" * 100)
    print(f"{'Class':<24} | {'Images':<6} | {'3G Correct':<10} | {'3L Correct':<10} | {'Hybrid Correct':<14} | {'Hybrid Acc':<10} | {'Avg Conf':<10} | {'Low Conf':<8} | {'Rejected':<8}")
    print("-" * 100)

    total_images_cnt = len(records)
    cls_metrics = {}

    for cls in CLASSES:
        recs = [r for r in records if r["ground_truth"] == cls]
        tot = len(recs)
        if tot == 0:
            continue

        c_g = sum(1 for r in recs if r["correct_g"])
        c_l = sum(1 for r in recs if r["correct_l"])
        c_h = sum(1 for r in recs if r["correct_h"])

        avg_conf_h = np.mean([r["conf_h"] for r in recs])
        low_conf_cnt = sum(1 for r in recs if r["conf_h"] < 0.65)
        rej_cnt = sum(1 for r in recs if not r["acc_h"])

        acc_h_pct = (c_h / tot) * 100.0

        cls_metrics[cls] = {
            "tot": tot, "c_g": c_g, "c_l": c_l, "c_h": c_h,
            "acc_h": acc_h_pct, "avg_conf": avg_conf_h,
            "low_conf": low_conf_cnt, "rej": rej_cnt
        }

        print(f"{cls:<24} | {tot:<6} | {c_g:<10} | {c_l:<10} | {c_h:<14} | {acc_h_pct:>9.1f}% | {avg_conf_h:>9.4f} | {low_conf_cnt:<8} | {rej_cnt:<8}")

    overall_acc_g = (sum(1 for r in records if r["correct_g"]) / total_images_cnt) * 100.0
    overall_acc_l = (sum(1 for r in records if r["correct_l"]) / total_images_cnt) * 100.0
    overall_acc_h = (sum(1 for r in records if r["correct_h"]) / total_images_cnt) * 100.0

    mean_conf_all = np.mean([r["conf_h"] for r in records])
    mean_lat_all = np.mean([r["lat_h"] for r in records])

    # Hard Negative Rejection Rate
    hn_recs = [r for r in records if r["ground_truth"] == "Hard_Negatives"]
    hn_tot = len(hn_recs)
    hn_rej_rate = (sum(1 for r in hn_recs if r["correct_h"]) / hn_tot * 100.0) if hn_tot > 0 else 0.0

    print("=" * 100)
    print(f"OVERALL FRESH-IMAGE ACCURACY (70 Images):")
    print(f"  Phase 3G Standalone Accuracy: {overall_acc_g:.2f}%")
    print(f"  Phase 3L Standalone Accuracy: {overall_acc_l:.2f}%")
    print(f"  Hybrid 3G Preferred (0.10):    {overall_acc_h:.2f}%")
    print(f"  Average Hybrid Confidence:   {mean_conf_all:.4f}")
    print(f"  Average Hybrid Latency:      {mean_lat_all:.2f} ms")
    print(f"  Hard-Negative Rejection Rate: {hn_rej_rate:.2f}% ({sum(1 for r in hn_recs if r['correct_h'])}/{hn_tot})")
    print("=" * 100)

    # Disagreement breakdown
    disagreements = [r for r in records if r["disagreement"]]
    print(f"\nDISAGREEMENTS BETWEEN 3G AND 3L ON FRESH IMAGES ({len(disagreements)} / {total_images_cnt}):")
    for i, d in enumerate(disagreements, 1):
        status = "CORRECT" if d["correct_h"] else "WRONG"
        print(f"  [{i:02d}] {d['filename']} | GT: {d['ground_truth']:<22} | 3G: {d['pred_g']:<22} ({d['conf_g']:.3f}) | 3L: {d['pred_l']:<22} ({d['conf_l']:.3f}) | Hybrid: {d['pred_h']:<22} ({d['winner_h']}) [{status}]")

if __name__ == "__main__":
    main()
