import type { Session } from "next-auth";

/**
 * Returns the scope used for querying shared data.
 * If the user belongs to a household, all household members share the same data.
 * Otherwise falls back to the individual user ID.
 */
export function getScopeId(session: Session): string {
  return session.user.householdId ?? session.user.id;
}
