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
  menu_server_check: { EN: 'Server Check', MM: 'ဆာဗာစစ်ရန်' },
  server_check_button: { EN: 'Check', MM: 'စစ်ဆေးမည်' },
  server_region: { EN: 'Region', MM: 'ဒေသ' },
  double_diamond_stats: { EN: 'Double Diamond Tiers', MM: 'Double Diamond အဆင့်များ' },
  tier: { EN: 'Tier', MM: 'အဆင့်' },
  status: { EN: 'Status', MM: 'အခြေအနေ' },
  status_available: { EN: 'Available', MM: 'ရနိုင်' },
  status_unavailable: { EN: 'Not available', MM: 'မရနိုင်' },
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

  // Authentication / OTP
  auth_welcome: { EN: 'Welcome Back', MM: 'ပြန်လည်ကြိုဆိုပါသည်' },
  auth_signin_hint: { EN: 'Sign in to continue gaming', MM: 'ဆက်လက်အသုံးပြုရန် အကောင့်ဝင်ပါ' },
  auth_create: { EN: 'Create Account', MM: 'အကောင့်သစ်ဖွင့်ရန်' },
  auth_join_hint: { EN: 'Join the gaming community', MM: 'ဂိမ်းအသိုင်းအဝိုင်းသို့ ဝင်ရောက်ပါ' },
  field_email: { EN: 'Email', MM: 'အီးမေးလ်' },
  field_password: { EN: 'Password', MM: 'စကားဝှက်' },
  field_confirm_password_short: { EN: 'Confirm Password', MM: 'စကားဝှက် ထပ်မံအတည်ပြုပါ' },
  field_name_placeholder: { EN: 'Your name', MM: 'သင့်နာမည်' },
  password_min_hint: { EN: 'Minimum 6 characters', MM: 'အနည်းဆုံး ၆ လုံး' },
  signing_in: { EN: 'Signing in...', MM: 'အကောင့်ဝင်နေသည်...' },
  creating_account: { EN: 'Creating account...', MM: 'အကောင့်ဖွင့်နေသည်...' },
  no_account: { EN: "Don't have an account?", MM: 'အကောင့်မရှိသေးပါသလား?' },
  have_account: { EN: 'Already have an account?', MM: 'အကောင့်ရှိပြီးသားလား?' },
  welcome_back_toast: { EN: 'Welcome back!', MM: 'ပြန်လည်ကြိုဆိုပါသည်!' },
  account_created: { EN: 'Account created successfully!', MM: 'အကောင့်ဖွင့်ပြီးပါပြီ!' },
  otp_label: { EN: '6-Digit OTP Code', MM: 'OTP ကုဒ် ၆ လုံး' },
  otp_send: { EN: 'Send OTP', MM: 'OTP ပို့မည်' },
  otp_sending: { EN: 'Sending...', MM: 'ပို့နေသည်...' },
  otp_sent: { EN: 'OTP sent to your email', MM: 'OTP ကို အီးမေးလ်သို့ ပို့ပြီးပါပြီ' },
  otp_invalid_length: { EN: 'Enter the 6-digit OTP sent to your email', MM: 'အီးမေးလ်သို့ ပို့ထားသော OTP ၆ လုံးကို ထည့်ပါ' },
  email_invalid: { EN: 'Enter a valid email first', MM: 'မှန်ကန်သော အီးမေးလ်ကို အရင်ထည့်ပါ' },
  password_toggle: { EN: 'Toggle password visibility', MM: 'စကားဝှက် ပြ/ဖျောက်' },

  // Order history
  order_history_title: { EN: 'Order History', MM: 'ဝယ်ယူမှုမှတ်တမ်း' },
  order_search: { EN: 'Search by order ID / package / game ID', MM: 'အော်ဒါ ID / Package / Game ID ဖြင့်ရှာရန်' },
  all_games: { EN: 'All Games', MM: 'ဂိမ်းအားလုံး' },
  date: { EN: 'Date', MM: 'ရက်စွဲ' },
  no_orders: { EN: 'No orders yet', MM: 'အော်ဒါမရှိသေးပါ' },
  status_success: { EN: 'Success', MM: 'အောင်မြင်' },
  status_pending: { EN: 'Pending', MM: 'စောင့်ဆိုင်းဆဲ' },
  status_failed: { EN: 'Failed', MM: 'မအောင်မြင်' },
  order_details: { EN: 'Order Details', MM: 'အော်ဒါအသေးစိတ်' },
  product: { EN: 'Product', MM: 'ပစ္စည်း' },
  game_id_server: { EN: 'Game ID & Server', MM: 'Game ID နှင့် Server' },
  package: { EN: 'Package', MM: 'Package' },
  price: { EN: 'Price', MM: 'ဈေးနှုန်း' },
  status: { EN: 'Status', MM: 'အခြေအနေ' },
  order_id: { EN: 'Order ID', MM: 'အော်ဒါ ID' },

  // Add funds and deposit history
  add_funds_title: { EN: 'Add Funds', MM: 'ငွေဖြည့်မည်' },
  history: { EN: 'History', MM: 'မှတ်တမ်း' },
  detected_amount: { EN: 'Amount (automatically read from receipt)', MM: 'ငွေပမာဏ (ပုံမှ အလိုအလျောက် ဖတ်ပါမည်)' },
  scanning_amount: { EN: 'Reading amount...', MM: 'ငွေပမာဏ ဖတ်နေသည်...' },
  enter_amount: { EN: 'Enter amount', MM: 'ငွေပမာဏ ရိုက်ထည့်ပါ' },
  amount_unreadable: { EN: 'Could not read amount', MM: 'ငွေပမာဏ မဖတ်နိုင်ပါ' },
  upload_receipt: { EN: 'Upload Payment Receipt', MM: 'ငွေလွှဲပုံတင်ပါ' },
  amount_detected: { EN: 'Amount detected from receipt — please verify it', MM: 'ပုံမှ ဖတ်ထားသော ငွေပမာဏ — မှန်/မမှန် စစ်ပေးပါ' },
  amount_low_confidence: { EN: 'Amount is uncertain — an admin will review it', MM: 'ငွေပမာဏ သေချာမသိပါ — Admin မှ ပြန်စစ်ပါမည်' },
  edit: { EN: 'Edit', MM: 'ပြင်မည်' },
  ocr_failed_long: { EN: 'The amount could not be read. Upload a clearer receipt or enter it manually for admin review.', MM: 'ပုံမှ ငွေပမာဏကို မဖတ်နိုင်ပါ။ ပုံရှင်းရှင်း ပြန်တင်ပါ၊ သို့မဟုတ် ကိုယ်တိုင် ရိုက်ထည့်ပါ — Admin မှ ပြန်စစ်ပေးပါမည်။' },
  scan_again: { EN: 'Scan again', MM: 'ပြန်စကန်ဖတ်မည်' },
  enter_manually: { EN: 'Enter manually', MM: 'ကိုယ်တိုင် ရိုက်ထည့်မည်' },
  payment_accounts: { EN: 'Payment Accounts', MM: 'ငွေလွှဲနံပါတ်' },
  copy: { EN: 'Copy', MM: 'ကူးယူမည်' },
  copied: { EN: 'Copied!', MM: 'ကူးယူပြီးပါပြီ!' },
  no_payment_methods: { EN: 'No payment methods available', MM: 'ငွေပေးချေမှုနည်းလမ်း မရှိသေးပါ' },
  receipt_with_id: { EN: 'Payment Receipt', MM: 'ငွေလွှဲပြေစာပုံ' },
  tap_upload_receipt: { EN: 'Tap to upload payment receipt', MM: 'ငွေလွှဲပုံထည့်ရန် နှိပ်ပါ' },
  submitting: { EN: 'Submitting...', MM: 'တင်နေသည်...' },
  submit_deposit: { EN: 'Submit', MM: 'တင်မည်' },
  deposit_submitted: { EN: 'Deposit request submitted! Status: Processing', MM: 'ငွေဖြည့်တောင်းဆိုမှု တင်ပြီးပါပြီ။ စစ်ဆေးနေပါသည်' },
  deposit_failed: { EN: 'Failed to submit deposit', MM: 'ငွေဖြည့်တောင်းဆိုမှု တင်၍မရပါ' },
  ocr_failed: { EN: 'Could not read the amount. Try again.', MM: 'ငွေပမာဏ ဖတ်၍မရပါ။ ပြန်ကြိုးစားပါ' },
  image_only: { EN: 'Only JPG, PNG, WEBP images are allowed', MM: 'ဓာတ်ပုံဖိုင် (JPG, PNG, WEBP) သာ တင်နိုင်ပါသည်' },
  file_too_large: { EN: 'File size must be under 10MB', MM: 'ဖိုင်အရွယ်အစား 10MB ထက် မပိုရပါ' },
  deposit_history_title: { EN: 'Add Funds History', MM: 'ငွေဖြည့်မှတ်တမ်း' },
  all: { EN: 'All', MM: 'အားလုံး' },
  approved: { EN: 'Approved', MM: 'အတည်ပြုပြီး' },
  rejected: { EN: 'Rejected', MM: 'ပယ်ချပြီး' },
  no_deposits: { EN: 'No deposits yet', MM: 'ငွေဖြည့်မှတ်တမ်း မရှိသေးပါ' },
  admin_topup: { EN: 'Admin Top-up', MM: 'Admin ငွေဖြည့်' },
  order_detail: { EN: 'Order Detail', MM: 'အသေးစိတ်' },
  amount: { EN: 'Amount', MM: 'ငွေပမာဏ' },
  type: { EN: 'Type', MM: 'အမျိုးအစား' },
  payment_slip: { EN: 'Payment Slip', MM: 'ငွေလွှဲပြေစာ' },
  slip_unavailable: { EN: 'Could not open image', MM: 'ပုံကို ဖွင့်၍မရပါ' },

  // Checkout
  checkout_enter_details: { EN: 'Enter Details', MM: 'အချက်အလက်များဖြည့်သွင်းပါ' },
  account_info: { EN: 'Account Info', MM: 'အကောင့်အချက်အလက်' },
  player_id: { EN: 'Player ID', MM: 'Player ID' },
  checking_account: { EN: 'Checking account...', MM: 'အကောင့်အမည် စစ်ဆေးနေသည်...' },
  account_name: { EN: 'Account Name', MM: 'အကောင့်အမည်' },
  balance: { EN: 'Balance', MM: 'လက်ကျန်ငွေ' },
  details_correct: { EN: 'Details are correct', MM: 'အချက်အလက်များမှန်ကန်ပါတယ်' },
  not_now: { EN: 'Not Now', MM: 'မဝယ်သေးပါ' },
  ordering: { EN: 'Purchasing...', MM: 'မှာယူနေပါသည်...' },
  no_packages: { EN: 'No packages available', MM: 'ပစ္စည်းများ မရှိသေးပါ' },
  login_required_order: { EN: 'Please log in first', MM: 'ကျေးဇူးပြု၍ အကောင့်ဝင်ပါ' },
  enter_game_id: { EN: 'Enter Game ID', MM: 'Game ID ထည့်ပါ' },
  enter_server_id: { EN: 'Enter Server ID', MM: 'Server ID ထည့်ပါ' },
  verify_account_first: { EN: 'Verify the account name first', MM: 'အကောင့်အမည် အရင်စစ်ဆေးပါ' },
  confirm_details_first: { EN: 'Confirm that the details are correct', MM: 'အချက်အလက်များမှန်ကန်ကြောင်း အတည်ပြုပါ' },
  insufficient_balance: { EN: 'Insufficient balance', MM: 'လက်ကျန်ငွေ မလုံလောက်ပါ' },
  system_error: { EN: 'The system is unavailable. Please try again later.', MM: 'စနစ်ချို့ယွင်းနေပါတယ် ခဏကြာမှပြန်လည်ကြိုးစားပါ' },
  order_failed: { EN: 'Purchase failed. Please try again later.', MM: 'မှာယူမှု မအောင်မြင်ပါ။ ခဏနေ ပြန်ကြိုးစားပါ။' },
  order_success: { EN: 'Purchase completed!', MM: 'မှာယူပြီးပါပြီ!' },
  too_many_orders: { EN: 'Please wait before placing another order.', MM: 'ခဏစောင့်ပါ။ မှာယူမှုကို မြန်ဆန်စွာ ထပ်ခါမလုပ်ပါနှင့်။' },

  // Notifications
  notifications_title: { EN: 'Notifications', MM: 'အသိပေးချက်များ' },
  mark_all_read: { EN: 'Mark all read', MM: 'အားလုံးဖတ်ပြီး' },
  notifications_empty: { EN: 'No notifications yet', MM: 'အသိပေးချက် မရှိသေးပါ' },
  notifications_empty_hint: { EN: 'Your notifications will appear here', MM: 'သင့်အတွက် အသိပေးချက်များ ဤနေရာတွင် ပေါ်လာပါမည်' },
  just_now: { EN: 'Just now', MM: 'ယခုလေးတင်' },
  minutes_ago: { EN: 'minutes ago', MM: 'မိနစ်အကြာ' },
  hours_ago: { EN: 'hours ago', MM: 'နာရီအကြာ' },
  days_ago: { EN: 'days ago', MM: 'ရက်အကြာ' },

  // Profile email change
  field_new_email: { EN: 'New Email', MM: 'အီးမေးလ်အသစ်' },
  current_email_hint: { EN: 'OTP will be sent to your current email', MM: 'OTP ကို လက်ရှိအီးမေးလ်သို့ ပို့ပါမည်' },
  email_change_otp: { EN: 'Verify Current Email', MM: 'လက်ရှိအီးမေးလ်ကို အတည်ပြုပါ' },
  ok_email_changed: { EN: 'Email updated successfully', MM: 'အီးမေးလ် ပြောင်းပြီးပါပြီ' },
  err_email_same: { EN: 'Enter a different email address', MM: 'မတူညီသော အီးမေးလ်အသစ်ကို ထည့်ပါ' },
  err_email_change_failed: { EN: 'Could not update email', MM: 'အီးမေးလ် ပြောင်း၍မရပါ' },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof translations | string) => string;
  formatNumber: (value: number) => string;
  formatMmk: (value: number) => string;
}

// Keep a single context instance across hot reloads so providers and consumers always match.
const g = globalThis as unknown as { __langCtx?: React.Context<LanguageContextValue | undefined> };
const LanguageContext = g.__langCtx ?? (g.__langCtx = createContext<LanguageContextValue | undefined>(undefined));

function fallbackValue(): LanguageContextValue {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('app_language') : null;
  const lang: Lang = stored === 'EN' ? 'EN' : 'MM';
  const formatNumber = (n: number) =>
    new Intl.NumberFormat(lang === 'MM' ? 'my-MM-u-nu-mymr' : 'en-US', { maximumFractionDigits: 0 }).format(n);
  return {
    lang,
    setLang: () => {},
    t: (key: string) => translations[key]?.[lang] ?? key,
    formatNumber,
    formatMmk: (n: number) => `${formatNumber(n)} ${translations.currency_suffix[lang]}`,
  };
}

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

  const formatNumber = useCallback(
    (amount: number) => new Intl.NumberFormat(
      lang === 'MM' ? 'my-MM-u-nu-mymr' : 'en-US',
      { maximumFractionDigits: 0 }
    ).format(amount),
    [lang]
  );

  const formatMmk = useCallback(
    (amount: number) => `${formatNumber(amount)} ${translations.currency_suffix[lang]}`,
    [formatNumber, lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t, formatNumber, formatMmk }),
    [lang, setLang, t, formatNumber, formatMmk]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  return ctx ?? fallbackValue();
}
