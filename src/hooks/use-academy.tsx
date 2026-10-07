'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DemoState } from '@/domain/entities';
import { seed } from '@/data/demo/seed';
import { createRepository } from '@/data/repositories/demo-repository';
import { browserStorage } from '@/services/storage/demo-storage';
const repository = createRepository(browserStorage);
const Context = createContext<{ data: DemoState; update: (fn: (state: DemoState) => DemoState) => void; ready: boolean; toast: string; notify: (message: string) => void; reset: () => void } | null>(null);
export function AcademyProvider({ children }: { children: ReactNode }) {
 const [data, setData] = useState(seed); const [ready, setReady] = useState(false); const [toast, notify] = useState('');
 useEffect(() => { const id = setTimeout(() => { setData(repository.load()); setReady(true); }, 0); return () => clearTimeout(id); }, []);
 useEffect(() => { if (!toast) return; const id = setTimeout(() => notify(''), 4500); return () => clearTimeout(id); }, [toast]);
 function update(fn: (state: DemoState) => DemoState) { const next = fn(data); try { repository.save(next); setData(next); notify('Saved to this browser · Demo Data'); } catch { notify('Could not save: browser storage is unavailable.'); } }
 function reset() { repository.reset(); setData(structuredClone(seed)); notify('Demo data reset'); }
 return <Context.Provider value={{ data, update, ready, toast, notify, reset }}>{children}</Context.Provider>;
}
export function useAcademy() { const ctx = useContext(Context); if (!ctx) throw new Error('AcademyProvider required'); return ctx; }
