import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Link2, Globe, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Package {
  product_id: string;
  catalogue_name: string;
  price_usd: number;
  price_mmk: number;
  reseller_price_mmk: number;
  hidden?: boolean;
}

interface GameData {
  game_code: string;
  game_name: string;
  packages: Package[];
}

const GAMES_WITH_SERVER_ID = ['mlbb', 'magic_chess_gogo'];

const SERVERS = [
  { value: 'global', label: 'Global' },
  { value: 'malaysia', label: 'Malaysia' },
  { value: 'philippine', label: 'Philippine' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'indonesia', label: 'Indonesia' },
];

const CURRENCIES = [
  { value: 'mmk', label: 'မြန်မာကျပ် 🇲🇲' },
  { value: 'usd', label: 'USD 💵' },
];

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>(); // id = game_code
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<GameData | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isReseller, setIsReseller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState('global');
  const [selectedCurrency, setSelectedCurrency] = useState('mmk');

  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameId, setGameId] = useState('');
  const [serverId, setServerId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const [checkedName, setCheckedName] = useState<string | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameCheckSuccess, setNameCheckSuccess] = useState(false);

  const needsServerId = id ? GAMES_WITH_SERVER_ID.includes(id) : false;

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('shadow-gameshop', {
        body: { action: 'listProducts' },
      });
      if (error || !data?.success) {
        toast.error('ပစ္စည်းများ ဆွဲထုတ်၍မရပါ');
      } else {
        const found = (data.games || []).find((g: GameData) => g.game_code === id);
        if (found) setGame(found);
      }

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, is_reseller')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setWalletBalance(profile.wallet_balance);
          setIsReseller(profile.is_reseller || false);
        }
      }
      setLoading(false);
    };
    load();
  }, [id, user]);

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const getMmkPrice = (pkg: Package) => pkg.price_mmk;
  const formatPrice = (pkg: Package) => {
    if (selectedCurrency === 'usd') return `$${pkg.price_usd.toFixed(2)}`;
    return `${formatBalance(getMmkPrice(pkg))} ကျပ်`;
  };

  useEffect(() => {
    setCheckedName(null);
    setNameCheckSuccess(false);
  }, [gameId, serverId]);

  const handlePackageClick = (pkg: Package) => {
    if (!user) {
      toast.error('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ');
      navigate('/login');
      return;
    }
    setSelectedPkg(pkg);
    setGameId('');
    setServerId('');
    setConfirmed(false);
    setCheckedName(null);
    setNameCheckSuccess(false);
    setDialogOpen(true);
  };

  const handleNameCheck = async () => {
    if (!game) return;
    if (!gameId.trim()) { toast.error('Game Id ထည့်ပါ'); return; }
    if (needsServerId && !serverId.trim()) { toast.error('Server Id ထည့်ပါ'); return; }

    setNameCheckLoading(true);
    setCheckedName(null);
    setNameCheckSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('shadow-gameshop', {
        body: {
          action: 'checkPlayerId',
          game: game.game_code,
          user_id: gameId.trim(),
          server_id: needsServerId ? serverId.trim() : '',
        },
      });
      if (error) throw new Error(error.message || 'API error');

      if (data?.valid === 'valid' && data?.name) {
        setCheckedName(data.name);
        setNameCheckSuccess(true);
        toast.success(`အကောင့်အမည်: ${data.name}`);
      } else {
        toast.error(data?.message || 'အကောင့် ရှာမတွေ့ပါ');
      }
    } catch (err: any) {
      console.error('[checkPlayerId] error:', err);
      toast.error(err.message || 'API ချိတ်ဆက်မှု မအောင်မြင်ပါ');
    }
    setNameCheckLoading(false);
  };

  const handleOrder = async () => {
    if (!selectedPkg || !user || !game) return;
    if (!gameId.trim()) { toast.error('Game Id ထည့်ပါ'); return; }
    if (needsServerId && !serverId.trim()) { toast.error('Server Id ထည့်ပါ'); return; }
    if (!nameCheckSuccess) { toast.error('အကောင့်အမည် အရင်စစ်ဆေးပါ'); return; }
    if (!confirmed) { toast.error('အချက်အလက်များမှန်ကန်ပါတယ် ကို အတည်ပြုပါ'); return; }

    const finalPrice = getMmkPrice(selectedPkg);
    if (walletBalance < finalPrice) { toast.error('လက်ကျန်ငွေ မလုံလောက်ပါ'); return; }

    setOrdering(true);
    try {
      const { data, error } = await supabase.functions.invoke('shadow-gameshop', {
        body: {
          action: 'placeOrder',
          game: game.game_code,
          catalogue_name: selectedPkg.catalogue_name,
          player_id: gameId.trim(),
          server_id: needsServerId ? serverId.trim() : '',
          price_usd: selectedPkg.price_usd,
        },
      });
      // Edge function returned a non-2xx (e.g. 402 insufficient reseller balance).
      // Body is in error.context — try to extract its message.
      if (error) {
        let serverMsg = error.message || 'API error';
        try {
          const ctxBody = await (error as any).context?.json?.();
          if (ctxBody?.message) serverMsg = ctxBody.message;
        } catch { /* ignore */ }
        throw new Error(serverMsg);
      }
      if (!data?.success) throw new Error(data?.message || 'Order failed');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance - finalPrice })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      const { error: orderError } = await supabase.from('game_orders').insert({
        user_id: user.id,
        product_name: game.game_name,
        item_name: selectedPkg.catalogue_name,
        price: finalPrice,
        game_id: gameId.trim(),
        server_id: needsServerId ? serverId.trim() : null,
      });
      if (orderError) throw orderError;

      supabase.functions.invoke('notify-admins', {
        body: { product_name: game.game_name, item_name: selectedPkg.catalogue_name, price: finalPrice, game_id: gameId.trim() },
      }).catch((e) => console.error('Push notify error:', e));

      setWalletBalance(walletBalance - finalPrice);
      toast.success(data.message || `${selectedPkg.catalogue_name} မှာယူပြီးပါပြီ!`);
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'မှာယူ၍မရပါ');
    }
    setOrdering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Game not found</p>
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const visiblePackages = game.packages.filter((p) => !p.hidden && p.price_mmk > 0);
  const buyButtonDisabled = ordering || !nameCheckSuccess;

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold truncate flex-1 text-center text-foreground">{game.game_name}</h1>
        <div className="text-sm font-semibold text-primary whitespace-nowrap">
          {formatBalance(walletBalance)} ကျပ်
        </div>
      </div>

      {needsServerId && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">ဆာဗာရွေးချယ်ရန်</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVERS.map((server) => (
              <button
                key={server.value}
                onClick={() => setSelectedServer(server.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedServer === server.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border border-border text-foreground hover:border-primary/50'
                }`}
              >
                {server.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4">
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 py-4">
        {visiblePackages.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>ပစ္စည်းများ မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {visiblePackages.map((pkg) => (
              <motion.div
                key={pkg.product_id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={() => handlePackageClick(pkg)}
                className="gaming-card rounded-xl p-3 cursor-pointer gaming-card-hover flex flex-col items-center text-center"
              >
                <div className="w-14 h-14 mb-2 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-xs font-medium text-foreground leading-tight mb-1 line-clamp-2">
                  {pkg.catalogue_name}
                </p>
                <p className="text-sm font-bold text-primary">{formatPrice(pkg)}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogTitle className="text-center text-lg font-bold bg-muted -mx-6 -mt-6 px-6 py-4 rounded-t-2xl">
            အချက်အလက်များဖြည့်သွင်းပါ
          </DialogTitle>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4" />
              {needsServerId ? 'Account Info' : 'Player Id'}
            </div>

            {needsServerId ? (
              <div className="flex items-center gap-1">
                <Input placeholder="Game Id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground font-bold">(</span>
                <Input placeholder="Server Id" value={serverId} onChange={(e) => setServerId(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground font-bold">)</span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNameCheck}
                  disabled={nameCheckLoading || !gameId.trim() || !serverId.trim()}
                  className="shrink-0 h-9 w-9"
                >
                  {nameCheckLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle className={`h-5 w-5 ${nameCheckSuccess ? 'text-green-400' : 'text-muted-foreground'}`} />
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input placeholder="Player Id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="flex-1" />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNameCheck}
                  disabled={nameCheckLoading || !gameId.trim()}
                  className="shrink-0 h-9 w-9"
                >
                  {nameCheckLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle className={`h-5 w-5 ${nameCheckSuccess ? 'text-green-400' : 'text-muted-foreground'}`} />
                  )}
                </Button>
              </div>
            )}

            {checkedName && nameCheckSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg px-4 py-2 text-center"
                style={{
                  color: '#ff00ff',
                  textShadow: '0 0 8px rgba(255, 0, 255, 0.6), 0 0 20px rgba(255, 0, 255, 0.3)',
                  background: 'rgba(255, 0, 255, 0.08)',
                  border: '1px solid rgba(255, 0, 255, 0.25)',
                }}
              >
                <p className="text-xs text-muted-foreground mb-0.5">အကောင့်အမည်</p>
                <p className="text-base font-bold">{checkedName}</p>
              </motion.div>
            )}

            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">ပမာဏ</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">{selectedPkg?.catalogue_name}</div>
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">
                  {selectedPkg ? formatPrice(selectedPkg) : '0 ကျပ်'}
                </div>
              </div>
            </div>

            <div className="bg-primary/10 rounded-lg px-4 py-3 text-sm font-semibold text-center">
              လက်ကျန်ငွေ = {formatBalance(walletBalance)} ကျပ်
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="confirm-order" checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} />
              <label htmlFor="confirm-order" className="text-sm font-semibold text-destructive cursor-pointer">
                အချက်အလက်များမှန်ကန်ပါတယ်
              </label>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" className="rounded-full px-6" onClick={() => setDialogOpen(false)}>
                မဝယ်သေးပါ
              </Button>
              <Button
                className={`rounded-full px-6 border-0 ${buyButtonDisabled ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'gaming-btn'}`}
                onClick={handleOrder}
                disabled={buyButtonDisabled}
              >
                {ordering ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    မှာယူနေပါသည်...
                  </span>
                ) : 'ဝယ်မည်'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
