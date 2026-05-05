import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Send, ArrowLeft, Percent, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Stats {
  userCount: number;
  successCount: number;
  totalAmount: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  user_code: string | null;
  wallet_balance: number;
  created_at: string;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ userCount: 0, successCount: 0, totalAmount: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transferCode, setTransferCode] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverVerified, setServerVerified] = useState(false);

  const callAdmin = async (action: string, params: Record<string, any> = {}) => {
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action, ...params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const loadData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        callAdmin('get_stats'),
        callAdmin('get_all_users'),
      ]);
      setStats(statsData);
      setUsers(usersData.users || []);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      if (!loading) navigate('/');
      return;
    }

    const verifyAndLoad = async () => {
      try {
        await callAdmin('verify_admin');
        setServerVerified(true);
        await loadData();
      } catch {
        navigate('/');
      }
    };

    verifyAndLoad();
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferLoading(true);
    try {
      const result = await callAdmin('transfer', {
        user_code: transferCode,
        amount: parseFloat(transferAmount),
      });
      toast.success(`Transferred ${transferAmount} ကျပ် to ${result.user_name}`);
      setTransferCode('');
      setTransferAmount('');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setTransferLoading(false);
  };

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse font-gaming text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!serverVerified) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5 mr-2" /> Home
          </Button>
          <h1 className="font-gaming text-lg font-bold text-primary">Admin Dashboard</h1>
          <div />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 bg-muted">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LayoutDashboard className="h-4 w-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-4 w-4 mr-2" /> Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="gaming-card rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Users</p>
                <p className="font-gaming text-3xl font-bold text-primary">{stats.userCount}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="gaming-card rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Successful Transactions</p>
                <p className="font-gaming text-3xl font-bold text-gaming-success">{stats.successCount}</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="gaming-card rounded-xl p-5">
                <p className="text-muted-foreground text-sm">Total Amount</p>
                <p className="font-gaming text-3xl font-bold text-gaming-gold">{formatBalance(stats.totalAmount)} ကျပ်</p>
              </motion.div>
            </div>

            {/* Direct Transfer */}
            <div className="gaming-card rounded-xl p-6">
              <h2 className="font-gaming text-lg font-bold mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Direct Transfer
              </h2>
              <form onSubmit={handleTransfer} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-1">
                  <Label>User Code</Label>
                  <Input
                    placeholder="GT123456"
                    value={transferCode}
                    onChange={(e) => setTransferCode(e.target.value)}
                    required
                    className="bg-muted border-border"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label>Amount (ကျပ်)</Label>
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    required
                    min="1"
                    className="bg-muted border-border"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={transferLoading} className="gaming-btn border-0 px-8">
                    {transferLoading ? 'Sending...' : 'Transfer'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Profit Settings link */}
            <div className="gaming-card rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Percent className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-gaming font-bold">Profit Settings</h3>
                  <p className="text-xs text-muted-foreground">API ဈေးပေါ်ကို Global / Game / Package margin ထည့်ရန်</p>
                </div>
              </div>
              <Button onClick={() => navigate('/admin/profit-settings')} className="gaming-btn border-0">
                Manage
              </Button>
            </div>

            {/* Payment Methods link */}
            <div className="gaming-card rounded-xl p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-gaming font-bold">Payment Methods</h3>
                  <p className="text-xs text-muted-foreground">Wave Pay / KBZ Pay စတဲ့ ငွေလွှဲနည်းများ ပြင်ရန်</p>
                </div>
              </div>
              <Button onClick={() => navigate('/admin/payment-methods')} className="gaming-btn border-0">
                Manage
              </Button>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="gaming-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>User Code</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-primary font-mono">{u.user_code}</TableCell>
                      <TableCell>{u.phone}</TableCell>
                      <TableCell className="font-semibold">{formatBalance(u.wallet_balance)} ကျပ်</TableCell>
                      <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
