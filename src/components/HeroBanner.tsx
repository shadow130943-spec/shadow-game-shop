import heroBanner from '@/assets/hero-banner.jpg';

export function HeroBanner() {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden">
      <img src={heroBanner} alt="24 hours top up promotion" className="w-full h-40 object-cover" />
    </div>
  );
}
