import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export type Lang = 'EN' | 'MM';

type Dict = Record<string, { EN: string; MM: string }>;

export const translations: Dict = {
  // Global / nav
  app_name: { EN: 'YK Game Shop', MM: 'YK Game Shop' },
  nav_shop: { EN: 'Shop', MM: 'ဆိုင်' },
  nav_message: { EN: 'Message', MM: 'အကြောင်းကြားချက်' },
  nav_account: { EN: 'Account', MM: 'အကောင့်' },
  back: { EN: 'Back', MM: 'နောက်သို့' },
  loading: { EN: 'Loading...', MM: 'ခဏစောင့်ပါ...' },

  // Home
  home_topup: { EN: 'Add Funds', MM: 'ငွေဖြည့်မည်' },
  home_orders: { EN: 'My Orders', MM: 'အော်ဒါများ' },
  home_login: { EN: 'Login', MM: 'အကောင့်ဝင်ရန်' },
  home_signup: { EN: 'Sign Up', MM: 'အကောင့်သစ်ဖွင့်ရန်' },
  buy_now: { EN: 'Buy Now', MM: 'ဝယ်မည်' },
  home_no_games: { EN: 'No games found', MM: 'ဂိမ်းရှာမတွေ့ပါ' },
  home_no_games_hint: { EN: 'Try another search term', MM: 'တခြား search term နဲ့ ထပ်ကြိုးစားကြည့်ပါ' },
  search_placeholder: { EN: 'Search games...', MM: 'ဂိမ်းရှာရန်...' },
  game_mlbb: { EN: 'Mobile Legends', MM: 'Mobile Legends' },
  game_pubgm: { EN: 'PUBG Mobile', MM: 'PUBG Mobile' },
  game_telegram: { EN: 'Telegram', MM: 'Telegram' },
  game_magic_chess: { EN: 'Magic Chess Go Go', MM: 'Magic Chess Go Go' },
  game_freefire: { EN: 'Free Fire Global', MM: 'Free Fire Global' },

  // Account
  account_login_required: { EN: 'Please log in to continue', MM: 'အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်' },
  account_service_hours: {
    EN: 'Service hours - 9:00 AM to 10:00 PM',
    MM: 'ဝန်ဆောင်မှုအချိန် - နံနက် ၉ နာရီ မှ ည ၁၀ နာရီ',
  },
  account_phone: { EN: 'Phone number', MM: 'ဖုန်းနံပါတ်' },
  account_admin_dashboard: { EN: 'Admin Dashboard', MM: 'Admin Dashboard' },
  account_reseller_dashboard: { EN: 'Reseller Dashboard', MM: 'Reseller Dashboard' },
  menu_user_id: { EN: 'User ID', MM: 'User ID' },
  menu_update_profile: { EN: 'Update Profile', MM: 'ပရိုဖိုင် ပြင်ဆင်ရန်' },
  menu_top_buyers: { EN: 'Top Buyers', MM: 'ထိပ်တန်းဝယ်ယူသူများ' },
  menu_reseller: { EN: 'Register Reseller Account', MM: 'Reseller အကောင့် ဖွင့်ရန်' },
  menu_language: { EN: 'Language', MM: 'ဘာသာစကား' },
  menu_privacy: { EN: 'Privacy Policy', MM: 'ကိုယ်ရေးအချက်အလက် မူဝါဒ' },
  menu_share: { EN: 'Share App', MM: 'App မျှဝေရန်' },
  menu_contact: { EN: 'Contact Us', MM: 'ဆက်သွယ်ရန်' },
  menu_about: { EN: 'About', MM: 'အကြောင်းအရာ' },
  menu_logout: { EN: 'Logout', MM: 'ထွက်မည်' },
  coming_soon: { EN: 'Not available yet.', MM: 'မရှိသေးပါ။' },
  copy_user_id: { EN: 'Copy user ID', MM: 'User ID ကူးရန်' },
  copied_user_id: { EN: 'User ID copied', MM: 'User ID ကူးယူပြီးပါပြီ' },
  copy_failed: { EN: 'Could not copy', MM: 'ကူးယူ၍မရပါ' },
  contact_pick: { EN: 'Choose how to reach us', MM: 'ဆက်သွယ်ရန် လမ်းကြောင်းရွေးပါ' },
  language_pick: { EN: 'Choose a language', MM: 'ဘာသာစကား ရွေးချယ်ပါ' },
  logout_title: { EN: 'Are you sure you want to log out?', MM: 'ထွက်မှာ သေချာပါသလား?' },
  logout_desc: {
    EN: 'You will need to log in again to use your account.',
    MM: 'အကောင့်မှ ထွက်ပါက ပြန်လည်ဝင်ရောက်ရန် လိုအပ်ပါမည်။',
  },
  cancel: { EN: 'Cancel', MM: 'မလုပ်တော့ပါ' },
  confirm_logout: { EN: 'Logout', MM: 'ထွက်မည်' },
  login: { EN: 'Login', MM: 'အကောင့်ဝင်ရန်' },
  signup: { EN: 'Sign Up', MM: 'အကောင့်သစ်ဖွင့်ရန်' },

  // Top buyers
  top_buyers_title: { EN: 'Top Buyers', MM: 'ထိပ်တန်းဝယ်ယူသူများ' },
  top_buyers_subtitle: {
    EN: 'Top 10 by total spending — updated every 24 hours',
    MM: 'စုစုပေါင်း သုံးစွဲမှုအလိုက် ထိပ်ဆုံး ၁၀ ဦး — ၂၄ နာရီတစ်ကြိမ် အသစ်ပြင်သည်',
  },
  top_buyers_empty: { EN: 'No top buyers yet', MM: 'အထိပ်တန်းဝယ်သူများ မရှိသေးပါ' },
  owner_badge: { EN: 'Owner Acc', MM: 'Owner Acc' },

  // Update profile
  update_profile_title: { EN: 'Update Profile', MM: 'ပရိုဖိုင် ပြင်ဆင်ရန်' },
  avatar_hint: { EN: 'Tap to change profile photo', MM: 'ပရိုဖိုင်ဓာတ်ပုံ ပြောင်းရန် နှိပ်ပါ' },
  avatar_uploading: { EN: 'Uploading...', MM: 'တင်နေပါသည်...' },
  details_title: { EN: 'Edit details', MM: 'အချက်အလက် ပြင်ဆင်ရန်' },
  field_name: { EN: 'Name', MM: 'နာမည်' },
  field_phone: { EN: 'Phone number', MM: 'ဖုန်းနံပါတ်' },
  field_current_password: { EN: 'Current password (required)', MM: 'လက်ရှိစကားဝှက် (မဖြစ်မနေ)' },
  field_new_password: { EN: 'New password', MM: 'စကားဝှက်အသစ်' },
  field_confirm_password: { EN: 'Confirm new password', MM: 'စကားဝှက်အသစ် (ထပ်ရိုက်ပါ)' },
  save: { EN: 'Save', MM: 'သိမ်းမည်' },
  saving: { EN: 'Saving...', MM: 'သိမ်းနေပါသည်...' },
  password_title: { EN: 'Change password', MM: 'စကားဝှက်ပြောင်းရန်' },
  change: { EN: 'Change', MM: 'ပြောင်းမည်' },
  changing: { EN: 'Changing...', MM: 'ပြောင်းနေပါသည်...' },
  err_current_password_required: {
    EN: 'Enter your current password first',
    MM: 'စကားဝှက်အဟောင်း ထည့်ရန် လိုအပ်ပါသည်',
  },
  err_current_password_wrong: {
    EN: 'Current password is incorrect',
    MM: 'စကားဝှက်အဟောင်း မှားယွင်းနေပါသည်',
  },
  err_name_short: { EN: 'Name must be at least 2 characters', MM: 'နာမည် အနည်းဆုံး ၂ လုံး ရှိရပါမည်' },
  err_phone_invalid: { EN: 'Enter a valid phone number', MM: 'ဖုန်းနံပါတ် မှန်ကန်စွာ ထည့်ပါ' },
  err_password_short: { EN: 'Password must be at least 6 characters', MM: 'စကားဝှက်အနည်းဆုံး ၆ လုံးရှိရပါမည်' },
  err_password_mismatch: { EN: 'New passwords do not match', MM: 'စကားဝှက်အသစ်နှစ်ခု မတူညီပါ' },
  ok_profile_saved: { EN: 'Profile saved', MM: 'ပရိုဖိုင် အချက်အလက် သိမ်းပြီးပါပြီ' },
  ok_password_changed: { EN: 'Password changed', MM: 'စကားဝှက်ပြောင်းပြီးပါပြီ' },
  ok_avatar_changed: { EN: 'Profile photo updated', MM: 'ပရိုဖိုင်ဓာတ်ပုံ ပြောင်းပြီးပါပြီ' },
  err_save_failed: { EN: 'Could not save', MM: 'သိမ်း၍မရပါ' },
  err_upload_failed: { EN: 'Could not upload photo', MM: 'ဓာတ်ပုံတင်၍မရပါ' },
  err_image_type: { EN: 'Only JPG, PNG or WEBP images allowed', MM: 'ဓာတ်ပုံ (JPG, PNG, WEBP) သာ တင်နိုင်ပါသည်' },
  err_image_size: { EN: 'Image must be under 10MB', MM: 'ဓာတ်ပုံအရွယ်အစား ၁၀MB ထက် မကျော်ရပါ' },
  err_account_missing: { EN: 'Account details not found', MM: 'အကောင့်အချက်အလက် မတွေ့ပါ' },
  err_password_change_failed: { EN: 'Could not change password', MM: 'စကားဝှက်ပြောင်း၍မရပါ' },
  currency_suffix: { EN: 'MMK', MM: 'ကျပ်' },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof translations | string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('app_language');
    return stored === 'MM' || stored === 'EN' ? stored : 'MM';
  });

  useEffect(() => {
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = lang === 'MM' ? 'my' : 'en';
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: string) => translations[key]?.[lang] ?? key,
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
