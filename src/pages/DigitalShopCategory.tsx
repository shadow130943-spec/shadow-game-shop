import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, ShoppingCart, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface Service {
  id: string;
  service_id: number;
  name: string;
  category: string;
  rate: number;
  selling_rate: number;
  min: number;
  max: number;
  description: string | null;
}

const DigitalShopCategory = () => {
  const { category } = useParams<{ category: string }>();
  const decodedCategory = decodeURIComponent(category || '');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [decodedCategory]);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category', decodedCategory)
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setServices(data as Service[]);
    }
    setLoading(false);
  };

  const selectedService = useMemo(
    () => services.find(s => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  const totalPrice = useMemo(() => {
    if (!selectedService || !quantity) return 0;
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return 0;
    // selling_rate is per 1000, so price = (selling_rate / 1000) * qty
    return Math.ceil((selectedService.selling_rate / 1000) * qty);
  }, [selectedService, quantity]);

  const handleOrder = async () => {
    if (!user) {
      toast.error('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ');
      navigate('/login');
      return;
    }
    if (!selectedService || !link.trim() || !quantity) {
      toast.error('အချက်အလက်အားလုံး ဖြည့်ပါ');
      return;
    }
    const qty = parseInt(quantity);
    if (qty < selectedService.min || qty > selectedService.max) {
      toast.error(`Quantity must be between ${selectedService.min} and ${selectedService.max}`);
      return;
    }

    // Check wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.wallet_balance < totalPrice) {
      toast.error('လက်ကျန်ငွေ မလုံလောက်ပါ');
      return;
    }

    setOrdering(true);
    try {
      const { data, error } = await supabase.functions.invoke('shweboost-proxy', {
        body: {
          action: 'add',
          service: selectedService.service_id,
          link: link.trim(),
          quantity: qty,
        },
      });

      if (error) throw error;

      if (data?.order) {
        // Deduct wallet balance
        const { error: deductErr } = await supabase.rpc('increment_wallet_balance', {
          p_user_id: user.id,
          p_amount: -totalPrice,
        });

        // Record as a game_order for tracking
        await supabase.from('game_orders').insert({
          user_id: user.id,
          game_id: link.trim(),
          server_id: String(data.order),
          product_id: selectedService.id,
          product_item_id: selectedService.id,
          product_name: decodedCategory,
          item_name: selectedService.name,
          price: totalPrice,
          status: 'processing',
        });

        toast.success('အော်ဒါ အောင်မြင်ပါသည်!');
        setLink('');
        setQuantity('');
        setSelectedServiceId('');
      } else {
        toast.error(data?.error || 'Order failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      {/* Back + Title */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate('/digital-shop')} className="p-2 rounded-lg bg-card border border-border/50 hover:border-cyan-500/40 transition-colors">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{decodedCategory}</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 space-y-4"
        >
          {/* Service Selector */}
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-4">
            <label className="text-sm font-semibold text-foreground">Service ရွေးပါ</label>
            <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
              <SelectTrigger className="bg-muted border-border/50 focus:border-cyan-500/50">
                <SelectValue placeholder="Service ရွေးပါ..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Service Details */}
            {selectedService && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                {selectedService.description && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                    <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{selectedService.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Min:</span>
                    <span className="ml-1 font-semibold text-foreground">{selectedService.min.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <span className="text-muted-foreground">Max:</span>
                    <span className="ml-1 font-semibold text-foreground">{selectedService.max.toLocaleString()}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-muted col-span-2">
                    <span className="text-muted-foreground">Rate (per 1000):</span>
                    <span className="ml-1 font-semibold text-cyan-400">{selectedService.selling_rate.toLocaleString()} MMK</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Link Input */}
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <label className="text-sm font-semibold text-foreground">Link</label>
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="bg-muted border-border/50 focus:border-cyan-500/50"
            />
          </div>

          {/* Quantity Input */}
          <div className="rounded-xl bg-card border border-border/50 p-4 space-y-2">
            <label className="text-sm font-semibold text-foreground">Quantity</label>
            <Input
              type="number"
              placeholder={selectedService ? `${selectedService.min} - ${selectedService.max}` : 'Quantity'}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={selectedService?.min}
              max={selectedService?.max}
              className="bg-muted border-border/50 focus:border-cyan-500/50"
            />
          </div>

          {/* Total Price */}
          {totalPrice > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 border border-cyan-500/20 p-4 flex justify-between items-center"
            >
              <span className="text-sm font-semibold text-foreground">စုစုပေါင်း</span>
              <span className="text-lg font-bold text-cyan-400">{totalPrice.toLocaleString()} MMK</span>
            </motion.div>
          )}

          {/* Order Button */}
          <Button
            onClick={handleOrder}
            disabled={ordering || !selectedServiceId || !link.trim() || !quantity}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-base border-0 shadow-lg shadow-cyan-500/20"
          >
            {ordering ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                ဝယ်မည်
              </>
            )}
          </Button>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default DigitalShopCategory;
