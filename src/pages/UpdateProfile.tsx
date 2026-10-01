import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Camera, Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageProvider';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function phoneToEmail(phone: string) {
  return `${phone.replace(/[^0-9]/g, '')}@gametop.app`;
}

export default function UpdateProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const storedAvatar = useAvatarUrl(profile?.avatar_url);
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
    setPhone(profile?.phone || '');
  }, [profile?.name, profile?.phone]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const avatarSrc = localPreview || storedAvatar;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('err_image_type'));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t('err_image_size'));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: path })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      setLocalPreview(URL.createObjectURL(file));
      await refreshProfile();
      toast.success(t('ok_avatar_changed'));
    } catch (err: any) {
      toast.error(err.message || t('err_upload_failed'));
    }
    setUploading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      toast.error(t('err_name_short'));
      return;
    }
    if (trimmedPhone && !/^[0-9+\s-]{6,20}$/.test(trimmedPhone)) {
      toast.error(t('err_phone_invalid'));
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmedName, phone: trimmedPhone || null })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t('ok_profile_saved'));
    } catch (err: any) {
      toast.error(err.message || t('err_save_failed'));
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(t('err_current_password_required'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t('err_password_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('err_password_mismatch'));
      return;
    }

    setChangingPassword(true);
    try {
      const email = user?.email || (profile?.phone ? phoneToEmail(profile.phone) : '');
      if (!email) throw new Error(t('err_account_missing'));

      // Verify the current password before allowing any change.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        toast.error(t('err_current_password_wrong'));
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(t('ok_password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || t('err_password_change_failed'));
    }
    setChangingPassword(false);
  };

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center gap-3 px-4 py-3">
        <button type="button" aria-label={t('back')} onClick={() => navigate('/account')} className="rounded-md p-1.5 text-foreground hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{t('update_profile_title')}</h1>
      </header>

      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {/* Avatar */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile picture" className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-3xl font-bold text-primary">
                  {(profile?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-4 w-4" />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">{uploading ? t('avatar_uploading') : t('avatar_hint')}</p>
          </div>
        </section>

        {/* Details */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">{t('details_title')}</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="name">{t('field_name')}</Label>
              <Input id="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="border-border bg-muted" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">{t('field_phone')}</Label>
              <Input id="phone" value={phone} maxLength={20} inputMode="tel" onChange={(e) => setPhone(e.target.value)} className="border-border bg-muted" />
            </div>
            <Button type="submit" disabled={savingProfile} className="gaming-btn w-full border-0">
              {savingProfile ? t('saving') : t('save')}
            </Button>
          </form>
        </section>

        {/* Password */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">{t('password_title')}</h2>
          </div>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="relative min-w-0">
              <Input
                type={showPasswords ? 'text' : 'password'}
                placeholder={t('field_current_password')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-border bg-muted pr-10"
              />
              <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder={t('field_new_password')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-border bg-muted"
            />
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder={t('field_confirm_password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-border bg-muted"
            />
            <Button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="gaming-btn w-full border-0"
            >
              {changingPassword ? t('changing') : t('change')}
            </Button>
          </form>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
