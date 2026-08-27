# HERIXA Phase 3I — ONNX Inference Performance Benchmark Report

This report compares CPU inference performance between the original PyTorch model and the optimized ONNX model under ONNX Runtime.

## 1. Benchmarking Configuration
* **Hardware Environment:** CPU-only inference execution.
* **Test Dataset Subset:** 35 validation images (5 per monument class).
* **Warm-up iterations:** 1 dummy tensor forward pass.

## 2. Speed Profiles Comparison
| Metric | PyTorch CPU | ONNX Runtime CPU | Speedup Factor |
| :--- | :---: | :---: | :---: |
| **Model Loading Time** | 237.44 ms | 222.91 ms | 1.07x |
| **Warm-up Inference Latency** | 85.25 ms | 13.67 ms | 6.24x |
| **Mean Inference Latency** | 45.15 ms | 10.89 ms | 4.15x |
| **Median Inference Latency** | 35.41 ms | 10.04 ms | 3.53x |
| **P95 Inference Latency** | 84.12 ms | 13.50 ms | 6.23x |

*Note: Speedup Factor is calculated as `PyTorch Latency / ONNX Latency`. Values > 1.0x represent an execution speedup under ONNX Runtime.*

## 3. Findings & Performance Assessment
* **Inference Efficiency:** ONNX Runtime yields a significant execution speedup for single-image inference compared to raw PyTorch. This is ideal for real-time mobile API servings.
* **Memory and Startup footprints:** ONNX model loading is faster than PyTorch model loading, which minimizes server restart overheads.
* **Benchmark Status:** `PASS`
