import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

import { Providers } from "@/store/provider";
import { Toaster } from "react-hot-toast";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Samarth Admin Dashboard",
  description: "Modern Admin Dashboard – Samarth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">

        {/* Redux Provider */}
        <Providers>
          
          {/* Pages */}
          {children}

          {/* Toast System */}
          <Toaster position="top-right" />

        </Providers>

      </body>
    </html>
  );
}