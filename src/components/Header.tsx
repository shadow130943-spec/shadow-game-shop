import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Plus, User, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Fetch notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setNotifications(data as Notification[]);
    };

    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Mark all as read when popover opens
  const handleNotifOpen = async (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0 && user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('my-MM').format(balance);
  };

  return (
    <header className="w-full z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-muted/80 border border-border">
              <span className="font-medium text-xs sm:text-sm">
                {formatBalance(profile?.wallet_balance || 0)} ကျပ်
              </span>
              <Link to="/deposit">
                <Plus className="h-4 w-4 text-foreground" />
              </Link>
            </div>
          ) : (
            <Link to="/" className="font-gaming text-xl font-bold text-accent gaming-glow-text">
              GAME<span className="text-foreground">TOP</span>
            </Link>
          )}

          <div className="flex items-center gap-3">
            <Popover open={notifOpen} onOpenChange={handleNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full bg-muted/80 border border-border h-11 w-11">
                  <Bell className="h-5 w-5 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b border-border">
                  <h4 className="font-semibold text-sm">အသိပေးချက်များ</h4>
                </div>
                <ScrollArea className="max-h-72">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      အသိပေးချက် မရှိသေးပါ
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                          <p className="leading-relaxed">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString('my-MM')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl bg-gaming-gold text-background h-11 w-14 hover:bg-gaming-gold/90"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-background/95 backdrop-blur-lg"
          >
            <div className="px-4 py-4 space-y-3">
              {user ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-medium block">{profile?.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground">ID: {profile?.user_code}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" className="block" onClick={() => setMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start text-primary">
                        <Shield className="h-5 w-5 mr-2" /> Admin Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5 mr-2" /> Sign Out
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <Link to="/login" className="block" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full">Login</Button>
                  </Link>
                  <Link to="/signup" className="block" onClick={() => setMenuOpen(false)}>
                    <Button className="w-full gaming-btn border-0">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
