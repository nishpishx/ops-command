import type { ApiCall, ModelId, Endpoint, Team, Status } from './types';

// ── Cost table (USD per 1M tokens) ────────────────────────────────────────
const MODEL_COST: Record<ModelId, { input: number; output: number }> = {
  'claude-opus-4-6':    { input: 15.0,  output: 75.0 },
  'claude-sonnet-4-6':  { input: 3.0,   output: 15.0 },
  'claude-haiku-4-5':   { input: 0.25,  output: 1.25 },
  'gpt-4o':             { input: 2.5,   output: 10.0 },
  'gpt-4o-mini':        { input: 0.15,  output: 0.60 },
  'gemini-1.5-pro':     { input: 1.25,  output: 5.0  },
};

// ── Weighted distributions ────────────────────────────────────────────────
const MODELS: ModelId[] = [
  'claude-sonnet-4-6', 'claude-sonnet-4-6', 'claude-sonnet-4-6',
  'claude-haiku-4-5', 'claude-haiku-4-5',
  'claude-opus-4-6',
  'gpt-4o', 'gpt-4o-mini', 'gpt-4o-mini',
  'gemini-1.5-pro',
];
const ENDPOINTS: Endpoint[] = [
  '/v1/messages', '/v1/messages', '/v1/messages', '/v1/messages',
  '/v1/completions', '/v1/completions',
  '/v1/embeddings',
  '/v1/agents',
];
const TEAMS: Team[] = ['platform', 'platform', 'product', 'product', 'data', 'infra', 'ml-research'];
const STATUSES: Status[] = [200, 200, 200, 200, 200, 200, 200, 200, 400, 429, 500, 503];

let idCounter = 0;

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function randInt(min: number, max: number) { return Math.floor(rand(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function uid() { return `req_${(++idCounter).toString(36)}_${Date.now().toString(36)}`; }

/**
 * Generate one simulated API call.
 * ~5% chance of being an injected anomaly (spike in latency or cost).
 */
export function generateApiCall(forceAnomaly = false): ApiCall {
  const model = pick(MODELS);
  const endpoint = pick(ENDPOINTS);
  const team = pick(TEAMS);
  const status = pick(STATUSES) as Status;
  const isAnomaly = forceAnomaly || Math.random() < 0.05;
  const anomalyReasons: string[] = [];

  // Latency
  let baseLatency = rand(80, 800);
  if (endpoint === '/v1/agents') baseLatency *= 3;
  if (isAnomaly && Math.random() < 0.6) {
    baseLatency *= rand(4, 15);
    anomalyReasons.push('latency spike');
  }
  const latencyMs = Math.round(baseLatency);
  const ttfbMs = Math.round(latencyMs * rand(0.05, 0.25));

  // Tokens
  let inputTokens = randInt(50, 2000);
  let outputTokens = randInt(10, 800);
  if (isAnomaly && Math.random() < 0.4) {
    inputTokens = randInt(4000, 8000);
    outputTokens = randInt(1500, 3000);
    anomalyReasons.push('token spike');
  }
  const totalTokens = inputTokens + outputTokens;

  // Cost
  const costs = MODEL_COST[model];
  let costUsd = (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
  if (isAnomaly && Math.random() < 0.3) {
    costUsd *= rand(5, 20);
    anomalyReasons.push('cost drift');
  }

  return {
    id: uid(),
    timestamp: Date.now(),
    model,
    endpoint,
    team,
    latencyMs,
    ttfbMs,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd,
    status,
    requestId: uid(),
    isAnomaly: isAnomaly && anomalyReasons.length > 0,
    anomalyReasons,
  };
}

/** Seed historical data for the past `minutes` minutes, ~N calls/min. */
export function seedHistory(minutes = 60, callsPerMin = 8): ApiCall[] {
  const calls: ApiCall[] = [];
  const now = Date.now();
  for (let m = minutes; m >= 0; m--) {
    const count = randInt(Math.max(1, callsPerMin - 3), callsPerMin + 4);
    for (let i = 0; i < count; i++) {
      const call = generateApiCall();
      call.timestamp = now - m * 60_000 + randInt(0, 59_000);
      calls.push(call);
    }
  }
  return calls.sort((a, b) => a.timestamp - b.timestamp);
}

/** Bucket calls into N-second intervals, returning an array of TimePoints. */
export function buildTimeSeries(
  calls: ApiCall[],
  bucketSec = 60,
  windowMs = 60 * 60 * 1000
): import('./types').TimePoint[] {
  const now = Date.now();
  const start = now - windowMs;
  const relevant = calls.filter(c => c.timestamp >= start && c.status === 200 || (calls.filter(c => c.timestamp >= start), false));
  // include all statuses for error rate, but separate latency from errors
  const all = calls.filter(c => c.timestamp >= start);

  const buckets = new Map<number, ApiCall[]>();
  const bucketMs = bucketSec * 1000;

  all.forEach(c => {
    const key = Math.floor(c.timestamp / bucketMs) * bucketMs;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  });

  const keys = Array.from(buckets.keys()).sort();
  return keys.map(key => {
    const items = buckets.get(key)!;
    const ok = items.filter(c => c.status === 200);
    const latencies = ok.map(c => c.latencyMs).sort((a, b) => a - b);
    const errors = items.filter(c => c.status !== 200).length;

    const pct = (p: number) => {
      if (!latencies.length) return 0;
      const idx = Math.floor((p / 100) * (latencies.length - 1));
      return latencies[idx];
    };

    const d = new Date(key);
    const label = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    return {
      time: key,
      label,
      p50: pct(50),
      p95: pct(95),
      p99: pct(99),
      avgLatency: ok.length ? ok.reduce((s, c) => s + c.latencyMs, 0) / ok.length : 0,
      requests: items.length,
      errors,
      errorRate: items.length ? errors / items.length : 0,
      totalCost: items.reduce((s, c) => s + c.costUsd, 0),
      avgCost: items.length ? items.reduce((s, c) => s + c.costUsd, 0) / items.length : 0,
      totalTokens: items.reduce((s, c) => s + c.totalTokens, 0),
      inputTokens: items.reduce((s, c) => s + c.inputTokens, 0),
      outputTokens: items.reduce((s, c) => s + c.outputTokens, 0),
    };
  });
  void relevant; // suppress unused
}

/** Compute per-model stats from a window of calls. */
export function computeModelStats(calls: ApiCall[]): import('./types').ModelStats[] {
  const map = new Map<ModelId, ApiCall[]>();
  calls.forEach(c => {
    if (!map.has(c.model)) map.set(c.model, []);
    map.get(c.model)!.push(c);
  });
  return Array.from(map.entries()).map(([model, items]) => {
    const ok = items.filter(c => c.status === 200);
    const latencies = ok.map(c => c.latencyMs).sort((a, b) => a - b);
    const p95 = latencies[Math.floor(0.95 * (latencies.length - 1))] ?? 0;
    return {
      model,
      requests: items.length,
      errors: items.filter(c => c.status !== 200).length,
      avgLatency: ok.length ? ok.reduce((s, c) => s + c.latencyMs, 0) / ok.length : 0,
      p95Latency: p95,
      totalCost: items.reduce((s, c) => s + c.costUsd, 0),
      totalTokens: items.reduce((s, c) => s + c.totalTokens, 0),
      errorRate: items.length ? items.filter(c => c.status !== 200).length / items.length : 0,
    };
  }).sort((a, b) => b.requests - a.requests);
}

export function computeTeamStats(calls: ApiCall[]): import('./types').TeamStats[] {
  const map = new Map<Team, ApiCall[]>();
  calls.forEach(c => {
    if (!map.has(c.team)) map.set(c.team, []);
    map.get(c.team)!.push(c);
  });
  return Array.from(map.entries()).map(([team, items]) => ({
    team,
    requests: items.length,
    totalCost: items.reduce((s, c) => s + c.costUsd, 0),
    avgLatency: items.length ? items.reduce((s, c) => s + c.latencyMs, 0) / items.length : 0,
    totalTokens: items.reduce((s, c) => s + c.totalTokens, 0),
    errorRate: items.length ? items.filter(c => c.status !== 200).length / items.length : 0,
  })).sort((a, b) => b.totalCost - a.totalCost);
}
