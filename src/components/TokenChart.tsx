import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { Card } from './ui/Card';
import type { TimePoint } from '../lib/types';

interface Props {
  data: TimePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value ?? 0) + (payload[1]?.value ?? 0);
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-mono text-white">{(p.value / 1000).toFixed(1)}K</span>
        </div>
      ))}
      <div className="border-t border-gray-700 mt-2 pt-2 flex items-center gap-2">
        <span className="text-gray-400">Total:</span>
        <span className="font-mono text-white">{(total / 1000).toFixed(1)}K</span>
      </div>
    </div>
  );
};

export function TokenChart({ data }: Props) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Token Usage</h2>
        <div className="flex items-center gap-3 text-xxs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-indigo-500 rounded-sm inline-block" />Input</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 bg-purple-500 rounded-sm inline-block" />Output</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="inputTokens" name="Input" stackId="a" fill="#6366f1" radius={[0, 0, 2, 2]} />
          <Bar dataKey="outputTokens" name="Output" stackId="a" fill="#a855f7" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
