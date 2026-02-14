import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, Copy, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const paymentMethods = [
  {
    name: 'WAVEPAY',
    phone: '09684533849',
    holder: 'Chue lae aung',
    color: 'bg-yellow-400',
    logo: '🌊',
  },
  {
    name: 'KBZ Pay',
    phone: '09757453851',
    holder: 'Zaw min tun',
    color: 'bg-red-600',
    logo: '🏦',
  },
  {
    name: 'AYA PAY',
    phone: '09759122980',
    holder: 'Ye Htet Ko ko',
    color: 'bg-white border border-red-500',
    logo: '🏠',
  },
];

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !amount) return;

    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Store just the path (bucket is now private, signed URLs generated server-side)

      const { error: insertError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          screenshot_url: path,
        });

      if (insertError) throw insertError;

      toast.success('Deposit request submitted! Status: Processing');
      navigate('/deposit-history');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit deposit');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <div className="px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between gaming-card rounded-xl p-4">
            <h1 className="font-bold text-lg text-foreground">ငွေဖြည့်မည်</h1>
            <Button variant="secondary" size="sm" onClick={() => navigate('/deposit-history')}>
              <History className="h-4 w-4 mr-1" /> မှတ်တမ်း
            </Button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">ငွေပမာဏထည့်ပါ</p>
            <div className="flex items-center gap-2 border border-border rounded-lg px-4 py-3 bg-card">
              <input
                type="number"
                min="0"
                placeholder="ငွေပမာဏ ထည့်ပါ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
              />
              <span className="text-muted-foreground shrink-0">ကျပ်</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">ငွေလွှဲနံပါတ်</p>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div key={method.name} className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg ${method.color} flex items-center justify-center text-2xl font-bold shrink-0`}>
                    <span className="text-xs sm:text-sm font-extrabold leading-tight text-center text-black">{method.name}</span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm sm:text-base text-foreground">{method.phone}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => handleCopy(method.phone)}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{method.holder}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Screenshot Upload */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Payment Screenshot ( ငွေလွှဲ Id ပါတဲ့ပုံ )
              </p>
              <div
                className="border-2 border-dashed border-green-500/50 rounded-xl p-6 text-center cursor-pointer hover:border-green-500 transition-colors bg-card"
                onClick={() => document.getElementById('screenshot')?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-primary" />
                    <p className="text-sm text-primary font-medium">ငွေလွှဲပုံထည့်ရန်နှိပ်ပါ</p>
                  </div>
                )}
              </div>
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !file || !amount}
              className="w-full gaming-btn border-0 py-6 text-base font-semibold rounded-xl"
            >
              {loading ? 'Submitting...' : 'ဝယ်ယူမည်'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
