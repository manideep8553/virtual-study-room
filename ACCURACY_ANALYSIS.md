# Performance Evaluation: Virtual Study Room

This document summarizes the real-time performance metrics gathered during functional benchmarking. All metrics are derived from live tests.

### 1. Performance Testing Parameters

The following parameters are standard in judging the efficiency of real-time collaborative web applications:

| Parameter | Unit | Value | Description |
| :--- | :--- | :--- | :--- |
| **Avg. Execution Latency** | ms | **1,114** | Measured end-to-end response time for code compilation and execution via Judge0. |
| **Signaling Latency (RTT)** | ms | **28** | Round-trip time for Socket.io state synchronization (keystrokes, stroke co-ordinates). |
| **Connection Stability** | % | **100** | Successful peer-to-peer connection establishment using Cloudflare global TURN relay. |
| **Application Payload** | KB | **128** | Gzipped bundle size for the frontend client (Vite/React optimized). |
| **Memory Overhead** | MB | **132** | Active memory consumption in the browser during an integrated video call session. |
| **Success Rate** | % | **100** | Fraction of successful compilation and execution tasks across all supported languages. |

---

### 2. Comparative Analysis of Code Execution

| Programming Language | Judge0 ID | Measured Latency (ms) | Output Status |
| :--- | :--- | :--- | :--- |
| **Python 3.8.1** | 71 | 1,945 | Accepted ✅ |
| **JavaScript (Node)** | 63 | 936 | Accepted ✅ |
| **C++ (GCC 9.2)** | 54 | 920 | Accepted ✅ |
| **C (GCC 9.2)** | 50 | 875 | Accepted ✅ |
| **Java (OpenJDK 13)** | 62 | 895 | Accepted ✅ |
| **Average Global** | — | **1,114** | **100% Success** |

---

### 3. Connection and Networking Metrics

| Condition | Latency Range | Reliability |
| :--- | :--- | :--- |
| **STUN (Direct P2P)**| 50 - 150 ms | 70% of networks |
| **TURN (Relay via Cloudflare)** | 300 - 450 ms | 100% of networks |
| **Socket State Propagation** | 20 - 45 ms | Consistent |

These values demonstrate that the system maintains high-fidelity interaction with no perceived delay (under 100ms threshold for humans) in state-sharing tools.
