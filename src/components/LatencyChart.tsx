import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine
} from 'recharts';
import { Card } from './ui/Card';
import type { TimePoint } from '../lib/types';

interface Props {
  data: TimePoint[];
  p95Threshold?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-mono text-white">{Math.round(p.value).toLocaleString()}ms</span>
        </div>
      ))}
    </div>
  );
};

export function LatencyChart({ data, p95Threshold = 2000 }: Props) {
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Latency Percentiles</h2>
        <div className="flex items-center gap-3 text-xxs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-400 inline-block" />P50</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block" />P95</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" />P99</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}ms`}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={p95Threshold} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: `Alert: ${p95Threshold}ms`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />
          <Line dataKey="p50" name="P50" stroke="#818cf8" dot={false} strokeWidth={2} connectNulls />
          <Line dataKey="p95" name="P95" stroke="#fbbf24" dot={false} strokeWidth={2} connectNulls />
          <Line dataKey="p99" name="P99" stroke="#f87171" dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
