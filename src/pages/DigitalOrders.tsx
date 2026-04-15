import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface DigitalOrder {
  id: string;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  external_order_id: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 shadow-[0_0_8px_rgba(234,179,8,0.15)]' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(0,255,255,0.15)]' },
  processing: { label: 'Processing', className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(0,255,255,0.15)]' },
  completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]' },
  partial: { label: 'Partial', className: 'bg-orange-500/10 text-orange-400 border-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.15)]' },
  canceled: { label: 'Canceled', className: 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]' },
};

const DigitalOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<DigitalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('digital_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as DigitalOrder[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="min-h-screen bg-[#0a0a0f] pb-20">
      <Header />

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-cyan-400" />
          <h1 className="text-lg font-bold text-white">My Orders</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-cyan-400 hover:bg-cyan-500/10"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">မှာယူထားခြင်း မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => {
              const sc = getStatusConfig(order.status);
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] p-4 space-y-3 hover:border-cyan-500/20 transition-all"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white leading-tight flex-1 line-clamp-2">
                      {order.service_name}
                    </h3>
                    <Badge className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${sc.className}`}>
                      {sc.label}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <span className="text-gray-500 block">Qty</span>
                      <span className="font-bold text-white">{order.quantity.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <span className="text-gray-500 block">Charge</span>
                      <span className="font-bold text-cyan-400">{order.charge.toLocaleString()}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 text-center">
                      <span className="text-gray-500 block">ID</span>
                      <span className="font-bold text-gray-300 text-[10px]">{order.external_order_id || '-'}</span>
                    </div>
                  </div>

                  {/* Link */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 overflow-hidden">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{order.link}</span>
                  </div>

                  {/* Date */}
                  <p className="text-[10px] text-gray-600">
                    {new Date(order.created_at).toLocaleString('my-MM')}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default DigitalOrders;
