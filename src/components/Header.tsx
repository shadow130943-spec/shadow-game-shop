import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, profile } = useAuth();

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('my-MM').format(balance);
  };

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-bold text-foreground">
        YK Game Shop
      </Link>
      {user && (
        <div className="px-4 py-1.5 rounded-full bg-card border border-border text-sm font-medium text-foreground">
          {formatBalance(profile?.wallet_balance || 0)} ကျပ်
        </div>
      )}
    </header>
  );
}
