import type { AlertRule, ActiveAlert, ApiCall, RuleMetric, DashboardSummary } from './types';

let alertIdCounter = 0;
const lastFired = new Map<string, number>(); // ruleId → timestamp

/**
 * Evaluate all enabled rules against current metrics.
 * Returns newly fired alerts (caller decides whether to append/resolve).
 */
export function evaluateRules(
  rules: AlertRule[],
  calls1h: ApiCall[],
  calls24h: ApiCall[],
  summary: DashboardSummary,
  existingAlerts: ActiveAlert[]
): { fired: ActiveAlert[]; resolved: string[] } {
  const fired: ActiveAlert[] = [];
  const resolved: string[] = [];
  const now = Date.now();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Apply optional filters
    let slice1h = calls1h;
    let slice24h = calls24h;
    if (rule.filterModel) {
      slice1h = slice1h.filter(c => c.model === rule.filterModel);
      slice24h = slice24h.filter(c => c.model === rule.filterModel);
    }
    if (rule.filterTeam) {
      slice1h = slice1h.filter(c => c.team === rule.filterTeam);
      slice24h = slice24h.filter(c => c.team === rule.filterTeam);
    }

    const value = measureMetric(rule.metric, slice1h, slice24h, summary);
    const triggered = compare(value, rule.operator, rule.threshold);

    // Check existing alert for this rule
    const existingIdx = existingAlerts.findIndex(a => a.ruleId === rule.id && !a.resolved);

    if (triggered) {
      // Respect cooldown
      const last = lastFired.get(rule.id) ?? 0;
      if (now - last < rule.cooldownMs && existingIdx !== -1) continue;

      lastFired.set(rule.id, now);

      if (existingIdx === -1) {
        fired.push({
          id: `alert_${++alertIdCounter}`,
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: buildMessage(rule, value),
          value,
          threshold: rule.threshold,
          metric: rule.metric,
          firedAt: now,
          resolved: false,
        });
      }
    } else {
      // Auto-resolve
      if (existingIdx !== -1) {
        resolved.push(existingAlerts[existingIdx].id);
      }
    }
  }

  return { fired, resolved };
}

function measureMetric(
  metric: RuleMetric,
  calls1h: ApiCall[],
  _calls24h: ApiCall[],
  summary: DashboardSummary
): number {
  const ok = calls1h.filter(c => c.status === 200);
  const latencies = ok.map(c => c.latencyMs).sort((a, b) => a - b);
  const pct = (p: number) => {
    if (!latencies.length) return 0;
    return latencies[Math.floor((p / 100) * (latencies.length - 1))];
  };

  switch (metric) {
    case 'p95_latency_ms': return pct(95);
    case 'p99_latency_ms': return pct(99);
    case 'avg_latency_ms': return summary.avgLatencyMs;
    case 'error_rate_pct': return summary.errorRateLast1h * 100;
    case 'cost_per_request_usd':
      return calls1h.length ? calls1h.reduce((s, c) => s + c.costUsd, 0) / calls1h.length : 0;
    case 'total_tokens':
      return calls1h.reduce((s, c) => s + c.totalTokens, 0);
    case 'budget_usd_1h': return summary.costLast1h;
    case 'budget_usd_24h': return summary.costLast24h;
    default: return 0;
  }
}

function compare(value: number, op: AlertRule['operator'], threshold: number): boolean {
  switch (op) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
  }
}

function buildMessage(rule: AlertRule, value: number): string {
  const label = METRIC_LABELS[rule.metric] ?? rule.metric;
  const opLabel = OP_LABELS[rule.operator];
  const fmtVal = formatValue(rule.metric, value);
  const fmtThresh = formatValue(rule.metric, rule.threshold);
  return `${label} is ${fmtVal} — ${opLabel} threshold ${fmtThresh}`;
}

function formatValue(metric: RuleMetric, v: number): string {
  if (metric.includes('usd')) return `$${v.toFixed(4)}`;
  if (metric.includes('ms')) return `${Math.round(v)}ms`;
  if (metric.includes('pct')) return `${v.toFixed(1)}%`;
  if (metric.includes('tokens')) return v.toLocaleString() + ' tokens';
  return v.toString();
}

const METRIC_LABELS: Record<RuleMetric, string> = {
  p95_latency_ms: 'P95 Latency',
  p99_latency_ms: 'P99 Latency',
  avg_latency_ms: 'Avg Latency',
  error_rate_pct: 'Error Rate',
  cost_per_request_usd: 'Cost/Request',
  total_tokens: 'Total Tokens (1h)',
  budget_usd_1h: 'Spend (1h)',
  budget_usd_24h: 'Spend (24h)',
};

const OP_LABELS: Record<AlertRule['operator'], string> = {
  gt: 'exceeded',
  gte: 'at or above',
  lt: 'below',
  lte: 'at or below',
};

// ── Default rules ─────────────────────────────────────────────────────────

export const DEFAULT_RULES: AlertRule[] = [
  {
    id: 'rule_p95_latency',
    name: 'High P95 Latency',
    metric: 'p95_latency_ms',
    operator: 'gt',
    threshold: 2000,
    severity: 'warning',
    enabled: true,
    cooldownMs: 60_000,
  },
  {
    id: 'rule_p99_latency',
    name: 'Critical P99 Latency',
    metric: 'p99_latency_ms',
    operator: 'gt',
    threshold: 5000,
    severity: 'critical',
    enabled: true,
    cooldownMs: 30_000,
  },
  {
    id: 'rule_error_rate',
    name: 'Elevated Error Rate',
    metric: 'error_rate_pct',
    operator: 'gt',
    threshold: 5,
    severity: 'warning',
    enabled: true,
    cooldownMs: 120_000,
  },
  {
    id: 'rule_high_error_rate',
    name: 'High Error Rate',
    metric: 'error_rate_pct',
    operator: 'gt',
    threshold: 15,
    severity: 'critical',
    enabled: true,
    cooldownMs: 30_000,
  },
  {
    id: 'rule_token_spike',
    name: 'Token Usage Spike',
    metric: 'total_tokens',
    operator: 'gt',
    threshold: 500_000,
    severity: 'info',
    enabled: true,
    cooldownMs: 300_000,
  },
  {
    id: 'rule_budget_1h',
    name: 'Hourly Budget Alert',
    metric: 'budget_usd_1h',
    operator: 'gt',
    threshold: 5.0,
    severity: 'warning',
    enabled: true,
    cooldownMs: 300_000,
  },
  {
    id: 'rule_budget_24h',
    name: '24h Budget Limit',
    metric: 'budget_usd_24h',
    operator: 'gt',
    threshold: 50.0,
    severity: 'critical',
    enabled: true,
    cooldownMs: 600_000,
  },
];
