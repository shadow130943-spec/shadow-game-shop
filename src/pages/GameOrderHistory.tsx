import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';

interface GameOrder {
  id: string;
  product_name: string;
  item_name: string;
  price: number;
  game_id: string;
  server_id: string | null;
  status: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    success: 'bg-primary/20 text-primary',
    processing: 'bg-gaming-gold/20 text-gaming-gold',
    failed: 'bg-destructive/20 text-destructive',
  };
  const labelMap: Record<string, string> = {
    success: 'Success',
    processing: 'Pending',
    failed: 'Failed',
  };
  return {
    className: map[status] || map.processing,
    label: labelMap[status] || status,
  };
};

export default function GameOrderHistory() {
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('game_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as GameOrder[]) || []);
      setLoading(false);
    };
    fetchOrders();

    const channel = supabase
      .channel('my-game-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_orders', filter: `user_id=eq.${user.id}` }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o => o.game_id.toLowerCase().includes(q) || o.id.toLowerCase().includes(q));
  }, [orders, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg text-foreground">ဝယ်ယူမှုမှတ်တမ်းများ</h1>
      </div>

      {/* Search */}
      <div className="px-4 mb-4 flex gap-2">
        <Input
          placeholder="Game ID ဖြင့်ရှာမည်..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-card border-border"
        />
        <Button className="btn-secondary-action border-0 shrink-0">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <div className="mx-4 rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
          </div>
        ) : paginated.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">အော်ဒါမရှိသေးပါ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">ID</th>
                  <th className="text-left px-3 py-2.5 text-muted-foreground font-medium">ပမာဏ</th>
                  <th className="text-center px-3 py-2.5 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(o => {
                  const badge = statusBadge(o.status);
                  return (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3">
                        <span className="text-secondary font-medium text-xs">{o.id.slice(0, 8)}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-foreground text-xs">{o.item_name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBalance(o.price)} ကျပ်</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
            Math.max(0, currentPage - 3),
            Math.min(totalPages, currentPage + 2)
          ).map(p => (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setCurrentPage(p)}
              className={`h-8 w-8 text-xs ${p === currentPage ? 'gaming-btn border-0' : ''}`}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
