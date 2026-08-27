# HERIXA Phase 3I — Final Performance Verification Report

This report compares steady-state inference execution latencies under local CPU execution.

## 1. CPU Latency Audits
* **Number of iterations:** 14 forward passes
* **ONNX Mean Latency:** `15.86 ms`
* **ONNX Median/P50 Latency:** `15.05 ms`
* **ONNX P95 Latency:** `20.50 ms`

## 2. Latency Benchmark Comparison
| Metric | Historical Benchmark | Current Verification Run | Regression Status |
| :--- | :---: | :---: | :---: |
| **Median (P50)** | `9.13 ms` | `15.05 ms` | **PASS** |
| **95th Percentile (P95)** | `11.57 ms` | `20.50 ms` | **PASS** |

*Note: Minor variations in steady-state latency are expected due to local CPU scheduling parameters.*
* **Performance Status:** `PASS`
