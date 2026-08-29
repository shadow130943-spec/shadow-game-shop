import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface GameCardProps {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  minPrice: number;
  onBuyNow: (id: string) => void;
}

function GameCardBase({ id, name, imageUrl, onBuyNow }: GameCardProps) {
  const handleClick = useCallback(() => onBuyNow(id), [id, onBuyNow]);
  const handleButton = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onBuyNow(id);
    },
    [id, onBuyNow],
  );

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl gaming-card gaming-card-hover cursor-pointer animate-fade-in"
      onClick={handleClick}
    >
      {/* Game Image */}
      <div className="w-14 h-14 min-w-[3.5rem] rounded-lg overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
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
      </div>

      {/* Buy Button */}
      <Button
        size="sm"
        onClick={handleButton}
        className="gaming-btn border-0 rounded-lg px-4 text-xs font-semibold shrink-0"
      >
        ဝယ်မည်
      </Button>
    </div>
  );
}

export const GameCard = memo(GameCardBase);
