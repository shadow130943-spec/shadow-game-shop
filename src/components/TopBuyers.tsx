import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TopBuyer {
  user_id: string;
  name: string;
  total_spend: number;
}

export function TopBuyers() {
  const [buyers, setBuyers] = useState<TopBuyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopBuyers();
  }, []);

  const fetchTopBuyers = async () => {
    // Get top 10 users by total game order spend (approved orders only)
    const { data: orders, error } = await supabase
      .from('game_orders')
      .select('user_id, price')
      .eq('status', 'approved');

    if (error) {
      console.error('Failed to fetch top buyers:', error);
      setLoading(false);
      return;
    }

    // Aggregate spend per user
    const spendMap: Record<string, number> = {};
    (orders || []).forEach((o) => {
      spendMap[o.user_id] = (spendMap[o.user_id] || 0) + o.price;
    });

    const userIds = Object.keys(spendMap);
    if (userIds.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch profiles for these users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name')
      .in('user_id', userIds);

    const profileMap: Record<string, string> = {};
    (profiles || []).forEach((p) => {
      profileMap[p.user_id] = p.name;
    });

    const sorted = Object.entries(spendMap)
      .map(([user_id, total_spend]) => ({
        user_id,
        name: profileMap[user_id] || 'Unknown',
        total_spend,
      }))
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 10);

    setBuyers(sorted);
    setLoading(false);
  };

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-300" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const getRankGlow = (rank: number) => {
    if (rank === 1) return 'border-yellow-400/50 shadow-[0_0_15px_hsl(45_100%_50%/0.3)]';
    if (rank === 2) return 'border-gray-300/30 shadow-[0_0_10px_hsl(0_0%_80%/0.2)]';
    if (rank === 3) return 'border-amber-600/30 shadow-[0_0_10px_hsl(25_80%_40%/0.2)]';
    return 'border-border';
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (buyers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">အထိပ်တန်းဝယ်သူများ မရှိသေးပါ</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-gaming text-base font-bold text-primary neon-text-cyan">
          Top Buyers
        </h3>
      </div>

      {buyers.map((buyer, idx) => {
        const rank = idx + 1;
        return (
          <div
            key={buyer.user_id}
            className={`flex items-center gap-3 rounded-xl p-3 gaming-card border ${getRankGlow(rank)} transition-all`}
          >
            <div className="flex items-center justify-center w-8">
              {getRankIcon(rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm truncate ${rank <= 3 ? 'text-primary' : 'text-foreground'}`}>
                {buyer.name}
              </p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${rank === 1 ? 'text-yellow-400' : rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                {formatBalance(buyer.total_spend)} ကျပ်
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
