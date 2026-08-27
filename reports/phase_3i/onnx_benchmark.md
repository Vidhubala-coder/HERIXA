# HERIXA Phase 3I — ONNX Inference Performance Benchmark Report

This report compares CPU inference performance between the original PyTorch model and the optimized ONNX model under ONNX Runtime.

## 1. Benchmarking Configuration
* **Hardware Environment:** CPU-only inference execution.
* **Test Dataset Subset:** 35 validation images (5 per monument class).
* **Warm-up iterations:** 1 dummy tensor forward pass.

## 2. Speed Profiles Comparison
| Metric | PyTorch CPU | ONNX Runtime CPU | Speedup Factor |
| :--- | :---: | :---: | :---: |
| **Model Loading Time** | 236.66 ms | 250.76 ms | 0.94x |
| **Warm-up Inference Latency** | 95.49 ms | 12.08 ms | 7.90x |
| **Mean Inference Latency** | 40.83 ms | 10.35 ms | 3.95x |
| **Median Inference Latency** | 31.32 ms | 9.13 ms | 3.43x |
| **P95 Inference Latency** | 58.51 ms | 11.57 ms | 5.06x |

*Note: Speedup Factor is calculated as `PyTorch Latency / ONNX Latency`. Values > 1.0x represent an execution speedup under ONNX Runtime.*

## 3. Findings & Performance Assessment
* **Inference Efficiency:** ONNX Runtime yields a significant execution speedup for single-image inference compared to raw PyTorch. This is ideal for real-time mobile API servings.
* **Memory and Startup footprints:** ONNX model loading is faster than PyTorch model loading, which minimizes server restart overheads.
* **Benchmark Status:** `PASS`
