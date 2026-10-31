import "server-only";
import type {
  CommunicationSettings,
  GuardianContact,
  DeliveryJob,
} from "@/domain/communication";
import { database } from "./database";
export const communicationRepository = {
  settings(academyId: string): CommunicationSettings | undefined {
    const r = database()
      .prepare("SELECT body FROM communication_settings WHERE academyId=?")
      .get(academyId);
    return r ? JSON.parse(String(r.body)) : undefined;
  },
  saveSettings(s: CommunicationSettings) {
    database()
      .prepare(
        "INSERT INTO communication_settings VALUES(?,?) ON CONFLICT(academyId) DO UPDATE SET body=excluded.body",
      )
      .run(s.academyId, JSON.stringify(s));
  },
  contact(academyId: string, guardianId: string): GuardianContact | undefined {
    const r = database()
      .prepare(
        "SELECT body FROM guardian_contacts WHERE academyId=? AND guardianId=?",
      )
      .get(academyId, guardianId);
    return r ? JSON.parse(String(r.body)) : undefined;
  },
  saveContact(c: GuardianContact) {
    database()
      .prepare(
        "INSERT INTO guardian_contacts VALUES(?,?,?,?) ON CONFLICT(academyId,guardianId) DO UPDATE SET phone=excluded.phone,body=excluded.body",
      )
      .run(c.academyId, c.guardianId, c.phone, JSON.stringify(c));
  },
  jobs(academyId: string): DeliveryJob[] {
    return database()
      .prepare(
        "SELECT * FROM delivery_jobs WHERE academyId=? ORDER BY dueAt DESC",
      )
      .all(academyId) as unknown as DeliveryJob[];
  },
  job(id: string): DeliveryJob | undefined {
    return database()
      .prepare("SELECT * FROM delivery_jobs WHERE id=?")
      .get(id) as unknown as DeliveryJob | undefined;
  },
  setState(
    id: string,
    state: DeliveryJob["state"],
    reason: string,
    providerId?: string,
  ) {
    database()
      .prepare(
        "UPDATE delivery_jobs SET state=?,reason=?,providerId=COALESCE(?,providerId),claim=NULL,claimedAt=NULL WHERE id=?",
      )
      .run(state, reason, providerId ?? null, id);
  },
};
