import { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { AlertRule, RuleMetric, AlertSeverity } from '../lib/types';
import { clsx } from 'clsx';

interface Props {
  rules: AlertRule[];
  onUpdate: (rules: AlertRule[]) => void;
}

const METRIC_OPTIONS: { value: RuleMetric; label: string; unit: string }[] = [
  { value: 'p95_latency_ms', label: 'P95 Latency', unit: 'ms' },
  { value: 'p99_latency_ms', label: 'P99 Latency', unit: 'ms' },
  { value: 'avg_latency_ms', label: 'Avg Latency', unit: 'ms' },
  { value: 'error_rate_pct', label: 'Error Rate', unit: '%' },
  { value: 'cost_per_request_usd', label: 'Cost / Request', unit: 'USD' },
  { value: 'total_tokens', label: 'Total Tokens (1h)', unit: 'tokens' },
  { value: 'budget_usd_1h', label: 'Hourly Spend', unit: 'USD' },
  { value: 'budget_usd_24h', label: '24h Spend', unit: 'USD' },
];

const SEVERITY_BADGE: Record<AlertSeverity, 'red' | 'yellow' | 'blue'> = {
  critical: 'red', warning: 'yellow', info: 'blue',
};

let ruleCounter = 100;

const BLANK_RULE: Omit<AlertRule, 'id'> = {
  name: 'New Rule',
  metric: 'p95_latency_ms',
  operator: 'gt',
  threshold: 2000,
  severity: 'warning',
  enabled: true,
  cooldownMs: 60_000,
};

interface EditState {
  name: string;
  metric: RuleMetric;
  operator: AlertRule['operator'];
  threshold: string;
  severity: AlertSeverity;
  cooldownMs: string;
}

function ruleToEdit(r: AlertRule): EditState {
  return {
    name: r.name,
    metric: r.metric,
    operator: r.operator,
    threshold: r.threshold.toString(),
    severity: r.severity,
    cooldownMs: (r.cooldownMs / 1000).toString(),
  };
}

export function RulesEditor({ rules, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const startEdit = (rule: AlertRule) => {
    setEditingId(rule.id);
    setEditState(ruleToEdit(rule));
  };

  const cancelEdit = () => { setEditingId(null); setEditState(null); };

  const saveEdit = (ruleId: string) => {
    if (!editState) return;
    onUpdate(rules.map(r => r.id === ruleId ? {
      ...r,
      name: editState.name,
      metric: editState.metric,
      operator: editState.operator,
      threshold: parseFloat(editState.threshold) || 0,
      severity: editState.severity,
      cooldownMs: (parseFloat(editState.cooldownMs) || 60) * 1000,
    } : r));
    cancelEdit();
  };

  const toggleRule = (id: string) => {
    onUpdate(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    onUpdate(rules.filter(r => r.id !== id));
  };

  const addRule = () => {
    const newRule: AlertRule = { ...BLANK_RULE, id: `rule_custom_${++ruleCounter}` };
    onUpdate([...rules, newRule]);
    setEditingId(newRule.id);
    setEditState(ruleToEdit(newRule));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Alert Rules</h2>
          <p className="text-xs text-gray-400 mt-0.5">Configure thresholds and notifications for your AI workloads</p>
        </div>
        <button
          onClick={addRule}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Rule
        </button>
      </div>

      <div className="space-y-2">
        {rules.map(rule => {
          const isEditing = editingId === rule.id;
          const metaLabel = METRIC_OPTIONS.find(m => m.value === rule.metric)?.label ?? rule.metric;

          return (
            <Card key={rule.id} className={clsx('transition-all', !rule.enabled && 'opacity-50')}>
              {isEditing && editState ? (
                /* Edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">Rule Name</label>
                      <input
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.name}
                        onChange={e => setEditState(s => s && ({ ...s, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">Severity</label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.severity}
                        onChange={e => setEditState(s => s && ({ ...s, severity: e.target.value as AlertSeverity }))}
                      >
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">Metric</label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.metric}
                        onChange={e => setEditState(s => s && ({ ...s, metric: e.target.value as RuleMetric }))}
                      >
                        {METRIC_OPTIONS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">Operator</label>
                      <select
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.operator}
                        onChange={e => setEditState(s => s && ({ ...s, operator: e.target.value as AlertRule['operator'] }))}
                      >
                        <option value="gt">Greater than (&gt;)</option>
                        <option value="gte">Greater or equal (≥)</option>
                        <option value="lt">Less than (&lt;)</option>
                        <option value="lte">Less or equal (≤)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">
                        Threshold ({METRIC_OPTIONS.find(m => m.value === editState.metric)?.unit})
                      </label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.threshold}
                        onChange={e => setEditState(s => s && ({ ...s, threshold: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xxs text-gray-400 block mb-1">Cooldown (seconds)</label>
                      <input
                        type="number"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        value={editState.cooldownMs}
                        onChange={e => setEditState(s => s && ({ ...s, cooldownMs: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs transition-colors">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                    <button onClick={() => saveEdit(rule.id)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs transition-colors">
                      <Check className="w-3 h-3" /> Save
                    </button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={clsx(
                      'w-9 h-5 rounded-full relative transition-colors shrink-0',
                      rule.enabled ? 'bg-indigo-600' : 'bg-gray-700'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      rule.enabled ? 'left-4' : 'left-0.5'
                    )} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{rule.name}</span>
                      <Badge variant={SEVERITY_BADGE[rule.severity]}>{rule.severity}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {metaLabel} {rule.operator === 'gt' ? '>' : rule.operator === 'gte' ? '≥' : rule.operator === 'lt' ? '<' : '≤'}{' '}
                      <span className="text-white font-mono">{rule.threshold.toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">· cooldown {rule.cooldownMs / 1000}s</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(rule)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
