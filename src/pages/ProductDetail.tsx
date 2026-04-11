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

interface ProductItem {
  id: string;
  category: string;
  name: string;
  price: number;
  image_url: string | null;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  image_url: string | null;
}

const REPLIT_API_BASE = 'https://3e974ca8-e680-465e-ab44-9a44f94305ea-00-2ydkonjceaflg.janeway.replit.dev';
const REPLIT_API_KEY = 'Shadow1309434872';

const GAMES_WITH_SERVER_ID = ['Mobile Legends'];
const PUBG_NAMES = ['PUBG', 'PUBG Mobile', 'PUBG MOBILE'];

const SERVERS = [
  { value: 'global', label: 'Global' },
  { value: 'malaysia', label: 'Malaysia' },
  { value: 'philippine', label: 'Philippine' },
  { value: 'singapore', label: 'Singapore' },
  { value: 'indonesia', label: 'Indonesia' },
];

const CURRENCIES = [
  { value: 'mmk', label: 'မြန်မာကျပ် 🇲🇲', rate: 1 },
  { value: 'myr', label: 'မလေးRM 🇲🇾', rate: 0.0014 },
];

function getGameType(productName: string): 'mlbb' | 'pubg' | null {
  if (GAMES_WITH_SERVER_ID.includes(productName)) return 'mlbb';
  if (PUBG_NAMES.some(n => productName.toLowerCase().includes(n.toLowerCase()))) return 'pubg';
  return null;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isReseller, setIsReseller] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState('global');
  const [selectedCurrency, setSelectedCurrency] = useState('mmk');

  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameId, setGameId] = useState('');
  const [serverId, setServerId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);

  // Name check state
  const [checkedName, setCheckedName] = useState<string | null>(null);
  const [nameCheckLoading, setNameCheckLoading] = useState(false);
  const [nameCheckSuccess, setNameCheckSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const [productRes, itemsRes] = await Promise.all([
        supabase.from('products').select('id, name, image_url').eq('id', id).single(),
        supabase.from('product_items').select('*').eq('product_id', id).eq('is_active', true).order('sort_order'),
      ]);
      if (productRes.data) setProduct(productRes.data);
      if (itemsRes.data) setItems(itemsRes.data as ProductItem[]);
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
    fetchData();
  }, [id, user]);

  const RESELLER_DISCOUNT = 0.97;
  const getPrice = (price: number) => isReseller ? Math.floor(price * RESELLER_DISCOUNT) : price;
  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const currencyRate = CURRENCIES.find(c => c.value === selectedCurrency)?.rate || 1;
  const formatPrice = (price: number) => {
    const converted = price * currencyRate;
    if (selectedCurrency === 'mmk') return `${formatBalance(Math.round(converted))} ကျပ်`;
    return `RM ${converted.toFixed(2)}`;
  };

  const groupedItems = items.reduce<Record<string, ProductItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
  const categories = Object.keys(groupedItems);
  const needsServerId = product ? GAMES_WITH_SERVER_ID.includes(product.name) : false;
  const gameType = product ? getGameType(product.name) : null;
  const supportsNameCheck = gameType !== null;

  const handleItemClick = (item: ProductItem) => {
    if (!user) {
      toast.error('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ');
      navigate('/login');
      return;
    }
    setSelectedItem(item);
    setGameId('');
    setServerId('');
    setConfirmed(false);
    setCheckedName(null);
    setNameCheckSuccess(false);
    setDialogOpen(true);
  };

  // Reset name check when IDs change
  useEffect(() => {
    setCheckedName(null);
    setNameCheckSuccess(false);
  }, [gameId, serverId]);

  const handleNameCheck = async () => {
    console.log('[NameCheck] triggered', { product: product?.name, gameType, gameId, serverId });
    if (!product || !gameType) return;
    if (!gameId.trim()) { toast.error('Game Id ထည့်ပါ'); return; }
    if (gameType === 'mlbb' && !serverId.trim()) { toast.error('Server Id ထည့်ပါ'); return; }

    setNameCheckLoading(true);
    setCheckedName(null);
    setNameCheckSuccess(false);

    try {
      if (gameType === 'mlbb') {
        // Use Apify proxy edge function for MLBB
        const { data, error } = await supabase.functions.invoke('apify-proxy', {
          body: { mode: 'check', userId: gameId.trim(), zoneId: serverId.trim() },
        });
        console.log('[NameCheck] apify-proxy response:', { data, error });

        if (error) throw new Error(error.message || 'Edge function error');
        if (data?.success === true && data?.name) {
          setCheckedName(data.name);
          setNameCheckSuccess(true);
          toast.success(`အကောင့်အမည်: ${data.name}`);
        } else {
          toast.error(data?.message || 'အကောင့် ရှာမတွေ့ပါ');
        }
      } else {
        // Use Replit API for PUBG
        const payload = { game: gameType, game_id: gameId.trim(), server_id: '' };
        const res = await fetch(`${REPLIT_API_BASE}/api/check-name`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-KEY': REPLIT_API_KEY },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        console.log('[NameCheck] replit response:', { status: res.status, data });

        if (data.success === true && data.name) {
          setCheckedName(data.name);
          setNameCheckSuccess(true);
          toast.success(`အကောင့်အမည်: ${data.name}`);
        } else {
          toast.error(data.message || 'အကောင့် ရှာမတွေ့ပါ');
        }
      }
    } catch (err: any) {
      console.error('[NameCheck] error:', err);
      toast.error('API ချိတ်ဆက်မှု မအောင်မြင်ပါ');
    }
    setNameCheckLoading(false);
  };

  const handleOrder = async () => {
    if (!selectedItem || !user || !product) return;
    if (!gameId.trim()) { toast.error('Game Id ထည့်ပါ'); return; }
    if (needsServerId && !serverId.trim()) { toast.error('Server Id ထည့်ပါ'); return; }
    if (supportsNameCheck && !nameCheckSuccess) { toast.error('အကောင့်အမည် အရင်စစ်ဆေးပါ'); return; }
    if (!confirmed) { toast.error('အချက်အလက်များမှန်ကန်ပါတယ် ကို အတည်ပြုပါ'); return; }
    const finalPrice = getPrice(selectedItem.price);
    if (walletBalance < finalPrice) { toast.error('လက်ကျန်ငွေ မလုံလောက်ပါ'); return; }
    setOrdering(true);
    try {
      // Call Replit buy API if supported
      if (gameType) {
        const buyPayload = {
          game: gameType,
          game_id: gameId.trim(),
          server_id: gameType === 'mlbb' ? serverId.trim() : '',
          product_key: selectedItem.name,
          pmethod: 'usecoin',
        };

        const buyRes = await fetch(`${REPLIT_API_BASE}/api/buy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': REPLIT_API_KEY,
          },
          body: JSON.stringify(buyPayload),
        });

        const buyData = await buyRes.json();
        if (!buyData.success) {
          throw new Error(buyData.message || 'API purchase failed');
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance - finalPrice })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      const { error: orderError } = await supabase
        .from('game_orders')
        .insert({
          user_id: user.id,
          product_id: product.id,
          product_item_id: selectedItem.id,
          product_name: product.name,
          item_name: selectedItem.name,
          price: finalPrice,
          game_id: gameId.trim(),
          server_id: needsServerId ? serverId.trim() : null,
        });
      if (orderError) throw orderError;

      supabase.functions.invoke('notify-admins', {
        body: { product_name: product.name, item_name: selectedItem.name, price: finalPrice, game_id: gameId.trim() },
      }).catch(err => console.error('Push notify error:', err));

      setWalletBalance(walletBalance - finalPrice);
      toast.success(`${selectedItem.name} မှာယူပြီးပါပြီ!`);
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

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Product not found</p>
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </div>
    );
  }

  const buyButtonDisabled = ordering || (supportsNameCheck && !nameCheckSuccess);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold truncate flex-1 text-center text-foreground">{product.name}</h1>
        <div className="text-sm font-semibold text-primary whitespace-nowrap">
          {formatBalance(walletBalance)} ကျပ်
        </div>
      </div>

      {/* Server Selection */}
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

      {/* Currency Selection */}
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

      {/* Categories & Items */}
      <div className="px-4 py-4 space-y-6">
        {categories.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>ပစ္စည်းများ မရှိသေးပါ</p>
          </div>
        ) : (
          categories.map((category, catIdx) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {catIdx + 1}
                </span>
                <h2 className="text-base font-bold text-foreground">{category}</h2>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {groupedItems[category].map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleItemClick(item)}
                    className="gaming-card rounded-xl p-3 cursor-pointer gaming-card-hover flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 mb-2 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-foreground leading-tight mb-1 line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-primary">
                      {formatPrice(getPrice(item.price))}
                    </p>
                    {isReseller && (
                      <p className="text-[10px] text-muted-foreground line-through">
                        {formatPrice(item.price)}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogTitle className="text-center text-lg font-bold bg-muted -mx-6 -mt-6 px-6 py-4 rounded-t-2xl">
            အချက်အလက်များဖြည့်သွင်းပါ
          </DialogTitle>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4" />
              {needsServerId ? 'Account Info' : 'Game Id'}
            </div>

            {needsServerId ? (
              <div className="flex items-center gap-1">
                <Input placeholder="Game Id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground font-bold">(</span>
                <Input placeholder="Server Id" value={serverId} onChange={(e) => setServerId(e.target.value)} className="flex-1" />
                <span className="text-muted-foreground font-bold">)</span>
                {supportsNameCheck && (
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
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Input placeholder="Game Id" value={gameId} onChange={(e) => setGameId(e.target.value)} className="flex-1" />
                {supportsNameCheck && (
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
                )}
              </div>
            )}

            {/* Name check result - magenta neon */}
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
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">{selectedItem?.name}</div>
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">
                  {selectedItem ? formatPrice(getPrice(selectedItem.price)) : '0 ကျပ်'}
                  {isReseller && <span className="text-[10px] text-muted-foreground ml-1">(-3%)</span>}
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
