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
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 p-3 rounded-xl gaming-card gaming-card-hover cursor-pointer"
      onClick={() => onBuyNow(id)}
    >
      {/* Game Image */}
      <div className="w-14 h-14 min-w-[3.5rem] rounded-lg overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground text-center leading-tight px-1">
              {name}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm truncate">{name}</h3>
        <p className="text-xs text-muted-foreground">{minPrice.toLocaleString()} Sold</p>
      </div>

      {/* Buy Button */}
      <Button
        size="sm"
        onClick={(e) => { e.stopPropagation(); onBuyNow(id); }}
        className="gaming-btn border-0 rounded-lg px-4 text-xs font-semibold shrink-0"
      >
        ဝယ်မည်
      </Button>
    </motion.div>
  );
}
