import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CODEXA AGENCY | Where Ideas Become Digital Reality",
  description: "High-end cinematic technology agency specializing in AI models development, custom web/mobile application architectures, and robust cybersecurity audits.",
  keywords: ["AI Development", "Next.js", "Web Development", "Cybersecurity Agency", "Ashu", "Deepak", "Venu"],
  authors: [{ name: "Ashu" }, { name: "Deepak" }, { name: "Venu" }],
  openGraph: {
    title: "CODEXA AGENCY | Where Ideas Become Digital Reality",
    description: "Futuristic developer agency engineering digital products & ecosystems. Learn. Build. Deploy. Grow.",
    url: "https://www.codeaxisapply.xyz",
    siteName: "CodeXa Agency",
    images: [
      {
        url: "/assets/images/logo.jpeg",
        width: 800,
        height: 800,
        alt: "CodeXa Agency Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" type="image/jpeg" href="/assets/images/logo.jpeg" />
      </head>
      <body className="antialiased selection:bg-crimson selection:text-white bg-[#070707] text-[#F7F7F7]">
        {children}
      </body>
    </html>
  );
}
