import "server-only";
import type { TrialEnrolment, TrialPolicy } from "@/domain/trial";
import { database } from "./database";
import { WorkspaceError } from "./auth";
export const trialRepository = {
  policy(academyId: string, currency: string): TrialPolicy {
    const row = database()
      .prepare("SELECT body FROM academy_trial_policies WHERE academyId=?")
      .get(academyId);
    return row
      ? JSON.parse(String(row.body))
      : {
          version: 0,
          defaultDurationDays: null,
          paidTrialsAllowed: false,
          defaultFeeMinor: 0,
          currency,
          feeRuleNote: "",
        };
  },
  savePolicy(academyId: string, policy: TrialPolicy) {
    database()
      .prepare(
        "INSERT INTO academy_trial_policies(academyId,body) VALUES(?,?) ON CONFLICT(academyId) DO UPDATE SET body=excluded.body",
      )
      .run(academyId, JSON.stringify(policy));
    return policy;
  },
  list(academyId: string): TrialEnrolment[] {
    return database()
      .prepare(
        "SELECT body FROM academy_trial_enrolments WHERE academyId=? ORDER BY rowid",
      )
      .all(academyId)
      .map((row) => JSON.parse(String(row.body)));
  },
  find(academyId: string, id: string): TrialEnrolment | undefined {
    const row = database()
      .prepare(
        "SELECT body FROM academy_trial_enrolments WHERE academyId=? AND id=?",
      )
      .get(academyId, id);
    return row ? JSON.parse(String(row.body)) : undefined;
  },
  save(value: TrialEnrolment, expectedVersion: number) {
    const old = trialRepository.find(value.academyId, value.id);
    if ((old?.version ?? 0) !== expectedVersion)
      throw new WorkspaceError(
        409,
        "Trial changed. Reload before reviewing or saving.",
      );
    database()
      .prepare(
        "INSERT INTO academy_trial_enrolments(academyId,id,playerId,version,body) VALUES(?,?,?,?,?) ON CONFLICT(academyId,id) DO UPDATE SET version=excluded.version,body=excluded.body",
      )
      .run(
        value.academyId,
        value.id,
        value.playerId,
        value.version,
        JSON.stringify(value),
      );
    return value;
  },
};
