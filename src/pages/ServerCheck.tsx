import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageProvider';

type Any = Record<string, any>;

const pick = (o: Any | undefined, keys: string[]) => {
  if (!o) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

const label = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ServerCheck() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [id, setId] = useState('');
  const [zone, setZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Any | null>(null);
  const [error, setError] = useState('');

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!/^\d{3,15}$/.test(id.trim())) return setError(t('enter_game_id'));
    if (!/^\d{1,8}$/.test(zone.trim())) return setError(t('enter_server_id'));
    setLoading(true);
    const { data, error: err } = await supabase.functions.invoke('mlbb-check', { body: { id: id.trim(), zone: zone.trim() } });
    setLoading(false);
    if (err || !data || data.status === 'error' || data.success === false) {
      setError(data?.message || t('system_error'));
      return;
    }
    setResult(data);
  };

  const d: Any = result?.data ?? result?.result ?? result ?? {};
  const name = pick(d, ['username', 'name', 'nickname', 'player_name', 'in_game_name']);
  const region = pick(d, ['region', 'country', 'region_name', 'create_role_country']);
  const stats = pick(d, ['double_diamond_stats']) ?? pick(result ?? undefined, ['double_diamond_stats']);

  const renderStats = () => {
    if (stats === undefined) return null;
    if (Array.isArray(stats)) {
      return stats.map((s, i) => (
        <div key={i} className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
          {typeof s === 'object'
            ? Object.entries(s).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><span className="text-muted-foreground">{label(k)}</span><span className="font-semibold text-foreground">{String(v)}</span></div>
              ))
            : String(s)}
        </div>
      ));
    }
    if (typeof stats === 'object') {
      return Object.entries(stats).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{label(k)}</span>
          <span className="font-semibold text-foreground">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ));
    }
    return <p className="text-sm text-foreground">{String(stats)}</p>;
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3">
        <button type="button" aria-label={t('back')} onClick={() => navigate('/account')} className="rounded-md p-1.5 text-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('menu_server_check')}</h1>
      </header>
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <form onSubmit={check} className="grid gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Mobile Legends</p>
          <div className="flex gap-2">
            <Input inputMode="numeric" placeholder="Game ID" value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, ''))} className="flex-1 bg-muted border-border" />
            <Input inputMode="numeric" placeholder="Server ID" value={zone} onChange={(e) => setZone(e.target.value.replace(/\D/g, ''))} className="w-28 bg-muted border-border" />
          </div>
          <Button type="submit" disabled={loading} className="gaming-btn border-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="mr-2 h-4 w-4" />{t('server_check_button')}</>}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {result && (
          <section className="grid gap-2 rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{t('account_name')}</span><span className="font-bold text-secondary">{name ?? '—'}</span></div>
            <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{t('server_region')}</span><span className="font-semibold text-foreground">{region ?? '—'}</span></div>
            {stats !== undefined && (
              <>
                <p className="mt-2 text-sm font-semibold text-foreground">{t('double_diamond_stats')}</p>
                {renderStats()}
              </>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
