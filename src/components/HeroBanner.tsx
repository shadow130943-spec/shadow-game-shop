export function HeroBanner() {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden bg-gradient-to-r from-accent to-secondary h-40 flex items-center justify-center relative">
      <div className="text-center z-10">
        <h2 className="font-gaming text-lg font-bold text-primary-foreground">24hours ဝယ်ယူနိုင်ပါ</h2>
        <p className="text-sm text-primary-foreground/80 mt-1">ငွေကြိုဖြည့်ကြစို့</p>
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-accent/50 to-transparent" />
    </div>
  );
}
