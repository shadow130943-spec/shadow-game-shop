import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  processing: { label: 'လုပ်ဆောင်နေဆဲ', icon: Clock, className: 'text-gaming-gold' },
  success: { label: 'Success', icon: CheckCircle, className: 'text-gaming-success' },
  failed: { label: 'Rejected', icon: XCircle, className: 'text-destructive' },
};

export default function GameOrderHistory() {
  const [orders, setOrders] = useState<GameOrder[]>([]);
  const [loading, setLoading] = useState(true);
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
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_orders',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(0_30%_12%)] to-[hsl(0_40%_18%)]">
      <div className="px-4 py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Button>

        <h1 className="font-gaming text-xl font-bold text-center mb-6">Game Order History</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No game orders yet</p>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            {orders.map((o) => {
              const config = statusConfig[o.status] || statusConfig.processing;
              const Icon = config.icon;
              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="gaming-card rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{o.product_name}</p>
                    <div className={`flex items-center gap-1 ${config.className}`}>
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{config.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.item_name}</p>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-muted-foreground">ID: {o.game_id}{o.server_id ? ` (${o.server_id})` : ''}</span>
                    <span className="font-medium">{formatBalance(o.price)} ကျပ်</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
