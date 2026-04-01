import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, profile } = useAuth();

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('my-MM').format(balance);
  };

  return (
    <header className="w-full z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-muted/80 border border-primary/30 neon-border-pulse">
              <span className="font-medium text-xs sm:text-sm text-primary">
                {formatBalance(profile?.wallet_balance || 0)} ကျပ်
              </span>
              <Link to="/deposit">
                <Plus className="h-4 w-4 text-primary" />
              </Link>
            </div>
          ) : (
            <Link to="/" className="font-gaming text-xl font-bold">
              <span className="text-primary neon-text-cyan">SHADOW</span>
              <span className="text-secondary neon-text-magenta"> GAME</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
