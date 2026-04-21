import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts';
import { Card } from './ui/Card';
import type { TimePoint } from '../lib/types';

interface Props {
  data: TimePoint[];
  budgetThreshold1h?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-gray-300">Cost:</span>
        <span className="font-mono text-white">${payload[0]?.value?.toFixed(4)}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-gray-300">Requests:</span>
        <span className="font-mono text-white">{payload[1]?.value}</span>
      </div>
    </div>
  );
};

export function CostChart({ data, budgetThreshold1h = 5.0 }: Props) {
  const totalCost = data.reduce((s, d) => s + d.totalCost, 0);
  const overBudget = totalCost > budgetThreshold1h;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Cost Over Time</h2>
          <p className={`text-xs mt-0.5 font-mono ${overBudget ? 'text-red-400' : 'text-emerald-400'}`}>
            ${totalCost.toFixed(4)} total
          </p>
        </div>
        <div className="text-right">
          <p className="text-xxs text-gray-500">Budget (1h)</p>
          <p className="text-xs text-gray-300 font-mono">${budgetThreshold1h.toFixed(2)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(3)}`} width={60} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            dataKey="totalCost"
            name="Cost"
            stroke="#10b981"
            fill="url(#costGrad)"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
