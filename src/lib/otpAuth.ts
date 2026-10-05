import { supabase } from '@/integrations/supabase/client';

const MESSAGES: Record<string, string> = {
  otp_send_failed: 'Could not send OTP. Please try again.',
  otp_invalid: 'Invalid or expired OTP code.',
  bad_credentials: 'Incorrect email or password.',
  bad_old_password: 'Current password is incorrect.',
  email_taken: 'This email is already registered.',
  signup_failed: 'Sign up failed. Please try a stronger password.',
  invalid_input: 'Please check the form fields.',
  email_same: 'Enter a different email address.',
  change_failed: 'Could not complete the change. Please try again.',
  unauthorized: 'Please log in again.',
};

export async function otpCall(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('auth-otp', { body });
  let payload: any = data;
  if (error) {
    try { payload = await (error as any).context?.json(); } catch { payload = null; }
  }
  if (!payload?.success) {
    const code = payload?.error || 'server_error';
    throw new Error(MESSAGES[code] || 'Something went wrong. Please try again.');
  }
  if (payload.session) await supabase.auth.setSession(payload.session);
  return payload;
}
