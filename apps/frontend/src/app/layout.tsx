import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thapathali Campus Service Status",
  description:
    "Official uptime and service health dashboard for Tribhuvan University IOE Thapathali Campus digital systems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
