import { clsx } from 'clsx';

type Variant = 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray' | 'orange';

const VARIANTS: Record<Variant, string> = {
  green:  'bg-green-900/40 text-green-400 border border-green-700/40',
  red:    'bg-red-900/40 text-red-400 border border-red-700/40',
  yellow: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700/40',
  blue:   'bg-blue-900/40 text-blue-400 border border-blue-700/40',
  purple: 'bg-purple-900/40 text-purple-400 border border-purple-700/40',
  gray:   'bg-gray-800/60 text-gray-400 border border-gray-700/40',
  orange: 'bg-orange-900/40 text-orange-400 border border-orange-700/40',
};

interface Props {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, variant = 'gray', className, dot }: Props) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-medium',
      VARIANTS[variant],
      className
    )}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColor(variant))} />}
      {children}
    </span>
  );
}

function dotColor(v: Variant) {
  const map: Record<Variant, string> = {
    green: 'bg-green-400', red: 'bg-red-400', yellow: 'bg-yellow-400',
    blue: 'bg-blue-400', purple: 'bg-purple-400', gray: 'bg-gray-400', orange: 'bg-orange-400',
  };
  return map[v];
}
