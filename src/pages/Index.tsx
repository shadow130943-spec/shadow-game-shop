import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, Zap, Shield, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { ProductGrid } from '@/components/ProductGrid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    // Future: Navigate to product detail page
  };

  const features = [
    { icon: Zap, title: 'Instant Delivery', desc: 'Get credits in seconds' },
    { icon: Shield, title: 'Secure Payment', desc: '100% safe transactions' },
    { icon: Clock, title: '24/7 Support', desc: 'Always here to help' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 gaming-gradient" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Gamepad2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Myanmar's #1 Game Top-up</span>
            </div>
            
            <h1 className="font-gaming text-3xl md:text-5xl font-bold mb-4 gaming-glow-text">
              <span className="text-primary">INSTANT</span> GAME TOP-UP
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Fast, secure, and reliable game credits for all your favorite games.
              Top up in seconds, play without limits!
            </p>
            
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-4 md:gap-8 max-w-2xl mx-auto"
          >
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm md:text-base">{feature.title}</h3>
                <p className="text-xs text-muted-foreground hidden md:block">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-8"
          >
            <h2 className="font-gaming text-xl md:text-2xl font-bold">
              <span className="text-primary">POPULAR</span> GAMES
            </h2>
            <span className="text-sm text-muted-foreground">
              {filteredProducts.length} games available
            </span>
          </motion.div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="gaming-card rounded-xl h-56 animate-pulse" />
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="font-gaming text-lg font-bold text-primary gaming-glow-text mb-2">
            GAME<span className="text-foreground">TOP</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 GameTop. Your trusted game top-up partner in Myanmar.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
