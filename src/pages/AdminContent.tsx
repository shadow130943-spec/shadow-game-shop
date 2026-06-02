import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Trash2, EyeOff, Eye, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/gif', 'image/avif'];

interface GameRow {
  game_code: string;
  game_name: string;
  packages: Array<{ catalogue_name: string; price_mmk: number }>;
}

interface OverrideRow {
  id?: string;
  game_code: string;
  catalogue_name: string;
  display_name: string | null;
  price_mmk_override: number | null;
  is_hidden: boolean;
  image_url?: string | null;
}

const BRANDING_KEYS: Array<{ key: string; label: string; hint: string }> = [
  { key: 'hero_banner', label: 'Hero Banner', hint: 'Homepage top banner image' },
  { key: 'site_logo', label: 'Site Logo', hint: 'Small logo shown next to site name in the header' },
  { key: 'favicon', label: 'Favicon', hint: 'Browser tab icon (square PNG/ICO recommended)' },
];

async function uploadToBranding(folder: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Image files only (JPG, PNG, WEBP, SVG, ICO, GIF, AVIF)');
  const ext = file.name.split('.').pop() || 'png';
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('branding').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('branding').getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminContent() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameRow[]>([]);
  const [gameLogos, setGameLogos] = useState<Record<string, string>>({});
  const [brandingMap, setBrandingMap] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  // Bulk image upload state
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [bulkUploading, setBulkUploading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [gamesRes, logosRes, brandingRes, overridesRes] = await Promise.all([
        supabase.functions.invoke('shadow-gameshop', { body: { action: 'listProducts' } }),
        supabase.from('game_assets').select('*'),
        supabase.from('branding_assets').select('*'),
        supabase.from('package_overrides').select('*'),
      ]);
      const gs = (gamesRes.data?.games || []) as GameRow[];
      setGames(gs);
      if (gs.length && !selectedGame) setSelectedGame(gs[0].game_code);
      const lm: Record<string, string> = {};
      (logosRes.data || []).forEach((r: any) => { lm[r.game_code] = r.logo_url; });
      setGameLogos(lm);
      const bm: Record<string, string> = {};
      (brandingRes.data || []).forEach((r: any) => { bm[r.key] = r.image_url; });
      setBrandingMap(bm);
      setOverrides((overridesRes.data || []) as OverrideRow[]);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  /* ---------- Branding ---------- */
  const uploadBranding = async (key: string, file: File) => {
    setUploadingKey(`branding:${key}`);
    try {
      const url = await uploadToBranding('site', file);
      const { error } = await supabase
        .from('branding_assets')
        .upsert({ key, image_url: url, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      setBrandingMap({ ...brandingMap, [key]: url });
      toast.success(`${key} updated`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploadingKey(null);
  };

  /* ---------- Game logos ---------- */
  const uploadGameLogo = async (game_code: string, file: File) => {
    setUploadingKey(`logo:${game_code}`);
    try {
      const url = await uploadToBranding(`game-logos/${game_code}`, file);
      const { error } = await supabase
        .from('game_assets')
        .upsert({ game_code, logo_url: url, updated_at: new Date().toISOString() }, { onConflict: 'game_code' });
      if (error) throw error;
      setGameLogos({ ...gameLogos, [game_code]: url });
      toast.success(`${game_code} logo updated`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploadingKey(null);
  };

  /* ---------- Package overrides ---------- */
  const getOverride = (game_code: string, catalogue_name: string): OverrideRow => {
    return (
      overrides.find((o) => o.game_code === game_code && o.catalogue_name === catalogue_name) || {
        game_code,
        catalogue_name,
        display_name: null,
        price_mmk_override: null,
        is_hidden: false,
      }
    );
  };

  const updateLocalOverride = (game_code: string, catalogue_name: string, patch: Partial<OverrideRow>) => {
    const idx = overrides.findIndex((o) => o.game_code === game_code && o.catalogue_name === catalogue_name);
    if (idx >= 0) {
      const next = [...overrides];
      next[idx] = { ...next[idx], ...patch };
      setOverrides(next);
    } else {
      setOverrides([
        ...overrides,
        { game_code, catalogue_name, display_name: null, price_mmk_override: null, is_hidden: false, ...patch },
      ]);
    }
  };

  const saveOverride = async (game_code: string, catalogue_name: string) => {
    const o = getOverride(game_code, catalogue_name);
    const isEmpty = !o.display_name && o.price_mmk_override == null && !o.is_hidden && !o.image_url;
    try {
      if (isEmpty && o.id) {
        const { error } = await supabase.from('package_overrides').delete().eq('id', o.id);
        if (error) throw error;
        toast.success('Override removed');
      } else {
        const { error } = await supabase.from('package_overrides').upsert(
          {
            game_code: o.game_code,
            catalogue_name: o.catalogue_name,
            display_name: o.display_name || null,
            price_mmk_override: o.price_mmk_override,
            is_hidden: o.is_hidden,
            image_url: o.image_url || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'game_code,catalogue_name' },
        );
        if (error) throw error;
        toast.success('Saved');
      }
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const uploadPackageImage = async (game_code: string, catalogue_name: string, file: File) => {
    const key = `pkg:${game_code}:${catalogue_name}`;
    setUploadingKey(key);
    try {
      const url = await uploadToBranding(`packages/${game_code}`, file);
      const o = getOverride(game_code, catalogue_name);
      const { error } = await supabase.from('package_overrides').upsert(
        {
          game_code,
          catalogue_name,
          display_name: o.display_name || null,
          price_mmk_override: o.price_mmk_override,
          is_hidden: o.is_hidden,
          image_url: url,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'game_code,catalogue_name' },
      );
      if (error) throw error;
      updateLocalOverride(game_code, catalogue_name, { image_url: url });
      toast.success('Package image updated');
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
    setUploadingKey(null);
  };

  /* ---------- Bulk image upload (one image -> many packages) ---------- */
  const toggleBulkSelected = (catalogue_name: string) => {
    setBulkSelected((s) => ({ ...s, [catalogue_name]: !s[catalogue_name] }));
  };

  const selectAllBulk = (game_code: string, select: boolean) => {
    const game = games.find((g) => g.game_code === game_code);
    if (!game) return;
    const next: Record<string, boolean> = {};
    if (select) game.packages.forEach((p) => { next[p.catalogue_name] = true; });
    setBulkSelected(next);
  };

  const bulkUploadImage = async (game_code: string, file: File) => {
    const targets = Object.entries(bulkSelected).filter(([, v]) => v).map(([k]) => k);
    if (targets.length === 0) {
      toast.error('Package တစ်ခု အနည်းဆုံး ရွေးချယ်ပါ');
      return;
    }
    setBulkUploading(true);
    try {
      // Upload once, reuse URL across all selected packages
      const url = await uploadToBranding(`packages/${game_code}`, file);
      const rows = targets.map((catalogue_name) => {
        const o = getOverride(game_code, catalogue_name);
        return {
          game_code,
          catalogue_name,
          display_name: o.display_name || null,
          price_mmk_override: o.price_mmk_override,
          is_hidden: o.is_hidden,
          image_url: url,
          updated_at: new Date().toISOString(),
        };
      });
      const { error } = await supabase
        .from('package_overrides')
        .upsert(rows, { onConflict: 'game_code,catalogue_name' });
      if (error) throw error;
      toast.success(`${targets.length} package(s) တွင် ပုံ apply လုပ်ပြီး`);
      setBulkSelected({});
      loadAll();
    } catch (e: any) {
      toast.error(e.message);
    }
    setBulkUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const currentGame = games.find((g) => g.game_code === selectedGame);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="h-5 w-5 mr-2" /> Admin
        </Button>
        <h1 className="font-gaming text-lg font-bold text-primary">Content & Branding</h1>
        <div />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3 bg-muted">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="logos">Game Logos</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
          </TabsList>

          {/* BRANDING */}
          <TabsContent value="branding" className="space-y-4">
            {BRANDING_KEYS.map((b) => (
              <div key={b.key} className="gaming-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {brandingMap[b.key] ? (
                    <img src={brandingMap[b.key]} alt={b.label} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{b.label}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{b.hint}</p>
                  <input
                    id={`branding-${b.key}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadBranding(b.key, e.target.files[0])}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={uploadingKey === `branding:${b.key}`}
                    onClick={() => document.getElementById(`branding-${b.key}`)?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {uploadingKey === `branding:${b.key}` ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* GAME LOGOS */}
          <TabsContent value="logos" className="space-y-3">
            {games.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No games loaded from API.</div>
            )}
            {games.map((g) => (
              <div key={g.game_code} className="gaming-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {gameLogos[g.game_code] ? (
                    <img src={gameLogos[g.game_code]} alt={g.game_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Default</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{g.game_name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{g.game_code}</p>
                </div>
                <input
                  id={`logo-${g.game_code}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadGameLogo(g.game_code, e.target.files[0])}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={uploadingKey === `logo:${g.game_code}`}
                  onClick={() => document.getElementById(`logo-${g.game_code}`)?.click()}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadingKey === `logo:${g.game_code}` ? '...' : 'Upload'}
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* PACKAGES */}
          <TabsContent value="packages" className="space-y-4">
            <div>
              <Label>Select Game</Label>
              <Select value={selectedGame} onValueChange={setSelectedGame}>
                <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {games.map((g) => (
                    <SelectItem key={g.game_code} value={g.game_code}>{g.game_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentGame && (
              <>
                {/* Bulk apply image panel */}
                <div className="gaming-card rounded-xl p-4 border border-secondary/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-secondary" />
                    <h3 className="font-bold text-sm">Bulk Image Apply</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Package အများကြီးကို ပုံတစ်ပုံတည်းနဲ့ apply လုပ်လို့ရပါတယ်။ အရင်ဆုံး package တွေကို
                    အောက်တွင် check လုပ်ပြီး "Upload &amp; Apply" ကိုနှိပ်ပါ။
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => selectAllBulk(currentGame.game_code, true)}>
                      Select All
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setBulkSelected({})}>
                      Clear
                    </Button>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {Object.values(bulkSelected).filter(Boolean).length} selected
                    </span>
                    <input
                      id="bulk-pkg-img"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] && bulkUploadImage(currentGame.game_code, e.target.files[0])
                      }
                    />
                    <Button
                      size="sm"
                      className="gaming-btn border-0"
                      disabled={bulkUploading || Object.values(bulkSelected).filter(Boolean).length === 0}
                      onClick={() => document.getElementById('bulk-pkg-img')?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      {bulkUploading ? 'Uploading...' : 'Upload & Apply'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                {currentGame.packages.map((p) => {
                  const o = getOverride(currentGame.game_code, p.catalogue_name);
                  return (
                    <div key={p.catalogue_name} className="gaming-card rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {o.image_url ? (
                            <img src={o.image_url} alt={p.catalogue_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No image</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-mono text-muted-foreground truncate">{p.catalogue_name}</p>
                          <p className="text-xs text-muted-foreground">
                            API price: <span className="font-semibold text-foreground">{new Intl.NumberFormat('my-MM').format(p.price_mmk)} ကျပ်</span>
                          </p>
                          <input
                            id={`pkg-img-${currentGame.game_code}-${p.catalogue_name}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              uploadPackageImage(currentGame.game_code, p.catalogue_name, e.target.files[0])
                            }
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            disabled={uploadingKey === `pkg:${currentGame.game_code}:${p.catalogue_name}`}
                            onClick={() =>
                              document
                                .getElementById(`pkg-img-${currentGame.game_code}-${p.catalogue_name}`)
                                ?.click()
                            }
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {uploadingKey === `pkg:${currentGame.game_code}:${p.catalogue_name}`
                              ? 'Uploading...'
                              : o.image_url
                              ? 'Replace Image'
                              : 'Upload Image'}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {o.is_hidden ? <EyeOff className="h-4 w-4 text-destructive" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          <Switch
                            checked={!o.is_hidden}
                            onCheckedChange={(v) => updateLocalOverride(currentGame.game_code, p.catalogue_name, { is_hidden: !v })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Display Name (optional)</Label>
                          <Input
                            value={o.display_name || ''}
                            placeholder={p.catalogue_name}
                            onChange={(e) =>
                              updateLocalOverride(currentGame.game_code, p.catalogue_name, { display_name: e.target.value || null })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Price Override (MMK)</Label>
                          <Input
                            type="number"
                            value={o.price_mmk_override ?? ''}
                            placeholder="Use API price"
                            onChange={(e) =>
                              updateLocalOverride(currentGame.game_code, p.catalogue_name, {
                                price_mmk_override: e.target.value === '' ? null : Number(e.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          className="gaming-btn border-0"
                          onClick={() => saveOverride(currentGame.game_code, p.catalogue_name)}
                        >
                          <Save className="h-4 w-4 mr-1" /> Save Name/Price
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
