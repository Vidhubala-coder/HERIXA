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

TEMPLE_CLASSES = CLASSES[:6]

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
    logits = sess.run([out_name], {in_name: tensor})[0][0]
    probs = softmax(logits)
    idx = int(np.argmax(probs))
    conf = float(probs[idx])
    return idx, CLASSES[idx], conf, probs

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

    all_records = []
    
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
            except Exception as e:
                continue

            t0 = time.perf_counter()
            idx_g, pred_g, conf_g, probs_g = run_onnx(sess_g, in_g, out_g, tensor)
            lat_g = (time.perf_counter() - t0) * 1000.0

            t1 = time.perf_counter()
            idx_l, pred_l, conf_l, probs_l = run_onnx(sess_l, in_l, out_l, tensor)
            lat_l = (time.perf_counter() - t1) * 1000.0

            # Hybrid 3G Preferred (0.10)
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

            # Correctness evaluation
            if cls_name == "Hard_Negatives":
                correct_g = not acc_g or pred_g == "Hard_Negatives"
                correct_l = not acc_l or pred_l == "Hard_Negatives"
                correct_h = not acc_h or pred_h == "Hard_Negatives"
            else:
                correct_g = acc_g and (pred_g == cls_name)
                correct_l = acc_l and (pred_l == cls_name)
                correct_h = acc_h and (pred_h == cls_name)

            all_records.append({
                "filename": fname,
                "ground_truth": cls_name,
                "pred_g": pred_g, "conf_g": float(conf_g), "margin_g": margin_g, "accepted_g": acc_g, "correct_g": correct_g, "lat_g": lat_g,
                "pred_l": pred_l, "conf_l": float(conf_l), "margin_l": margin_l, "accepted_l": acc_l, "correct_l": correct_l, "lat_l": lat_l,
                "pred_h": pred_h, "conf_h": float(conf_h), "margin_h": margin_h, "accepted_h": acc_h, "winner_h": winner_h, "correct_h": correct_h, "lat_h": lat_h,
                "disagreement": (pred_g != pred_l)
            })

    print(f"Evaluated Total {len(all_records)} Real Validation Images across 7 Classes.")

    # Calculate Per-Class Breakdown
    per_class_summary = {}
    f1_list_g = []
    f1_list_l = []
    f1_list_h = []

    for cls in CLASSES:
        cls_recs = [r for r in all_records if r["ground_truth"] == cls]
        tot = len(cls_recs)
        if tot == 0:
            continue
            
        acc_cnt_g = sum(1 for r in cls_recs if r["correct_g"])
        acc_cnt_l = sum(1 for r in cls_recs if r["correct_l"])
        acc_cnt_h = sum(1 for r in cls_recs if r["correct_h"])

        mean_c_g = np.mean([r["conf_g"] for r in cls_recs])
        mean_c_l = np.mean([r["conf_l"] for r in cls_recs])
        mean_c_h = np.mean([r["conf_h"] for r in cls_recs])

        min_c_h = np.min([r["conf_h"] for r in cls_recs])
        max_c_h = np.max([r["conf_h"] for r in cls_recs])
        low_c_h = sum(1 for r in cls_recs if r["conf_h"] < 0.65)
        rej_c_h = sum(1 for r in cls_recs if not r["accepted_h"])

        per_class_summary[cls] = {
            "total": tot,
            "3G_acc": (acc_cnt_g / tot) * 100.0,
            "3L_acc": (acc_cnt_l / tot) * 100.0,
            "Hybrid_acc": (acc_cnt_h / tot) * 100.0,
            "Hybrid_mean_conf": mean_c_h,
            "Hybrid_min_conf": min_c_h,
            "Hybrid_max_conf": max_c_h,
            "Hybrid_low_conf_cnt": low_c_h,
            "Hybrid_rej_cnt": rej_c_h
        }

    print("\n" + "=" * 100)
    print("MASTER PER-CLASS BENCHMARK TABLE")
    print("=" * 100)
    print(f"{'Class':<24} | {'Total':<5} | {'3G Acc':<8} | {'3L Acc':<8} | {'Hybrid Acc':<10} | {'Mean Conf':<10} | {'Low Conf':<8} | {'Rejects':<8}")
    print("-" * 100)
    for cls in CLASSES:
        s = per_class_summary[cls]
        print(f"{cls:<24} | {s['total']:<5} | {s['3G_acc']:>7.1f}% | {s['3L_acc']:>7.1f}% | {s['Hybrid_acc']:>9.1f}% | {s['Hybrid_mean_conf']:>9.4f} | {s['Hybrid_low_conf_cnt']:<8} | {s['Hybrid_rej_cnt']:<8}")

    # Latencies
    avg_lat_g = np.mean([r["lat_g"] for r in all_records])
    avg_lat_l = np.mean([r["lat_l"] for r in all_records])
    avg_lat_h = np.mean([r["lat_h"] for r in all_records])

    tot_all = len(all_records)
    acc_tot_g = (sum(1 for r in all_records if r["correct_g"]) / tot_all) * 100.0
    acc_tot_l = (sum(1 for r in all_records if r["correct_l"]) / tot_all) * 100.0
    acc_tot_h = (sum(1 for r in all_records if r["correct_h"]) / tot_all) * 100.0

    print("\n" + "=" * 100)
    print("OVERALL PERFORMANCE SUMMARY")
    print("=" * 100)
    print(f"Total Validation Images Tested: {tot_all}")
    print(f"Phase 3G Accuracy:              {acc_tot_g:.2f}% (Avg Latency: {avg_lat_g:.2f} ms)")
    print(f"Phase 3L Accuracy:              {acc_tot_l:.2f}% (Avg Latency: {avg_lat_l:.2f} ms)")
    print(f"Hybrid 3G Preferred (0.10):     {acc_tot_h:.2f}% (Avg Latency: {avg_lat_h:.2f} ms)")
    print("=" * 100)

if __name__ == "__main__":
    main()
