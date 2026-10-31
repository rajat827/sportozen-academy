import type { Metadata } from "next";
import "@/styles/globals.css";
export const metadata: Metadata = {
  title: "Sportozen Academy",
  description: "One team. A different development path for every player.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
