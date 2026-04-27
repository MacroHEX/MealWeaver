/**
 * Returns the scope used for querying shared data.
 * If the user belongs to a household, all household members share the same data.
 * Otherwise falls back to the individual user ID.
 */
export function getScopeId(user: { id: string; householdId?: string | null }): string {
  return user.householdId ?? user.id;
}
