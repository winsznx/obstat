import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OBSTAT — Continuous Clearance Evidence Control",
  description: "Screenplay clearance evidence control for film productions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
