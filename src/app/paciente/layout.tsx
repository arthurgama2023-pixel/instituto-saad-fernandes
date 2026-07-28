import { BottomNav } from "@/components/brand/BottomNav";

export default function PacienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="brand-app min-h-screen pb-28">
      {children}
      <BottomNav />
    </div>
  );
}
