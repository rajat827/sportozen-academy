import type {ReactNode} from 'react';
import {AcademyProvider} from '@/hooks/use-academy';
import {AppShell} from '@/components/layout/app-shell';
export default function DemoLayout({children}:{children:ReactNode}){return <AcademyProvider><AppShell>{children}</AppShell></AcademyProvider>;}
