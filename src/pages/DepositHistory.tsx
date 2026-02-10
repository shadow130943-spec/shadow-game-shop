import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Deposit {
  id: string;
  amount: number;
  status: string;
  screenshot_url: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  processing: { label: 'လုပ်ဆောင်နေဆဲ', icon: Clock, className: 'text-gaming-gold' },
  success: { label: 'Success', icon: CheckCircle, className: 'text-gaming-success' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-destructive' },
};

export default function DepositHistory() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
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

    // Realtime subscription
    const channel = supabase
      .channel('my-deposits')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'deposits',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchDeposits();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(0_30%_12%)] to-[hsl(0_40%_18%)]">
      <div className="px-4 py-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Button>

        <h1 className="font-gaming text-xl font-bold text-center mb-6">Deposit History</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : deposits.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No deposits yet</p>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            {deposits.map((d) => {
              const config = statusConfig[d.status] || statusConfig.processing;
              const Icon = config.icon;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="gaming-card rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{formatBalance(d.amount)} ကျပ်</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1 ${config.className}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
