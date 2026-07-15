import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { NavBar } from "../components/NavBar";
import { Footer } from "../components/Footer";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "Halaal — On-chain certificate verification",
  description:
    "Issue tamper-proof Halaal certificates as Polygon NFTs. Verify any certificate in seconds, no login required.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-paper text-ink antialiased">
        <NavBar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
