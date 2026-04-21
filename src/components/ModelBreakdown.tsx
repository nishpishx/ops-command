import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { ModelStats, TeamStats } from '../lib/types';

interface Props {
  modelStats: ModelStats[];
  teamStats: TeamStats[];
}

const MODEL_BADGE: Record<string, 'purple' | 'blue' | 'green' | 'orange' | 'yellow' | 'gray'> = {
  'claude-opus-4-6':   'purple',
  'claude-sonnet-4-6': 'blue',
  'claude-haiku-4-5':  'green',
  'gpt-4o':            'orange',
  'gpt-4o-mini':       'yellow',
  'gemini-1.5-pro':    'gray',
};

const TEAM_COLORS = ['bg-indigo-500', 'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500'];

function ProgressBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1 bg-gray-800 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function ModelBreakdown({ modelStats, teamStats }: Props) {
  const maxModelReqs = Math.max(...modelStats.map(m => m.requests), 1);
  const maxTeamCost = Math.max(...teamStats.map(t => t.totalCost), 0.001);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Model table */}
      <Card noPad>
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">By Model</h2>
        </div>
        <div className="divide-y divide-gray-800/60">
          {modelStats.map(m => (
            <div key={m.model} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={MODEL_BADGE[m.model] ?? 'gray'}>{m.model}</Badge>
                <div className="flex items-center gap-3 text-xxs text-gray-400">
                  <span className="tabular-nums">{m.requests.toLocaleString()} req</span>
                  <span className={`font-mono ${m.errorRate > 0.1 ? 'text-red-400' : m.errorRate > 0.05 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {(m.errorRate * 100).toFixed(1)}% err
                  </span>
                  <span className="font-mono text-emerald-400">${m.totalCost.toFixed(3)}</span>
                </div>
              </div>
              <ProgressBar value={m.requests} max={maxModelReqs} color="bg-indigo-500" />
              <div className="flex items-center gap-4 mt-1.5 text-xxs text-gray-500">
                <span>avg {Math.round(m.avgLatency)}ms</span>
                <span>p95 {Math.round(m.p95Latency)}ms</span>
                <span>{(m.totalTokens / 1000).toFixed(0)}K tok</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Team table */}
      <Card noPad>
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">By Team</h2>
        </div>
        <div className="divide-y divide-gray-800/60">
          {teamStats.map((t, i) => (
            <div key={t.team} className="px-4 py-3 hover:bg-gray-800/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${TEAM_COLORS[i % TEAM_COLORS.length]}`} />
                  <span className="text-sm text-white font-medium">{t.team}</span>
                </div>
                <div className="flex items-center gap-3 text-xxs text-gray-400">
                  <span className="tabular-nums">{t.requests.toLocaleString()} req</span>
                  <span className={`font-mono ${t.errorRate > 0.1 ? 'text-red-400' : t.errorRate > 0.05 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {(t.errorRate * 100).toFixed(1)}% err
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ProgressBar value={t.totalCost} max={maxTeamCost} color={TEAM_COLORS[i % TEAM_COLORS.length]} />
                <span className="text-xxs text-emerald-400 font-mono shrink-0 w-16 text-right">${t.totalCost.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xxs text-gray-500">
                <span>avg {Math.round(t.avgLatency)}ms</span>
                <span>{(t.totalTokens / 1000).toFixed(0)}K tokens</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
