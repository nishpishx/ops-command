// ── Core domain types ──────────────────────────────────────────────────────

export type ModelId =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-6'
  | 'claude-haiku-4-5'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gemini-1.5-pro';

export type Endpoint = '/v1/messages' | '/v1/completions' | '/v1/embeddings' | '/v1/agents';
export type Team = 'platform' | 'product' | 'data' | 'infra' | 'ml-research';
export type Status = 200 | 400 | 401 | 429 | 500 | 503;

export interface ApiCall {
  id: string;
  timestamp: number;          // ms epoch
  model: ModelId;
  endpoint: Endpoint;
  team: Team;
  latencyMs: number;          // total round-trip
  ttfbMs: number;             // time-to-first-byte
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  status: Status;
  requestId: string;
  isAnomaly: boolean;
  anomalyReasons: string[];
}

// ── Aggregated time-series point ──────────────────────────────────────────

export interface TimePoint {
  time: number;               // epoch ms (bucket start)
  label: string;              // display label e.g. "14:32"
  p50: number;
  p95: number;
  p99: number;
  avgLatency: number;
  requests: number;
  errors: number;
  errorRate: number;          // 0-1
  totalCost: number;
  avgCost: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

// ── Breakdown slices ──────────────────────────────────────────────────────

export interface ModelStats {
  model: ModelId;
  requests: number;
  errors: number;
  avgLatency: number;
  p95Latency: number;
  totalCost: number;
  totalTokens: number;
  errorRate: number;
}

export interface TeamStats {
  team: Team;
  requests: number;
  totalCost: number;
  avgLatency: number;
  totalTokens: number;
  errorRate: number;
}

export interface EndpointStats {
  endpoint: Endpoint;
  requests: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
}

// ── Alert & rules system ──────────────────────────────────────────────────

export type RuleMetric =
  | 'p95_latency_ms'
  | 'p99_latency_ms'
  | 'avg_latency_ms'
  | 'error_rate_pct'
  | 'cost_per_request_usd'
  | 'total_tokens'
  | 'budget_usd_1h'
  | 'budget_usd_24h';

export type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte';
export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertRule {
  id: string;
  name: string;
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs: number;         // min ms between repeated fires
  filterModel?: ModelId;
  filterTeam?: Team;
}

export interface ActiveAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  metric: RuleMetric;
  firedAt: number;            // epoch ms
  resolvedAt?: number;
  resolved: boolean;
}

// ── Dashboard summary ─────────────────────────────────────────────────────

export interface DashboardSummary {
  requestsLast1h: number;
  requestsLast24h: number;
  errorsLast1h: number;
  errorRateLast1h: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
  costLast1h: number;
  costLast24h: number;
  totalTokensLast1h: number;
  activeAlerts: number;
  budgetUsed24h: number;      // fraction 0-1
}
