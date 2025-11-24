# Order Execution Engine (Solana DEX – Mock Devnet)

This project is a backend-only **order execution engine** that processes **market orders** with:

- DEX routing between **Raydium** and **Meteora** (mocked)
- **BullMQ + Redis** order queue
- **Fastify + WebSocket** live status updates
- **PostgreSQL** order history

> **Order Type Chosen:** **Market Order**
> I chose market orders because they let me focus on the full execution pipeline and DEX routing without introducing extra price triggers.
> The same engine can be extended to **limit orders** by adding a price-check trigger before execution (watch price feed and only enqueue/execute when target price reached), and to **sniper orders** by adding listeners for token launch/pool creation events and triggering the same market-execution pipeline once the pool goes live.

---

## High-Level Architecture

Client → HTTP POST /api/orders/execute → Fastify API → Redis Queue → BullMQ Worker → DEX Router → DB + WebSocket updates

Order lifecycle:
pending → routing → building → submitted → confirmed
or failed (after 3 retries, with error reason)

---

## Tech Stack

- Node.js + TypeScript
- Fastify v4 + @fastify/websocket
- BullMQ + Redis (order queue)
- PostgreSQL (order history)
- Vitest (tests)

---

## Setup & Run Locally

Clone & Install

```
git clone <your-repo-url>.git
cd order-execution-engine
npm install
```

Start Infra (Postgres + Redis)

```
docker compose up -d postgres redis
```
Create orders table:

```
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  token_in text NOT NULL,
  token_out text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL,
  dex text,
  tx_hash text,
  failure_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

Run API & Worker
```
npm run dev
npm run worker
```
---

## Submit an Order
```
curl -X POST http://localhost:3000/api/orders/execute \\
-H "Content-Type: application/json" \\
-d '{"tokenIn":"SOL","tokenOut":"USDC","amount":1}'
```

Example response:
```
{
  "orderId": "xxxx",
  "wsUrl": "ws://localhost:3000/api/orders/execute?orderId=xxxx"
}
```
---

## Watch WebSocket Status Updates

Using wscat:
```
npm i -g wscat
wscat -c "ws://localhost:3000/api/orders/execute?orderId=<ORDER_ID>"
```
Example messages:
pending → routing → building → submitted → confirmed { dex, txHash, executedPrice }

---

## DEX Routing Logic (Mock)

Simulated quotes from:
- Raydium: base price ± 2–4%
- Meteora: base price ± 3–5%
Choose the best price (higher = better for seller)

Swap simulated 2–3 seconds
txHash generated randomly


---

## Queue & Concurrency

- BullMQ queue “orders”
- Worker concurrency: 10
- Retry attempts: 3
- Exponential backoff: starts at 500ms

Supports: **100 orders/minute**

---

## API Endpoints

POST `/api/orders/execute` — create order, enqueue, return wsUrl  
GET `/api/orders/execute?orderId=xxx` — WebSocket for status streaming

---

## Tests

Run:
`npm test`

Test coverage includes:
- DEX routing logic
- Queue behaviour
- WebSocket lifecycle

---

## Deployment

Deploy API + Worker separately (Railway/Render/Fly.io)
Redis + Postgres can be managed services

Dockerfile provided in repo

---

## Demo Video

YouTube: <add after recording>  
Submission requirement: show 3–5 orders executing simultaneously, console logs, WebSocket outputs

---

## Extending to Limit & Sniper Orders
-	Limit Order:
    -	Add limitPrice field in orders table.
    -	Before enqueuing execution, compare best DEX quote vs limitPrice.
    -	Either:
        -	enqueue only when price is favourable, or
        -	run a watcher that periodically checks price and enqueues when target reached.
-	Sniper Order:
    -	Add poolId/tokenMint to orders.
    -	Add a listener (e.g., using Solana RPC or WebSocket) that waits for a specific pool/token to be initialized.
    -	When launch event is detected → enqueue a market-like execution using the same worker pipeline.