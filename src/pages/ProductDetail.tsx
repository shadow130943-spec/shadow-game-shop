import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingCart, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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

// Games that need Server ID in addition to Game ID
const GAMES_WITH_SERVER_ID = ['Mobile Legends'];

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Order dialog state
  const [selectedItem, setSelectedItem] = useState<ProductItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [gameId, setGameId] = useState('');
  const [serverId, setServerId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [ordering, setOrdering] = useState(false);

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
          .select('wallet_balance')
          .eq('user_id', user.id)
          .single();
        if (profile) setWalletBalance(profile.wallet_balance);
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user]);

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  // Group items by category
  const groupedItems = items.reduce<Record<string, ProductItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(groupedItems);

  const needsServerId = product ? GAMES_WITH_SERVER_ID.includes(product.name) : false;

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
    setDialogOpen(true);
  };

  const handleOrder = async () => {
    if (!selectedItem || !user || !product) return;
    if (!gameId.trim()) {
      toast.error('Game Id ထည့်ပါ');
      return;
    }
    if (needsServerId && !serverId.trim()) {
      toast.error('Server Id ထည့်ပါ');
      return;
    }
    if (!confirmed) {
      toast.error('အချက်အလက်များမှန်ကန်ပါတယ် ကို အတည်ပြုပါ');
      return;
    }
    if (walletBalance < selectedItem.price) {
      toast.error('လက်ကျန်ငွေ မလုံလောက်ပါ');
      return;
    }
    setOrdering(true);
    try {
      // Deduct wallet balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance: walletBalance - selectedItem.price })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      // Create game order
      const { error: orderError } = await supabase
        .from('game_orders')
        .insert({
          user_id: user.id,
          product_id: product.id,
          product_item_id: selectedItem.id,
          product_name: product.name,
          item_name: selectedItem.name,
          price: selectedItem.price,
          game_id: gameId.trim(),
          server_id: needsServerId ? serverId.trim() : null,
        });
      if (orderError) throw orderError;

      setWalletBalance(walletBalance - selectedItem.price);
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
        <div className="animate-pulse font-gaming text-lg text-muted-foreground">Loading...</div>
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

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-gaming text-lg font-bold truncate flex-1 text-center">{product.name}</h1>
        <div className="text-sm font-semibold text-primary whitespace-nowrap">
          {formatBalance(walletBalance)} ကျပ်
        </div>
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
                <h2 className="font-gaming text-lg font-bold">{category}</h2>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {groupedItems[category].map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleItemClick(item)}
                    className="gaming-card rounded-xl p-3 cursor-pointer gaming-card-hover flex flex-col items-center text-center relative overflow-hidden"
                  >
                    {/* Order badge */}
                    <div className="absolute top-1 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-l-md">
                      မှာမည်ရပါ
                    </div>

                    {/* Item icon/number */}
                    <div className="absolute top-1 left-1 flex items-center gap-0.5">
                      <span className="text-xs font-bold text-foreground">1</span>
                      <ShoppingCart className="h-3 w-3 text-primary" />
                    </div>

                    {/* Image */}
                    <div className="w-16 h-16 mt-4 mb-2 flex items-center justify-center">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <p className="text-xs font-semibold text-foreground leading-tight mb-1 line-clamp-2">
                      {item.name}
                    </p>

                    {/* Price */}
                    <p className="text-sm font-bold text-foreground">
                      {formatBalance(item.price)} ကျပ်
                    </p>
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
            {/* Account Info */}
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link2 className="h-4 w-4" />
              {needsServerId ? 'Account Info' : 'Game Id'}
            </div>

            {needsServerId ? (
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Game Id"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground font-bold">(</span>
                <Input
                  placeholder="Server Id"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  className="flex-1"
                />
                <span className="text-muted-foreground font-bold">)</span>
              </div>
            ) : (
              <Input
                placeholder="Game Id"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
              />
            )}

            {/* Selected item info */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-1">ပမာဏ</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">
                  {selectedItem?.name}
                </div>
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-semibold">
                  {selectedItem ? formatBalance(selectedItem.price) : 0} ကျပ်
                </div>
              </div>
            </div>

            {/* Wallet balance */}
            <div className="bg-primary/10 rounded-lg px-4 py-3 text-sm font-semibold text-center">
              လက်ကျန်ငွေ = {formatBalance(walletBalance)} ကျပ်
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm-order"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <label htmlFor="confirm-order" className="text-sm font-semibold text-destructive cursor-pointer">
                အချက်အလက်များမှန်ကန်ပါတယ်
              </label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="outline"
                className="rounded-full px-6"
                onClick={() => setDialogOpen(false)}
              >
                မဝယ်သေးပါ
              </Button>
              <Button
                className="rounded-full px-6"
                onClick={handleOrder}
                disabled={ordering}
              >
                {ordering ? 'မှာယူနေပါသည်...' : 'ဝယ်မည်'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
