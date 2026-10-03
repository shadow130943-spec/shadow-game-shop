import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { otpCall } from '@/lib/otpAuth';

interface Props {
  email: string;
  value: string;
  onChange: (v: string) => void;
}

/** 6-digit OTP input with a "Send OTP" button (60s resend cooldown). */
export function OtpField({ email, value, onChange }: Props) {
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error('Enter a valid email first');
      return;
    }
    setSending(true);
    try {
      await otpCall({ action: 'send', email: email.trim().toLowerCase() });
      toast.success('OTP sent to your email');
      setCooldown(60);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="otp">6-Digit OTP Code</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            className="pl-10 bg-muted border-border tracking-widest"
          />
        </div>
        <Button type="button" variant="outline" onClick={send} disabled={sending || cooldown > 0} className="shrink-0">
          {sending ? 'Sending...' : cooldown > 0 ? `${cooldown}s` : 'Send OTP'}
        </Button>
      </div>
    </div>
  );
}
