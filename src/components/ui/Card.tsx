import { clsx } from 'clsx';

interface Props {
  children: React.ReactNode;
  className?: string;
  glow?: 'none' | 'green' | 'red' | 'yellow';
  noPad?: boolean;
}

export function Card({ children, className, glow = 'none', noPad }: Props) {
  return (
    <div className={clsx(
      'rounded-xl bg-gray-900 border border-gray-800',
      !noPad && 'p-4',
      glow === 'green' && 'glow-green border-green-800/50',
      glow === 'red' && 'glow-red border-red-800/50',
      glow === 'yellow' && 'glow-yellow border-yellow-800/50',
      className
    )}>
      {children}
    </div>
  );
}
