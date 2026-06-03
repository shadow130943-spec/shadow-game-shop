import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Search, CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

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

const statusBadge = (status: string) => {
  const map: Record<string, { cls: string; label: string }> = {
    success: { cls: 'bg-primary text-primary-foreground', label: 'Success' },
    processing: { cls: 'bg-gaming-gold/90 text-black', label: 'Pending' },
    failed: { cls: 'bg-destructive text-destructive-foreground', label: 'Failed' },
  };
  return map[status] || { cls: 'bg-muted text-foreground', label: status };
};

const formatNum = (n: number) => new Intl.NumberFormat('my-MM').format(n);

export default function GameOrderHistory() {
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selected, setSelected] = useState<GameOrder | null>(null);
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

  const games = useMemo(() => {
    const s = new Set(orders.map((o) => o.product_name));
    return Array.from(s);
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (searchQuery.trim() && !o.id.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
      if (gameFilter !== 'all' && o.product_name !== gameFilter) return false;
      if (dateFilter) {
        const d = new Date(o.created_at);
        if (d.toDateString() !== dateFilter.toDateString()) return false;
      }
      return true;
    });
  }, [orders, searchQuery, gameFilter, dateFilter]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-bold text-lg">ဝယ်ယူမှုမှတ်တမ်း</h1>
      </div>

      {/* Filters */}
      <div className="px-4 pt-4 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={gameFilter} onValueChange={setGameFilter}>
            <SelectTrigger className="bg-card border-border"><SelectValue placeholder="All Games" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              {games.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('justify-start font-normal bg-card border-border', !dateFilter && 'text-muted-foreground')}>
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFilter ? format(dateFilter, 'PP') : 'Date'}
                {dateFilter && (
                  <X className="h-3 w-3 ml-auto" onClick={(e) => { e.stopPropagation(); setDateFilter(undefined); }} />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Order Cards */}
      <div className="px-4 pt-4 space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">အော်ဒါမရှိသေးပါ</p>
        ) : (
          filtered.map((o) => {
            const badge = statusBadge(o.status);
            const date = new Date(o.created_at);
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left gaming-card rounded-xl p-3 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] font-mono text-muted-foreground">#{o.id.slice(0, 8)}</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {o.game_id}{o.server_id ? ` (${o.server_id})` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{o.item_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">{format(date, 'p')}</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{formatNum(o.price)} Ks</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogTitle className="text-center text-lg font-bold">Order Details</DialogTitle>
          {selected && (
            <div className="space-y-2 pt-2">
              <DetailRow label="NAME" value={selected.product_name} />
              <DetailRow label="GAME ID & SERVER" value={`${selected.game_id}${selected.server_id ? ` (${selected.server_id})` : ''}`} />
              <DetailRow label="ITEM" value={selected.item_name} />
              <DetailRow label="PRICE" value={`${formatNum(selected.price)} Ks`} valueClass="text-primary" />
              <DetailRow label="DATE" value={format(new Date(selected.created_at), 'd MMM yyyy p')} />
              <DetailRow label="STATUS" value={statusBadge(selected.status).label} />
              <DetailRow label="ORDER ID" value={selected.id} valueClass="font-mono text-xs break-all" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm font-semibold text-foreground mt-0.5', valueClass)}>{value}</p>
    </div>
  );
}
