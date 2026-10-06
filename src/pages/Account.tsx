import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarUrl } from '@/hooks/useAvatarUrl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  LogOut,
  Shield,
  Clock,
  UserRound,
  IdCard,
  Store,
  Globe,
  FileText,
  Share2,
  Headphones,
  Info,
  Copy,
  Check,
  ChevronRight,
  Send,
  MessageCircle,
  Phone,
  Server,
} from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { TopBuyers } from '@/components/TopBuyers';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { toast } from 'sonner';
import { Lang, useLanguage } from '@/i18n/LanguageProvider';

const LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'MM', label: 'မြန်မာ (Myanmar)' },
];

const TELEGRAM_SUPPORT = 'https://t.me/Mgkaung2222010';

export default function Account() {
  const { user, profile, isAdmin, isReseller, signOut } = useAuth();
  const navigate = useNavigate();
  const avatarUrl = useAvatarUrl(profile?.avatar_url);
  const { lang: language, setLang, t, formatMmk } = useLanguage();

  const [copied, setCopied] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const comingSoon = () => toast(t('coming_soon'));

  const copyUserId = async () => {
    if (!profile?.user_code) return;
    try {
      await navigator.clipboard.writeText(profile.user_code);
      setCopied(true);
      toast.success(t('copied_user_id'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('copy_failed'));
    }
  };

  const pickLanguage = (code: Lang) => {
    setLang(code);
    setLanguageOpen(false);
  };

  if (!user) {
    return (
      <div className="account-page flex min-h-dvh flex-col bg-background">
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          <p className="text-muted-foreground mb-2">{t('account_login_required')}</p>
          <Button className="w-full max-w-xs gaming-btn border-0" onClick={() => navigate('/login')}>{t('login')}</Button>
          <Button variant="outline" className="w-full max-w-xs" onClick={() => navigate('/signup')}>{t('signup')}</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const shortUserId = profile?.user_code ? `@${profile.user_code}` : '—';

  const menuItems = [
    { key: 'update', icon: UserRound, label: t('menu_update_profile'), onClick: () => navigate('/update-profile') },
    { key: 'top-buyers', icon: Store, label: t('menu_top_buyers'), onClick: () => navigate('/top-buyers') },
    { key: 'server-check', icon: Server, label: t('menu_server_check'), onClick: () => navigate('/server-check') },
    { key: 'reseller', icon: Store, label: t('menu_reseller'), onClick: comingSoon },
    { key: 'language', icon: Globe, label: t('menu_language'), value: language, onClick: () => setLanguageOpen(true) },
    { key: 'privacy', icon: FileText, label: t('menu_privacy'), onClick: comingSoon },
    { key: 'share', icon: Share2, label: t('menu_share'), onClick: comingSoon },
    { key: 'contact', icon: Headphones, label: t('menu_contact'), onClick: () => setContactOpen(true) },
    { key: 'about', icon: Info, label: t('menu_about'), onClick: comingSoon },
  ];

  return (
    <div className="account-page min-h-dvh bg-background">
      <main className="mx-auto grid w-full max-w-md gap-4 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4">
        {/* Profile Card */}
        <section className="account-surface overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-4 p-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile picture"
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-xl font-bold text-primary">
                {(profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h2 className="truncate text-lg font-bold text-foreground">{profile?.name || 'User'}</h2>
                {isAdmin && <VerifiedBadge className="h-[18px] w-[18px]" />}
              </div>
              <p className="text-sm font-semibold text-primary">{formatMmk(profile?.wallet_balance || 0)}</p>
            </div>
          </div>

          <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gaming-gold" />
            <span className="text-xs leading-5 text-muted-foreground">{t('account_service_hours')}</span>
          </div>

          <div className="space-y-2 px-4 pb-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">{t('field_email')}</span>
              <span className="break-all text-right font-medium text-foreground">{user?.email || '—'}</span>
            </div>
          </div>
        </section>

        {/* Dashboard shortcuts */}
        {(isAdmin || isReseller) && (
          <section className="account-surface flex flex-col gap-2">
            <Button
              variant="outline"
              className={`h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left ${isAdmin ? 'border-primary/30 text-primary' : 'border-secondary/30 text-secondary'}`}
              onClick={() => navigate('/admin')}
            >
              <Shield className="mr-2 h-5 w-5 shrink-0" /> {isAdmin ? t('account_admin_dashboard') : t('account_reseller_dashboard')}
            </Button>
          </section>
        )}

        {/* Menu list */}
        <section className="account-surface flex flex-col gap-2">
          {/* User ID with copy */}
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <IdCard className="h-5 w-5 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{t('menu_user_id')}</span>
            <span className="ml-auto max-w-[45%] truncate text-sm text-muted-foreground">{shortUserId}</span>
            <button
              type="button"
              aria-label={t('copy_user_id')}
              onClick={copyUserId}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-secondary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {menuItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60"
            >
              <item.icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
              <span className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                {'value' in item && item.value ? <span>{item.value}</span> : null}
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-left transition-colors hover:bg-destructive/20"
          >
            <LogOut className="h-5 w-5 shrink-0 text-destructive" />
            <span className="text-sm font-semibold text-destructive">{t('menu_logout')}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-destructive" />
          </button>
        </section>

        {/* Top Buyers */}
        <section className="account-surface">
          <TopBuyers />
        </section>
      </main>

      {/* Contact Us modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-xs rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('menu_contact')}</DialogTitle>
            <DialogDescription>{t('contact_pick')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={comingSoon}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/60"
            >
              <Phone className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Viber</span>
            </button>
            <button
              type="button"
              onClick={comingSoon}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/60"
            >
              <MessageCircle className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-foreground">Whatsapp</span>
            </button>
            <a
              href={TELEGRAM_SUPPORT}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/60"
            >
              <Send className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Telegram</span>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language modal */}
      <Dialog open={languageOpen} onOpenChange={setLanguageOpen}>
        <DialogContent className="max-w-xs rounded-xl">
          <DialogHeader>
            <DialogTitle>{t('menu_language')}</DialogTitle>
            <DialogDescription>{t('language_pick')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => pickLanguage(lang.code as Lang)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  language === lang.code ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted/60'
                }`}
              >
                <span className="text-sm font-medium text-foreground">{lang.label}</span>
                {language === lang.code && <Check className="ml-auto h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout confirmation */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="max-w-xs rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logout_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('logout_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('confirm_logout')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
}
