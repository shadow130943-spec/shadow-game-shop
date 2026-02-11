import { GameCard } from './GameCard';

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
  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}
