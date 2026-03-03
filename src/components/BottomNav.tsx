import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Mail, User, LogOut, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  is_read: boolean;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, is_read')
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (data) setNotifications(data as Notification[]);
    };
    fetchNotifs();

    const channel = supabase
      .channel('bottomnav-notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => { fetchNotifs(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const navItems = [
    { icon: Home, label: 'Shop', path: '/', onClick: () => navigate('/') },
    {
      icon: Mail,
      label: 'Message',
      path: '/notifications',
      onClick: () => navigate('/notifications'),
      badge: unreadCount,
    },
    {
      icon: User,
      label: 'Account',
      path: '#menu',
      onClick: () => setMenuOpen(prev => !prev),
    },
  ];

  return (
    <>
      {/* Menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-16 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg rounded-t-2xl shadow-lg"
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
                  <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg">
        <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const isActive = item.path !== '#menu' && location.pathname === item.path;
            const isMenuActive = item.path === '#menu' && menuOpen;
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors relative ${
                  isActive || isMenuActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
