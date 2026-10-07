import type { Metadata } from 'next';
import { AcademyProvider } from '@/hooks/use-academy';
import { AppShell } from '@/components/layout/app-shell';
import '@/styles/globals.css';
export const metadata: Metadata = { title: 'Sportozen Academy', description: 'One team. A different development path for every player.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><AcademyProvider><AppShell>{children}</AppShell></AcademyProvider></body></html>; }
