import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ClipboardList, Users, Send, ArrowLeft, CheckCircle, XCircle, Eye, History, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Stats {
  userCount: number;
  successCount: number;
  totalAmount: number;
}

interface PendingDeposit {
  id: string;
  amount: number;
  screenshot_url: string;
  created_at: string;
  profiles: { name: string; user_code: string; phone: string } | null;
}

interface OrderHistory {
  id: string;
  amount: number;
  status: string;
  screenshot_url: string;
  created_at: string;
  updated_at: string;
  profiles: { name: string; user_code: string; phone: string } | null;
}

interface GameOrder {
  id: string;
  product_name: string;
  item_name: string;
  price: number;
  game_id: string;
  server_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  profiles: { name: string; user_code: string; phone: string } | null;
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
  const { user, isAdmin, session } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ userCount: 0, successCount: 0, totalAmount: 0 });
  const [deposits, setDeposits] = useState<PendingDeposit[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [gameOrders, setGameOrders] = useState<GameOrder[]>([]);
  const [gameOrderHistory, setGameOrderHistory] = useState<GameOrder[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [transferCode, setTransferCode] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
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
      const [statsData, depositsData, usersData, historyData, gameOrdersData, gameHistoryData] = await Promise.all([
        callAdmin('get_stats'),
        callAdmin('get_pending_deposits'),
        callAdmin('get_all_users'),
        callAdmin('get_order_history'),
        callAdmin('get_pending_game_orders'),
        callAdmin('get_game_order_history'),
      ]);
      setStats(statsData);
      setDeposits(depositsData.deposits || []);
      setUsers(usersData.users || []);
      setOrderHistory(historyData.orders || []);
      setGameOrders(gameOrdersData.orders || []);
      setGameOrderHistory(gameHistoryData.orders || []);
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

    const channel = supabase
      .channel('admin-all-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_orders' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleApprove = async (depositId: string) => {
    try {
      await callAdmin('approve_deposit', { deposit_id: depositId });
      toast.success('Deposit approved!');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReject = async (depositId: string) => {
    try {
      await callAdmin('reject_deposit', { deposit_id: depositId });
      toast.success('Deposit rejected');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleApproveGameOrder = async (orderId: string) => {
    try {
      await callAdmin('approve_game_order', { deposit_id: orderId });
      toast.success('Game order approved!');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRejectGameOrder = async (orderId: string) => {
    try {
      await callAdmin('reject_game_order', { deposit_id: orderId });
      toast.success('Game order rejected & refunded');
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
          <TabsList className="w-full grid grid-cols-6 bg-muted">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <LayoutDashboard className="h-4 w-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative text-xs">
              <ClipboardList className="h-4 w-4 mr-1" /> Deposits
              {deposits.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {deposits.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="game-orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative text-xs">
              <Gamepad2 className="h-4 w-4 mr-1" /> Games
              {gameOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {gameOrders.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <History className="h-4 w-4 mr-1" /> Dep History
            </TabsTrigger>
            <TabsTrigger value="game-history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Gamepad2 className="h-4 w-4 mr-1" /> Game History
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Users className="h-4 w-4 mr-1" /> Users
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
          </TabsContent>

          {/* Pending Deposit Orders Tab */}
          <TabsContent value="orders">
            <div className="gaming-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Screenshot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pending deposits
                      </TableCell>
                    </TableRow>
                  ) : (
                    deposits.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{d.profiles?.name}</p>
                            <p className="text-xs text-muted-foreground">{d.profiles?.user_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatBalance(d.amount)} ကျပ်</TableCell>
                        <TableCell className="text-sm">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setScreenshotUrl(d.screenshot_url)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApprove(d.id)} className="bg-gaming-success hover:bg-gaming-success/80 text-primary-foreground">
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(d.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Pending Game Orders Tab */}
          <TabsContent value="game-orders">
            <div className="gaming-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Game ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No pending game orders
                      </TableCell>
                    </TableRow>
                  ) : (
                    gameOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{o.profiles?.name}</p>
                            <p className="text-xs text-muted-foreground">{o.profiles?.user_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{o.product_name}</TableCell>
                        <TableCell className="text-sm">{o.item_name}</TableCell>
                        <TableCell className="font-semibold">{formatBalance(o.price)} ကျပ်</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{o.game_id}</span>
                          {o.server_id && <span className="text-xs text-muted-foreground ml-1">({o.server_id})</span>}
                        </TableCell>
                        <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleApproveGameOrder(o.id)} className="bg-gaming-success hover:bg-gaming-success/80 text-primary-foreground">
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRejectGameOrder(o.id)}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Deposit History Tab */}
          <TabsContent value="history">
            <div className="gaming-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Screenshot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No deposit history
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderHistory.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{o.profiles?.name}</p>
                            <p className="text-xs text-muted-foreground">{o.profiles?.user_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatBalance(o.amount)} ကျပ်</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            o.status === 'success' 
                              ? 'bg-gaming-success/20 text-gaming-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {o.status === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {o.status === 'success' ? 'Approved' : 'Rejected'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(o.updated_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => setScreenshotUrl(o.screenshot_url)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Game Order History Tab */}
          <TabsContent value="game-history">
            <div className="gaming-card rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Game ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gameOrderHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No game order history
                      </TableCell>
                    </TableRow>
                  ) : (
                    gameOrderHistory.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{o.profiles?.name}</p>
                            <p className="text-xs text-muted-foreground">{o.profiles?.user_code}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{o.product_name}</TableCell>
                        <TableCell className="text-sm">{o.item_name}</TableCell>
                        <TableCell className="font-semibold">{formatBalance(o.price)} ကျပ်</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{o.game_id}</span>
                          {o.server_id && <span className="text-xs text-muted-foreground ml-1">({o.server_id})</span>}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            o.status === 'success' 
                              ? 'bg-gaming-success/20 text-gaming-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {o.status === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                            {o.status === 'success' ? 'Approved' : 'Rejected'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(o.updated_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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

      {/* Screenshot Dialog */}
      <Dialog open={!!screenshotUrl} onOpenChange={() => setScreenshotUrl(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-gaming">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl && (
            <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
