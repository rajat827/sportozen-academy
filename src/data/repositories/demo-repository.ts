import type { DemoState } from '@/domain/entities';
import type { StorageAdapter } from '@/services/storage/demo-storage';
export interface AcademyRepository { load(): DemoState; save(state: DemoState): void; reset(): void }
export function createRepository(adapter: StorageAdapter): AcademyRepository { return { load: () => adapter.load(), save: state => adapter.save(state), reset: () => adapter.reset() }; }
export function parentRecords(state: DemoState, guardianId: string) {
 const ids = new Set(state.guardians.find(g => g.id === guardianId)?.playerIds ?? []);
 return { players: state.players.filter(p => ids.has(p.id)), goals: state.goals.filter(g => ids.has(g.playerId)), paths: state.paths.filter(p => ids.has(p.playerId)), evidence: state.evidence.filter(e => ids.has(e.playerId) && e.status === 'Coach Reviewed'), reports: state.reports.filter(r => ids.has(r.playerId) && r.status === 'Approved'), observations: state.observations.filter(o => ids.has(o.playerId) && o.public), charges: state.charges.filter(c => ids.has(c.playerId)), payments: state.payments.filter(p => ids.has(p.playerId)), messages: state.messages.filter(m => ids.has(m.playerId) && m.status === 'Approved') };
}
