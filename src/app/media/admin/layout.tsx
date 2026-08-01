import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CTR Media Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-carbon-950 font-body text-white/90">{children}</div>;
}
