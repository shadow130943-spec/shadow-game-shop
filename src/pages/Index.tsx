import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Gamepad2 } from 'lucide-react';

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
    const product = products.find((p) => p.id === id);
    toast.info(`Opening ${product?.name} top-up options...`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-[hsl(0_30%_12%)] to-[hsl(0_40%_18%)]">
      <Header />

      {/* Search Section */}
      <div className="px-4 py-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Myanmar Text */}
      <div className="px-4 pb-2">
        <p className="text-sm text-muted-foreground">
          သင့်ရဲ့နိုင်သည့် Game အမျိုးအစားများ
        </p>
      </div>

      {/* Products Section */}
      <section className="px-4 pb-10">
        <h2 className="font-gaming text-xl font-bold text-center mb-6 tracking-wider">
          OUR PRODUCTS
        </h2>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
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
