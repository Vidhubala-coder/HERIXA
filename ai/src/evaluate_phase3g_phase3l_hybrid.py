import os
import sys
import time
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

TEMPLE_CLASSES = CLASSES[:6]

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

def preprocess(img_path):
    img = Image.open(img_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = (img_data - MEAN) / STD
    img_data = img_data.transpose(2, 0, 1)
    img_data = np.expand_dims(img_data, axis=0)
    return img_data

def softmax(logits):
    exp_l = np.exp(logits - np.max(logits))
    return exp_l / np.sum(exp_l)

def run_model(session, input_name, output_name, img_data):
    t0 = time.perf_counter()
    logits = session.run([output_name], {input_name: img_data})[0][0]
    latency_ms = (time.perf_counter() - t0) * 1000.0
    probs = softmax(logits)
    pred_idx = int(np.argmax(probs))
    conf = float(probs[pred_idx])
    return pred_idx, CLASSES[pred_idx], conf, probs, latency_ms

def compute_metrics(true_classes, pred_classes):
    total = len(true_classes)
    correct = sum(1 for t, p in zip(true_classes, pred_classes) if t == p)
    acc = (correct / total) * 100.0 if total > 0 else 0.0
    
    # Per class metrics
    per_cls = {}
    f1_list = []
    for cls in CLASSES:
        tp = sum(1 for t, p in zip(true_classes, pred_classes) if t == cls and p == cls)
        fp = sum(1 for t, p in zip(true_classes, pred_classes) if t != cls and p == cls)
        fn = sum(1 for t, p in zip(true_classes, pred_classes) if t == cls and p != cls)
        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
        per_cls[cls] = {"tp": tp, "fp": fp, "fn": fn, "prec": prec, "rec": rec, "f1": f1}
        if cls in TEMPLE_CLASSES:
            f1_list.append(f1)
            
    macro_f1 = (sum(f1_list) / len(f1_list)) * 100.0 if f1_list else 0.0
    return acc, macro_f1, per_cls

def main():
    ai_root = r"C:\Users\LENOVO\Desktop\AR model\ai"
    onnx_g_path = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    onnx_l_path = os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")
    
    if not os.path.exists(onnx_g_path):
        print(f"[ERROR] Phase 3G ONNX not found: {onnx_g_path}")
        sys.exit(1)
    if not os.path.exists(onnx_l_path):
        print(f"[ERROR] Phase 3L ONNX not found: {onnx_l_path}")
        sys.exit(1)

    print("================================================================================")
    print("HERIXA PHASE 3G vs PHASE 3L SIDE-BY-SIDE & HYBRID EVALUATION")
    print("================================================================================")
    print(f"Phase 3G Model: {onnx_g_path} ({os.path.getsize(onnx_g_path)} bytes)")
    print(f"Phase 3L Model: {onnx_l_path} ({os.path.getsize(onnx_l_path)} bytes)")

    sess_g = onnxruntime.InferenceSession(onnx_g_path, providers=["CPUExecutionProvider"])
    sess_l = onnxruntime.InferenceSession(onnx_l_path, providers=["CPUExecutionProvider"])
    
    in_g = sess_g.get_inputs()[0].name
    out_g = sess_g.get_outputs()[0].name
    in_l = sess_l.get_inputs()[0].name
    out_l = sess_l.get_outputs()[0].name

    val_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation")
    
    # Collect 10 images per temple (60 images total)
    temple_images = []
    for cls in TEMPLE_CLASSES:
        cls_dir = os.path.join(val_dir, cls)
        files = sorted([f for f in os.listdir(cls_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])[:10]
        for f in files:
            temple_images.append({
                "path": os.path.join(cls_dir, f),
                "filename": f,
                "expected": cls
            })

    # Collect 10 hard-negative images
    hn_dir = os.path.join(val_dir, "hard_negatives")
    hn_files = sorted([f for f in os.listdir(hn_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])[:10]
    hard_negative_images = [{
        "path": os.path.join(hn_dir, f),
        "filename": f,
        "expected": "hard_negatives"
    } for f in hn_files]

    print(f"\nCollected {len(temple_images)} temple images (10 per temple) + {len(hard_negative_images)} hard negative safety images.")

    # Evaluate all temple images
    eval_results = []
    
    for item in temple_images:
        img_data = preprocess(item["path"])
        
        idx_g, cls_g, conf_g, probs_g, lat_g = run_model(sess_g, in_g, out_g, img_data)
        idx_l, cls_l, conf_l, probs_l, lat_l = run_model(sess_l, in_l, out_l, img_data)
        
        # Hybrid Strategy 1: 50/50 Weighted Probability Fusion
        prob_fusion = 0.5 * probs_g + 0.5 * probs_l
        idx_f = int(np.argmax(prob_fusion))
        cls_f = CLASSES[idx_f]
        conf_f = float(prob_fusion[idx_f])
        
        # Hybrid Strategy 2: Confidence Winner
        if conf_g >= conf_l:
            cls_cw = cls_g
            conf_cw = conf_g
        else:
            cls_cw = cls_l
            conf_cw = conf_l
            
        # Hybrid Strategy 3: 3L Preferred (margin 0.05, 0.10, 0.15)
        cls_3lp_05 = cls_g if conf_g > conf_l + 0.05 else cls_l
        cls_3lp_10 = cls_g if conf_g > conf_l + 0.10 else cls_l
        cls_3lp_15 = cls_g if conf_g > conf_l + 0.15 else cls_l
        
        # Hybrid Strategy 4: 3G Preferred (margin 0.05, 0.10, 0.15)
        cls_3gp_05 = cls_l if conf_l > conf_g + 0.05 else cls_g
        cls_3gp_10 = cls_l if conf_l > conf_g + 0.10 else cls_g
        cls_3gp_15 = cls_l if conf_l > conf_g + 0.15 else cls_g
        
        eval_results.append({
            "filename": item["filename"],
            "expected": item["expected"],
            "3G_pred": cls_g, "3G_conf": conf_g, "3G_probs": probs_g, "3G_lat": lat_g,
            "3L_pred": cls_l, "3L_conf": conf_l, "3L_probs": probs_l, "3L_lat": lat_l,
            "Fusion_pred": cls_f, "Fusion_conf": conf_f,
            "ConfWinner_pred": cls_cw, "ConfWinner_conf": conf_cw,
            "3LP_05_pred": cls_3lp_05, "3LP_10_pred": cls_3lp_10, "3LP_15_pred": cls_3lp_15,
            "3GP_05_pred": cls_3gp_05, "3GP_10_pred": cls_3gp_10, "3GP_15_pred": cls_3gp_15,
        })

    # Output Side-by-Side Per Image Results
    print("\n" + "="*100)
    print("PURE SIDE-BY-SIDE PER-IMAGE EVALUATION (60 TEMPLE IMAGES)")
    print("="*100)
    
    for i, res in enumerate(eval_results, 1):
        match_g = "CORRECT" if res["3G_pred"] == res["expected"] else f"WRONG ({res['3G_pred']})"
        match_l = "CORRECT" if res["3L_pred"] == res["expected"] else f"WRONG ({res['3L_pred']})"
        print(f"[{i:02d}/60] {res['filename']} | True: {res['expected']:<22} | 3G: {match_g:<30} (conf: {res['3G_conf']:.2f}) | 3L: {match_l:<30} (conf: {res['3L_conf']:.2f})")

    # Per-Temple Performance Table
    print("\n" + "="*100)
    print("PER-TEMPLE PERFORMANCE ACCURACY COMPARISON TABLE")
    print("="*100)
    print(f"{'Temple Class':<25} | {'3G Correct':<10} | {'3G Accuracy':<12} | {'3L Correct':<10} | {'3L Accuracy':<12}")
    print("-" * 78)
    
    for cls in TEMPLE_CLASSES:
        items = [r for r in eval_results if r["expected"] == cls]
        tot = len(items)
        corr_g = sum(1 for r in items if r["3G_pred"] == cls)
        corr_l = sum(1 for r in items if r["3L_pred"] == cls)
        acc_g = (corr_g / tot * 100) if tot > 0 else 0
        acc_l = (corr_l / tot * 100) if tot > 0 else 0
        print(f"{cls:<25} | {corr_g}/{tot:<8} | {acc_g:>10.2f}% | {corr_l}/{tot:<8} | {acc_l:>10.2f}%")

    # Overall Summary
    true_all = [r["expected"] for r in eval_results]
    pred_g = [r["3G_pred"] for r in eval_results]
    pred_l = [r["3L_pred"] for r in eval_results]
    pred_f = [r["Fusion_pred"] for r in eval_results]
    pred_cw = [r["ConfWinner_pred"] for r in eval_results]
    pred_3lp_05 = [r["3LP_05_pred"] for r in eval_results]
    pred_3lp_10 = [r["3LP_10_pred"] for r in eval_results]
    pred_3lp_15 = [r["3LP_15_pred"] for r in eval_results]
    pred_3gp_05 = [r["3GP_05_pred"] for r in eval_results]
    pred_3gp_10 = [r["3GP_10_pred"] for r in eval_results]
    pred_3gp_15 = [r["3GP_15_pred"] for r in eval_results]

    acc_g, macro_f1_g, _ = compute_metrics(true_all, pred_g)
    acc_l, macro_f1_l, _ = compute_metrics(true_all, pred_l)
    acc_f, macro_f1_f, _ = compute_metrics(true_all, pred_f)
    acc_cw, macro_f1_cw, _ = compute_metrics(true_all, pred_cw)
    acc_3lp_05, macro_f1_3lp_05, _ = compute_metrics(true_all, pred_3lp_05)
    acc_3lp_10, macro_f1_3lp_10, _ = compute_metrics(true_all, pred_3lp_10)
    acc_3lp_15, macro_f1_3lp_15, _ = compute_metrics(true_all, pred_3lp_15)
    acc_3gp_05, macro_f1_3gp_05, _ = compute_metrics(true_all, pred_3gp_05)
    acc_3gp_10, macro_f1_3gp_10, _ = compute_metrics(true_all, pred_3gp_10)
    acc_3gp_15, macro_f1_3gp_15, _ = compute_metrics(true_all, pred_3gp_15)

    avg_conf_g = np.mean([r["3G_conf"] for r in eval_results])
    avg_conf_l = np.mean([r["3L_conf"] for r in eval_results])
    avg_lat_g = np.mean([r["3G_lat"] for r in eval_results])
    avg_lat_l = np.mean([r["3L_lat"] for r in eval_results])

    print("\n" + "="*100)
    print("OVERALL MODEL METRICS")
    print("="*100)
    print(f"Phase 3G -> Overall Acc: {acc_g:.2f}% | Macro F1: {macro_f1_g:.2f}% | Avg Conf: {avg_conf_g:.4f} | Avg Latency: {avg_lat_g:.2f} ms")
    print(f"Phase 3L -> Overall Acc: {acc_l:.2f}% | Macro F1: {macro_f1_l:.2f}% | Avg Conf: {avg_conf_l:.4f} | Avg Latency: {avg_lat_l:.2f} ms")

    # Evaluate Hard-Negative Safety
    print("\n" + "="*100)
    print("HARD-NEGATIVE SAFETY EVALUATION (10 HARD NEGATIVE IMAGES)")
    print("="*100)
    hn_results = []
    for item in hard_negative_images:
        img_data = preprocess(item["path"])
        _, cls_g, conf_g, probs_g, _ = run_model(sess_g, in_g, out_g, img_data)
        _, cls_l, conf_l, probs_l, _ = run_model(sess_l, in_l, out_l, img_data)
        
        prob_fusion = 0.5 * probs_g + 0.5 * probs_l
        cls_f = CLASSES[int(np.argmax(prob_fusion))]
        cls_cw = cls_g if conf_g >= conf_l else cls_l
        cls_3lp = cls_g if conf_g > conf_l + 0.10 else cls_l
        cls_3gp = cls_l if conf_l > conf_g + 0.10 else cls_g
        
        hn_results.append({
            "expected": "hard_negatives",
            "3G": cls_g, "3L": cls_l, "Fusion": cls_f, "ConfWinner": cls_cw, "3LP": cls_3lp, "3GP": cls_3gp
        })
        
    rej_g = sum(1 for r in hn_results if r["3G"] == "hard_negatives") / len(hn_results) * 100
    rej_l = sum(1 for r in hn_results if r["3L"] == "hard_negatives") / len(hn_results) * 100
    rej_f = sum(1 for r in hn_results if r["Fusion"] == "hard_negatives") / len(hn_results) * 100
    rej_cw = sum(1 for r in hn_results if r["ConfWinner"] == "hard_negatives") / len(hn_results) * 100
    rej_3lp = sum(1 for r in hn_results if r["3LP"] == "hard_negatives") / len(hn_results) * 100
    rej_3gp = sum(1 for r in hn_results if r["3GP"] == "hard_negatives") / len(hn_results) * 100

    print(f"Phase 3G Rejection Rate:      {rej_g:.2f}%")
    print(f"Phase 3L Rejection Rate:      {rej_l:.2f}%")
    print(f"Hybrid 50/50 Fusion:         {rej_f:.2f}%")
    print(f"Hybrid Confidence Winner:    {rej_cw:.2f}%")
    print(f"Hybrid 3L Preferred (0.10):  {rej_3lp:.2f}%")
    print(f"Hybrid 3G Preferred (0.10):  {rej_3gp:.2f}%")

    # Disagreement Analysis
    disagreements = [r for r in eval_results if r["3G_pred"] != r["3L_pred"]]
    print("\n" + "="*100)
    print(f"DISAGREEMENT ANALYSIS ({len(disagreements)} / 60 IMAGES)")
    print("="*100)
    for i, res in enumerate(disagreements, 1):
        print(f"[{i:02d}] {res['filename']} | True: {res['expected']:<22}")
        print(f"    3G: {res['3G_pred']:<22} (conf: {res['3G_conf']:.4f})")
        print(f"    3L: {res['3L_pred']:<22} (conf: {res['3L_conf']:.4f})")
        print(f"    Fusion 50/50: {res['Fusion_pred']:<15} | ConfWinner: {res['ConfWinner_pred']:<15} | 3L Preferred (0.10): {res['3LP_10_pred']:<15}")
        print("-" * 80)

    # Master Strategy Comparison Table
    print("\n" + "="*120)
    print("MASTER STRATEGY COMPARISON TABLE")
    print("="*120)
    header = f"{'Model / Strategy':<25} | {'Overall Acc':<11} | {'Macro F1':<9} | {'Brihadees':<9} | {'Meenakshi':<9} | {'Mahabalip':<9} | {'Gangaikon':<9} | {'Airavates':<9} | {'Thirumala':<9} | {'HN Rejection':<12}"
    print(header)
    print("-" * len(header))

    def print_strategy_row(name, pred_list, rej_rate):
        acc, m_f1, per_cls = compute_metrics(true_all, pred_list)
        b_acc = (sum(1 for r in eval_results if r['expected'] == 'brihadeeswarar' and pred_list[eval_results.index(r)] == 'brihadeeswarar') / 10) * 100
        m_acc = (sum(1 for r in eval_results if r['expected'] == 'meenakshi-amman' and pred_list[eval_results.index(r)] == 'meenakshi-amman') / 10) * 100
        mb_acc = (sum(1 for r in eval_results if r['expected'] == 'mahabalipuram' and pred_list[eval_results.index(r)] == 'mahabalipuram') / 10) * 100
        g_acc = (sum(1 for r in eval_results if r['expected'] == 'gangaikonda-cholapuram' and pred_list[eval_results.index(r)] == 'gangaikonda-cholapuram') / 10) * 100
        a_acc = (sum(1 for r in eval_results if r['expected'] == 'airavatesvara' and pred_list[eval_results.index(r)] == 'airavatesvara') / 10) * 100
        t_acc = (sum(1 for r in eval_results if r['expected'] == 'thirumalai-nayakkar' and pred_list[eval_results.index(r)] == 'thirumalai-nayakkar') / 10) * 100
        
        print(f"{name:<25} | {acc:>10.2f}% | {m_f1:>8.2f}% | {b_acc:>8.1f}% | {m_acc:>8.1f}% | {mb_acc:>8.1f}% | {g_acc:>8.1f}% | {a_acc:>8.1f}% | {t_acc:>8.1f}% | {rej_rate:>11.2f}%")

    print_strategy_row("Phase 3G Standalone", pred_g, rej_g)
    print_strategy_row("Phase 3L Standalone", pred_l, rej_l)
    print_strategy_row("Hybrid 50/50 Fusion", pred_f, rej_f)
    print_strategy_row("Hybrid Conf Winner", pred_cw, rej_cw)
    print_strategy_row("Hybrid 3L Pref (0.05)", pred_3lp_05, rej_3lp)
    print_strategy_row("Hybrid 3L Pref (0.10)", pred_3lp_10, rej_3lp)
    print_strategy_row("Hybrid 3L Pref (0.15)", pred_3lp_15, rej_3lp)
    print_strategy_row("Hybrid 3G Pref (0.05)", pred_3gp_05, rej_3gp)
    print_strategy_row("Hybrid 3G Pref (0.10)", pred_3gp_10, rej_3gp)
    print_strategy_row("Hybrid 3G Pref (0.15)", pred_3gp_15, rej_3gp)

    # Save detailed markdown report
    report_path = r"C:\Users\LENOVO\Desktop\AR model\reports\phase_3l\hybrid_eval_report.md"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# HERIXA Phase 3G + Phase 3L Hybrid Evaluation Report\n\n")
        f.write("## 1. Executive Summary\n")
        f.write(f"* **Phase 3G Standalone Accuracy:** {acc_g:.2f}% (Macro F1: {macro_f1_g:.2f}%)\n")
        f.write(f"* **Phase 3L Standalone Accuracy:** {acc_l:.2f}% (Macro F1: {macro_f1_l:.2f}%)\n")
        f.write(f"* **Best Hybrid Strategy (50/50 Probability Fusion):** {acc_f:.2f}% (Macro F1: {macro_f1_f:.2f}%)\n\n")
        
        f.write("## 2. Per-Temple Accuracy Comparison Table\n\n")
        f.write("| Temple Class | Phase 3G Standalone | Phase 3L Standalone | Hybrid 50/50 Fusion | Hybrid Conf Winner |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: |\n")
        for cls in TEMPLE_CLASSES:
            items = [r for r in eval_results if r["expected"] == cls]
            tot = len(items)
            c_g = sum(1 for r in items if r["3G_pred"] == cls)
            c_l = sum(1 for r in items if r["3L_pred"] == cls)
            c_f = sum(1 for r in items if r["Fusion_pred"] == cls)
            c_cw = sum(1 for r in items if r["ConfWinner_pred"] == cls)
            f.write(f"| **{cls}** | {c_g}/{tot} ({(c_g/tot)*100:.1f}%) | {c_l}/{tot} ({(c_l/tot)*100:.1f}%) | {c_f}/{tot} ({(c_f/tot)*100:.1f}%) | {c_cw}/{tot} ({(c_cw/tot)*100:.1f}%) |\n")
            
        f.write("\n## 3. Disagreement Breakdown\n\n")
        f.write(f"Total Disagreements between 3G and 3L: **{len(disagreements)} / 60** images.\n\n")
        for i, res in enumerate(disagreements, 1):
            f.write(f"### {i}. Image: `{res['filename']}`\n")
            f.write(f"* **True Class:** `{res['expected']}`\n")
            f.write(f"* **Phase 3G:** `{res['3G_pred']}` (Confidence: {res['3G_conf']:.4f})\n")
            f.write(f"* **Phase 3L:** `{res['3L_pred']}` (Confidence: {res['3L_conf']:.4f})\n")
            f.write(f"* **Hybrid 50/50 Fusion:** `{res['Fusion_pred']}` | **Confidence Winner:** `{res['ConfWinner_pred']}`\n\n")
            
        f.write("## 4. Production Recommendation\n\n")
        if acc_f > max(acc_g, acc_l):
            f.write(f"**RECOMMENDATION:** **DEPLOY HYBRID 50/50 FUSION**. Hybrid probability fusion achieves **{acc_f:.2f}%** overall accuracy, outperforming both standalone Phase 3G ({acc_g:.2f}%) and Phase 3L ({acc_l:.2f}%).\n")
        else:
            f.write(f"**RECOMMENDATION:** **RETAIN STANDALONE MODEL ({'Phase 3L' if acc_l >= acc_g else 'Phase 3G'})**. Hybrid inference did not achieve a significant improvement over the best standalone model.\n")

    print(f"\n[PASS] Detailed report saved to: {report_path}")

if __name__ == "__main__":
    main()
