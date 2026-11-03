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
| Dashboard | A ranked to-do queue, last Sunday, health cards with comparison and status, giving through the year against last year or a target, and how fresh the data is |
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
| Marriages | Each wedding has a full page with five tabs. **Banns:** three dated readings with objections and their resolution, plus a printable notice or certificate of banns. **Readiness:** a checklist drawn from the registers plus hand ticks, and counselling sessions. **Money:** church fees, paid as income, and the couple's contributions collection, kept off the books. **The day:** order of service and run sheet, booking the calendar and venue with clash warnings, then forming a family. Weddings still needing banns appear on the printed Sunday programme. Also: the printable marriage register by year (`/marriages/register`), the marriage shown on the member's profile, the official photo on the certificate, and anniversary greetings |
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

The dashboard is built for deciding, not just reading figures.

**Layout:** one 12-column grid. The left 8 columns are for deciding: health cards, the queue and giving through the year. The right 4 are context: last Sunday, the week ahead, engagement and people to call.
- **Header:** the date, a chip with the church season in its liturgical colour and a matching stripe, the view switch, and one main action with a **Record ▾** menu for the rest.
- **Verdict banner:** full width, tinted by tone, with "Updated…" and "What changed". A slim copy sticks to the top once you scroll.
- **Health cards:** every card has the same rows (label, value, trend line, comparison, cause), so they line up. Colour appears only for *Watch* or *Act now*.
- **Missing Sunday records** show once, as **Record** links in the Last Sunday card.
- **On a phone:** the verdict, then today's queue, then the health cards as a swipeable row.

- **Verdict:** one sentence under the greeting. It gives an opening judgement from the health cards ("A good week", "Mostly good", "A mixed picture", "Needs a closer look"), then the parts worth knowing, e.g. "attendance up 20% on the month before, 16 members drifting away, and 3 things need you today". Each part is underlined in its status colour and links to its evidence.
- **Freshness line:** "Updated 2 min ago", plus anything from last Sunday not yet entered (e.g. "Youth Service offertory not entered"), so nobody decides on half a week's numbers.
- **Needs attention:** a ranked queue grouped into **Today** (overdue or urgent), **This week** and **Can wait**. Within each group, items assigned to you come first, then by urgency, due date and amount at stake. Each row opens the page that resolves it, and its menu lets you:
  - **mark it done:** it comes back if its figures change;
  - **snooze it** for a day, 3 days or a week (just for you);
  - **assign it** to someone who holds the permission it needs: they get a notification, and everyone sees who has it.

  When nothing is waiting, the queue shows **All clear**.
- **Last Sunday:** attendance and giving per service, compared with the week before and the same Sunday last year.
- **Health cards:** colour appears only when something is off ("Watch" from −5%, "Act now" from −15%). Each card shows the figure, a comparison, a 12-point trend line and the main cause in one line, and links to its list:
  - **Giving this year:** against the same days last year, or against the target set in Settings.
  - **Sunday attendance:** the 4-week average against the 4 weeks before.
  - **Members:** people joined against the same time last year.
  - **Free to spend:** cash and bank, less restricted funds and loan repayments due within 30 days, in weeks of usual spending.
- **Giving through the year:** this year cumulative against last year (and the target), with the gap shaded. There is a table view.
- **How engaged are members:** active members grouped as New, Regular (seen in 4 weeks), Occasional (4–8 weeks), Drifting (8 weeks–6 months), Gone quiet and No record. "Seen" means giving, contributions or Sunday school recorded by name; Sunday headcounts aren't per person, so nobody is called lost just because they don't give by name. Each group opens the filtered member list (`/members?engagement=drifting`). Below it is **Worth a call this week**: the drifting members seen most recently, with a call button. The queue also lists drifting members nobody has visited in a month.
- **What changed:** the recent-activity feed, now in a dialog off the main page.

- **Unusual figures** are flagged in the queue with an "Unusual" badge and a plain "Why flagged" line:
  - a service more than 25% smaller than its average over the 8 Sundays before;
  - an offertory more than 30% below its usual;
  - a project over budget, or 90% spent with under 60% of its time gone;
  - a pledge drive more than 25 points behind the time gone by;
  - cash at hand above the limit in Settings with some of it held over 3 days. Recording the bank deposit as a journal clears it.
- **One screen per role:**
  - **Pastor:** the whole queue, last Sunday, attendance, giving, members, free cash, engagement and the week ahead.
  - **Treasurer:** money items in the queue, last Sunday, giving, free cash, payments due in 30 days, cash not banked, and giving through the year.
  - **Office:** registers and care items, last Sunday, attendance, members and the week ahead.

  The view is picked from the user's permissions. Anyone with more than one role can switch (remembered per browser), and the queue's "+N others" shows the rest.

Every figure follows the user's permissions: nobody sees figures for a page they can't open.

### Requisitions and items & sales

**Requisitions** are under *Finance → Requisitions*.
- **Asking:** anyone with the permission (ministry leaders included) asks for what's needed, item by item, with a "needed by" date and a reason, and can attach a quote.
- **Approval:** the treasurer approves. At or above the threshold in Settings (default UGX 500,000), the vicar approves too, and it must be two different people.
- **Budget check:** each request shows the category's budget this month and what it would leave.
- **Paying:** the treasurer records what was actually paid and to whom (a warning shows above +10%), and attaches the receipt. The expense goes into the books, and goods bought to sell can go straight into stock.
- **Tracking:** each request shows a timeline of who did what. Requests waiting on you appear on the dashboard queue.

**Items & sales** are under *Finance → Items & sales*.
- **Merchandise:** T-shirts, calendars and books sold by the church or a ministry. Stock and its cost are tracked, and profit is shown per item.
- **Gifts in kind:** a goat, sugar or chickens, recorded with the donor and an estimated value, then sold.
- **Harvest auctions:** these count as harvest income, and "Save & next lot" speeds up an auction.
- **Pay later:** part payment now with a promised date. The **Owing** tab has "Paid" and "Send reminder SMS" buttons, and late buyers appear on the dashboard.
- **Reports:** a summary by who sells (church or each ministry) and by item. Gifts in kind show what they were sold for against their estimate.

### Loans

*Finance → Loans* (`/loans`) lists the church's loans with what's owed, the next instalment and any arrears.
- **New loan:** shows the repayments and checks affordability as you type.
- **A loan's own page** (`/loans/view?id=`):
  - A countdown bar, and a debt-free card: giving vs repayment, and what paying extra each month saves.
  - Schedule, repayments (with an automatic interest/principal split), money received, details and history.
  - Approval, receiving money, repaying, restructuring and reversing entries.
  - A printable council statement (`/loans/print?id=`).
- **The project page** shows a "Clear the loan" card, and the poster shows the countdown.

### Documents, readings, guests & placements, personal collections

- **Documents (`<Attachments>`):** on sermons, loans, projects, guest ministers, placements and collections. Drag files in or pick them; PDFs and images open in the browser.
- **Sermons:**
  - Readings in the church's tradition order, each with a reader (a member or a typed name), alongside the sermon text.
  - The preacher can be a member, a typed name, or a guest from the register.
  - The printed order of service lists the readings.
- **People → Guests & placements (`/guests`):**
  - **Guest ministers:** the register, upcoming visits, and confirm (rota + SMS), mark done (feedback, invite again?), pay facilitation and thank.
  - **Placements:** students, their mentor, assignments, rating and report.
  - **Printable documents:** a report for the institution and a letter of appreciation (`/guests/print?id=&doc=report|letter`).
- **Giving → Personal collections (`/collections`):** collections for a person (send-offs, weddings, families in need): gifts and promises with receipts, thank-you SMS and the hand-over. Clearly marked as not church money.

