import { useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import type { ApiCall } from '../lib/types';
import { clsx } from 'clsx';

interface Props {
  calls: ApiCall[];
  maxRows?: number;
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-6':   'purple',
  'claude-sonnet-4-6': 'blue',
  'claude-haiku-4-5':  'green',
  'gpt-4o':            'orange',
  'gpt-4o-mini':       'yellow',
  'gemini-1.5-pro':    'gray',
};

const STATUS_COLOR: Record<number, string> = {
  200: 'text-green-400',
  400: 'text-yellow-400',
  401: 'text-yellow-400',
  429: 'text-orange-400',
  500: 'text-red-400',
  503: 'text-red-400',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function latencyColor(ms: number) {
  if (ms > 3000) return 'text-red-400';
  if (ms > 1500) return 'text-yellow-400';
  return 'text-green-400';
}

export function LiveFeed({ calls, maxRows = 50 }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // Auto-scroll only when near bottom
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    autoScrollRef.current = nearBottom;
  };

  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [calls]);

  const visible = [...calls].reverse().slice(0, maxRows);

  return (
    <Card noPad className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h2 className="text-sm font-semibold text-white">Live Request Feed</h2>
        </div>
        <span className="text-xxs text-gray-500">{calls.length.toLocaleString()} total</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[90px_1fr_90px_70px_70px_70px_70px] gap-2 px-4 py-2 border-b border-gray-800/60 text-xxs text-gray-500 font-medium uppercase tracking-wider">
        <span>Time</span>
        <span>Model / Endpoint</span>
        <span>Team</span>
        <span>Status</span>
        <span>Latency</span>
        <span>Tokens</span>
        <span>Cost</span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ maxHeight: '380px' }}
      >
        {visible.map((call, i) => (
          <div
            key={call.id}
            className={clsx(
              'grid grid-cols-[90px_1fr_90px_70px_70px_70px_70px] gap-2 px-4 py-1.5 border-b border-gray-800/30 text-xs hover:bg-gray-800/30 transition-colors animate-slide-in items-center',
              call.isAnomaly && 'bg-red-950/20 border-l-2 border-l-red-600/50',
              i === 0 && 'animate-fade-in'
            )}
          >
            <span className="text-gray-500 font-mono text-xxs tabular-nums">{formatTime(call.timestamp)}</span>

            <div className="flex items-center gap-1.5 min-w-0">
              {call.isAnomaly && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Badge variant={MODEL_COLORS[call.model] as any}>{call.model.replace('claude-', 'cl-').replace('gemini-', 'gem-')}</Badge>
                </div>
                <p className="text-gray-500 text-xxs truncate mt-0.5">{call.endpoint}</p>
              </div>
            </div>

            <span className="text-gray-400 text-xxs">{call.team}</span>

            <span className={clsx('font-mono font-semibold text-xxs', STATUS_COLOR[call.status] ?? 'text-gray-400')}>
              {call.status === 200 ? (
                <span className="flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> 200</span>
              ) : (
                <span className="flex items-center gap-0.5"><XCircle className="w-3 h-3" /> {call.status}</span>
              )}
            </span>

            <span className={clsx('font-mono tabular-nums text-xxs', latencyColor(call.latencyMs))}>
              {call.latencyMs.toLocaleString()}ms
            </span>

            <span className="text-gray-400 font-mono tabular-nums text-xxs">
              {(call.totalTokens / 1000).toFixed(1)}K
            </span>

            <span className="text-gray-400 font-mono tabular-nums text-xxs">
              ${call.costUsd < 0.001 ? call.costUsd.toExponential(1) : call.costUsd.toFixed(4)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </Card>
  );
}
