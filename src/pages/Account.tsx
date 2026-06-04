import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Shield, Lock, Eye, EyeOff, Clock, Send } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { TopBuyers } from '@/components/TopBuyers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Account() {
  const { user, profile, isAdmin, isReseller, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('စကားဝှက်အနည်းဆုံး ၆ လုံးရှိရပါမည်');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('စကားဝှက်အသစ်နှစ်ခု မတူညီပါ');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('စကားဝှက်ပြောင်းပြီးပါပြီ');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'စကားဝှက်ပြောင်း၍မရပါ');
    }
    setChangingPassword(false);
  };

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background">
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <p className="text-muted-foreground mb-2">အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်</p>
          <Button className="w-full max-w-xs gaming-btn border-0" onClick={() => navigate('/login')}>Login</Button>
          <Button variant="outline" className="w-full max-w-xs" onClick={() => navigate('/signup')}>Sign Up</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const dashboardActions = [
    ...(isAdmin
      ? [{ key: 'admin-dashboard', label: 'Admin Dashboard', path: '/admin', className: 'text-primary border-primary/30' }]
      : []),
    ...(!isAdmin && isReseller
      ? [{ key: 'reseller-dashboard', label: 'Reseller Dashboard', path: '/admin', className: 'text-secondary border-secondary/30' }]
      : []),
  ];

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">
        {/* Profile Card */}
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-xl font-bold text-primary">
              {(profile?.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-foreground">{profile?.name || 'User'}</h2>
              <p className="text-sm font-semibold text-primary">{formatBalance(profile?.wallet_balance || 0)} ကျပ်</p>
            </div>
          </div>

          {/* Service Hours */}
          <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gaming-gold" />
            <span className="text-xs leading-5 text-muted-foreground">ဝန်ဆောင်မှုအချိန် - နံနက် ၉ နာရီ မှ ည ၁၀ နာရီ</span>
          </div>

          <div className="space-y-2 px-4 pb-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">User ID</span>
              <span className="break-all text-right font-medium text-foreground">{profile?.user_code || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">ဖုန်းနံပါတ်</span>
              <span className="break-all text-right font-medium text-foreground">{profile?.phone || '—'}</span>
            </div>
          </div>
        </section>

        {/* Telegram Links */}
        <section className="grid grid-cols-2 gap-2">
          <a href="https://t.me/ykgaming2392024" target="_blank" rel="noopener noreferrer"
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-center transition-colors hover:bg-secondary/20">
            <Send className="h-5 w-5 text-secondary" />
            <span className="text-[10px] font-medium leading-4 text-secondary">Telegram Channel</span>
          </a>
          <a href="https://t.me/Mgkaung2222010" target="_blank" rel="noopener noreferrer"
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-xl border border-secondary/30 bg-secondary/10 p-3 text-center transition-colors hover:bg-secondary/20">
            <Send className="h-5 w-5 text-secondary" />
            <span className="text-[10px] font-medium leading-4 text-secondary">Telegram Support</span>
          </a>
        </section>

        {/* Actions */}
        <section className="flex flex-col gap-2">
          {dashboardActions.map((action) => (
            <Button
              key={action.key}
              variant="outline"
              className={`h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left ${action.className}`}
              onClick={() => navigate(action.path)}
            >
              <Shield className="mr-2 h-5 w-5 shrink-0" /> {action.label}
            </Button>
          ))}
          <Button variant="outline" className="h-auto min-h-11 w-full justify-start whitespace-normal border-destructive/50 py-2 text-left text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="mr-2 h-5 w-5 shrink-0" /> Logout
          </Button>
        </section>

        {/* Change Password */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 shrink-0 text-primary" />
            <h3 className="font-bold text-foreground">စကားဝှက်ပြောင်းရန်</h3>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="relative min-w-0">
              <Input
                type={showPasswords ? 'text' : 'password'}
                placeholder="လက်ရှိစကားဝှက်"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-muted border-border pr-10"
              />
              <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder="စကားဝှက်အသစ်"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted border-border"
            />
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder="စကားဝှက်အသစ် (ထပ်ရိုက်ပါ)"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted border-border"
            />
            <Button
              type="submit"
              disabled={changingPassword || !newPassword || !confirmPassword}
              className="w-full gaming-btn border-0"
            >
              {changingPassword ? 'ပြောင်းနေပါသည်...' : 'ပြောင်းမည်'}
            </Button>
          </form>
        </section>

        {/* Top Buyers */}
        <section>
          <TopBuyers />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
