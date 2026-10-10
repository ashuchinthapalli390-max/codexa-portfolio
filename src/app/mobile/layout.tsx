import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodeXa Mobile — Official Android App | CodeXa Agency",
  description:
    "Download CodeXa Mobile, the official CodeXa Agency Android workspace. Available exclusively on our official website. Connect your attendance, classes, assignments, projects, and real-time team communication.",
  alternates: {
    canonical: "https://codxa-agency.online/mobile",
  },
  openGraph: {
    title: "CodeXa Mobile — Official Android App | CodeXa Agency",
    description:
      "Official Android workspace for CodeXa Agency members. Download verified APK exclusively at codxa-agency.online.",
    url: "https://codxa-agency.online/mobile",
    siteName: "CodeXa Agency",
    images: [
      {
        url: "https://codxa-agency.online/appstore/screenshot-1.png",
        width: 1080,
        height: 1920,
        alt: "CodeXa Mobile Official Android App",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CodeXa Mobile — Official Android App | CodeXa Agency",
    description: "Download the official CodeXa Agency Android app exclusively from codxa-agency.online.",
    images: ["https://codxa-agency.online/appstore/screenshot-1.png"],
  },
};

export default function MobileShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
