export const APP_ROLES = ["OWNER", "ADMIN", "CULTURE_REVIEWER", "EDITOR", "OPS", "VIEWER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const STUDIO_ROLES = new Set<AppRole>(APP_ROLES);

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole);
}
