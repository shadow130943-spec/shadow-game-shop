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
            <div className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-muted/80 border border-border">
              <span className="font-medium text-xs sm:text-sm">
                {formatBalance(profile?.wallet_balance || 0)} ကျပ်
              </span>
              <Link to="/deposit">
                <Plus className="h-4 w-4 text-foreground" />
              </Link>
            </div>
          ) : (
            <Link to="/" className="font-gaming text-xl font-bold text-accent gaming-glow-text">
              GAME<span className="text-foreground">TOP</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
