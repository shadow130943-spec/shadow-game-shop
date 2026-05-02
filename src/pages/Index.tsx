import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { BottomNav } from '@/components/BottomNav';
import { HeroBanner } from '@/components/HeroBanner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  min_price: number;
}

const GAME_IMAGES: Record<string, string> = {
  mlbb: 'https://cdn-icons-png.flaticon.com/512/871/871381.png',
  magic_chess_gogo: 'https://cdn-icons-png.flaticon.com/512/3534/3534033.png',
  pubgm: 'https://cdn-icons-png.flaticon.com/512/4712/4712013.png',
  telegram: 'https://cdn-icons-png.flaticon.com/512/2111/2111646.png',
  freefire_global: 'https://cdn-icons-png.flaticon.com/512/871/871381.png',
};

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
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('shadow-gameshop', {
      body: { action: 'listProducts' },
    });

    if (error || !data?.success) {
      toast.error('Failed to load games');
      setProducts([]);
    } else {
      const games = (data.games || []) as Array<{
        game_code: string;
        game_name: string;
        packages: Array<{ price_mmk: number; hidden?: boolean }>;
      }>;
      const mapped: Product[] = games.map((g) => {
        const visible = (g.packages || []).filter((p) => !p.hidden && p.price_mmk > 0);
        const minPrice = visible.length ? Math.min(...visible.map((p) => p.price_mmk)) : 0;
        return {
          id: g.game_code,
          name: g.game_name,
          description: null,
          image_url: GAME_IMAGES[g.game_code] || null,
          min_price: minPrice,
        };
      });
      setProducts(mapped);
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

      <div className="py-2">
        <HeroBanner />
      </div>

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

      <div className="px-4 py-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

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
