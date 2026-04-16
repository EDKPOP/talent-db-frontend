import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "KEENS Casting DB",
  description: "K-pop talent casting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 font-sans">
        <Providers>
          <Nav />
          <main className="flex-1 p-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
