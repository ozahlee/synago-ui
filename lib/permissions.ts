/** Human wording for permission keys, shown on profile and access screens. */
export const PERMISSION_LABELS: Record<string, { label: string; area: string }> = {
  "members.view": { label: "View members, ministries & registers", area: "Congregation" },
  "members.manage": { label: "Add & edit members, baptisms", area: "Congregation" },
  "ministries.manage": { label: "Manage ministries", area: "Congregation" },
  "finance.view": { label: "View offertory, accounts & reports", area: "Stewardship" },
  "finance.manage": { label: "Record offerings & transactions", area: "Stewardship" },
  "alerts.manage": { label: "Post announcements & notifications", area: "Office" },
  "users.manage": { label: "Manage staff accounts & roles", area: "Administration" },
  "settings.manage": { label: "Change church settings", area: "Administration" },
  "welfare.manage": { label: "Manage welfare cases", area: "Stewardship" },
  "sms.send": { label: "Send bulk SMS", area: "Office" },
  "sacraments.override": { label: "Complete a baptism/confirmation with requirements missing", area: "Congregation" },
  "groups.lead": { label: "See “My groups” (position-holders)", area: "Leaders" },
}

export const ROLE_BLURB: Record<string, string> = {
  admin: "Full access, including staff accounts and church settings",
  pastor: "Congregation, giving reports and announcements; can't record money",
  secretary: "Members, ministries, registers and announcements; no finances",
  treasurer: "Records and reports giving and expenses; read-only members",
  leader: "Sunday school teachers, ministry chairs and cell leaders: only their own group",
}
