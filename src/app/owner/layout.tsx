/**
 * Owner section layout — wraps all /owner/* pages
 * Dark CodeXa theme, no public navbar/footer
 */
import type { Metadata } from "next";
import "../../app/globals.css";

export const metadata: Metadata = {
  title: "Owner — CODEXA AGENCY",
  description: "Owner-only control panel",
  robots: { index: false, follow: false },
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] antialiased">
      {children}
    </div>
  );
}
