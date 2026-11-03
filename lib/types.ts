// Mirrors synago-backend's API resources (app/Http/Resources). IDs are strings.

export type ChurchStatus = "trial" | "active" | "suspended"
/** The signed-in user's church (tenant). */
export type ChurchSummary = {
  id: string
  name: string
  slug: string
  status: ChurchStatus
  plan: string | null
  trialEndsAt: string | null
  trialDaysLeft: number | null
  onboarded: boolean
}
export type User = {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  emailVerified: boolean
  /** Synago platform owner (no church; uses the /platform console) */
  platformAdmin: boolean
  roles: string[]
  permissions: string[]
  church: ChurchSummary | null
}
export type PlatformChurch = Omit<ChurchSummary, "onboarded"> & {
  onboarded: boolean
  denomination: string
  diocese: string | null
  phone: string | null
  email: string | null
  country: string
  createdAt: string | null
  lastActiveAt: string | null
  members?: number
  users?: number
  owner?: { name: string; email: string; phone: string | null; verified: boolean } | null
}
export type PlatformStats = { churches: number; trial: number; active: number; suspended: number; trialsEndingThisWeek: number; newThisMonth: number; activeLast7Days: number; members: number; users: number }

export type Member = {
  id: string
  /** Pledge / envelope number, e.g. "SJW-0042" */
  pledgeNumber: string | null
  name: string
  email: string | null
  phone: string | null
  gender: "male" | "female"
  dateOfBirth: string | null
  dateJoined: string
  status: "active" | "inactive" | "deceased"
  dateOfDeath?: string | null
  sundaySchool: boolean
  sundaySchoolClassId?: string | null
  sundaySchoolClass?: string | null
  cellGroupId?: string | null
  cellGroup?: string | null
  householdId?: string | null
  household?: string | null
  nextOfKin?: { name: string | null; relationship: string | null; phone: string | null; memberId: string | null }
  positions?: Array<{ title: string; scope: string; startDate: string | null; current: boolean }>
  address: string | null
  village: string | null
  parish: string | null
  subCounty: string | null
  /** Primary ministry name */
  ministry: string | null
  ministries: Array<{ id: string; name: string; isPrimary: boolean }>
}

export const OFFERTORY_CATEGORIES = ["tithe", "pledge", "thanksgiving", "harvest"] as const
export type OffertoryCategory = (typeof OFFERTORY_CATEGORIES)[number]

export type Offertory = {
  id: string
  date: string
  /** "First Service", "Second Service"… (null when not recorded) */
  service: string | null
  category: OffertoryCategory
  amount: number
  paymentMethod: string
  reference: string
  memberId: string | null
  pledgeNumber: string | null
  cellGroupId?: string | null
  contributor: string
  notes: string | null
}

export type OffertorySummary = {
  total: number
  byCategory: Record<OffertoryCategory, { total: number; count: number }>
}

export type Ministry = {
  id: string
  name: string
  description: string | null
  leaderId: string | null
  leader: string | null
  members: number
  meetingDay: string | null
  meetingTime: string | null
  location: string | null
  status: "active" | "inactive"
  memberList?: Array<{ id: string; name: string; joinedAt: string | null }>
  activities?: Array<{ id: string; title: string; description: string | null; scheduledAt: string | null }>
}

export type Transaction = {
  id: string
  date: string
  type: "income" | "expense"
  category: string
  amount: number
  paymentMethod: string | null
  description: string
  payee: string | null
  reference: string
  projectId?: string | null
  project?: string | null
}

export type AccountsSummary = { income: number; expense: number; balance: number }
export type AccountsTrend = { month: string; period: string; income: number; expenses: number }

export type Budget = {
  id: string
  category: string
  allocated: number
  spent: number
  period: string
  status: "on-track" | "warning" | "exceeded"
  notes: string | null
}

export type Notification = {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  date: string
  read: boolean
  important: boolean
  archived: boolean
}


export type DashboardStats = {
  totalMembers: number
  membersChange: number
  activeMembers: number
  attendanceRate: number | null
  sundaySchool: number
  sundaySchoolClasses: number | null
  monthlyOffertory: number
  offertoryChange: number
  membershipByGender: { male: number; female: number }
  offertoryTrends: Array<{ month: string; tithe: number; pledge: number; thanksgiving: number; harvest: number }>
  recentActivities: Array<{ id: string; name: string; action: string; time: string }>
}

export const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"] as const
export const TRANSACTION_CATEGORIES = {
  income: ["Offerings", "Tithes", "Donations", "Events", "Fundraising", "Rental Income", "Welfare", "Other"],
  expense: ["Utilities", "Salaries", "Maintenance", "Ministry Programs", "Outreach", "Media & Technology", "Supplies", "Events", "Missions", "Welfare", "Other"],
} as const

export type Denomination = "anglican" | "pentecostal" | "other"

export type ChurchSettings = {
  churchName: string
  denomination: Denomination
  diocese: string | null
  address: string | null
  pledgePrefix: string
  services: string[]
  serviceTimes?: Array<string | null>
  quietHoursStart?: string
  quietHoursEnd?: string
  smsMonthlyBudget?: number
  financialYearStartMonth?: number
  sacramentRequirements: RequirementConfig[]
}

export const RITE_KINDS = ["baptism", "confirmation", "dedication"] as const
export type RiteKind = (typeof RITE_KINDS)[number]

export type Baptism = {
  id: string
  memberId: string | null
  kind: RiteKind
  status: "scheduled" | "completed"
  name: string
  gender: "male" | "female" | null
  dateOfBirth: string | null
  date: string
  mode: "sprinkling" | "pouring" | "immersion" | null
  officiant: string | null
  place: string | null
  fatherName: string | null
  motherName: string | null
  sponsors: string | null
  classCompleted: boolean
  certificateNumber: string | null
  notes: string | null
  requirements: Requirement[]
  requirementsDone: number
  requirementsTotal: number
  overrideReason: string | null
}

export type BaptismStats = {
  year: number
  completedThisYear: Record<RiteKind, number>
  candidates: number
  awaitingClass: number
  nextDate: string | null
  totalRegistered: number
}

type GivingBlock = { total: number; count: number; byCategory: Record<OffertoryCategory, number> }
export type OffertoryDay = GivingBlock & { date: string; services: Array<GivingBlock & { service: string | null }> }
export type OffertoryDaySummary = { date: string; total: number; count: number; services: Array<{ service: string | null; total: number }> }

export type TitheRow = {
  memberId: string | null
  name: string
  pledgeNumber: string | null
  months: number[]
  total: number
  count: number
  monthsGiven: number
}
export type TitheReport = { year: number; from: string; to: string; months: Array<{ key: string; label: string }>; monthTotals: number[]; total: number; tithers: number; rows: TitheRow[] }

export const ANNOUNCEMENT_TYPES = ["burial", "wedding", "introduction", "thanksgiving", "fundraising", "meeting", "general"] as const
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number]
export type Announcement = {
  id: string
  type: AnnouncementType
  title: string
  subject: string | null
  details: string | null
  /** Local date-time "YYYY-MM-DDTHH:mm" */
  eventAt: string | null
  venue: string | null
  contactName: string | null
  contactPhone: string | null
  memberId: string | null
  memberName?: string | null
  pinned: boolean
  createdAt: string
}

export type Role = { name: string; permissions: string[]; users: number }

// ---- Attendance
export type AttendanceRow = { service: string; men: number; women: number; children: number; visitors: number; total: number; notes: string | null; recorded: boolean }
export type AttendanceDay = { date: string; services: AttendanceRow[]; total: number }
export type AttendanceTrends = {
  days: Array<{ date: string; men: number; women: number; children: number; visitors: number; total: number; services: Array<{ service: string; total: number }> }>
  averageTotal: number
  averageAdults: number
  attendanceRate: number | null
  activeMembers: number
}

// ---- Marriages
export type Marriage = {
  id: string
  status: "scheduled" | "completed"
  groomName: string
  groomMemberId: string | null
  brideName: string
  brideMemberId: string | null
  date: string
  place: string | null
  officiant: string | null
  witnesses: string | null
  bannsRead: number
  counsellingDone: boolean
  certificateNumber: string | null
  notes: string | null
}
export type MarriageStats = { year: number; marriedThisYear: number; planned: number; bannsPending: number; totalRegistered: number }

// ---- SMS
export type SmsAudience =
  | { type: "all" | "birthdays" | "visitors" }
  | { type: "ministry"; ministryId: number }
  | { type: "cell_group"; cellGroupId: number }
  | { type: "gender"; gender: "male" | "female" }
  | { type: "members"; memberIds: number[] }
  | { type: "numbers"; numbers: string }
export type SmsPreview = { label: string; recipients: number; withoutPhone: number; sample: string[]; example: string | null; driver: string }
export type SmsBatch = {
  id: string
  message: string
  audience: string
  audienceLabel: string
  recipients: number
  sent: number
  failed: number
  driver: string
  sentBy: string | null
  createdAt: string
  messages?: Array<{ name: string | null; phone: string; status: "sent" | "failed"; error: string | null }>
}

// ---- Statements
export type GivingStatement = {
  year: number
  from?: string
  to?: string
  member: { id: string; name: string; pledgeNumber: string | null; phone: string | null; address: string | null }
  byCategory: Record<OffertoryCategory, number>
  offertoryTotal: number
  donationTotal: number
  grandTotal: number
  gifts: Array<{ date: string; category: OffertoryCategory; service: string | null; amount: number; reference: string; pledgePurpose: string | null }>
  inKindTotal?: number
  donations: Array<{ date: string; campaign: string | null; amount: number; inKind?: string | null; inKindValue?: number | null; reference?: string }>
  pledges: Array<{ purpose: string; amount: number; paid: number; balance: number; status: string }>
}

// ---- Pledges
export type PledgeStatus = "open" | "overdue" | "fulfilled"
export type Pledge = {
  id: string
  memberId: string | null
  pledgeNumber: string | null
  pledger: string
  projectId: string | null
  project: string | null
  purpose: string
  amount: number
  paid: number
  balance: number
  pledgeDate: string
  dueDate: string | null
  status: PledgeStatus
  notes: string | null
  payments?: Array<{ id: string; date: string; amount: number; paymentMethod: string; reference: string; service: string | null }>
}
export type PledgeStats = {
  promised: number
  paid: number
  outstanding: number
  pledges: number
  fulfilled: number
  overdue: number
  byPurpose: Array<{ purpose: string; promised: number; paid: number }>
}

// ---- Visitors
export const VISITOR_STATUSES = ["new", "contacted", "returning", "joined", "lost"] as const
export type VisitorStatus = (typeof VISITOR_STATUSES)[number]
export type Visitor = {
  id: string
  name: string
  phone: string | null
  email: string | null
  gender: "male" | "female" | null
  village: string | null
  firstVisit: string
  service: string | null
  invitedBy: string | null
  howHeard: string | null
  prayerRequest: string | null
  status: VisitorStatus
  welcomeSent: boolean
  called: boolean
  visited: boolean
  invitedBack: boolean
  assignedTo: string | null
  assignee: string | null
  memberId: string | null
  followUpCount: number
  notes: string | null
  followUps?: Array<{ id: string; method: string; note: string | null; date: string; by: string | null }>
}
export type VisitorStats = { byStatus: Record<VisitorStatus, number>; last30Days: number; needsCall: number; joinedThisYear: number }

// ---- Welfare
export const WELFARE_CATEGORIES = ["bereavement", "medical", "school_fees", "food", "housing", "other"] as const
export type WelfareCategory = (typeof WELFARE_CATEGORIES)[number]
export type WelfareCase = {
  id: string
  memberId: string | null
  pledgeNumber: string | null
  beneficiary: string
  category: WelfareCategory
  description: string | null
  amountRequested: number | null
  amountApproved: number | null
  status: "pending" | "approved" | "paid" | "declined"
  decidedBy: string | null
  decidedAt: string | null
  paidReference: string | null
  createdAt: string
}
export type WelfareStats = {
  fundBalance: number
  contributed: number
  paidThisYear: number
  pending: number
  awaitingPayment: number
  awaitingPaymentAmount: number
  helpedThisYear: number
}

// ---- Cell groups
export type CellGroup = {
  id: string
  name: string
  leaderId: string | null
  leader: string | null
  leaderPhone: string | null
  host: string | null
  village: string | null
  parish: string | null
  meetingDay: string | null
  meetingTime: string | null
  location: string | null
  members: number
  areaId?: string | null
  area?: string | null
  harvestTarget?: number | null
  memberList?: Array<{ id: string; name: string; phone: string | null; pledgeNumber: string | null; status: string; village: string | null }>
}
export type CellGroupIndex = { groups: CellGroup[]; unassigned: { total: number; byVillage: Array<{ village: string | null; count: number }> } }

// ---- Church life (areas, Sunday school, care, projects, outreach, positions)
export type Area = { id: string; name: string; level: "archdeaconry" | "parish" | "region" | "village"; parentId: string | null; cellGroups: number; children: number; members: number }

export type Requirement = { key: string; label: string; fee: number | null; done: boolean; amount: number | null; note: string | null; by: string | null; at: string | null; reference: string | null }
export type RequirementConfig = { key: string; label: string; kinds: RiteKind[]; fee: number | null }

export type SundaySchoolTeacher = { memberId: string; name: string | null; phone: string | null; title: string }
export type SundaySchoolClass = {
  id: string
  name: string
  minAge: number
  maxAge: number
  room: string | null
  description: string | null
  pupils: number
  teachers: SundaySchoolTeacher[]
  lastAttendance?: number | null
  pupilList?: Array<{ id: string; name: string; gender: string; age: number | null; dateOfBirth: string | null; parent: string | null; parentPhone: string | null; attended: number }>
  recentSundays?: number
}
export type SundaySchoolIndex = { classes: SundaySchoolClass[]; unplaced: number; enrolled: number; maxAge: number }

export type HarvestReport = {
  year: number
  total: number
  target: number | null
  cells: Array<{ id: string; name: string; area: string | null; areaId: string | null; total: number; gifts: number; givers: number; target: number | null }>
  areas: Partial<Record<Area["level"], Array<{ id: string; name: string; level: string; parent: string | null; total: number; target: number | null; cells: number }>>>
  topGivers: Array<{ id: string; name: string; pledgeNumber: string | null; cell: string | null; total: number }>
  unassigned: { total: number; gifts: number }
}

export const CARE_TYPES = ["member_death", "bereavement", "sickness", "hospital", "newborn", "other"] as const
export type CareType = (typeof CARE_TYPES)[number]
export type CareCase = {
  id: string
  type: CareType
  memberId: string | null
  memberName: string | null
  subject: string | null
  relationship: string | null
  date: string
  burialDate: string | null
  burialPlace: string | null
  status: "open" | "closed"
  welfareStatus: string | null
  welfareCaseId: string | null
  announcementId: string | null
  notes: string | null
  visits: number
}
export const VISIT_TYPES = ["home", "hospital", "sick", "bereavement", "newborn", "prison", "other"] as const
export type PastoralVisit = {
  id: string
  careCaseId: string | null
  memberId: string | null
  visitee: string
  type: (typeof VISIT_TYPES)[number]
  date: string
  place: string | null
  team: string | null
  notes: string | null
  giftAmount: number | null
  followUpOn: string | null
}
export type CareStats = { openCases: number; deathsThisYear: number; visitsThisMonth: number; followUpsDue: number }

export type Project = {
  id: string
  name: string
  description: string | null
  status: "planning" | "active" | "on_hold" | "completed"
  openForContributions: boolean
  budget: number
  target: number | null
  /** target, or the budget when no separate target is set */
  goal: number
  raised: number
  inKindValue: number
  pledged: number
  /** promised but not yet paid */
  pledgeBalance: number
  spent: number
  remaining: number
  contributions: number
  startDate: string | null
  endDate: string | null
  deadline: string | null
  suggestedFamilyAmount: number | null
  managerMemberId: string | null
  manager: string | null
  transactions?: Array<{ id: string; date: string; type: "income" | "expense"; category: string; amount: number; description: string; payee: string | null; reference: string }>
  byCategory?: Array<{ category: string; amount: number }>
  milestones?: ProjectMilestone[]
  cellTargets?: Array<{ cellGroupId: string; target: number }>
  events?: Array<{ id: string; title: string; date: string }>
}

export const OUTREACH_TYPES = ["babies_home", "hospital", "prison", "school", "community", "other"] as const
export type Outreach = {
  id: string
  title: string
  type: (typeof OUTREACH_TYPES)[number]
  place: string | null
  date: string
  peopleReached: number | null
  items: string | null
  team: string | null
  cost: number | null
  expenseReference: string | null
  projectId: string | null
  project: string | null
  notes: string | null
}

export const POSITION_SCOPES = ["church", "ministry", "cell_group", "sunday_school_class", "project"] as const
export type PositionScope = (typeof POSITION_SCOPES)[number]
export type Position = {
  id: string
  memberId: string
  member: string | null
  memberPhone: string | null
  title: string
  scopeType: PositionScope
  scopeId: string | null
  scopeName: string
  startDate: string | null
  endDate: string | null
  current: boolean
  login: { email: string; active: boolean } | null
}

export type MyGroup = {
  positionTitle: string
  type: "sunday_school_class" | "ministry" | "cell_group"
  id: string
  name: string
  subtitle: string
  people: Array<{ id: string; name: string; phone: string | null; age: number | null; pledgeNumber: string | null; parent: string | null; parentPhone: string | null }>
  activities?: Array<{ id: string; title: string; scheduledAt: string | null }>
}

// ---- Calendar & reminders
export type CalendarKind = "event" | "sermon" | "service" | "meeting" | "activity" | "announcement" | "burial" | "wedding" | "sacrament" | "birthday" | "pledge" | "care" | "outreach"
export type CalendarItem = {
  id: string
  kind: CalendarKind
  title: string
  /** "YYYY-MM-DD" (all day) or "YYYY-MM-DDTHH:mm" local */
  start: string
  end: string | null
  allDay: boolean
  subtitle: string | null
  link: { type: string; id: string; tab?: string } | null
  eventType?: string
  repeats?: boolean
}
export type LiturgicalColour = "white" | "gold" | "red" | "purple" | "rose" | "green" | "black" | "blue"
export type ChurchDay = { name: string; start: string; end: string; colour: LiturgicalColour; kind: "season" | "feast"; custom?: boolean; id?: string; note?: string | null }
export type CalendarRange = { items: CalendarItem[]; seasons: ChurchDay[]; feasts: ChurchDay[]; today: string; season: ChurchDay | null }

export const EVENT_TYPES = ["service", "communion", "meeting", "fundraising", "crusade", "retreat", "celebration", "other"] as const
export type ReminderAudience = { type: "all" | "staff" | "leaders" | "ministry" | "cell_group" | "members" | "users"; ministryId?: number; cellGroupId?: number; memberIds?: number[]; userIds?: number[] }
export type ChurchEvent = {
  id: string
  title: string
  type: (typeof EVENT_TYPES)[number]
  description: string | null
  startsAt: string
  endsAt: string | null
  allDay: boolean
  venue: string | null
  organiserMemberId: string | null
  organiser: string | null
  ministryId: string | null
  ministry: string | null
  cellGroupId: string | null
  cellGroup: string | null
  projectId?: string | null
  repeat: "none" | "weekly" | "monthly_nth" | "monthly_day" | "yearly"
  repeatUntil: string | null
  remindMinutes: number[]
  remindAudience: ReminderAudience | null
  remindChannel: "sms" | "app" | "both"
}
export type Observance = { id: string; name: string; rule: "fixed" | "easter"; month: number | null; day: number | null; easterOffset: number | null; durationDays: number; colour: LiturgicalColour; note: string | null }

export type Reminder = {
  id: string
  remindAt: string
  channel: "sms" | "app" | "both"
  audience: ReminderAudience
  audienceLabel: string
  message: string
  status: "pending" | "sent" | "cancelled" | "skipped"
  source: string | null
  sentCount: number
  note: string | null
}
export type ReminderRule = { key: string; label: string; when: string; enabled: boolean; options: { time?: string; message?: string; channel?: "sms" | "app" | "both"; daysBefore?: number; audience?: ReminderAudience } }
export type ReminderStats = { smsUsedThisMonth: number; smsBudget: number | null; pending: number; quietHours: [string, string]; lastRun: string | null }

// ---- Sermons
export type Sermon = {
  id: string
  date: string
  service: string | null
  status: "planned" | "preached"
  preacherMemberId: string | null
  preacher: string
  preacherPhone: string | null
  preacherChurch: string | null
  visiting: boolean
  title: string | null
  theme: string | null
  seriesId: string | null
  series: string | null
  scriptures: string[]
  notes: string | null
  recordingUrl: string | null
  season: { name: string; colour: LiturgicalColour } | null
  attendance?: number | null
  offertory?: number | null
}
export type SermonSeries = { id: string; name: string; description: string | null; sermons: number; preached: number; from: string | null; to: string | null }
export type SermonStats = {
  year: number
  preached: number
  preachers: number
  upcoming: number
  gaps: Array<{ date: string; service: string }>
  coverage: Array<{ book: string; index: number; testament: "OT" | "NT"; count: number }>
}

// ---- Project giving
export type ProjectMilestone = { id: string; title: string; amount: number | null; dueDate: string | null; status: "pending" | "done"; doneOn: string | null; notes: string | null }
export const CONTRIBUTION_KINDS = ["gift", "thanksgiving", "pledge_payment", "in_kind"] as const
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number]
export const CONTRIBUTOR_TYPES = ["member", "household", "cell_group", "ministry", "organisation", "named", "anonymous"] as const
export type ContributorType = (typeof CONTRIBUTOR_TYPES)[number]
export type Contribution = {
  id: string
  projectId: string
  date: string
  kind: ContributionKind
  contributorType: ContributorType
  contributor: string
  memberId: string | null
  pledgeNumber: string | null
  householdId: string | null
  cellGroupId: string | null
  organisationId: string | null
  amount: number
  inKindDescription: string | null
  inKindValue: number | null
  paymentMethod: string | null
  reference: string
  service: string | null
  eventId: string | null
  event: string | null
  pledgeId: string | null
  hideName: boolean
  notes: string | null
  canThank: boolean
}
export type ProjectSummary = {
  byKind: Record<ContributionKind, number>
  byContributorType: Record<ContributorType, number>
  honourRoll: Array<{ name: string; type: ContributorType; total: number; gifts: number }>
  cells: Array<{ id: string; name: string; area: string | null; total: number; target: number | null }>
  families: Array<{ id: string; name: string; head: string | null; members: number; total: number; suggested: number | null }>
  events: Array<{ id: string; title: string | null; date: string | null; total: number; gifts: number }>
  monthly: Array<{ month: string; total: number }>
  unattributedToCell: number
}
export type ProjectStats = { openProjects: number; raisedThisYear: number; inKindThisYear: number; contributors: number; goalOpen: number; raisedOpen: number }
export type Household = {
  id: string
  name: string
  headMemberId: string | null
  head: string | null
  phone: string | null
  village: string | null
  notes: string | null
  members: number
  memberList?: Array<{ id: string; name: string; gender: string; age: number | null; phone: string | null; pledgeNumber: string | null; status: string; isHead: boolean }>
}
export const ORGANISATION_TYPES = ["company", "ngo", "church", "government", "school", "other"] as const
export type Organisation = { id: string; name: string; type: (typeof ORGANISATION_TYPES)[number]; contactName: string | null; phone: string | null; email: string | null; notes: string | null; contributions: number; given: number }

// ---- Accounting (general ledger & financial statements)
export const ACCOUNT_TYPES = ["asset", "liability", "fund", "income", "expense"] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export const ACCOUNT_SUBTYPES = ["cash", "mobile_money", "bank", "receivable", "fixed_asset", "contra_asset", "payable", "loan"] as const
export type AccountSubtype = (typeof ACCOUNT_SUBTYPES)[number]
export type Account = {
  id: string
  code: string
  name: string
  type: AccountType
  subtype: AccountSubtype | null
  description: string | null
  isSystem: boolean
  active: boolean
  mappedFrom?: Array<{ source: MappingSource; key: string }>
}
export type MappingSource = "payment_method" | "offertory" | "income" | "expense"
export type AccountMappings = {
  mappings: Array<{ source: MappingSource; key: string; accountId: string; account: string }>
  unmapped: Partial<Record<MappingSource, string[]>>
}
export const JOURNAL_KINDS = ["general", "opening", "transfer", "depreciation", "adjustment"] as const
export type JournalLine = { accountId: string; account: string; fund: "general" | "welfare" | "project"; projectId: string | null; project: string | null; debit: number; credit: number; memo: string | null }
export type Journal = { id: string; date: string; reference: string; memo: string; kind: (typeof JOURNAL_KINDS)[number]; recordedBy: string | null; total: number; lines: JournalLine[] }
export type FundOption = { key: "general" | "welfare" | "project"; projectId?: string; name: string }

export type TrialBalance = {
  asOf: string
  yearStart: string
  rows: Array<{ id: string; code: string; name: string; type: AccountType; debit: number; credit: number }>
  totals: { debit: number; credit: number }
  balanced: boolean
  unmapped: AccountMappings["unmapped"]
}
type StatementCols = { general: number; restricted: number; total: number; previous: number; budget?: number | null }
export type IncomeStatementSection = { rows: Array<{ id: string; code: string; name: string } & StatementCols>; total: StatementCols }
export type IncomeStatement = {
  from: string
  to: string
  previousFrom: string
  previousTo: string
  income: IncomeStatementSection
  expenses: IncomeStatementSection
  surplus: { general: number; restricted: number; total: number; previous: number }
  unmapped: AccountMappings["unmapped"]
}
export type BalanceSheetLine = { id: string; code: string; name: string; subtype: AccountSubtype | null; amount: number }
export type BalanceSheet = {
  asOf: string
  yearStart: string
  warnings: string[]
  assets: { current: BalanceSheetLine[]; fixed: BalanceSheetLine[]; currentTotal: number; fixedTotal: number; total: number }
  liabilities: { rows: BalanceSheetLine[]; total: number }
  netAssets: number
  funds: { rows: Array<{ key: string; name: string; restricted: boolean; opening: number; movement: number; amount: number }>; general: number; restricted: number; total: number }
  balanced: boolean
  unmapped: AccountMappings["unmapped"]
}
export type GeneralLedger = {
  account: { id: string; code: string; name: string; type: AccountType; debitNormal: boolean }
  from: string
  to: string
  opening: number
  closing: number
  truncated: boolean
  totals: { debit: number; credit: number }
  rows: Array<{ date: string; reference: string; source: "offertory" | "transaction" | "journal"; sourceId: string; description: string; fund: string; debit: number; credit: number; balance: number }>
}
