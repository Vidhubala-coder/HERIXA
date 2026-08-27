# HERIXA Phase 3I — End-to-End Recognition Test Report

This report summarizes the end-to-end multi-view and single-view recognition API pathways.

## 1. Multi-View API Recognition Endpoint (`POST /api/monuments/recognize-multiview`)
| Test Case Label | Expected Monument | Resolved Prediction | Confidence Score | Supporting Views | Processing Latency | Verification Result |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Mahabalipuram Multi-View** | Mahabalipuram Shore Temple | Mahabalipuram Shore Temple | 84.62% | 2 | 2592.69 ms | **PASS** |
| **Thirumalai Palace Multi-View** | Thirumalai Nayakkar Palace | Thirumalai Nayakkar Palace | 99.88% | 2 | 2269.89 ms | **PASS** |
| **Mixed / Hard Negatives Multi-View** | Meenakshi Amman Temple | Meenakshi Amman Temple | 90.04% | 2 | 2150.04 ms | **PASS** |

## 2. Robustness and Rejection Policy Check
* Multi-view predictions are fused by computing the average probability vector across all input images.
* Low-confidence and hard negatives are correctly rejected to prevent false classification listings in mobile views.
* **E2E Status:** `PASS`
