import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import heroBanner from '@/assets/hero-banner.jpg';
import { useHeroSlides } from '@/hooks/useShopContent';

export function HeroBanner() {
  const slides = useHeroSlides();
  const images = slides.length > 0 ? slides : [heroBanner];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start' },
    [Autoplay({ delay: 4000, stopOnInteraction: false })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
  }, [emblaApi, images.length]);

  return (
    <div className="mx-4 relative">
      <div className="rounded-2xl overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {images.map((src, i) => (
            <div className="flex-[0_0_100%] min-w-0" key={i}>
              <img
                src={src}
                alt={`promotion ${i + 1}`}
                className="w-full h-36 sm:h-44 md:h-52 lg:h-60 object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selectedIndex ? 'w-5 bg-primary' : 'w-1.5 bg-white/50'
              }`}
              aria-label={`slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
