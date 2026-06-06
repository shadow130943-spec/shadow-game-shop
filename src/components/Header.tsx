import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandingAsset } from '@/hooks/useShopContent';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const { user, profile, loading } = useAuth();
  const logoUrl = useBrandingAsset('site_logo');

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('my-MM').format(balance);
  };

  return (
    <header className="w-full px-4 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
        {logoUrl ? (
          <img src={logoUrl} alt="Site logo" className="h-8 w-8 rounded object-contain" />
        ) : (
          <Skeleton className="h-8 w-8 rounded" />
        )}
        <span>YK Game Shop</span>
      </Link>
      {loading ? (
        <Skeleton className="h-7 w-24 rounded-full" />
      ) : user && profile ? (
        <div className="px-4 py-1.5 rounded-full bg-card border border-border text-sm font-medium text-foreground">
          {formatBalance(profile.wallet_balance)} ကျပ်
        </div>
      ) : null}
    </header>
  );
}
