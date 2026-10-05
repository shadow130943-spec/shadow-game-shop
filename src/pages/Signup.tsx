import { useLanguage } from '@/i18n/LanguageProvider';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { OtpField } from '@/components/OtpField';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(t('err_password_short'));
      return;
    }

    if (password !== confirm) {
      toast.error(t('err_password_mismatch'));
      return;
    }
    if (otp.length !== 6) {
      toast.error(t('otp_invalid_length'));
      return;
    }
    setLoading(true);

    const { error } = await signUp(email, password, name, otp);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('account_created'));
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
          <h1 className="font-gaming text-xl text-foreground">{t('auth_create')}</h1>
          <p className="text-muted-foreground mt-1">{t('auth_join_hint')}</p>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="gaming-card rounded-2xl p-6 space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="name">{t('field_name')}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder={t('field_name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('field_email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('field_password')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
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
            <p className="text-xs text-muted-foreground">{t('password_min_hint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">{t('field_confirm_password_short')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirm"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="pl-10 bg-muted border-border"
              />
            </div>
          </div>

          <OtpField email={email} value={otp} onChange={setOtp} />

          <Button
            type="submit"
            disabled={loading}
            className="w-full gaming-btn border-0 py-6 text-base font-semibold"
          >
            {loading ? t('creating_account') : t('auth_create')}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t('have_account')}{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              {t('login')}
            </Link>
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
