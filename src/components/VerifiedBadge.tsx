import { Check } from 'lucide-react';

interface VerifiedBadgeProps {
  className?: string;
}

export function VerifiedBadge({ className = 'h-4 w-4' }: VerifiedBadgeProps) {
  return (
    <span
      aria-label="Verified"
      role="img"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground ${className}`}
    >
      <Check aria-hidden="true" className="h-[72%] w-[72%] stroke-[3.5]" />
    </span>
  );
}