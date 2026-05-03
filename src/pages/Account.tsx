import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogOut, Shield, History, Gamepad2, Lock, Eye, EyeOff, Clock, ExternalLink } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { TopBuyers } from '@/components/TopBuyers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Account() {
  const { user, profile, isAdmin, signOut } = useAuth();
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
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4 pb-20">
          <p className="text-muted-foreground mb-2">အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်</p>
          <Button className="w-full max-w-xs gaming-btn border-0" onClick={() => navigate('/login')}>Login</Button>
          <Button variant="outline" className="w-full max-w-xs" onClick={() => navigate('/signup')}>Sign Up</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const formatBalance = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile Card */}
      <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-border bg-card">
        <div className="p-4 flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
            {(profile?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg text-foreground">{profile?.name || 'User'}</h2>
            <p className="text-sm text-primary font-semibold">{formatBalance(profile?.wallet_balance || 0)} ကျပ်</p>
          </div>
        </div>

        {/* Service Hours */}
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-muted/50 border border-border flex items-center gap-2">
          <Clock className="h-4 w-4 text-gaming-gold shrink-0" />
          <span className="text-xs text-muted-foreground">ဝန်ဆောင်မှုအချိန် - နံနက် ၉ နာရီ မှ ည ၁၀ နာရီ</span>
        </div>

        <div className="px-4 pb-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-medium text-foreground">{profile?.user_code || '—'}</span>
          </div>
          {profile?.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">ဖုန်းနံပါတ်</span>
              <span className="font-medium text-foreground">{profile.phone}</span>
            </div>
          )}
        </div>
      </div>

      {/* Telegram Links */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-2">
        <a href="https://t.me/ykgaming2392024" target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 transition-colors">
          <ExternalLink className="h-5 w-5 text-secondary" />
          <span className="text-[10px] text-secondary font-medium">Channel</span>
        </a>
        <a href="https://t.me/Mgkaung2222010" target="_blank" rel="noopener noreferrer"
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-secondary/30 bg-secondary/10 hover:bg-secondary/20 transition-colors">
          <ExternalLink className="h-5 w-5 text-secondary" />
          <span className="text-[10px] text-secondary font-medium">Account</span>
        </a>
      </div>

      {/* Actions */}
      <div className="mx-4 mt-4 space-y-2">
        {isAdmin && (
          <Button variant="outline" className="w-full justify-start text-primary border-primary/30" onClick={() => navigate('/admin')}>
            <Shield className="h-5 w-5 mr-2" /> Admin Dashboard
          </Button>
        )}
        <Button variant="outline" className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" /> Logout
        </Button>
      </div>

      {/* Change Password */}
      <div className="mx-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="font-bold text-foreground">စကားဝှက်ပြောင်းရန်</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="relative">
              <Input
                type={showPasswords ? 'text' : 'password'}
                placeholder="လက်ရှိစကားဝှက်"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-muted border-border pr-10"
              />
              <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
        </div>
      </div>

      {/* Top Buyers */}
      <div className="mx-4 mt-6">
        <TopBuyers />
      </div>

      <BottomNav />
    </div>
  );
}
