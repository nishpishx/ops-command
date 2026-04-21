import { Activity, Bell, Settings, Zap } from 'lucide-react';

interface Props {
  activeAlerts: number;
  isLive: boolean;
  onToggleLive: () => void;
  onTabChange: (tab: Tab) => void;
  activeTab: Tab;
}

export type Tab = 'overview' | 'breakdown' | 'rules';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'rules', label: 'Alert Rules' },
];

export function Header({ activeAlerts, isLive, onToggleLive, onTabChange, activeTab }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-semibold text-sm tracking-tight">OpsCommand</span>
            <span className="text-gray-500 text-xs ml-2">AI Workload Monitor</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1 ml-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === t.id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Live toggle */}
          <button
            onClick={onToggleLive}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isLive
                ? 'bg-green-900/30 border-green-700/50 text-green-400'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
            {isLive ? 'Live' : 'Paused'}
          </button>

          {/* Alerts bell */}
          <div className="relative">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            {activeAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white flex items-center justify-center text-xxs font-bold">
                {activeAlerts > 9 ? '9+' : activeAlerts}
              </span>
            )}
          </div>

          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Activity className="w-3 h-3" />
            <span>Simulated</span>
          </div>
        </div>
      </div>
    </header>
  );
}
