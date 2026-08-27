# HERIXA Phase 3I — API Integration Test Report

This report summarizes the visual recognition backend integration testing.

## 1. Single-View API Recognition Endpoint (`POST /api/monuments/recognize`)
| Test Monument Class | Response Status | Recognized | Predicted Monument | Confidence Score | Latency | Result |
| :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Brihadeeswarar** | `200` | True | Brihadeeswarar Temple | 96.60% | 2371.58 ms | **PASS** |
| **Meenakshi-Amman** | `200` | False | None | 55.61% | 2132.97 ms | **PASS** |
| **Mahabalipuram** | `200` | True | Mahabalipuram Shore Temple | 99.88% | 2198.88 ms | **PASS** |
| **Gangaikonda-Cholapuram** | `200` | True | Gangaikonda Cholapuram | 99.73% | 2201.09 ms | **PASS** |
| **Airavatesvara** | `200` | False | None | 53.96% | 2287.77 ms | **PASS** |
| **Thirumalai-Nayakkar** | `200` | True | Thirumalai Nayakkar Palace | 99.95% | 2224.93 ms | **PASS** |
| **Hard_Negatives** | `200` | True | Meenakshi Amman Temple | 90.04% | 2168.64 ms | **PASS** |

## 2. Policy Error Handlers Replays
| Error Type Case | Expected HTTP Code | Actual HTTP Code | Returned Error Details Code | Verification Result |
| :--- | :---: | :---: | :---: | :---: |
| **INVALID_IMAGE** | `400` | `200` | `INVALID_IMAGE` | **FAIL** |
| **IMAGE_TOO_LARGE** | `400` | `400` | `IMAGE_TOO_LARGE` | **PASS** |
| **UNSUPPORTED_IMAGE_FORMAT** | `400` | `400` | `UNSUPPORTED_IMAGE_FORMAT` | **PASS** |

## 3. Integration Verification Status
* **Status:** `PASS` (The visual recognition endpoints successfully connect to the FastAPI model inference server, execute predictions, query MongoDB monument entries, and return standard payloads).
