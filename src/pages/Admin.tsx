import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ClipboardList, Users, Send, ArrowLeft, CheckCircle, XCircle, Eye, History, Gamepad2, Package, Pencil, Bot, RefreshCw, Zap, Copy, ScanText } from 'lucide-react';
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

interface AdminProduct {
  id: string;
  name: string;
  image_url: string | null;
  category: string;
}

interface AdminProductItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  sort_order: number;
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
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [adminProductItems, setAdminProductItems] = useState<AdminProductItem[]>([]);
  const [editingItem, setEditingItem] = useState<AdminProductItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [botHealth, setBotHealth] = useState<any[]>([]);
  const [botRuns, setBotRuns] = useState<any[]>([]);
  const [ocrLoading, setOcrLoading] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);

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
      const [statsData, depositsData, usersData, historyData, gameOrdersData, gameHistoryData, productsData] = await Promise.all([
        callAdmin('get_stats'),
        callAdmin('get_pending_deposits'),
        callAdmin('get_all_users'),
        callAdmin('get_order_history'),
        callAdmin('get_pending_game_orders'),
        callAdmin('get_game_order_history'),
        callAdmin('get_products_with_items'),
      ]);
      setStats(statsData);
      setDeposits(depositsData.deposits || []);
      setUsers(usersData.users || []);
      setOrderHistory(historyData.orders || []);
      setGameOrders(gameOrdersData.orders || []);
      setGameOrderHistory(gameHistoryData.orders || []);
      setAdminProducts(productsData.products || []);
      setAdminProductItems(productsData.items || []);
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
        loadBotData();
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

  const handleUpdatePrice = async () => {
    if (!editingItem) return;
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('စျေးနှုန်းမှားနေပါသည်');
      return;
    }
    setSavingPrice(true);
    try {
      await callAdmin('update_item_price', { item_id: editingItem.id, new_price: newPrice });
      toast.success(`${editingItem.name} စျေးနှုန်းပြောင်းပြီးပါပြီ`);
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSavingPrice(false);
  };

  const handleSyncPrices = async () => {
    setSyncingPrices(true);
    try {
      const { data, error } = await supabase.functions.invoke('price-sync');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Price sync complete! ${data.items_updated} items updated via ${data.bot_used}`);
      loadData();
      loadBotData();
    } catch (err: any) {
      toast.error(err.message || 'Price sync failed');
    }
    setSyncingPrices(false);
  };

  const loadBotData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('bot-status');
      if (error) throw error;
      setBotHealth(data?.bot_health || []);
      setBotRuns(data?.bot_runs || []);
    } catch (err) {
      console.error('Failed to load bot data:', err);
    }
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
          <TabsList className="w-full grid grid-cols-8 bg-muted">
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
            <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Package className="h-4 w-4 mr-1" /> Products
            </TabsTrigger>
            <TabsTrigger value="bots" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
              <Bot className="h-4 w-4 mr-1" /> Bots
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

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {adminProducts.map((product) => {
              const productItems = adminProductItems.filter(i => i.product_id === product.id);
              const grouped = productItems.reduce<Record<string, AdminProductItem[]>>((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {});

              return (
                <div key={product.id} className="gaming-card rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {product.image_url && (
                      <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <h2 className="font-gaming text-lg font-bold">{product.name}</h2>
                    <span className="text-xs text-muted-foreground">({productItems.length} items)</span>
                  </div>

                  {Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="mb-4">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {items.map((item) => (
                          <div key={item.id} className="bg-muted rounded-lg p-3 flex flex-col items-center text-center gap-2">
                            <p className="text-xs font-semibold text-foreground line-clamp-2">{item.name}</p>
                            <p className="text-sm font-bold text-primary">{formatBalance(item.price)} ကျပ်</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                setEditingItem(item);
                                setEditPrice(String(item.price));
                              }}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Price
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {productItems.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No items</p>
                  )}
                </div>
              );
            })}

            {adminProducts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No products found</div>
            )}
          </TabsContent>

          {/* Bots & Price Sync Tab */}
          <TabsContent value="bots" className="space-y-6">
            {/* Price Sync Action */}
            <div className="gaming-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-gaming text-lg font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" /> Dynamic Price Sync
                </h2>
                <Button
                  onClick={handleSyncPrices}
                  disabled={syncingPrices}
                  className="gaming-btn border-0"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingPrices ? 'animate-spin' : ''}`} />
                  {syncingPrices ? 'Syncing...' : 'Update Prices from Provider'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Provider စျေးနှုန်းကို scrape လုပ်ပြီး 5% profit margin ထည့်ကာ database ကို update လုပ်ပါမယ်။
                Bot 4 ခုပါပြီး failover system ရှိပါတယ်။
              </p>
            </div>

            {/* Bot Health Status */}
            <div className="gaming-card rounded-xl p-5">
              <h2 className="font-gaming text-lg font-bold mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" /> Bot Health Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {botHealth.map((bot: any) => (
                  <div key={bot.bot_index} className="bg-muted rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-foreground">Bot {bot.bot_index}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{bot.name}</p>
                      {bot.last_run && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last: {new Date(bot.last_run.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`w-3 h-3 rounded-full ${bot.is_healthy ? 'bg-green-500 shadow-[0_0_8px_hsl(145_70%_45%/0.6)]' : 'bg-red-500 shadow-[0_0_8px_hsl(0_84%_60%/0.6)]'}`} />
                      <span className="text-xs text-muted-foreground">{bot.error_count} errors</span>
                    </div>
                  </div>
                ))}
                {botHealth.length === 0 && (
                  <p className="text-muted-foreground text-sm col-span-2 text-center py-4">No bot data yet. Run a price sync first.</p>
                )}
              </div>
            </div>

            {/* Bot Run History */}
            <div className="gaming-card rounded-xl overflow-hidden">
              <div className="p-4">
                <h2 className="font-gaming text-lg font-bold">Run History</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items Updated</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {botRuns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No bot runs yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    botRuns.map((run: any) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-sm font-medium">Bot {run.bot_index}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            run.status === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : run.status === 'running'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {run.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{run.items_updated || 0}</TableCell>
                        <TableCell className="text-xs text-destructive max-w-[150px] truncate">{run.error_message || '—'}</TableCell>
                        <TableCell className="text-sm">{new Date(run.created_at).toLocaleString()}</TableCell>
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

      {/* Price Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-gaming">စျေးနှုန်းပြောင်းရန်</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editingItem.name}</p>
              <div className="space-y-1">
                <Label>စျေးနှုန်းအသစ် (ကျပ်)</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  min="0"
                  className="bg-muted border-border"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                <Button onClick={handleUpdatePrice} disabled={savingPrice} className="gaming-btn border-0">
                  {savingPrice ? 'Saving...' : 'Save Price'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Dialog with OCR */}
      <Dialog open={!!screenshotUrl} onOpenChange={() => { setScreenshotUrl(null); setOcrResult(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-gaming">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {screenshotUrl && (
            <div className="space-y-3">
              <img src={screenshotUrl} alt="Payment screenshot" className="w-full rounded-lg" />
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={ocrLoading === screenshotUrl}
                  onClick={async () => {
                    setOcrLoading(screenshotUrl);
                    setOcrResult(null);
                    try {
                      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
                        body: { screenshot_path: screenshotUrl },
                      });
                      if (error) throw error;
                      setOcrResult(data?.transaction_id || 'NOT_FOUND');
                    } catch (err: any) {
                      toast.error('OCR failed: ' + (err.message || 'Unknown error'));
                    }
                    setOcrLoading(null);
                  }}
                >
                  <ScanText className="h-4 w-4 mr-1" />
                  {ocrLoading === screenshotUrl ? 'Scanning...' : 'Extract Transaction ID'}
                </Button>
                {ocrResult && ocrResult !== 'NOT_FOUND' && (
                  <div className="flex items-center gap-1 bg-muted px-3 py-1 rounded-lg">
                    <span className="text-sm font-mono text-primary">{ocrResult}</span>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(ocrResult); toast.success('Copied!'); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {ocrResult === 'NOT_FOUND' && (
                  <span className="text-sm text-muted-foreground">Transaction ID not found</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
