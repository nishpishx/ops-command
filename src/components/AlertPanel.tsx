import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react';
import { Card } from './ui/Card';
import type { ActiveAlert } from '../lib/types';
import { clsx } from 'clsx';

interface Props {
  alerts: ActiveAlert[];
  onDismiss: (id: string) => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    border: 'border-l-red-500',
    bg: 'bg-red-950/30',
    iconColor: 'text-red-400',
    badge: 'bg-red-900/50 text-red-300 border border-red-700/50',
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-l-yellow-500',
    bg: 'bg-yellow-950/20',
    iconColor: 'text-yellow-400',
    badge: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50',
  },
  info: {
    icon: Info,
    border: 'border-l-blue-500',
    bg: 'bg-blue-950/20',
    iconColor: 'text-blue-400',
    badge: 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
  },
};

function formatAge(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function AlertPanel({ alerts, onDismiss }: Props) {
  const active = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved).slice(0, 5);

  return (
    <Card noPad className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <h2 className="text-sm font-semibold text-white">Active Alerts</h2>
          {active.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-900/50 border border-red-700/50 text-red-300 rounded-full text-xxs font-bold">
              {active.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 opacity-60" />
            <p className="text-sm text-gray-400">All clear</p>
            <p className="text-xxs text-gray-600">No active alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/50">
            {active.map(alert => {
              const cfg = SEVERITY_CONFIG[alert.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={alert.id}
                  className={clsx(
                    'flex items-start gap-3 px-4 py-3 border-l-2 animate-slide-in',
                    cfg.border, cfg.bg
                  )}
                >
                  <Icon className={clsx('w-4 h-4 mt-0.5 shrink-0', cfg.iconColor)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-white">{alert.ruleName}</span>
                      <span className={clsx('px-1.5 py-0.5 rounded text-xxs font-medium', cfg.badge)}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mb-1">{alert.message}</p>
                    <p className="text-xxs text-gray-500">{formatAge(alert.firedAt)}</p>
                  </div>
                  <button
                    onClick={() => onDismiss(alert.id)}
                    className="w-5 h-5 flex items-center justify-center rounded text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors shrink-0 mt-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolved */}
        {resolved.length > 0 && (
          <div className="border-t border-gray-800 mt-2">
            <p className="px-4 py-2 text-xxs text-gray-500 font-medium uppercase tracking-wider">Recently Resolved</p>
            <div className="divide-y divide-gray-800/30">
              {resolved.map(alert => (
                <div key={alert.id} className="flex items-center gap-3 px-4 py-2 opacity-50">
                  <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xxs text-gray-400 truncate">{alert.ruleName}</p>
                    <p className="text-xxs text-gray-600">{alert.resolvedAt ? formatAge(alert.resolvedAt) : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
