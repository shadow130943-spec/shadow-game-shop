export function HeroBanner() {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden bg-gradient-to-r from-accent to-secondary h-40 flex items-center justify-center relative">
      <div className="text-center z-10">
        <p className="text-sm text-primary-foreground">Can be purchased within 24 hours, please top up</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-accent/50 to-transparent" />
    </div>
  );
}
