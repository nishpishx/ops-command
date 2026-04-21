# OpsCommand

A real-time operational dashboard for monitoring AI API workloads in production.

## Overview

OpsCommand ingests a stream of API calls — latency, token usage, error rates, cost, model version — and surfaces actionable insights through live charts, anomaly detection, and a configurable alert system.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript) ![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat&logo=tailwindcss)

## Features

- **Live request feed** — scrolling table of API calls with latency, token count, cost, status code, model, and team
- **Latency percentiles** — P50 / P95 / P99 time-series chart with a configurable alert threshold line
- **Cost & error tracking** — area charts for spend over time and error rate, with per-bucket breakdowns
- **Token usage** — stacked bar chart of input vs. output tokens per time bucket
- **Anomaly detection** — automatically flags requests with latency spikes, token overruns, or cost drift
- **Alert rules engine** — 7 built-in rules (P95 latency, error rate, hourly budget, etc.) with full CRUD UI; rules evaluate on a rolling 1h window and auto-resolve when conditions clear
- **Model & team breakdown** — request volume, average latency, P95, cost, and error rate sliced by model and team
- **Budget tracking** — 1h and 24h spend limits with a visual progress bar and configurable alerts

## Stack

| Layer | Technology |
|---|---|
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Build | Vite |

## Getting Started

```bash
npm install
npm run dev
```

Requires Node.js 20.19+ or 22.12+.

## Project Structure

```
src/
  components/
    AlertPanel.tsx       # Active alerts with severity and auto-resolve
    CostChart.tsx        # Spend over time
    ErrorRateChart.tsx   # Error rate time-series
    Header.tsx           # Nav, live toggle, alert badge
    LatencyChart.tsx     # P50/P95/P99 with threshold line
    LiveFeed.tsx         # Real-time scrolling request table
    MetricsCards.tsx     # KPI summary row
    ModelBreakdown.tsx   # Per-model and per-team stats
    RulesEditor.tsx      # Alert rules CRUD
    TokenChart.tsx       # Input/output token usage
    ui/                  # Shared Badge and Card primitives
  lib/
    alertEngine.ts       # Rule evaluation and alert lifecycle
    simulator.ts         # Data generation, time-series aggregation
    types.ts             # Shared TypeScript types
```

## Data

The dashboard runs on simulated API traffic by default — ~8 requests per minute seeded across 6 models, 4 endpoints, and 5 teams, with a ~5% anomaly injection rate. Replace `generateApiCall()` in `src/lib/simulator.ts` with a real data source (e.g. a `/api/ingest` webhook) to monitor live traffic.
