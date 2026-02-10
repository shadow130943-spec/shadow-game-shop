import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Lock, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(phone, password);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back!');
      navigate('/');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 gaming-gradient">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Gamepad2 className="h-10 w-10 text-primary" />
            <span className="font-gaming text-3xl font-bold text-primary gaming-glow-text">
              GAME<span className="text-foreground">TOP</span>
            </span>
          </motion.div>
          <h1 className="font-gaming text-xl text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-1">Sign in to continue gaming</p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="gaming-card rounded-2xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="09xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10 bg-muted border-border"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full gaming-btn border-0 py-6 text-base font-semibold"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
