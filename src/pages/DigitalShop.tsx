import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Category config with icons and colors
const CATEGORY_CONFIG: Record<string, { icon: string; gradient: string }> = {
  'TikTok': { icon: '🎵', gradient: 'from-pink-500 to-cyan-400' },
  'Facebook': { icon: '📘', gradient: 'from-blue-600 to-blue-400' },
  'Telegram': { icon: '✈️', gradient: 'from-sky-500 to-sky-300' },
  'Instagram': { icon: '📸', gradient: 'from-purple-500 to-pink-400' },
  'YouTube': { icon: '▶️', gradient: 'from-red-600 to-red-400' },
  'Twitter': { icon: '🐦', gradient: 'from-sky-400 to-sky-300' },
  'Spotify': { icon: '🎧', gradient: 'from-green-500 to-green-400' },
  'Discord': { icon: '💬', gradient: 'from-indigo-500 to-indigo-400' },
  'Twitch': { icon: '🎮', gradient: 'from-purple-600 to-purple-400' },
};

function getCategoryConfig(name: string) {
  // Try to match category name to config
  for (const [key, val] of Object.entries(CATEGORY_CONFIG)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { icon: '🌐', gradient: 'from-cyan-500 to-blue-500' };
}

const DigitalShop = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('category')
      .eq('is_active', true);

    if (!error && data) {
      const unique = [...new Set(data.map((d: any) => d.category))].sort();
      setCategories(unique);
    }
    setLoading(false);
  };

  const filtered = categories.filter(c =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      {/* Hero */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-cyan-500/20 via-background to-fuchsia-500/20 border border-cyan-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-fuchsia-400/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Digital Shop</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Social Media Services</h1>
            <p className="text-sm text-muted-foreground mt-1">Followers, Likes, Views & More</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border/50 focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <section className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((cat, i) => {
              const config = getCategoryConfig(cat);
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  onClick={() => navigate(`/digital-shop/${encodeURIComponent(cat)}`)}
                  className="relative overflow-hidden rounded-xl p-4 cursor-pointer border border-border/50 bg-card hover:border-cyan-500/40 transition-all group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  <div className="relative">
                    <span className="text-3xl">{config.icon}</span>
                    <h3 className="font-semibold text-foreground text-sm mt-2 truncate">{cat}</h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Service များ မရှိသေးပါ။ Admin မှ sync လုပ်ပါ။</p>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default DigitalShop;
