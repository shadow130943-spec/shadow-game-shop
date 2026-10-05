import { useLanguage } from '@/i18n/LanguageProvider';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ArrowLeft, Copy, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

interface PaymentMethod {
  id: string;
  name: string;
  phone: string;
  holder: string;
  logo_url: string | null;
  color: string;
}

export default function Deposit() {
  const [amount, setAmount] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, formatMmk, formatNumber } = useLanguage();


  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('id, name, phone, holder, logo_url, color')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setMethods(data || []));
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copied'));
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const toBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

  const scanAmount = async (f: File) => {
    setScanning(true);
    setScanFailed(false);
    setManual(false);
    setManualValue('');
    setConfidence(0);
    setAmount(null);
    try {
      const image_base64 = await toBase64(f);
      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: { mode: 'amount', image_base64, mime_type: f.type },
      });
      if (error || data?.error || !data?.amount) {
        setScanFailed(true);
        toast.error(t('ocr_failed_long'));
        return;
      }
      setAmount(data.amount as number);
      setConfidence(Number(data.confidence) || 0);
      toast.success(`${t('amount_detected')}: ${formatMmk(data.amount)}`);
    } catch {
      setScanFailed(true);
      toast.error(t('ocr_failed'));
    } finally {
      setScanning(false);
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate MIME type (defence in depth, not just accept="image/*")
    if (!ALLOWED_IMAGE_TYPES.includes(selected.type)) {
      toast.error(t('image_only'));
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error(t('file_too_large'));
      e.target.value = '';
      return;
    }

    let finalFile = selected;
    try {
      finalFile = await compressImage(selected);
    } catch {
      finalFile = selected;
    }
    setFile(finalFile);
    // Data URL preview: survives CSP blob restrictions and object-URL revocation.
    const reader = new FileReader();
    reader.onload = () => setPreview(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => setPreview(URL.createObjectURL(finalFile));
    reader.readAsDataURL(finalFile);
    await scanAmount(finalFile);
  };

  const manualAmount = manual ? Math.round(Number(manualValue.replace(/[^0-9]/g, ''))) : 0;
  const finalAmount = manual ? (manualAmount > 0 ? manualAmount : null) : amount;
  const needsReview = manual || (!!amount && confidence > 0 && confidence < 0.6);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || !finalAmount) return;

    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: finalAmount,
          screenshot_url: path,
          admin_note: needsReview
            ? (manual ? 'MANUAL AMOUNT — OCR failed, please verify' : 'LOW OCR CONFIDENCE — please verify')
            : null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;


      if (inserted?.id) {
        supabase.functions
          .invoke('telegram-deposit-notify', { body: { deposit_id: inserted.id } })
          .catch((e) => console.error('Telegram notify failed', e));
      }

      toast.success('Deposit request submitted! Status: Processing');
      navigate('/deposit-history');
    } catch (err: any) {
      toast.error(err.message || t('deposit_failed'));
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
          <div className="flex items-center justify-between gaming-card rounded-xl p-4">
            <h1 className="font-bold text-lg text-foreground">{t('add_funds_title')}</h1>
            <Button variant="secondary" size="sm" onClick={() => navigate('/deposit-history')}>
              <History className="h-4 w-4 mr-1" /> {t('history')}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('detected_amount')}</p>
            <div className="flex items-center justify-between gap-2 border border-border rounded-lg px-4 py-3 bg-card">
              {scanning ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('scanning_amount')}
                </span>
              ) : manual ? (
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder={t('enter_amount')}
                  className="flex-1 bg-transparent text-lg font-bold text-foreground outline-none"
                />
              ) : amount ? (
                <span className="text-lg font-bold text-foreground">
                  {formatNumber(amount)}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {scanFailed ? t('amount_unreadable') : t('upload_receipt')}
                </span>
              )}
              <span className="text-muted-foreground shrink-0">{t('currency_suffix')}</span>
            </div>

            {!scanning && amount !== null && !manual && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {confidence >= 0.6
                    ? t('amount_detected')
                    : t('amount_low_confidence')}
                </p>
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => { setManual(true); setManualValue(String(amount)); }}>
                  {t('edit')}
                </Button>
              </div>
            )}

            {!scanning && scanFailed && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                <p className="text-xs text-foreground">
                  {t('ocr_failed_long')}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="secondary" className="text-xs" disabled={!file} onClick={() => file && scanAmount(file)}>
                    {t('scan_again')}
                  </Button>
                  {!manual && (
                    <Button type="button" size="sm" variant="outline" className="text-xs" onClick={() => setManual(true)}>
                      {t('enter_manually')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>



          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t('payment_accounts')}</p>
            <div className="space-y-3">
              {methods.map((method) => (
                <div key={method.id} className="border border-border rounded-xl p-3 bg-card flex items-center gap-3">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-lg ${method.color} flex items-center justify-center overflow-hidden shrink-0`}>
                    {method.logo_url ? (
                      <img src={method.logo_url} alt={method.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs sm:text-sm font-extrabold leading-tight text-center text-black px-1">{method.name}</span>
                    )}
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
                        <Copy className="h-3 w-3 mr-1" /> {t('copy')}
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{method.holder}</p>
                  </div>
                </div>
              ))}
              {methods.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">{t('no_payment_methods')}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {t('receipt_with_id')}
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
                    <p className="text-sm text-primary font-medium">{t('tap_upload_receipt')}</p>
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
              {loading ? t('submitting') : t('submit_deposit')}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
