import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Globe, Gamepad2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Margin {
  id: string;
  scope: 'global' | 'game' | 'package';
  game_code: string | null;
  catalogue_name: string | null;
  margin_percent: number;
}

interface GameOption {
  game_code: string;
  game_name: string;
  packages: { catalogue_name: string }[];
}

const callAdmin = async (action: string, params: Record<string, any> = {}) => {
  const { data, error } = await supabase.functions.invoke('admin-actions', { body: { action, ...params } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export default function AdminProfitSettings() {
  const navigate = useNavigate();
  const [margins, setMargins] = useState<Margin[]>([]);
  const [games, setGames] = useState<GameOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  // form state
  const [scope, setScope] = useState<'global' | 'game' | 'package'>('global');
  const [gameCode, setGameCode] = useState('');
  const [catalogueName, setCatalogueName] = useState('');
  const [pct, setPct] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [mres, pres] = await Promise.all([
        callAdmin('list_profit_margins'),
        supabase.functions.invoke('shadow-gameshop', { body: { action: 'listProducts' } }),
      ]);
      setMargins(mres.margins || []);
      const gameList = (pres.data?.games || []).map((g: any) => ({
        game_code: g.game_code,
        game_name: g.game_name,
        packages: (g.packages || []).map((p: any) => ({ catalogue_name: p.catalogue_name })),
      }));
      setGames(gameList);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        await callAdmin('verify_admin');
        setVerified(true);
        await load();
      } catch {
        navigate('/');
      }
    })();
  }, []);

  const handleSave = async () => {
    const value = parseFloat(pct);
    if (isNaN(value) || value < 0) { toast.error('Margin % မမှန်ပါ'); return; }
    if (scope !== 'global' && !gameCode) { toast.error('Game ရွေးပါ'); return; }
    if (scope === 'package' && !catalogueName) { toast.error('Package ရွေးပါ'); return; }

    setSaving(true);
    try {
      await callAdmin('upsert_profit_margin', {
        scope,
        game_code: scope === 'global' ? null : gameCode,
        catalogue_name: scope === 'package' ? catalogueName : null,
        margin_percent: value,
      });
      toast.success('သိမ်းပြီးပါပြီ');
      setPct('');
      setCatalogueName('');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ဖျက်မှာ သေချာပါသလား?')) return;
    try {
      await callAdmin('delete_profit_margin', { id });
      toast.success('Deleted');
      await load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const selectedGame = games.find(g => g.game_code === gameCode);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>;
  }
  if (!verified) return null;

  const scopeIcon = (s: string) => s === 'global' ? <Globe className="h-4 w-4" /> : s === 'game' ? <Gamepad2 className="h-4 w-4" /> : <Package className="h-4 w-4" />;

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5 mr-2" /> Back
          </Button>
          <h1 className="font-gaming text-lg font-bold text-primary">Profit Settings</h1>
          <div />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="gaming-card rounded-xl p-5 space-y-4">
          <h2 className="font-gaming text-lg font-bold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Set / Update Margin
          </h2>
          <p className="text-xs text-muted-foreground">
            အဆင့်: <b>Package</b> &gt; <b>Game</b> &gt; <b>Global</b>. တိကျသော override က အရင်အလုပ်လုပ်ပါမယ်။
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v: any) => { setScope(v); setGameCode(''); setCatalogueName(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌐 Global</SelectItem>
                  <SelectItem value="game">🎮 Game</SelectItem>
                  <SelectItem value="package">📦 Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scope !== 'global' && (
              <div className="space-y-1">
                <Label>Game</Label>
                <Select value={gameCode} onValueChange={(v) => { setGameCode(v); setCatalogueName(''); }}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {games.map(g => (
                      <SelectItem key={g.game_code} value={g.game_code}>{g.game_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === 'package' && (
              <div className="space-y-1">
                <Label>Package</Label>
                <Select value={catalogueName} onValueChange={setCatalogueName} disabled={!selectedGame}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {(selectedGame?.packages || []).map(p => (
                      <SelectItem key={p.catalogue_name} value={p.catalogue_name}>{p.catalogue_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Margin %</Label>
              <Input type="number" step="0.1" min="0" placeholder="e.g. 5" value={pct} onChange={(e) => setPct(e.target.value)} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gaming-btn border-0">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save margin'}
          </Button>
        </div>

        <div className="gaming-card rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-gaming font-bold">Active Margins</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Margin</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {margins.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No margins yet</TableCell></TableRow>
              )}
              {margins.map((m) => (
                <TableRow key={m.id}>
                  <TableCell><span className="inline-flex items-center gap-1 capitalize">{scopeIcon(m.scope)} {m.scope}</span></TableCell>
                  <TableCell>{m.game_code || '—'}</TableCell>
                  <TableCell>{m.catalogue_name || '—'}</TableCell>
                  <TableCell className="font-semibold text-primary">+{Number(m.margin_percent)}%</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
