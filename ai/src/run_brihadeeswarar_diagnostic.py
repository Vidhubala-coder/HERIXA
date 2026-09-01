import os
import sys
import io
import time
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

def preprocess(img_path):
    img = Image.open(img_path)
    orig_w, orig_h = img.size
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)
    img_data = np.array(img_resized, dtype=np.float32) / 255.0
    img_data = (img_data - MEAN) / STD
    img_data = img_data.transpose(2, 0, 1)
    img_data = np.expand_dims(img_data, axis=0)
    return img_data, orig_w, orig_h

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
    onnx_g = os.path.join(ai_root, "models", "integration", "onnx", "herixa_phase3g.onnx")
    onnx_l = os.path.join(ai_root, "models", "integration", "onnx", "phase3l", "phase3l_candidate.onnx")
    
    sess_g = onnxruntime.InferenceSession(onnx_g, providers=["CPUExecutionProvider"])
    sess_l = onnxruntime.InferenceSession(onnx_l, providers=["CPUExecutionProvider"])
    
    in_g = sess_g.get_inputs()[0].name
    out_g = sess_g.get_outputs()[0].name
    in_l = sess_l.get_inputs()[0].name
    out_l = sess_l.get_outputs()[0].name

    brih_dir = os.path.join(ai_root, "dataset", "multiclass_v2", "validation", "brihadeeswarar")
    img_files = sorted([f for f in os.listdir(brih_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))])

    print("=" * 100)
    print(f"HERIXA BRIHADEESWARAR DIAGNOSTIC RUN (Total images: {len(img_files)})")
    print("=" * 100)

    cats = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "F": 0}
    records = []

    conf_threshold = 0.35
    margin_threshold = 0.08

    for idx, fname in enumerate(img_files, 1):
        fpath = os.path.join(brih_dir, fname)
        tensor, orig_w, orig_h = preprocess(fpath)
        
        idx_g, pred_g, conf_g, probs_g = run_onnx(sess_g, in_g, out_g, tensor)
        idx_l, pred_l, conf_l, probs_l = run_onnx(sess_l, in_l, out_l, tensor)

        # Hybrid 3G Preferred (0.10)
        if conf_l > conf_g + 0.10:
            pred_h = pred_l
            conf_h = conf_l
            probs_h = probs_l
            winner_h = "Phase 3L"
        else:
            pred_h = pred_g
            conf_h = conf_g
            probs_h = probs_g
            winner_h = "Phase 3G"

        sorted_h = np.sort(probs_h)[::-1]
        margin_h = sorted_h[0] - sorted_h[1] if len(sorted_h) > 1 else 0.0

        is_accepted = (conf_h >= conf_threshold) and (pred_h != "Hard_Negatives") and (margin_h >= margin_threshold)

        rejection_reason = "ACCEPTED"
        if not is_accepted:
            if pred_h == "Hard_Negatives":
                rejection_reason = "HARD_NEGATIVE"
            elif conf_h < conf_threshold:
                rejection_reason = "LOW_CONFIDENCE"
            elif margin_h < margin_threshold:
                rejection_reason = "INSUFFICIENT_MARGIN"

        g_correct = (pred_g == "Brihadeeswarar")
        l_correct = (pred_l == "Brihadeeswarar")

        # Categorize
        if g_correct and l_correct:
            if not is_accepted:
                cat = "E" # both correct but Hybrid rejects
            elif conf_h < 0.65:
                cat = "F" # correct prediction but confidence unexpectedly low
            else:
                cat = "A" # 3G correct + 3L correct
        elif g_correct and not l_correct:
            cat = "B" # 3G correct + 3L wrong
        elif not g_correct and l_correct:
            cat = "C" # 3G wrong + 3L correct
        else:
            cat = "D" # both wrong

        cats[cat] += 1

        print(f"[{idx:02d}] {fname}")
        print(f"     Orig Size: {orig_w}x{orig_h} -> Preprocessed: 224x224")
        print(f"     Phase 3G: {pred_g:<22} (Conf: {conf_g:.4f}) {'[OK]' if g_correct else '[X]'}")
        print(f"     Phase 3L: {pred_l:<22} (Conf: {conf_l:.4f}) {'[OK]' if l_correct else '[X]'}")
        print(f"     Hybrid:   {pred_h:<22} (Conf: {conf_h:.4f}, Margin: {margin_h:.4f}) [Winner: {winner_h}]")
        print(f"     Status:   {'ACCEPTED' if is_accepted else 'REJECTED'} (Reason: {rejection_reason}) | Category: {cat}")
        print("-" * 100)

        records.append({
            "filename": fname,
            "orig_w": orig_w, "orig_h": orig_h,
            "pred_g": pred_g, "conf_g": conf_g, "g_correct": g_correct,
            "pred_l": pred_l, "conf_l": conf_l, "l_correct": l_correct,
            "pred_h": pred_h, "conf_h": conf_h, "winner_h": winner_h,
            "is_accepted": is_accepted, "rejection_reason": rejection_reason,
            "cat": cat
        })

    tot = len(records)
    print("\n" + "=" * 100)
    print("CATEGORIZATION SUMMARY")
    print("=" * 100)
    print(f"Total Brihadeeswarar Images Tested: {tot}")
    print(f"A (3G correct + 3L correct):            {cats['A']} / {tot} ({cats['A']/tot*100:.1f}%)")
    print(f"B (3G correct + 3L wrong):              {cats['B']} / {tot} ({cats['B']/tot*100:.1f}%)")
    print(f"C (3G wrong + 3L correct):              {cats['C']} / {tot} ({cats['C']/tot*100:.1f}%)")
    print(f"D (both wrong):                         {cats['D']} / {tot} ({cats['D']/tot*100:.1f}%)")
    print(f"E (both correct but Hybrid rejects):    {cats['E']} / {tot} ({cats['E']/tot*100:.1f}%)")
    print(f"F (correct but confidence < 0.65):       {cats['F']} / {tot} ({cats['F']/tot*100:.1f}%)")
    print("=" * 100)

    acc_g = sum(1 for r in records if r["g_correct"]) / tot * 100
    acc_l = sum(1 for r in records if r["l_correct"]) / tot * 100
    acc_h = sum(1 for r in records if r["pred_h"] == "Brihadeeswarar" and r["is_accepted"]) / tot * 100
    mean_conf_g = np.mean([r["conf_g"] for r in records])
    mean_conf_l = np.mean([r["conf_l"] for r in records])
    mean_conf_h = np.mean([r["conf_h"] for r in records])

    print(f"Phase 3G Accuracy: {acc_g:.1f}% (Mean Conf: {mean_conf_g:.4f})")
    print(f"Phase 3L Accuracy: {acc_l:.1f}% (Mean Conf: {mean_conf_l:.4f})")
    print(f"Hybrid Accuracy:   {acc_h:.1f}% (Mean Conf: {mean_conf_h:.4f})")

if __name__ == "__main__":
    main()
