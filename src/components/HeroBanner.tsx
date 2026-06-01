import heroBanner from '@/assets/hero-banner.jpg';
import { useBrandingAsset } from '@/hooks/useShopContent';

export function HeroBanner() {
  const customUrl = useBrandingAsset('hero_banner');
  return (
    <div className="mx-4 rounded-2xl overflow-hidden">
      <img
        src={customUrl || heroBanner}
        alt="24 hours top up promotion"
        className="w-full h-36 sm:h-44 md:h-52 lg:h-60 object-cover"
      />
    </div>
  );
}
