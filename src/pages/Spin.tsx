import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BottomNav } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Gift, Ticket, RotateCw } from 'lucide-react';

const SEGMENTS = [
  { label: '100 Coins', color: 'hsl(var(--primary))' },
  { label: 'Free Spin', color: 'hsl(var(--secondary))' },
  { label: '50 Coins', color: 'hsl(var(--gaming-gold))' },
  { label: '200 Coins', color: 'hsl(var(--destructive))' },
  { label: '10 Coins', color: 'hsl(var(--muted))' },
  { label: '500 Coins', color: 'hsl(var(--accent))' },
];

export default function Spin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [tickets, setTickets] = useState(3);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center pb-20 px-4">
        <p className="text-muted-foreground mb-4">အကောင့်ဝင်ရောက်ရန် လိုအပ်ပါသည်</p>
        <Button className="gaming-btn border-0" onClick={() => navigate('/login')}>Login</Button>
        <BottomNav />
      </div>
    );
  }

  const handleSpin = () => {
    if (spinning || tickets <= 0) return;
    setSpinning(true);
    setResult(null);
    setTickets(t => t - 1);

    const segmentIndex = Math.floor(Math.random() * SEGMENTS.length);
    const segmentAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 * 5 + (360 - segmentIndex * segmentAngle - segmentAngle / 2);
    const newRotation = rotation + targetAngle;
    setRotation(newRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[segmentIndex].label);
    }, 4000);
  };

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-foreground text-center mb-2">ကံစမ်းဘီး</h1>

        {/* Ticket Counter */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Ticket className="h-5 w-5 text-gaming-gold" />
          <span className="text-sm font-medium text-foreground">
            ကံစမ်းလက်မှတ် <span className="text-primary font-bold">{tickets}</span> စောင်
          </span>
        </div>

        {/* Wheel */}
        <div className="relative mx-auto w-72 h-72 mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
          </div>

          <motion.div
            className="w-full h-full rounded-full border-4 border-border overflow-hidden relative"
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.17, 0.67, 0.12, 0.99] }}
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {SEGMENTS.map((seg, i) => {
                const startAngle = i * segmentAngle - 90;
                const endAngle = startAngle + segmentAngle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;
                const x1 = 100 + 100 * Math.cos(startRad);
                const y1 = 100 + 100 * Math.sin(startRad);
                const x2 = 100 + 100 * Math.cos(endRad);
                const y2 = 100 + 100 * Math.sin(endRad);
                const largeArc = segmentAngle > 180 ? 1 : 0;
                const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
                const textX = 100 + 60 * Math.cos(midAngle);
                const textY = 100 + 60 * Math.sin(midAngle);
                const textRotation = (startAngle + endAngle) / 2 + 90;

                return (
                  <g key={i}>
                    <path
                      d={`M100,100 L${x1},${y1} A100,100 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={seg.color}
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                      className="fill-foreground text-[7px] font-bold"
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>
        </div>

        {/* Spin Button */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleSpin}
            disabled={spinning || tickets <= 0}
            className="gaming-btn border-0 px-10 py-3 text-base font-bold rounded-xl"
          >
            <RotateCw className={`h-5 w-5 mr-2 ${spinning ? 'animate-spin' : ''}`} />
            {spinning ? 'လည်နေပါသည်...' : tickets <= 0 ? 'လက်မှတ်ကုန်ပါပြီ' : 'Start'}
          </Button>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-6 p-4 rounded-xl border border-primary/30 bg-primary/10"
          >
            <Gift className="h-8 w-8 text-gaming-gold mx-auto mb-2" />
            <p className="text-lg font-bold text-foreground">🎉 {result} ရရှိပါပြီ!</p>
          </motion.div>
        )}

        {/* Prize List */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            ဆုလာဘ်များ
          </h3>
          <div className="space-y-2">
            {SEGMENTS.map((seg, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-sm text-foreground">{seg.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
