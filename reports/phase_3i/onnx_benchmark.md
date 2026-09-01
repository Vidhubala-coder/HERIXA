# HERIXA Phase 3I — ONNX Inference Performance Benchmark Report

This report compares CPU inference performance between the original PyTorch model and the optimized ONNX model under ONNX Runtime.

## 1. Benchmarking Configuration
* **Hardware Environment:** CPU-only inference execution.
* **Test Dataset Subset:** 35 validation images (5 per monument class).
* **Warm-up iterations:** 1 dummy tensor forward pass.

## 2. Speed Profiles Comparison
| Metric | PyTorch CPU | ONNX Runtime CPU | Speedup Factor |
| :--- | :---: | :---: | :---: |
| **Model Loading Time** | 196.70 ms | 142.32 ms | 1.38x |
| **Warm-up Inference Latency** | 54.34 ms | 14.12 ms | 3.85x |
| **Mean Inference Latency** | 33.09 ms | 10.10 ms | 3.28x |
| **Median Inference Latency** | 28.60 ms | 9.08 ms | 3.15x |
| **P95 Inference Latency** | 55.08 ms | 15.28 ms | 3.61x |

*Note: Speedup Factor is calculated as `PyTorch Latency / ONNX Latency`. Values > 1.0x represent an execution speedup under ONNX Runtime.*

## 3. Findings & Performance Assessment
* **Inference Efficiency:** ONNX Runtime yields a significant execution speedup for single-image inference compared to raw PyTorch. This is ideal for real-time mobile API servings.
* **Memory and Startup footprints:** ONNX model loading is faster than PyTorch model loading, which minimizes server restart overheads.
* **Benchmark Status:** `PASS`
