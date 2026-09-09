import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, BadgeCheck, Crown, Medal, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { useLanguage } from '@/i18n/LanguageProvider';

interface TopBuyerRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_spend: number;
  is_owner: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchTopBuyers(): Promise<TopBuyerRow[]> {
  const { data, error } = await (supabase as any).rpc('get_top_buyers');
  if (error) throw error;
  return (data || []).map((r: any) => ({
    user_id: r.user_id,
    name: r.name || 'User',
    avatar_url: r.avatar_url ?? null,
    total_spend: Number(r.total_spend) || 0,
    is_owner: !!r.is_owner,
  }));
}

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
}

function rankGlow(rank: number) {
  if (rank === 1) return 'border-yellow-400/50 shadow-[0_0_15px_hsl(45_100%_50%/0.3)]';
  if (rank === 2) return 'border-gray-300/30';
  if (rank === 3) return 'border-amber-600/30';
  return 'border-border';
}

export default function TopBuyersPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data = [], isLoading } = useQuery({
    queryKey: ['top_buyers_board'],
    queryFn: fetchTopBuyers,
    // Rankings refresh once every 24 hours.
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    refetchInterval: DAY_MS,
  });

  const owner = data.find((r) => r.is_owner);
  const buyers = data.filter((r) => !r.is_owner);
  const format = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3">
        <button type="button" aria-label={t('back')} onClick={() => navigate('/account')} className="rounded-md p-1.5 text-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('top_buyers_title')}</h1>
      </header>

      <main className="mx-auto grid w-full max-w-md gap-3 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <p className="text-xs text-muted-foreground">{t('top_buyers_subtitle')}</p>

        {owner && (
          <div className="flex items-center gap-3 rounded-xl border border-primary/50 bg-primary/10 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-base font-bold text-primary">
              {owner.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate font-semibold text-foreground">
                {owner.name}
                <BadgeCheck className="h-4 w-4 shrink-0 text-[hsl(210_100%_56%)]" />
              </p>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {t('owner_badge')}
              </span>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : buyers.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <Trophy className="mx-auto mb-2 h-10 w-10 opacity-50" />
            <p className="text-sm">{t('top_buyers_empty')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {buyers.map((buyer, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={buyer.user_id}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${rankGlow(rank)}`}
                >
                  <div className="flex w-8 items-center justify-center">{rankIcon(rank)}</div>
                  <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${rank <= 3 ? 'text-primary' : 'text-foreground'}`}>
                    {buyer.name}
                  </p>
                  <p className={`text-sm font-bold ${rank === 1 ? 'text-yellow-400' : rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(buyer.total_spend)} {t('currency_suffix')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
