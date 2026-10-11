import type {
  AcademyConfiguration,
  AcademyMembership,
  WorkspaceKind,
  WorkspaceRecords,
} from "@/domain/workspace";
export interface WorkspaceRepository {
  academy(academyId: string): AcademyConfiguration | undefined;
  membership(academyId: string, userId: string): AcademyMembership | undefined;
  list<K extends WorkspaceKind>(
    academyId: string,
    kind: K,
  ): WorkspaceRecords[K][];
  find<K extends WorkspaceKind>(
    academyId: string,
    kind: K,
    id: string,
  ): WorkspaceRecords[K] | undefined;
  save<K extends WorkspaceKind>(
    academyId: string,
    kind: K,
    record: WorkspaceRecords[K],
  ): void;
}
