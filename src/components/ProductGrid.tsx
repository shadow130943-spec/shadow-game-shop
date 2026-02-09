import { GameCard } from './GameCard';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  min_price: number;
}

interface ProductGridProps {
  products: Product[];
  onBuyNow: (id: string) => void;
}

export function ProductGrid({ products, onBuyNow }: ProductGridProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
    >
      {products.map((product) => (
        <GameCard
          key={product.id}
          id={product.id}
          name={product.name}
          description={product.description}
          imageUrl={product.image_url}
          minPrice={product.min_price}
          onBuyNow={onBuyNow}
        />
      ))}
    </motion.div>
  );
}
