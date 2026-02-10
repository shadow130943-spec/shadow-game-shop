import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Deposit() {
  const [amount, setAmount] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;

    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(path);

      const { error: insertError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          screenshot_url: urlData.publicUrl,
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
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(0_30%_12%)] to-[hsl(0_40%_18%)]">
      <div className="px-4 py-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-5 w-5 mr-2" /> Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <h1 className="font-gaming text-2xl font-bold text-center mb-6">
            <Banknote className="inline h-7 w-7 mr-2 text-primary" />
            Deposit Funds
          </h1>

          <form onSubmit={handleSubmit} className="gaming-card rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ကျပ်)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                className="bg-muted border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Screenshot</Label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => document.getElementById('screenshot')?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                  </div>
                )}
              </div>
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !file || !amount}
              className="w-full gaming-btn border-0 py-6 text-base font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Deposit Request'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
