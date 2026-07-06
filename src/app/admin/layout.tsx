/**
 * Admin layout — wraps all /admin/* pages
 * Dark theme, no public navbar/footer
 */
import type { Metadata } from "next";
import "../../app/globals.css";

export const metadata: Metadata = {
  title: "Admin — CODEXA AGENCY",
  description: "Restricted admin access",
  robots: { index: false, follow: false }, // Never index admin pages
};

export default function AdminLayout({
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
