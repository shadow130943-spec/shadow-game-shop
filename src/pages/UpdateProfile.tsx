import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Camera, Eye, EyeOff, Lock, Mail, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageProvider';
import { OtpField } from '@/components/OtpField';
import { otpCall } from '@/lib/otpAuth';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];


export default function UpdateProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const storedAvatar = useAvatarUrl(profile?.avatar_url);
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [otp, setOtp] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setName(profile?.name || '');
  }, [profile?.name]);

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
    if (trimmedName.length < 2 || trimmedName.length > 60) {
      toast.error(t('err_name_short'));
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: trimmedName })
        .eq('user_id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success(t('ok_profile_saved'));
    } catch (err: any) {
      toast.error(err.message || t('err_save_failed'));
    }
    setSavingProfile(false);
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) || next.length > 255) {
      toast.error(t('email_invalid'));
      return;
    }
    if (next === (user?.email || '').toLowerCase()) {
      toast.error(t('err_email_same'));
      return;
    }
    if (!/^\d{6}$/.test(emailOtp)) {
      toast.error(t('otp_invalid_length'));
      return;
    }
    setChangingEmail(true);
    try {
      await otpCall({ action: 'change_email', new_email: next, otp_code: emailOtp });
      await supabase.auth.refreshSession();
      await refreshProfile();
      setNewEmail('');
      setEmailOtp('');
      toast.success(t('ok_email_changed'));
    } catch (err: any) {
      toast.error(err.message || t('err_email_change_failed'));
    }
    setChangingEmail(false);
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

    if (otp.length !== 6) {
      toast.error(t('otp_invalid_length'));
      return;
    }
    setChangingPassword(true);
    try {
      await otpCall({ action: 'change_password', old_password: currentPassword, new_password: newPassword, otp_code: otp });
      toast.success(t('ok_password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
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
                <img src={avatarSrc} alt={t('update_profile_title')} className="h-24 w-24 rounded-full object-cover" />
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
              <Label htmlFor="email">{t('field_email')}</Label>
              <Input id="email" value={user?.email || ''} readOnly className="border-border bg-muted/50 text-muted-foreground" />
            </div>
            <Button type="submit" disabled={savingProfile} className="gaming-btn w-full border-0">
              {savingProfile ? t('saving') : t('save')}
            </Button>
          </form>
        </section>

        {/* Email change */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-foreground">{t('email_change_otp')}</h2>
          </div>
          <form onSubmit={handleChangeEmail} className="flex flex-col gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">{t('field_new_email')}</Label>
              <Input id="new-email" type="email" autoComplete="email" maxLength={255} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="you@gmail.com" className="border-border bg-muted" />
            </div>
            <p className="text-xs text-muted-foreground">{t('current_email_hint')}: {user?.email}</p>
            <OtpField email={user?.email || ''} value={emailOtp} onChange={setEmailOtp} toCurrentUser />
            <Button type="submit" disabled={changingEmail || !newEmail} className="gaming-btn w-full border-0">
              {changingEmail ? t('saving') : t('save')}
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
              <button type="button" aria-label={t('password_toggle')} onClick={() => setShowPasswords(!showPasswords)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
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
            <OtpField email={user?.email || ''} value={otp} onChange={setOtp} toCurrentUser />
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
