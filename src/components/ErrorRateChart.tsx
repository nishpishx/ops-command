import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';
import { Card } from './ui/Card';
import type { TimePoint } from '../lib/types';

interface Props {
  data: TimePoint[];
  errorThresholdPct?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const errRate = payload[0]?.value ?? 0;
  const reqs = payload[1]?.value ?? 0;
  const errors = payload[2]?.value ?? 0;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex gap-2"><span className="text-gray-400">Error Rate:</span><span className="text-white font-mono">{(errRate * 100).toFixed(1)}%</span></div>
        <div className="flex gap-2"><span className="text-gray-400">Requests:</span><span className="text-white font-mono">{reqs}</span></div>
        <div className="flex gap-2"><span className="text-gray-400">Errors:</span><span className="text-red-400 font-mono">{errors}</span></div>
      </div>
    </div>
  );
};

export function ErrorRateChart({ data, errorThresholdPct = 5 }: Props) {
  const formatted = data.map(d => ({ ...d, errorRatePct: d.errorRate * 100 }));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Error Rate</h2>
        <span className="text-xxs text-gray-500">threshold {errorThresholdPct}%</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(0)}%`} width={36} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={errorThresholdPct} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} />
          <Area
            dataKey="errorRatePct"
            name="Error Rate"
            stroke="#ef4444"
            fill="url(#errGrad)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          {/* hidden data for tooltip */}
          <Area dataKey="requests" name="Requests" stroke="transparent" fill="transparent" connectNulls />
          <Area dataKey="errors" name="Errors" stroke="transparent" fill="transparent" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
