import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { BottomNav } from '@/components/BottomNav';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      console.error(error);
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
    <div className="min-h-screen bg-background pb-6">
      <Header />

      {/* Hero Banner */}
      <div className="py-3">
        <HeroBanner />
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2 flex gap-3">
        <button className="flex-1 py-2.5 rounded-lg gaming-btn text-sm font-semibold text-primary-foreground" onClick={() => navigate('/deposit')}>
          ငွေဖြည့်မည်
        </button>
        <button className="flex-1 py-2.5 rounded-lg bg-muted border border-border text-sm font-semibold text-foreground" onClick={() => navigate('/deposit-history')}>
          အော်ဒါများ
        </button>
      </div>

      {/* Search Section */}
      <div className="px-4 py-3">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Products Section */}
      <section className="px-4 pb-10">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <ProductGrid products={filteredProducts} onBuyNow={handleBuyNow} />
        ) : (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-gaming text-xl mb-2">No games found</h3>
            <p className="text-muted-foreground">Try a different search term</p>
          </div>
        )}
      </section>

    </div>
  );
};

export default Index;
