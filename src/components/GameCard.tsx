import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface GameCardProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  minPrice: number;
  onBuyNow: (id: string) => void;
}

export function GameCard({ id, name, imageUrl, onBuyNow }: GameCardProps) {
  // Game-specific colors for placeholder gradients
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
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center gap-2"
    >
      {/* Game Image */}
      <div className={`w-full aspect-square rounded-2xl overflow-hidden bg-gradient-to-br ${gradientClass}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <span className="font-gaming text-sm font-bold text-white text-center drop-shadow-lg">
              {name}
            </span>
          </div>
        )}
      </div>

      {/* Buy Now Button */}
      <Button
        onClick={() => onBuyNow(id)}
        variant="outline"
        className="w-full rounded-lg border-2 border-foreground bg-transparent text-foreground font-semibold hover:bg-foreground hover:text-background transition-colors"
      >
        Buy Now
      </Button>
    </motion.div>
  );
}
