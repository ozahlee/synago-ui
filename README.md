# Synago UI

Church admin dashboard for [synago-backend](../synago-backend). Next.js 16 · React 19 · Tailwind 4 · shadcn/ui · SWR.

## Run locally

```bash
# 1. backend (in ../synago-backend)
php artisan migrate --seed && php artisan serve          # http://127.0.0.1:8000

# 2. frontend
cp .env.example .env.local   # adjust API URL / currency / church name
npm ci
npm run dev                  # http://localhost:4100
```

Sign in with the seeded admin: `admin@synago.test` / `password`.

| Env var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/api/v1` | Backend base URL |
| `NEXT_PUBLIC_CURRENCY` | `UGX` | ISO currency code used for all money formatting |
| `NEXT_PUBLIC_CHURCH_NAME` | `SJW` | Login page and tab title (inside the app the name comes from Church settings) |
| `NEXT_PUBLIC_PHONE_COUNTRY_CODE` | `256` | Turns local numbers (0772…) into WhatsApp links |

## What's in the MVP

| Page | Can do |
|---|---|
| Global search | ⌘K / Ctrl+K (or `/`) anywhere, or the sidebar search box: members (name, phone, pledge no.), visitors, ministries, cell groups, baptisms, marriages, pledges, welfare, announcements, staff and pages. Results respect the user's role; members open in place, other results deep-link (`?open=`, `?q=`, `?tab=`). Remembers recently opened items |
| Dashboard | Live member/offertory stats, gender split, 6-month giving trends, recent activity |
| Members | Server-side search/filter/paging; add, edit (incl. village/parish/sub county, ministry), delete |
| Ministries | Create/edit/delete; leader picker; view members & activities; add/remove members and activities |
| Offertory | Record/edit/delete gifts (linked member, visitor name, or anonymous); monthly totals vs last month; category chart |
| Accounts | Three tabs. **Transactions**: income/expense with edit/delete, period totals, overall balance and an income vs expense chart. **Journal entries**: opening balances, banking/transfers, assets, loans, depreciation (must balance). **Chart of accounts**: accounts plus the posting rules that link offertory/Accounts categories and payment methods to them; click an account for its ledger. Deep links: `/accounts?tab=journals|chart` |
| Budget | Monthly allocations per expense category; spent/status computed from Accounts; period picker |
| Projects & giving | Land, building and other causes open for contributions: goal/raised/pledged/in-kind progress, project page with contributions (members, families, cells, ministries, organisations, well-wishers, anonymous), honour roll, cell league with targets, family progress vs a suggested amount, pledges, spending and milestones; printable progress poster (`/projects/poster?id=`); thank-you SMS with receipt. `/donations` redirects here |
| Financial reports | Balance sheet (with general and restricted funds and the movement in funds), income statement (general/restricted columns, same period last year, budget), trial balance, and a general ledger for any account (click a line). Print with signature lines (`/accounting/print?report=bs|is|tb`) or export to CSV |
| Families | Households: head of home, members, family phone; used for family giving and thanksgiving |
| Organisations | Companies, NGOs, sister churches and others who give toward projects |
| Notifications | Staff announcements; read/unread, important, archive, delete, mark-all-read; unread badge in sidebar |
| Baptisms | Candidates (class progress, planned date) and the permanent register; auto certificate numbers; printable certificate. Labels follow the church's tradition (Anglican: baptism & confirmation; Pentecostal: water baptism & child dedication) |
| Offertory by service | Each offering is tagged First / Second / … service; "Service collections" totals each service and the whole day |
| Pledge numbers | Every member has a pledge / envelope number (auto `SJW-0001`…), searchable everywhere |
| Tithe report | Year grid of tithers × months, faithful-giver filter, CSV export, print |
| Announcements | Community notices (burials, weddings, introductions, thanksgivings, meetings) with a printable Sunday sheet |
| Profile | Edit your own details, change password, see your permissions |
| Staff & access | Admin: add/edit staff, assign roles, disable sign-in, role × permission matrix |
| Church settings | Admin: church name, tradition, diocese, Sunday services, pledge-number prefix |
| Attendance | Sunday head count per service (men / women / children / visitors), 12-week chart, attendance rate on the dashboard |
| Marriages | Planned weddings with banns (Anglican) and counselling, marriage register, printable certificate |
| Visitors | First-time guests, 4-step follow-up checklist, contact log, prayer requests, "Make member" |
| Cell groups | Home fellowships by village, leaders/hosts, "Group by village" to place unassigned members |
| Pledges | Promises for building fund / harvest etc., progress by purpose, record payments (they appear in offertory as pledge gifts) |
| Welfare fund | Requests → approve → pay; payouts post to Accounts under "Welfare"; fund balance |
| Statements | Year-end giving letter per member; print one or all |
| Sunday school | Classes by age with teachers; children ≤ 12 enrolled automatically on registration; weekly class register; "Sort by age" moves children up and graduates over-12s |
| Baptism requirements | Per-rite checklist (class, Bible, hymn book, certificates, godparents, fee…) configured in Church settings; fees post to Accounts; completion blocked until met unless a pastor/admin overrides with a reason |
| Areas & harvest | Archdeaconry → parish → region (urban) → village → cell tree (can be built from member addresses); harvest league rolls cell totals up every level, with cell targets; gifts can come from a cell group |
| Pastoral care | Next of kin on members; "Record death" (deceased status, burial announcement, welfare case, condolence SMS); bereavements of relatives, sickness, newborns; visit log with follow-ups |
| Outreach | Outreach (babies' homes, hospitals, prisons…) with optional expense posting |
| Positions & My groups | Teachers, chairpersons, cell leaders, wardens; "Give login" creates a `leader` account that sees only its own class/ministry/cell; role & permission editor on Staff & access |
| Calendar | Month / agenda views of everything dated in the app (services, events, meetings, burials, weddings, baptisms, birthdays, pledges, follow-ups, outreach) against the Anglican church year with liturgical colours; repeating events ("first Sunday"), venue double-booking warning, custom observances, private phone/Google calendar subscription link |
| Sermons | Preaching rota with unassigned-service warnings, service register (preacher, theme, title, series, passages, notes, recording), Bible-book coverage map, series, printable Sunday programme, share by SMS; preachers get an automatic reminder |
| Reminders | Automatic SMS / in-app reminders (Saturday service, birthdays, cell & ministry meetings, pledge due, follow-ups, week ahead), per-event reminders, personal reminders; quiet hours, monthly SMS budget, upcoming queue with cancel, history |
| Bulk SMS | Text members, a ministry, cell group, birthdays or visitors with `{name}` personalisation; test mode until Africa's Talking keys are set (see backend README) |

Pages, menu items and action buttons are hidden according to the signed-in user's permissions
(admin / pastor / secretary / treasurer — see the backend README).

## Code map

- `lib/api.ts` — fetch wrapper (bearer token, JSON, `ApiError` with Laravel field errors), `useApi` / `usePaginated` SWR hooks
- `lib/auth.tsx` — `AuthProvider`, `useAuth()` (`user`, `login`, `logout`, `can(permission)`). Logout/expired token does a full reload to `/login` so no cached data survives between users.
- `lib/types.ts` — types mirroring the backend API resources
- `components/app-shell.tsx` — auth guard + sidebar layout used by every page
- `components/form.tsx` — `useApiForm` (submit → toast → inline 422 errors), `FieldError`, `runAction`
- `components/member-picker.tsx` — search-as-you-type member selector (optionally allows free-text names)
- `components/*-form-dialog.tsx` — create/edit dialogs; `*-content.tsx` — page bodies

### Period filter

Lists and reports share one period picker (`components/period-filter.tsx`, `lib/period.ts`): This week, Last week, This month, Last month, This year, Last year and Custom, plus All time on lists. Weeks start on Monday, and "year" follows the financial year set in Church settings. Summary cards compare with the matching earlier period (for example, last month up to the same date). Balance sheet and trial balance use the end of the chosen period as their "as at" date.

### Sign-up and the platform console

- `/signup`: a church registers itself and its first administrator on a 30-day free trial. It then goes through `/welcome` (church details → services → pledge prefix and financial year → next steps). The welcome steps can be skipped and changed later in Church settings.
- The app shows a banner until the admin confirms their email, and another in the last 7 days of the trial.
- `/platform`: the Synago owner's console (platform admins only). It shows churches with status, trial, administrator, members and staff counts, and last use, and lets you mark a church active, extend its trial or suspend it.

### Dashboard

The dashboard starts with **Needs attention**: the items your role can act on, most urgent first, each linking to the filtered page that resolves it (e.g. `/pledges?status=overdue`, `/attendance?date=…`, `/care?tab=visits`). Next to it is **Last Sunday**: attendance and giving per service, with week-on-week and year-on-year change.

Quick actions and figures follow the user's permissions. The treasurer sees money first, everyone else sees people first, and nobody sees figures for a page they can't open.

