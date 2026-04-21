import { TrendingUp, TrendingDown, Minus, Clock, DollarSign, AlertTriangle, Zap, Activity } from 'lucide-react';
import { Card } from './ui/Card';
import type { DashboardSummary } from '../lib/types';

interface Props {
  summary: DashboardSummary;
  prevSummary?: DashboardSummary;
}

function Trend({ current, prev, lowerIsBetter = false }: { current: number; prev?: number; lowerIsBetter?: boolean }) {
  if (!prev || prev === 0) return null;
  const pct = ((current - prev) / prev) * 100;
  const isUp = pct > 0;
  const isGood = lowerIsBetter ? !isUp : isUp;
  if (Math.abs(pct) < 0.5) return <Minus className="w-3 h-3 text-gray-500" />;
  return (
    <span className={`flex items-center gap-0.5 text-xxs font-medium ${isGood ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

interface CardData {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  trend?: { current: number; prev?: number; lowerIsBetter?: boolean };
  accent: string;
  glow?: 'green' | 'red' | 'yellow' | 'none';
}

export function MetricsCards({ summary, prevSummary }: Props) {
  const cards: CardData[] = [
    {
      label: 'Requests (1h)',
      value: summary.requestsLast1h.toLocaleString(),
      sub: `${summary.requestsLast24h.toLocaleString()} / 24h`,
      icon: <Activity className="w-4 h-4" />,
      trend: { current: summary.requestsLast1h, prev: prevSummary?.requestsLast1h },
      accent: 'text-indigo-400 bg-indigo-900/30',
      glow: 'none',
    },
    {
      label: 'P95 Latency',
      value: `${Math.round(summary.p95LatencyMs)}ms`,
      sub: `avg ${Math.round(summary.avgLatencyMs)}ms`,
      icon: <Clock className="w-4 h-4" />,
      trend: { current: summary.p95LatencyMs, prev: prevSummary?.p95LatencyMs, lowerIsBetter: true },
      accent: summary.p95LatencyMs > 2000 ? 'text-red-400 bg-red-900/30' : summary.p95LatencyMs > 1000 ? 'text-yellow-400 bg-yellow-900/30' : 'text-green-400 bg-green-900/30',
      glow: summary.p95LatencyMs > 2000 ? 'red' : summary.p95LatencyMs > 1000 ? 'yellow' : 'none',
    },
    {
      label: 'Error Rate',
      value: `${(summary.errorRateLast1h * 100).toFixed(1)}%`,
      sub: `${summary.errorsLast1h} errors (1h)`,
      icon: <AlertTriangle className="w-4 h-4" />,
      trend: { current: summary.errorRateLast1h, prev: prevSummary?.errorRateLast1h, lowerIsBetter: true },
      accent: summary.errorRateLast1h > 0.1 ? 'text-red-400 bg-red-900/30' : summary.errorRateLast1h > 0.05 ? 'text-yellow-400 bg-yellow-900/30' : 'text-green-400 bg-green-900/30',
      glow: summary.errorRateLast1h > 0.1 ? 'red' : 'none',
    },
    {
      label: 'Spend (1h)',
      value: `$${summary.costLast1h.toFixed(3)}`,
      sub: `$${summary.costLast24h.toFixed(2)} / 24h`,
      icon: <DollarSign className="w-4 h-4" />,
      trend: { current: summary.costLast1h, prev: prevSummary?.costLast1h, lowerIsBetter: true },
      accent: 'text-emerald-400 bg-emerald-900/30',
      glow: 'none',
    },
    {
      label: 'Tokens (1h)',
      value: formatTokens(summary.totalTokensLast1h),
      sub: 'input + output',
      icon: <Zap className="w-4 h-4" />,
      trend: { current: summary.totalTokensLast1h, prev: prevSummary?.totalTokensLast1h },
      accent: 'text-purple-400 bg-purple-900/30',
      glow: 'none',
    },
    {
      label: 'Budget Used',
      value: `${(summary.budgetUsed24h * 100).toFixed(0)}%`,
      sub: `$${summary.costLast24h.toFixed(2)} of $50 limit`,
      icon: <DollarSign className="w-4 h-4" />,
      accent: summary.budgetUsed24h > 0.9 ? 'text-red-400 bg-red-900/30' : summary.budgetUsed24h > 0.7 ? 'text-yellow-400 bg-yellow-900/30' : 'text-blue-400 bg-blue-900/30',
      glow: summary.budgetUsed24h > 0.9 ? 'red' : summary.budgetUsed24h > 0.7 ? 'yellow' : 'none',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {cards.map(c => (
        <Card key={c.label} glow={c.glow} className="relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <p className="text-gray-400 text-xs font-medium leading-tight">{c.label}</p>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.accent}`}>
              {c.icon}
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-xl font-bold text-white tabular-nums tracking-tight">{c.value}</p>
            <div className="flex items-center gap-2">
              <p className="text-gray-500 text-xxs">{c.sub}</p>
              {c.trend && <Trend {...c.trend} />}
            </div>
          </div>
          {/* Budget progress bar */}
          {c.label === 'Budget Used' && (
            <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.budgetUsed24h > 0.9 ? 'bg-red-500' : summary.budgetUsed24h > 0.7 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, summary.budgetUsed24h * 100)}%` }}
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
