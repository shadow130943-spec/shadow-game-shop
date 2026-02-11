import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Plus, User, LogOut, Banknote, History, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
            <div className="flex items-center gap-1 px-4 py-2.5 rounded-full bg-muted/80 border border-border">
              <span className="font-medium text-sm">
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
            <Button variant="ghost" size="icon" className="relative rounded-full bg-muted/80 border border-border h-11 w-11">
              <Bell className="h-5 w-5 text-foreground" />
            </Button>

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
                  <Link to="/deposit" className="block" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Banknote className="h-5 w-5 mr-2" /> Deposit
                    </Button>
                  </Link>
                  <Link to="/deposit-history" className="block" onClick={() => setMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <History className="h-5 w-5 mr-2" /> Deposit History
                    </Button>
                  </Link>
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
