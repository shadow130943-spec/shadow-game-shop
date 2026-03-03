import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';

export default function Account() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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
      <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-border">
        <div className="bg-muted p-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
            {(profile?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg text-foreground">{profile?.name || 'User'}</h2>
            <p className="text-sm text-muted-foreground">{formatBalance(profile?.wallet_balance || 0)} ကျပ်</p>
          </div>
        </div>

        <div className="p-4 space-y-2 text-sm">
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

      {/* Actions */}
      <div className="mx-4 mt-4 space-y-3">
        {isAdmin && (
          <Button variant="outline" className="w-full justify-start text-primary" onClick={() => navigate('/admin')}>
            <Shield className="h-5 w-5 mr-2" /> Admin Dashboard
          </Button>
        )}

        <Button variant="outline" className="w-full justify-start border-destructive/50 text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
          <LogOut className="h-5 w-5 mr-2" /> Logout
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
