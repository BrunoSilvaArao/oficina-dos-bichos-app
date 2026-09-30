import BottomNav from "./BottomNav";

export default function MobilePage({ children }: { children: React.ReactNode }) {
  return <main className="app-bg"><section className="mobile-shell">{children}<BottomNav /></section></main>;
}
