import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface GameCardProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  minPrice: number;
  onBuyNow: (id: string) => void;
}

export function GameCard({ id, name, description, imageUrl, minPrice, onBuyNow }: GameCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('my-MM').format(price);
  };

  // Game-specific colors for variety
  const gameColors: Record<string, string> = {
    'Mobile Legends': 'from-blue-600 to-purple-700',
    'PUBG Mobile': 'from-amber-600 to-orange-700',
    'Free Fire': 'from-orange-500 to-red-600',
    'Genshin Impact': 'from-cyan-500 to-blue-600',
    'Call of Duty Mobile': 'from-green-600 to-emerald-700',
    'Valorant': 'from-red-500 to-pink-600',
    'Roblox': 'from-red-600 to-rose-700',
    'Clash of Clans': 'from-yellow-500 to-amber-600',
  };

  const gradientClass = gameColors[name] || 'from-primary to-accent';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.2 }}
      className="group gaming-card rounded-xl overflow-hidden gaming-card-hover transition-all duration-300"
    >
      {/* Image Container */}
      <div className={`relative h-32 bg-gradient-to-br ${gradientClass} overflow-hidden`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h3 className="font-gaming text-lg font-bold text-white text-center px-2 drop-shadow-lg">
            {name}
          </h3>
        </div>
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-primary/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description || 'Top up your game credits instantly'}
        </p>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>
            <p className="text-lg font-bold text-primary gaming-glow-text">
              {formatPrice(minPrice)} ကျပ်
            </p>
          </div>
          
          <Button
            onClick={() => onBuyNow(id)}
            size="sm"
            className="gaming-btn border-0 gap-1"
          >
            <ShoppingCart className="h-4 w-4" />
            Buy
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
