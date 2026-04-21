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
import {
  loadCalls, persistCalls, purgeStaleCalls,
  loadRules, saveRules, loadAlerts, saveAlerts,
} from './lib/storage';
import type {
  ApiCall, AlertRule, ActiveAlert, DashboardSummary,
  TimePoint, ModelStats, TeamStats,
} from './lib/types';

const MAX_CALLS = 2000;
const TICK_MS = 1500;
const EVAL_EVERY = 5;
const BUDGET_24H = 50.0;
// Write new calls to IndexedDB in batches every N ticks to avoid thrashing
const PERSIST_EVERY = 10;

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
  const [hydrated, setHydrated] = useState(false);
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>(() => loadRules() ?? DEFAULT_RULES);

  // Hydrate calls and alerts from storage on first mount
  useEffect(() => {
    loadCalls(86_400_000).then(stored => {
      if (stored.length > 0) {
        // Use stored history, trimmed to MAX_CALLS
        setCalls(stored.slice(-MAX_CALLS));
      } else {
        // First ever load — seed with fake history so charts aren't empty
        const seeded = seedHistory(60, 8);
        setCalls(seeded);
        persistCalls(seeded);
      }
    }).catch(() => {
      setCalls(seedHistory(60, 8));
    }).finally(() => {
      setHydrated(true);
    });

    setAlerts(loadAlerts());

    // Purge calls older than 24h once on startup
    purgeStaleCalls(86_400_000).catch(() => {});
  }, []);

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
  const pendingCallsRef = useRef<ApiCall[]>([]);

  useEffect(() => {
    if (!isLive || !hydrated) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      const newCall = generateApiCall();
      pendingCallsRef.current.push(newCall);

      setCalls(prev => {
        const next = [...prev, newCall];
        return next.length > MAX_CALLS ? next.slice(next.length - MAX_CALLS) : next;
      });

      // Batch-persist new calls to IndexedDB
      if (tickRef.current % PERSIST_EVERY === 0) {
        const batch = pendingCallsRef.current.splice(0);
        if (batch.length) persistCalls(batch).catch(() => {});
      }

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
            const next = [...updated, ...fired];
            saveAlerts(next);
            return next;
          });

          return prevCalls;
        });
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [isLive, hydrated]);

  const handleDismiss = useCallback((id: string) => {
    setAlerts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, resolved: true, resolvedAt: Date.now() } : a);
      saveAlerts(next);
      return next;
    });
  }, []);

  const handleRulesUpdate = useCallback((next: AlertRule[]) => {
    saveRules(next);
    setRules(next);
  }, []);

  const p95Rule = rules.find(r => r.id === 'rule_p95_latency' && r.enabled);
  const p95Threshold = p95Rule?.threshold ?? 2000;

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading history…</p>
        </div>
      </div>
    );
  }

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
            <RulesEditor rules={rules} onUpdate={handleRulesUpdate} />
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
