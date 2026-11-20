import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scoreboard",
  description: "Live two-competitor scoreboard with an admin view and a public viewer.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23FCFBF5'/%3E%3Crect x='3' y='7' width='12' height='16' rx='4' fill='%232B2A78'/%3E%3Crect x='6' y='11' width='6' height='2.4' rx='1.2' fill='%2333D6A3'/%3E%3Crect x='17' y='7' width='12' height='16' rx='4' fill='%2333D6A3'/%3E%3Crect x='20' y='11' width='6' height='2.4' rx='1.2' fill='%232B2A78'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F6F5EC",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
