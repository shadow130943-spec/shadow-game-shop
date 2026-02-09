import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Wallet, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('my-MM').format(balance);
  };

  return (
    <header className="sticky top-0 z-50 w-full gaming-gradient border-b border-border backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="font-gaming text-xl font-bold text-primary gaming-glow-text"
            >
              GAME<span className="text-foreground">TOP</span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                {/* Wallet Balance */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg gaming-card"
                >
                  <Wallet className="h-4 w-4 text-gaming-gold" />
                  <span className="font-medium">
                    {formatBalance(profile?.wallet_balance || 0)} ကျပ်
                  </span>
                </motion.div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] flex items-center justify-center">
                    3
                  </span>
                </Button>

                {/* User Menu */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <User className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{profile?.name || 'User'}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="gaming-btn border-0">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              {user ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg gaming-card">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <span className="font-medium">{profile?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gaming-gold">
                      <Wallet className="h-4 w-4" />
                      <span>{formatBalance(profile?.wallet_balance || 0)} ကျပ်</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Sign Out
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
