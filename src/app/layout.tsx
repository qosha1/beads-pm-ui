import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beads Dashboard",
  description: "Interactive Gantt chart for beads visualization",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
