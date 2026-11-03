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


/** People figures are null without members.view, money figures null without finance.view. */
export type DashboardStats = {
  totalMembers: number | null
  membersChange: number | null
  activeMembers: number | null
  attendanceRate: number | null
  sundaySchool: number | null
  sundaySchoolClasses: number | null
  monthlyOffertory: number | null
  offertoryChange: number | null
  membershipByGender: { male: number; female: number } | null
  offertoryTrends: Array<{ month: string; tithe: number; pledge: number; thanksgiving: number; harvest: number }>
  recentActivities: Array<{ id: string; name: string; action: string; time: string }>
}

export type AttentionItem = {
  key: string
  area: "care" | "registers" | "money" | "admin"
  severity: "danger" | "warning" | "info"
  title: string
  detail: string | null
  count: number
  href: string
  due: string | null
  impact: number
  perm: string | null
  fingerprint: string
  bucket: "today" | "week" | "later"
  hidden: "snoozed" | "done" | null
  snoozedUntil: string | null
  assignedTo: { id: string; name: string; me: boolean; by: string | null; at: string | null } | null
  /** Set on unusual-figure flags: why it was flagged. */
  why: string | null
}

export type HealthCard = {
  key: "giving" | "attendance" | "members" | "cash" | "due" | "unbanked"
  label: string
  format: "money" | "number"
  value: number | null
  unit?: string
  compare: { label: string; value: number; pct: number } | null
  status: "good" | "watch" | "act" | "neutral"
  spark: number[]
  sparkLabel: string | null
  cause: string | null
  href: string
}

export type DashboardHealth = {
  cards: HealthCard[]
  givingYear: { yearLabel: string; target: number | null; months: Array<{ month: string; thisYear: number | null; lastYear: number; target: number | null }> } | null
  dataStatus: { asOf: string; sunday: string; missing: Array<{ what: "attendance" | "offertory"; service: string; href: string }> }
  verdict: { tone: "good" | "watch" | "bad" | "neutral"; opening: string; parts: Array<{ text: string; tone: "good" | "watch" | "bad" | "neutral"; href: string | null }> }
  engagement: {
    segments: Array<{ key: "new" | "regular" | "occasional" | "drifting" | "lost" | "unknown"; label: string; count: number }>
    total: number
    drifting: Array<{ id: string; name: string; phone: string | null; lastSeen: string; lastWhat: string | null; lastVisit: string | null }>
    driftingNotVisited: number
  } | null
}
export type SundaySnapshot = {
  date: string
  previousDate: string
  lastYearDate: string
  showAttendance: boolean
  showGiving: boolean
  services: Array<{ service: string; attendance: number | null; attendancePrev: number | null; visitors: number | null; giving: number | null; givingPrev: number | null }>
  totals: { attendance: number | null; attendancePrev: number | null; attendanceLastYear: number | null; visitors: number | null; giving: number | null; givingPrev: number | null; givingLastYear: number | null }
}

export const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"] as const
export const TRANSACTION_CATEGORIES = {
  income: ["Offerings", "Tithes", "Donations", "Events", "Fundraising", "Rental Income", "Welfare", "Other"],
  expense: ["Utilities", "Salaries", "Maintenance", "Ministry Programs", "Outreach", "Media & Technology", "Supplies", "Equipment", "Events", "Missions", "Welfare", "Merchandise stock", "Other"],
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
  givingTarget?: number | null
  cashOnHandLimit?: number | null
  requisitionSeniorThreshold?: number | null
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
  time?: string | null
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
  /** borrowing for the project: received from lenders / repaid to them */
  loanReceived?: number
  loanRepaid?: number
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
  /** Bible readings in service order, with who reads them */
  readings?: SermonReading[]
  preacherGuestId?: string | null
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
export const ORGANISATION_TYPES = ["bank", "sacco", "company", "ngo", "church", "government", "school", "other"] as const
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
export const JOURNAL_KINDS = ["general", "opening", "transfer", "depreciation", "adjustment", "loan"] as const
export type JournalLine = { accountId: string; account: string; fund: "general" | "welfare" | "project"; projectId: string | null; project: string | null; debit: number; credit: number; memo: string | null }
export type Journal = { id: string; date: string; reference: string; memo: string; kind: (typeof JOURNAL_KINDS)[number]; loanId?: string | null; recordedBy: string | null; total: number; lines: JournalLine[] }
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
  /** expected situations worth explaining, e.g. a project fund below zero because a loan paid for the work */
  notes?: string[]
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

// ---- Loans (formal borrowing for a project)
export const LOAN_METHODS = ["reducing", "flat", "none"] as const
export type LoanMethod = (typeof LOAN_METHODS)[number]
export type LoanStatus = "proposed" | "approved" | "active" | "closed"
export type LoanInstallmentRow = { number: number; dueDate: string; principal: number; interest: number; amount: number; paid: number; status: "paid" | "partial" | "due" | "overdue" }
export type LoanSummary = {
  disbursed: number
  undrawn: number
  principalPaid: number
  interestPaid: number
  feesPaid: number
  outstanding: number
  totalInterest: number
  remainingScheduled: number
  progress: number
  endDate: string | null
  nextInstallment: { number: number; dueDate: string; amount: number; full: number; daysLeft: number } | null
  arrears: { count: number; amount: number; since: string | null }
  installments?: LoanInstallmentRow[]
}
export type Loan = {
  id: string
  projectId: string
  project: string | null
  organisationId: string | null
  lender: string
  lenderName: string | null
  accountNumber: string | null
  purpose: string
  principal: number
  interestMethod: LoanMethod
  annualRate: number
  termPeriods: number
  frequency: "monthly" | "quarterly"
  gracePeriods: number
  startDate: string
  fees: number
  security: string | null
  guarantors: string | null
  approvalRef: string | null
  approvedOn: string | null
  consentRef: string | null
  status: LoanStatus
  accountId: string | null
  account: string | null
  notes: string | null
  summary: LoanSummary
}
export type LoanDetail = Loan & {
  summary: LoanSummary & { installments: LoanInstallmentRow[] }
  disbursements: Array<{ id: string; date: string; amount: number; account: string | null; notes: string | null }>
  payments: Array<{ id: string; date: string; amount: number; principal: number; interest: number; fees: number; reference: string | null; account: string | null; notes: string | null }>
  events: Array<{ type: string; note: string | null; by: string | null; at: string | null }>
}
export type LoanStats = { owed: number; undrawn: number; repaid: number; interestPaid: number; arrears: number; active: number; nextDue: LoanSummary["nextInstallment"] }
export type LoanProjection = {
  owed: number
  scheduledPerMonth: number
  endDate: string | null
  givingPerMonth: number
  givingCovers: number | null
  shortfallPerMonth: number
  atGiving: { months: number; date: string; interest: number } | null
  extra: number
  withExtra: { months: number; date: string; interest: number; monthsSaved: number | null; interestSaved: number | null } | null
  note: string | null
}
export type LoanPreview = {
  installment: number
  graceInstallment: number | null
  totalInterest: number
  totalRepayable: number
  endDate: string | null
  annualRepayment: number
  incomeLast12Months: number
  ratio: number | null
  limit: number
  affordable: boolean | null
  schedule: Array<{ number: number; due_date: string; principal: number; interest: number }>
}

// ---- Sermon readings
export type ReadingRole = "first" | "psalm" | "second" | "third" | "gospel"
export type SermonReading = { role: ReadingRole; label: string; ref: string; readerMemberId: string | null; reader: string | null }
export const READING_LABELS: Record<ReadingRole, string> = { first: "First reading", psalm: "Psalm", second: "Second reading", third: "Third reading", gospel: "Gospel" }
/** Which readings a tradition uses, in service order. */
export const READING_SETS: Record<"anglican" | "default", ReadingRole[]> = { anglican: ["first", "psalm", "second", "gospel"], default: ["first", "second", "third"] }

// ---- Guest ministers & placements
export const GUEST_TITLES = ["Rev.", "Rev. Canon", "Ven.", "Rt. Rev.", "Bishop", "Pastor", "Apostle", "Evangelist", "Prophet", "Dr.", "Mr.", "Mrs.", "Ms."] as const
export const INVITATION_PURPOSES = ["preaching", "conference", "crusade", "retreat", "wedding", "funeral", "other"] as const
export type InvitationStatus = "invited" | "confirmed" | "declined" | "completed" | "cancelled"
export type GuestMinister = {
  id: string
  title: string | null
  name: string
  fullName: string
  churchName: string | null
  denomination: string | null
  phone: string | null
  email: string | null
  inviteAgain: boolean | null
  notes: string | null
  invitations?: number
  sermons?: number
  lastVisit?: string | null
  nextVisit?: string | null
}
export type GuestInvitation = {
  id: string
  guestId: string
  guest: string | null
  guestPhone: string | null
  date: string
  service: string | null
  purpose: (typeof INVITATION_PURPOSES)[number]
  topic: string | null
  status: InvitationStatus
  sermonId: string | null
  hostMemberId: string | null
  host: string | null
  accommodation: string | null
  facilitation: number | null
  paid: boolean
  confirmationSent: boolean
  thanked: boolean
  feedback: string | null
}
export type GuestIndex = { guests: GuestMinister[]; upcoming: GuestInvitation[]; stats: { guests: number; thisYear: number; awaiting: number; facilitation: number; inKind?: number; unpaid: number } }
export type GuestDetail = GuestMinister & { invitations: GuestInvitation[]; sermons: Array<{ id: string; date: string; service: string | null; title: string | null; theme: string | null; scriptures: string[]; status: string }> }

export type PlacementKind = "teaching" | "ministry"
export type CollectionSummary = { id: string; status: "open" | "handed_over" | "closed"; given: number; target: number | null; handedOverOn: string | null; gift: string | null }
export type Placement = {
  id: string
  kind: PlacementKind
  name: string
  gender: "male" | "female" | null
  phone: string | null
  email: string | null
  institution: string
  course: string | null
  supervisor: string | null
  supervisorPhone: string | null
  mentorMemberId: string | null
  mentor: string | null
  startDate: string
  endDate: string | null
  sendOffDate: string | null
  status: "upcoming" | "active" | "completed"
  daysLeft: number | null
  weeks: number | null
  assignments: Array<{ area: string; detail: string | null }>
  allowanceAmount?: number | null
  allowanceFrequency?: "weekly" | "monthly" | null
  rating: number | null
  report: string | null
  notes: string | null
  collection: CollectionSummary | null
}
export type PlacementStats = { active: number; upcoming: number; endingSoon: number; thisYear: number; institutions: number }

/** Money members give to a person (send-off, wedding…): recorded, never church income. */
export type PersonalCollection = {
  id: string
  purpose: string
  beneficiary: string
  relatedType: "placement" | "marriage" | "guest" | "member" | "other" | null
  relatedId: string | null
  target: number | null
  deadline: string | null
  coordinatorMemberId: string | null
  coordinator: string | null
  status: "open" | "handed_over" | "closed"
  given: number
  promised: number
  stillPromised: number
  givers: number
  handedOverOn: string | null
  handedOverAmount: number | null
  gift: string | null
  notes: string | null
  gifts?: Array<{ id: string; date: string; giver: string; memberId: string | null; amount: number; pledged: number | null; paymentMethod: string | null; reference: string }>
}

// ---- Hosting / upkeep costs (guest visits, placements)
export const UPKEEP_CATEGORIES = ["accommodation", "meals", "transport", "honorarium", "allowance", "airtime", "gift", "other"] as const
export type UpkeepCategory = (typeof UPKEEP_CATEGORIES)[number]
export type UpkeepLine = { id: string; category: UpkeepCategory; description: string | null; budget: number | null; amount: number | null; date: string | null; providedBy: "church" | "member"; member: string | null; paymentMethod: string | null; state: "paid" | "in_kind" | "planned" }
export type UpkeepSummary = {
  lines: UpkeepLine[]
  totals: { budget: number; paid: number; inKind: number; planned: number; total: number }
  byCategory: Array<{ category: UpkeepCategory; budget: number; actual: number }>
  allowance: { amount: number; frequency: "weekly" | "monthly"; periods: number; due: number; paid: number; owed: number } | null
}

// ---- Weddings
export type WeddingDetail = {
  id: string
  time: string | null
  banns: Array<{ id: string; number: number; date: string; service: string | null; readBy: string | null; objection: string | null; objectionResolved: boolean; resolution: string | null }>
  nextBannsSunday: string | null
  readiness: Array<{ key: string; label: string; auto: boolean; done: boolean; detail: string | null }>
  ready: boolean
  readyCount: number
  counselling: Array<{ date: string; counsellor: string | null; topic: string | null }>
  fees: Array<{ id: string; item: string; amount: number; paid: boolean; paidOn: string | null; paymentMethod: string | null }>
  feesTotal: number
  feesPaid: number
  collection: { id: string; given: number; target: number | null; status: string } | null
  programme: Array<{ time: string | null; item: string; who: string | null }>
  eventId: string | null
  household: { id: string; name: string } | null
  bothMembers: boolean
  clashes?: Array<{ title: string; start: string }>
}

export type RequisitionStatus = "pending" | "awaiting_senior" | "approved" | "paid" | "rejected" | "cancelled"
export type RequisitionRow = {
  id: string; number: string; title: string; category: string
  ministry: { id: string; name: string } | null
  total: number; paidAmount: number | null; status: RequisitionStatus; neededBy: string | null
  requestedBy: string | null; mine: boolean; createdAt: string; waitingOnMe: boolean
}
export type Requisition = RequisitionRow & {
  purpose: string | null
  project: { id: string; name: string } | null
  items: Array<{ id: string; description: string; quantity: number; unit: string | null; unitCost: number; amount: number }>
  approvals: Array<{ stage: "treasurer" | "senior"; decision: "approved" | "rejected"; by: string | null; note: string | null; at: string }>
  needsSenior: boolean; threshold: number
  budget: { allocated: number; spent: number; remaining: number; after: number } | null
  payment: { date: string | null; amount: number; method: string | null; supplier: string | null; by: string | null; variance: number } | null
  can: { approve: boolean; stage: "treasurer" | "senior" | null; pay: boolean; edit: boolean; cancel: boolean }
}

export type SaleItem = {
  id: string; name: string; kind: "merchandise" | "in_kind"; status: "available" | "sold_out" | "archived"
  ministry: { id: string; name: string } | null; project: { id: string; name: string } | null
  price: number | null; unit: string | null; stock: number | null
  donor: string | null; donorMemberId: string | null; receivedOn: string | null; estimatedValue: number | null; notes: string | null
  sold: number; revenue: number; collected: number; owed: number; cost: number; profit: number | null
}
export type Sale = {
  id: string; number: string; date: string
  item: { id: string; name: string | null; kind: "merchandise" | "in_kind" | null; unit: string | null; seller: string }
  quantity: number; unitPrice: number; total: number; paid: number; owed: number; dueDate: string | null; overdue: boolean
  buyer: string; buyerMemberId: string | null; buyerPhone: string | null; occasion: "harvest" | null; event: string | null
  payments: Array<{ date: string; amount: number; method: string }> | null
}
export type SalesSummary = {
  sold: number; collected: number; owed: number; stockCost: number
  bySeller: Array<{ label: string; sold: number; collected: number; owed: number; count: number }>
  byItem: Array<{ label: string; sold: number; collected: number; owed: number; count: number }>
  inKind: { realised: number; estimated: number }
  events: string[]
}
