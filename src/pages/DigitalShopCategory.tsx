import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, ShoppingCart, Info, Zap } from 'lucide-react';
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
  const [comments, setComments] = useState('');
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

  const isCommentService = useMemo(() => {
    if (!selectedService) return false;
    const name = selectedService.name.toLowerCase();
    const cat = selectedService.category.toLowerCase();
    return name.includes('comment') || cat.includes('comment');
  }, [selectedService]);

  const effectiveQuantity = useMemo(() => {
    if (isCommentService) {
      return comments.split('\n').filter(l => l.trim()).length;
    }
    const qty = parseInt(quantity);
    return isNaN(qty) || qty <= 0 ? 0 : qty;
  }, [isCommentService, comments, quantity]);

  const totalPrice = useMemo(() => {
    if (!selectedService || effectiveQuantity <= 0) return 0;
    return Math.ceil((selectedService.selling_rate / 1000) * effectiveQuantity);
  }, [selectedService, effectiveQuantity]);

  const handleOrder = async () => {
    if (!user) {
      toast.error('ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ');
      navigate('/login');
      return;
    }
    if (!selectedService || !link.trim()) {
      toast.error('အချက်အလက်အားလုံး ဖြည့်ပါ');
      return;
    }
    if (effectiveQuantity <= 0) {
      toast.error('Quantity ထည့်ပါ');
      return;
    }
    if (effectiveQuantity < selectedService.min || effectiveQuantity > selectedService.max) {
      toast.error(`Quantity must be between ${selectedService.min} and ${selectedService.max}`);
      return;
    }

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
      const body: any = {
        action: 'add',
        service: selectedService.service_id,
        link: link.trim(),
        quantity: effectiveQuantity,
      };
      if (isCommentService) {
        body.comments = comments;
      }

      const { data, error } = await supabase.functions.invoke('shweboost-proxy', { body });

      if (error) throw error;

      if (data?.order) {
        await supabase.rpc('increment_wallet_balance', {
          p_user_id: user.id,
          p_amount: -totalPrice,
        });

        await supabase.from('digital_orders').insert({
          user_id: user.id,
          service_id: selectedService.service_id,
          service_name: selectedService.name,
          link: link.trim(),
          quantity: effectiveQuantity,
          charge: totalPrice,
          status: 'pending',
          external_order_id: String(data.order),
        });

        toast.success('အော်ဒါ အောင်မြင်ပါသည်!');
        setLink('');
        setQuantity('');
        setComments('');
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
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <Header />

      {/* Back + Title */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate('/digital-shop')} className="p-2 rounded-lg bg-white/5 border border-cyan-500/20 hover:border-cyan-400/50 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.1)]">
          <ArrowLeft className="h-4 w-4 text-cyan-400" />
        </button>
        <h1 className="text-lg font-bold text-white">{decodedCategory}</h1>
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
          {/* Service Selector - Glassmorphism Card */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-cyan-500/20 p-5 space-y-4 shadow-[0_0_30px_rgba(0,255,255,0.03)]">
            <label className="text-sm font-semibold text-cyan-300 tracking-wide">⚡ Service ရွေးပါ</label>
            <Select value={selectedServiceId} onValueChange={(v) => { setSelectedServiceId(v); setQuantity(''); setComments(''); }}>
              <SelectTrigger className="bg-white/5 border-cyan-500/20 text-white focus:border-cyan-400/60 focus:shadow-[0_0_10px_rgba(0,255,255,0.15)] transition-all">
                <SelectValue placeholder="Service ရွေးပါ..." />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-[#12121a] border-cyan-500/20">
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-gray-200 focus:bg-cyan-500/10 focus:text-cyan-300">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedService && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3"
              >
                {selectedService.description && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                    <Info className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-400">{selectedService.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-gray-500 block">Min</span>
                    <span className="font-bold text-white">{selectedService.min.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-gray-500 block">Max</span>
                    <span className="font-bold text-white">{selectedService.max.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-center">
                    <span className="text-gray-500 block">Rate/1K</span>
                    <span className="font-bold text-cyan-400">{selectedService.selling_rate.toLocaleString()}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Link Input */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-cyan-500/20 p-5 space-y-2 shadow-[0_0_30px_rgba(0,255,255,0.03)]">
            <label className="text-sm font-semibold text-cyan-300 tracking-wide">🔗 Link</label>
            <Input
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="bg-white/5 border-cyan-500/20 text-white placeholder:text-gray-600 focus:border-cyan-400/60 focus:shadow-[0_0_10px_rgba(0,255,255,0.15)]"
            />
          </div>

          {/* Comments or Quantity Input */}
          {isCommentService ? (
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-fuchsia-500/20 p-5 space-y-2 shadow-[0_0_30px_rgba(255,0,255,0.03)]">
              <label className="text-sm font-semibold text-fuchsia-300 tracking-wide">💬 Comments (1 per line)</label>
              <Textarea
                placeholder={"Comment 1\nComment 2\nComment 3"}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={5}
                className="bg-white/5 border-fuchsia-500/20 text-white placeholder:text-gray-600 focus:border-fuchsia-400/60 focus:shadow-[0_0_10px_rgba(255,0,255,0.15)] resize-none"
              />
              <p className="text-xs text-gray-500">
                Comments: <span className="text-fuchsia-400 font-bold">{effectiveQuantity}</span>
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-cyan-500/20 p-5 space-y-2 shadow-[0_0_30px_rgba(0,255,255,0.03)]">
              <label className="text-sm font-semibold text-cyan-300 tracking-wide">📊 Quantity</label>
              <Input
                type="number"
                placeholder={selectedService ? `${selectedService.min} - ${selectedService.max}` : 'Quantity'}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={selectedService?.min}
                max={selectedService?.max}
                className="bg-white/5 border-cyan-500/20 text-white placeholder:text-gray-600 focus:border-cyan-400/60 focus:shadow-[0_0_10px_rgba(0,255,255,0.15)]"
              />
            </div>
          )}

          {/* Live Total Charge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl overflow-hidden"
          >
            <div className="relative p-5 bg-gradient-to-r from-cyan-500/10 via-white/[0.02] to-fuchsia-500/10 border border-cyan-500/20 rounded-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05),transparent_70%)]" />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-gray-300">Total Charge</span>
                </div>
                <span className={`text-xl font-black transition-all ${totalPrice > 0 ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]' : 'text-gray-600'}`}>
                  {totalPrice.toLocaleString()} <span className="text-sm font-medium">MMK</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* Order Button - Magenta Accent */}
          <Button
            onClick={handleOrder}
            disabled={ordering || !selectedServiceId || !link.trim() || effectiveQuantity <= 0}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white font-bold text-base border border-fuchsia-400/30 shadow-[0_0_30px_rgba(255,0,255,0.2)] hover:shadow-[0_0_40px_rgba(255,0,255,0.35)] transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {ordering ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                Place Order
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
