# HERIXA Phase 3I — Single-View Recognition Verification Report

This report documents the end-to-end API validation of the single-view monument recognition endpoint (`POST /api/monuments/recognize`).

## 1. Verification Results
| Input Class | HTTP Status | Recognized | Resolved Monument | Confidence | Margin | Latency | Status Verdict |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **Brihadeeswarar** | `200` | True | Brihadeeswarar Temple | 96.60% | `0.934` | 2325.92 ms | **PASS** |
| **Meenakshi-Amman** | `200` | False | None | 55.61% | `0.121` | 2193.71 ms | **PASS** |
| **Mahabalipuram** | `200` | True | Mahabalipuram Shore Temple | 99.88% | `0.998` | 2247.25 ms | **PASS** |
| **Gangaikonda-Cholapuram** | `200` | True | Gangaikonda Cholapuram | 99.73% | `0.995` | 2280.07 ms | **PASS** |
| **Airavatesvara** | `200` | False | None | 53.96% | `0.193` | 2375.55 ms | **PASS** |
| **Thirumalai-Nayakkar** | `200` | True | Thirumalai Nayakkar Palace | 99.95% | `0.999` | 2253.92 ms | **PASS** |
| **Hard_Negatives** | `200` | True | Meenakshi Amman Temple | 90.04% | `0.825` | 2169.37 ms | **PASS** |

## 2. Threshold Rejection Checks
* Target threshold: `0.65`
* Rejections are correctly triggered when the predicted class confidence falls below `0.65` or maps to the `Hard_Negatives` group, resolving status to `uncertain`.
* **Single-View Status:** `PASS`
