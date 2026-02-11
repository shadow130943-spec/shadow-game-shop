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

export function GameCard({ id, name, imageUrl, minPrice, onBuyNow }: GameCardProps) {
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

  const gradientClass = gameColors[name] || 'from-accent to-secondary';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-4 p-3 rounded-xl gaming-card gaming-card-hover transition-all cursor-pointer"
    >
      {/* Game Image */}
      <div className={`w-20 h-20 min-w-[5rem] rounded-xl overflow-hidden bg-gradient-to-br ${gradientClass}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2">
            <span className="font-gaming text-[10px] font-bold text-white text-center drop-shadow-lg leading-tight">
              {name}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-base truncate">{name}</h3>
        <p className="text-sm text-muted-foreground">{minPrice.toLocaleString()} Sold</p>
      </div>

      {/* Buy Button */}
      <Button
        onClick={() => onBuyNow(id)}
        className="gaming-btn border-0 rounded-full px-5 text-sm font-semibold text-primary-foreground shrink-0"
      >
        ဝယ်မည်
      </Button>
    </motion.div>
  );
}
