import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, CalendarIcon, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';

interface Deposit {
  id: string;
  amount: number;
  status: string;
  screenshot_url: string;
  created_at: string;
}

type StatusFilter = 'all' | 'approved' | 'pending';

const statusPill = (status: string) => {
  if (status === 'success')
    return { label: 'Approved', cls: 'bg-primary/15 text-primary border border-primary/30' };
  if (status === 'failed')
    return { label: 'Rejected', cls: 'bg-destructive/15 text-destructive border border-destructive/30' };
  return { label: 'Pending', cls: 'bg-gaming-gold/15 text-gaming-gold border border-gaming-gold/30' };
};

const formatNum = (n: number) => new Intl.NumberFormat('my-MM').format(n);

export default function DepositHistory() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selected, setSelected] = useState<Deposit | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchDeposits = async () => {
      const { data } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setDeposits((data as Deposit[]) || []);
      setLoading(false);
    };
    fetchDeposits();
    const channel = supabase
      .channel('my-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${user.id}` }, () => fetchDeposits())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filtered = useMemo(() => {
    return deposits.filter((d) => {
      if (statusFilter === 'approved' && d.status !== 'success') return false;
      if (statusFilter === 'pending' && d.status !== 'processing') return false;
      if (dateFilter) {
        const dd = new Date(d.created_at);
        if (dd.toDateString() !== dateFilter.toDateString()) return false;
      }
      return true;
    });
  }, [deposits, statusFilter, dateFilter]);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending' },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-base">TopUp Order History</h1>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-8 px-3 text-xs bg-card border-border', !dateFilter && 'text-muted-foreground')}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {dateFilter ? format(dateFilter, 'dd MMM') : 'Date'}
              {dateFilter && (
                <X
                  className="h-3 w-3 ml-1.5"
                  onClick={(e) => { e.stopPropagation(); setDateFilter(undefined); }}
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="single" selected={dateFilter} onSelect={setDateFilter} initialFocus className={cn('p-3 pointer-events-auto')} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter pills */}
      <div className="px-4 pt-3 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold transition-colors',
              statusFilter === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pt-3 space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No deposits yet</p>
        ) : (
          filtered.map((d) => {
            const pill = statusPill(d.status);
            const dt = new Date(d.created_at);
            return (
              <button
                key={d.id}
                onClick={() => setSelected(d)}
                className="w-full text-left gaming-card rounded-xl p-3 flex items-center gap-3 hover:border-primary/50 transition-colors"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {format(dt, 'dd MMM yyyy')} • {format(dt, 'p')}
                  </p>
                  <p className="text-sm font-bold text-foreground">+{formatNum(d.amount)} MMK</p>
                </div>
                <span className={cn('px-3 py-1 rounded-full text-[10px] font-semibold', pill.cls)}>
                  {pill.label}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-border">
          {selected && (
            <>
              <div className="bg-primary text-primary-foreground px-5 py-3 flex items-center justify-between">
                <DialogTitle className="text-sm font-bold">
                  Order Detail - #{selected.id.slice(0, 6).toUpperCase()}
                </DialogTitle>
              </div>
              <div className="p-4 space-y-2.5">
                <DetailRow label="ORDER ID" value={`#${selected.id.slice(0, 8).toUpperCase()}`} />
                <DetailRow label="AMOUNT" value={`+${formatNum(selected.amount)} MMK`} valueClass="text-primary font-bold" />
                <DetailRow label="DATE" value={format(new Date(selected.created_at), 'dd MMM yyyy, p')} />
                <DetailRow label="STATUS" value={statusPill(selected.status).label} />
                {selected.screenshot_url && (
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Payment Slip
                    </p>
                    <div className="rounded-lg overflow-hidden bg-background">
                      <img
                        src={selected.screenshot_url}
                        alt="Payment slip"
                        className="w-full h-auto max-h-80 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
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
