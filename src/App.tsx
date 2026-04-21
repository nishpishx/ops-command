import { useState, useEffect, useRef, useCallback } from 'react';
import { Header, type Tab } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { LiveFeed } from './components/LiveFeed';
import { LatencyChart } from './components/LatencyChart';
import { CostChart } from './components/CostChart';
import { TokenChart } from './components/TokenChart';
import { ErrorRateChart } from './components/ErrorRateChart';
import { ModelBreakdown } from './components/ModelBreakdown';
import { AlertPanel } from './components/AlertPanel';
import { RulesEditor } from './components/RulesEditor';
import {
  generateApiCall, seedHistory, buildTimeSeries,
  computeModelStats, computeTeamStats,
} from './lib/simulator';
import { evaluateRules, DEFAULT_RULES } from './lib/alertEngine';
import type {
  ApiCall, AlertRule, ActiveAlert, DashboardSummary,
  TimePoint, ModelStats, TeamStats,
} from './lib/types';

const MAX_CALLS = 2000;
const TICK_MS = 1500;
const EVAL_EVERY = 5;
const BUDGET_24H = 50.0;

function computeSummary(calls1h: ApiCall[], calls24h: ApiCall[]): DashboardSummary {
  const ok1h = calls1h.filter(c => c.status === 200);
  const latencies = ok1h.map(c => c.latencyMs).sort((a, b) => a - b);
  const p95 = latencies[Math.floor(0.95 * (latencies.length - 1))] ?? 0;
  const errors1h = calls1h.filter(c => c.status !== 200).length;
  const cost1h = calls1h.reduce((s, c) => s + c.costUsd, 0);
  const cost24h = calls24h.reduce((s, c) => s + c.costUsd, 0);

  return {
    requestsLast1h: calls1h.length,
    requestsLast24h: calls24h.length,
    errorsLast1h: errors1h,
    errorRateLast1h: calls1h.length ? errors1h / calls1h.length : 0,
    p95LatencyMs: p95,
    avgLatencyMs: ok1h.length ? ok1h.reduce((s, c) => s + c.latencyMs, 0) / ok1h.length : 0,
    costLast1h: cost1h,
    costLast24h: cost24h,
    totalTokensLast1h: calls1h.reduce((s, c) => s + c.totalTokens, 0),
    activeAlerts: 0,
    budgetUsed24h: cost24h / BUDGET_24H,
  };
}

export default function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [isLive, setIsLive] = useState(true);
  const [calls, setCalls] = useState<ApiCall[]>(() => seedHistory(60, 8));
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);

  const now = Date.now();
  const calls1h = calls.filter(c => c.timestamp >= now - 3_600_000);
  const calls24h = calls.filter(c => c.timestamp >= now - 86_400_000);
  const summary = computeSummary(calls1h, calls24h);
  summary.activeAlerts = alerts.filter(a => !a.resolved).length;

  const timeSeries: TimePoint[] = buildTimeSeries(calls, 60, 3_600_000);
  const modelStats: ModelStats[] = computeModelStats(calls1h);
  const teamStats: TeamStats[] = computeTeamStats(calls1h);

  const tickRef = useRef(0);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      const newCall = generateApiCall();

      setCalls(prev => {
        const next = [...prev, newCall];
        return next.length > MAX_CALLS ? next.slice(next.length - MAX_CALLS) : next;
      });

      if (tickRef.current % EVAL_EVERY === 0) {
        setCalls(prevCalls => {
          const t = Date.now();
          const c1h = prevCalls.filter(c => c.timestamp >= t - 3_600_000);
          const c24h = prevCalls.filter(c => c.timestamp >= t - 86_400_000);
          const s = computeSummary(c1h, c24h);

          setAlerts(prevAlerts => {
            const { fired, resolved } = evaluateRules(rulesRef.current, c1h, c24h, s, prevAlerts);
            if (!fired.length && !resolved.length) return prevAlerts;
            const updated = prevAlerts.map(a =>
              resolved.includes(a.id) ? { ...a, resolved: true, resolvedAt: Date.now() } : a
            );
            return [...updated, ...fired];
          });

          return prevCalls;
        });
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [isLive]);

  const handleDismiss = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true, resolvedAt: Date.now() } : a));
  }, []);

  const p95Rule = rules.find(r => r.id === 'rule_p95_latency' && r.enabled);
  const p95Threshold = p95Rule?.threshold ?? 2000;

  return (
    <div className="min-h-screen bg-gray-950">
      <Header
        activeAlerts={summary.activeAlerts}
        isLive={isLive}
        onToggleLive={() => setIsLive(l => !l)}
        onTabChange={setTab}
        activeTab={tab}
      />

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {tab === 'overview' && (
          <>
            <MetricsCards summary={summary} />

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              <div className="space-y-4">
                <LatencyChart data={timeSeries} p95Threshold={p95Threshold} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CostChart data={timeSeries} />
                  <ErrorRateChart data={timeSeries} />
                </div>
                <TokenChart data={timeSeries} />
              </div>

              <div className="flex flex-col gap-4">
                <AlertPanel alerts={alerts} onDismiss={handleDismiss} />
                <LiveFeed calls={calls1h} maxRows={40} />
              </div>
            </div>
          </>
        )}

        {tab === 'breakdown' && (
          <div className="space-y-6">
            <MetricsCards summary={summary} />
            <ModelBreakdown modelStats={modelStats} teamStats={teamStats} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LatencyChart data={timeSeries} p95Threshold={p95Threshold} />
              <CostChart data={timeSeries} />
            </div>
            <LiveFeed calls={calls1h} maxRows={100} />
          </div>
        )}

        {tab === 'rules' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
            <RulesEditor rules={rules} onUpdate={setRules} />
            <div className="space-y-4">
              <AlertPanel alerts={alerts} onDismiss={handleDismiss} />
              <MetricsCards summary={summary} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
