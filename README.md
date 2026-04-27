# Real-Time Crypto Tracking Dashboard

This project is a **high-performance data pipeline** designed for real-time cryptocurrency tracking, utilizing a modern microservices architecture and bidirectional communication.

---

## System Architecture
The data flow follows an optimized path from the source to the end user:
**Binance WebSocket** → **Go Service** → ( **.NET Backend** → **SignalR** ) → **React Frontend**

---

## Key Components

### 1. Data Ingestor (Go Service)
* **Responsibility:** Low-latency connection with the exchange.
* **Technology:** Go (Golang).
* **Key Functions:**
    * Connects to the **Binance** WebSocket stream.
    * Actively subscribes to `BTC/USDT` and `ETH/USDT` pairs.
    * Parses trade messages and forwards them via HTTP POST to the .NET backend.

### 2. Central Hub (.NET gRPC Service)
* **Responsibility:** Message orchestration and distribution.
* **Technology:** .NET (Kestrel Server) on port `5283`.
* **Key Functions:**
    * **SignalR Hub:** Manages real-time communication with the frontend.
    * **API Endpoint:** Receives market updates from the Go service.
    * **Infrastructure:** Includes a base gRPC service and CORS configuration for the development environment.

### 3. Visualization (React Frontend)
* **Responsibility:** User interface and graphical rendering.
* **Technology:** React + Vite on port `5173`.
* **Key Functions:**
    * **Dynamic Charts:** Implementation of **Recharts** to visualize price fluctuations.
    * **Time Views:** Support for time ranges (seconds, daily, weekly, and yearly).
    * **Aggregation:** Data processing into "buckets" based on the selected time range.

---

## Data Flow
1.  **Capture:** Binance emits a trading event.
2.  **Processing:** The **Go** microservice receives, filters, and structures the JSON.
3.  **Transport:** Go sends the payload to the **.NET** backend.
4.  **Broadcast:** .NET uses **SignalR** to immediately broadcast updates to all connected clients.
5.  **Rendering:** The **React** app updates the local state and redraws the charts in real-time.
