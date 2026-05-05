import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  phone: string;
  holder: string;
  logo_url: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
}

const COLOR_OPTIONS = [
  { value: 'bg-yellow-400', label: 'Yellow' },
  { value: 'bg-red-600', label: 'Red' },
  { value: 'bg-blue-600', label: 'Blue' },
  { value: 'bg-green-600', label: 'Green' },
  { value: 'bg-purple-600', label: 'Purple' },
  { value: 'bg-pink-600', label: 'Pink' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-gray-700', label: 'Gray' },
];

export default function AdminPaymentMethods() {
  const navigate = useNavigate();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) toast.error(error.message);
    else setMethods(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateField = (id: string, field: keyof PaymentMethod, value: any) => {
    setMethods(methods.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const save = async (m: PaymentMethod) => {
    const { error } = await supabase
      .from('payment_methods')
      .update({
        name: m.name, phone: m.phone, holder: m.holder,
        color: m.color, sort_order: m.sort_order, is_active: m.is_active,
      })
      .eq('id', m.id);
    if (error) toast.error(error.message);
    else toast.success('Saved');
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this payment method?')) return;
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Deleted'); load(); }
  };

  const addNew = async () => {
    const { error } = await supabase.from('payment_methods').insert({
      name: 'New Method', phone: '', holder: '', color: 'bg-blue-600',
      sort_order: methods.length + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success('Added'); load(); }
  };

  const uploadLogo = async (m: PaymentMethod, file: File) => {
    setUploadingId(m.id);
    try {
      const ext = file.name.split('.').pop();
      const path = `${m.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('payment-logos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('payment-logos').getPublicUrl(path);
      const { error: updErr } = await supabase.from('payment_methods').update({ logo_url: publicUrl }).eq('id', m.id);
      if (updErr) throw updErr;
      updateField(m.id, 'logo_url', publicUrl);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err.message);
    }
    setUploadingId(null);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5 mr-2" /> Admin
        </Button>
        <h1 className="font-gaming text-lg font-bold text-primary">Payment Methods</h1>
        <Button onClick={addNew} size="sm" className="gaming-btn border-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {methods.map((m) => (
          <div key={m.id} className="gaming-card rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-lg ${m.color} flex items-center justify-center overflow-hidden shrink-0 relative`}>
                {m.logo_url ? (
                  <img src={m.logo_url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-center text-black px-1">{m.name}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-xs">Logo</Label>
                <input
                  id={`file-${m.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadLogo(m, e.target.files[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={uploadingId === m.id}
                  onClick={() => document.getElementById(`file-${m.id}`)?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadingId === m.id ? 'Uploading...' : 'Upload Logo'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={m.name} onChange={(e) => updateField(m.id, 'name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={m.phone} onChange={(e) => updateField(m.id, 'phone', e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Account Holder</Label>
                <Input value={m.holder} onChange={(e) => updateField(m.id, 'holder', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Color</Label>
                <select
                  value={m.color}
                  onChange={(e) => updateField(m.id, 'color', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={m.sort_order} onChange={(e) => updateField(m.id, 'sort_order', parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Switch checked={m.is_active} onCheckedChange={(v) => updateField(m.id, 'is_active', v)} />
                <Label className="text-sm">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => remove(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button size="sm" className="gaming-btn border-0" onClick={() => save(m)}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        ))}
        {methods.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No payment methods. Click "Add" to create one.</div>
        )}
      </div>
    </div>
  );
}
