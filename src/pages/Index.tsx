import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { BottomNav } from '@/components/BottomNav';
import { HeroBanner } from '@/components/HeroBanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gamepad2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  min_price: number;
}

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error('Failed to load games');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleBuyNow = (id: string) => {
    navigate(`/product/${id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      {/* Hero Banner */}
      <div className="py-2">
        <HeroBanner />
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2 flex gap-3">
        {user ? (
          <>
            <button
              className="flex-1 py-2.5 rounded-lg gaming-btn text-sm font-semibold"
              onClick={() => navigate('/deposit')}
            >
              ငွေဖြည့်မည်
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg btn-secondary-action text-sm font-semibold"
              onClick={() => navigate('/game-order-history')}
            >
              အော်ဒါများ
            </button>
          </>
        ) : (
          <>
            <button
              className="flex-1 py-2.5 rounded-lg gaming-btn text-sm font-semibold"
              onClick={() => navigate('/login')}
            >
              အကောင့်ဝင်ရန်
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg btn-secondary-action text-sm font-semibold"
              onClick={() => navigate('/signup')}
            >
              အကောင့်သစ်ဖွင့်ရန်
            </button>
          </>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Digital Shop Banner */}
      <div className="px-4 py-2">
        <button
          onClick={() => navigate('/digital-shop')}
          className="w-full relative overflow-hidden rounded-xl p-4 border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-card to-fuchsia-500/10 hover:border-cyan-500/40 transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <Sparkles className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Digital Shop</h3>
              <p className="text-xs text-muted-foreground">TikTok, Facebook, Telegram & More</p>
            </div>
          </div>
        </button>
      </div>

      {/* Products */}
      <section className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} onBuyNow={handleBuyNow} />
        ) : (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-foreground">ဂိမ်းရှာမတွေ့ပါ</h3>
            <p className="text-muted-foreground">တခြား search term နဲ့ ထပ်ကြိုးစားကြည့်ပါ</p>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
};

export default Index;
