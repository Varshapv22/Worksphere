// Content for the standalone /manual user-guide site. Kept as plain data
// (rather than JSX) so the page component can render, search, and link to
// it uniformly.
import {
  Award,
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock,
  Code2,
  CreditCard,
  Eye,
  FileSearch,
  Gauge,
  GitBranch,
  Globe,
  History,
  Inbox,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  LineChart,
  Lock,
  LogIn,
  Megaphone,
  Network,
  Palette,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ManualBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "callout"; tone: "tip" | "info" | "warning"; text: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "image"; src: string; alt: string; caption?: string };

export interface ManualChapter {
  id: string;
  title: string;
  icon: LucideIcon;
  audience: string;
  access?: string;
  summary: string;
  blocks: ManualBlock[];
}

export interface ManualGroup {
  id: string;
  label: string;
  description: string;
  chapters: ManualChapter[];
}

export const MANUAL_GROUPS: ManualGroup[] = [
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "workspace",
    label: "For Everyone",
    description: "Every employee at a company using WorkSphere can use these.",
    chapters: [
      {
        id: "getting-started",
        title: "Getting Started",
        icon: LogIn,
        audience: "Everyone",
        summary: "Signing in, registering a company, and understanding the three kinds of accounts.",
        blocks: [
          {
            kind: "p",
            text: "WorkSphere is a multi-tenant HR platform: every company that signs up gets its own private workspace (a \"tenant\"). There are three kinds of accounts, and each one lands in a different part of the app after login.",
          },
          {
            kind: "table",
            headers: ["Account type", "Where you land", "Who it's for"],
            rows: [
              ["Employee", "/dashboard", "Everyone on the team — clock in, request leave, use the HR tools."],
              ["Manager / Company Admin", "/dashboard (fuller sidebar)", "Runs the company workspace — approves leave, manages employees, configures modules and billing."],
              ["Super Admin", "/admin (a separate Platform area)", "Runs the WorkSphere platform itself, not a company — approves new companies, manages plans, billing and modules across every tenant."],
            ],
          },
          { kind: "h3", text: "Signing in" },
          {
            kind: "image",
            src: "/manual/login-screen.png",
            alt: "The WorkSphere sign-in screen, with email and password fields on the left and a product highlight panel on the right.",
            caption: "The sign-in screen — every company shares this page, with a link to register a new company below the form.",
          },
          {
            kind: "steps",
            items: [
              "Go to your company's WorkSphere login page and enter your email and password.",
              "If your account has two-factor authentication set up (this applies to the platform Security area — see the Super Admin chapters), you'll be asked for a 6-digit code from your authenticator app, or a recovery code, before you're let in.",
              "You're redirected to /dashboard automatically. Super admins are redirected to /admin instead.",
            ],
          },
          { kind: "h3", text: "Registering a new company" },
          {
            kind: "p",
            text: "New companies sign up from the \"Register your company\" link on the login page: company name, a unique company slug, company email, and an admin account (name, email, password).",
          },
          {
            kind: "callout",
            tone: "info",
            text: "Registering doesn't grant instant access. New companies are submitted as \"Pending approval\" and a WorkSphere Super Admin has to approve the company from the Platform Companies list before the admin account can sign in.",
          },
          { kind: "h3", text: "Who can do what" },
          {
            kind: "p",
            text: "Inside a company workspace there are three roles, layered on top of each other — a Company Admin can do everything a Manager can, and a Manager can do everything an Employee can:",
          },
          {
            kind: "table",
            headers: ["Capability", "Employee", "Manager", "Company Admin"],
            rows: [
              ["View the employee directory & your own profile", "✓", "✓", "✓"],
              ["Add / edit employee records", "–", "–", "✓"],
              ["Clock in / out & view your own attendance", "✓", "✓", "✓"],
              ["View & manage the whole team's attendance", "–", "✓", "✓"],
              ["Request leave", "✓", "✓", "✓"],
              ["Approve or reject leave requests", "–", "✓", "✓"],
              ["Add or remove company holidays", "–", "–", "✓"],
              ["Manage departments", "–", "–", "✓"],
              ["Enable/disable modules (App Marketplace)", "–", "–", "✓"],
              ["Branding, Payroll Config, Developer API, Billing", "–", "–", "✓"],
            ],
          },
          {
            kind: "callout",
            tone: "tip",
            text: "A Manager or Company Admin can open the user menu (click your name/initials in the top-right corner) and choose \"View as Employee\" to preview the app the way a regular employee sees it — see \"Previewing as an Employee\" in the Admin & Manager guide for the full details.",
          },
        ],
      },
      {
        id: "dashboard-overview",
        title: "Your Dashboard",
        icon: LayoutDashboard,
        audience: "Everyone",
        summary: "The at-a-glance home screen you land on after signing in.",
        blocks: [
          {
            kind: "p",
            text: "The Dashboard (/dashboard) is deliberately simple — a quick daily snapshot rather than a busy control panel. It shows three stat cards:",
          },
          {
            kind: "image",
            src: "/manual/dashboard-overview.png",
            alt: "The WorkSphere dashboard showing Headcount, Present today, and Pending leave requests stat cards, with the sidebar navigation on the left.",
            caption: "The dashboard for a small company — the sidebar only lists the modules this company has enabled.",
          },
          {
            kind: "list",
            items: [
              "Headcount — total number of employees at your company.",
              "Present today — how many people have clocked in today (shows \"—\" instead of an error if your company hasn't enabled the Attendance module).",
              "Pending leave requests — how many leave requests are currently awaiting a decision.",
            ],
          },
          {
            kind: "callout",
            tone: "tip",
            text: "Everything else — your profile, attendance history, leave calendar, and the feature modules — lives in the sidebar on the left. Only modules your Company Admin has enabled in the App Marketplace will appear there.",
          },
        ],
      },
      {
        id: "employee-directory-profile",
        title: "Employee Directory & Profiles",
        icon: Users,
        audience: "Everyone (viewing) · Company Admin (adding/editing)",
        summary: "Browse the team, and the 13-tab profile page behind every employee.",
        blocks: [
          { kind: "h3", text: "The directory (/employees)" },
          {
            kind: "image",
            src: "/manual/employee-directory.png",
            alt: "The employee directory list view with a search bar, department filter, and employee rows.",
          },
          {
            kind: "list",
            items: [
              "Search by name or email, and filter by department.",
              "Switch between a List view and an Org Chart view using the toggle at the top.",
              "Click any name to open that person's full profile.",
            ],
          },
          {
            kind: "p",
            text: "\"Add employee\" only appears for Company Admins — employees and anyone with \"View as Employee\" on see a read-only directory, with no way to create or edit records from this page.",
          },
          { kind: "h3", text: "The employee profile — 13 tabs" },
          {
            kind: "p",
            text: "Every employee has a full 360° profile reached from the directory. The header shows an avatar, name, designation, department, status, tenure and employee code. Tabs across the top break the record down by area:",
          },
          {
            kind: "table",
            headers: ["Tab", "What's there"],
            rows: [
              ["Overview", "Personal info, contact details, emergency contact, and address. Company Admins get an Edit button to update any of it, including employment status (active / on leave / terminated)."],
              ["Attendance", "Days present/absent over the last 30 days, average work hours, and a recent clock-in/out table."],
              ["Leave", "Leave balances by type with a progress bar (used vs. allocated), plus recent requests."],
              ["Payroll", "Latest payslip breakdown (basic, allowances, bonus, overtime, deductions, net) and salary history."],
              ["Performance", "Latest review with rating bars (communication, technical, teamwork, leadership) and an overall score, plus review history."],
              ["Skills", "Skills grouped by category with a star-rating proficiency level."],
              ["Projects", "Company Admins can add or remove project assignments — name, role, dates, status."],
              ["Assets", "Company Admins can add or remove assigned assets (laptop, phone, access card, other) with serial numbers and dates."],
              ["Training", "Company Admins can add or remove training/course records with completion status."],
              ["Certificates", "Company Admins can add or remove certifications; expired ones are flagged in red."],
              ["Documents", "Company Admins can add or remove document links (contract, offer letter, ID proof, other)."],
              ["Notes", "Company Admins can add free-text notes tagged general / HR / performance, with author and timestamp."],
              ["Timeline", "A chronological activity feed pulling together every event above — joined, payroll, performance, skills, projects, assets, training, certificates, notes, and leave decisions."],
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            text: "\"Delete employee\" on the profile header is permanent — there's a confirmation prompt, but no undo. Like every other edit control on this page, it's Company-Admin-only and disappears under \"View as Employee.\"",
          },
        ],
      },
      {
        id: "attendance",
        title: "Attendance",
        icon: Clock,
        audience: "Employee",
        access: "Requires the Attendance module to be enabled",
        summary: "Clock in and out, and see your personal attendance history.",
        blocks: [
          {
            kind: "p",
            text: "As a plain employee, the Attendance page (/attendance) shows your own My Attendance view: today's status — not clocked in, clocked in at a given time, or completed — with a big Clock In / Clock Out button (each asks for confirmation before it submits).",
          },
          {
            kind: "image",
            src: "/manual/attendance-personal.png",
            alt: "The personal Attendance view, reached via View as Employee, showing the clock in/out button.",
          },
          {
            kind: "p",
            text: "Below that is your personal history: date, clock-in time (flagged in red if it's after 10am), clock-out time, and a status badge (Completed / In progress).",
          },
          {
            kind: "callout",
            tone: "info",
            text: "There's no manual edit/correction option here — attendance is purely clock in/out plus the read-only history it produces.",
          },
          {
            kind: "callout",
            tone: "tip",
            text: "A Manager or Company Admin lands on the whole team's attendance table instead of this personal view — see \"Managing Team Attendance & Leave\" in the Admin & Manager guide. They can still clock themselves in/out by turning on \"View as Employee,\" which switches them to exactly this view.",
          },
          {
            kind: "callout",
            tone: "tip",
            text: "Managers and Company Admins also see a Team tab here — see \"Managing Team Attendance & Leave\" in the Admin & Manager guide.",
          },
        ],
      },
      {
        id: "leave",
        title: "Requesting Leave",
        icon: CalendarDays,
        audience: "Employee",
        summary: "The leave calendar, submitting a request, and tracking your own requests.",
        blocks: [
          { kind: "h3", text: "Calendar view" },
          {
            kind: "p",
            text: "A month grid you can page through with Prev / Next / Today. Company holidays show as red badges; your own leave requests show as colored badges on the days they cover (green = approved, amber = pending, red = rejected or holiday). Click any day to open the Request Leave form pre-filled with that date.",
          },
          {
            kind: "image",
            src: "/manual/leave-personal.png",
            alt: "The personal Leave calendar, reached via View as Employee, with balance tiles and a month grid.",
          },
          { kind: "h3", text: "Requesting leave" },
          {
            kind: "steps",
            items: [
              "Open Request Leave (from the calendar or the button on the page).",
              "Pick a Leave type, Start date and End date.",
              "Choose Full day or Half day — half day is only available for single-day requests.",
              "Add a reason, then submit. The form shows a live \"this covers N days\" total before you send it.",
            ],
          },
          { kind: "h3", text: "My Requests view" },
          {
            kind: "p",
            text: "A table of everything you've submitted — type, dates, number of days, and status — filterable to pending / approved / rejected.",
          },
          {
            kind: "callout",
            tone: "tip",
            text: "A Manager or Company Admin lands on the whole team's leave requests instead of this personal view — see \"Managing Team Attendance & Leave\" in the Admin & Manager guide. They can still request their own leave by turning on \"View as Employee,\" which switches them to exactly this view.",
          },
        ],
      },
      {
        id: "skills-matrix",
        title: "Skills Matrix",
        icon: BarChart3,
        audience: "Everyone",
        access: "Requires the Skills Matrix module to be enabled",
        summary: "A star-rated grid of who has which skills, and how deep.",
        blocks: [
          {
            kind: "p",
            text: "The Skills Matrix (/skills) is a grid: rows are employees, columns are skills grouped by category. Click a star on any cell to set that person's proficiency (1–5 stars) — it saves instantly and reverts automatically if the save fails.",
          },
          {
            kind: "image",
            src: "/manual/skills-matrix.png",
            alt: "The Skills Matrix page with stat tiles and a grid of employees against star-rated skills.",
          },
          {
            kind: "list",
            items: [
              "Stat tiles at the top show skills tracked, employees, ratings logged, and overall matrix coverage.",
              "\"Find experts by skill\" — pick a skill and a minimum star level to list everyone who qualifies.",
              "Search by name and filter by department to narrow the grid.",
              "\"Manage Skills\" lets you add a new skill (with an optional category) or delete existing ones.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            text: "Anyone who can reach this page can rate anyone's skills — there's no built-in restriction to \"rate only your own team.\" In practice, companies typically use this as a manager/HR tool.",
          },
        ],
      },
      {
        id: "knowledge-base",
        title: "Knowledge Base",
        icon: BookOpen,
        audience: "Everyone",
        access: "Requires the Knowledge Base module to be enabled",
        summary: "A searchable internal wiki for policies, SOPs, guides, FAQs, and onboarding docs.",
        blocks: [
          {
            kind: "p",
            text: "Browse by category in the sidebar (Policies, SOPs, Technical Guides, FAQs, Onboarding, or any custom category), or search by title/content. Each article card shows its category, view count, an excerpt, the author, and when it was last updated.",
          },
          {
            kind: "image",
            src: "/manual/knowledge-base.png",
            alt: "The Knowledge Base page with a category sidebar and a grid of article cards.",
          },
          { kind: "h3", text: "Writing an article" },
          {
            kind: "steps",
            items: [
              "Click New Article.",
              "Give it a Title and pick a Category (or type a custom one).",
              "Write the Content — a lightweight markdown syntax is supported: # / ## / ### for headings, - or * for bullets, numbered lists, > for blockquotes.",
              "Add comma-separated Tags if useful, then choose whether to Publish immediately.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            text: "Create/edit/delete are open to anyone who can reach this page — there's no separate read-only mode built in.",
          },
        ],
      },
      {
        id: "recognition",
        title: "Recognition",
        icon: Award,
        audience: "Everyone",
        access: "Requires the Recognition module to be enabled",
        summary: "Award peer or manager recognition badges and browse the company feed.",
        blocks: [
          {
            kind: "image",
            src: "/manual/recognition.png",
            alt: "The Recognition page with stat tiles, a grid of available badges, and an empty recognition feed.",
          },
          {
            kind: "steps",
            items: [
              "Click Award Recognition.",
              "Search for and pick the person you're recognizing.",
              "Pick a badge from the visual badge grid.",
              "Optionally add a message (up to 500 characters, with a live counter), then submit.",
            ],
          },
          {
            kind: "p",
            text: "The feed shows every recognition in reverse-chronological order — who received what, from whom, with the message and a relative timestamp. Hover a card to reveal a delete option (with confirmation).",
          },
        ],
      },
      {
        id: "ai-assistant",
        title: "AI Assistant",
        icon: Bot,
        audience: "Everyone",
        access: "Requires the AI Assistant module to be enabled",
        summary: "A conversational HR chatbot grounded in your company's live data.",
        blocks: [
          {
            kind: "p",
            text: "Ask questions in plain language — the assistant answers using real, live data from your company (employees, attendance, leave), not canned responses. Try one of the suggested chips on the empty screen, e.g. \"Who is on leave today?\", \"Who is late today?\", \"Show pending leave requests\", or \"How many employees do we have?\"",
          },
          {
            kind: "image",
            src: "/manual/ai-assistant.png",
            alt: "The AI Assistant chat page with suggested question chips and a message input at the bottom.",
          },
          {
            kind: "list",
            items: [
              "Type and press Enter to send (Shift+Enter for a new line), or use the microphone button for voice input if your browser supports it.",
              "Toggle \"Voice replies\" to have answers read aloud automatically; you can also replay any past reply with the speaker icon next to it.",
              "\"Clear chat\" wipes the conversation and stops any speech in progress.",
            ],
          },
        ],
      },
      {
        id: "career-roadmap",
        title: "Career Roadmap",
        icon: TrendingUp,
        audience: "Everyone",
        access: "Requires the Career Roadmap module to be enabled",
        summary: "Multi-step career tracks toward a target role, with enrollment.",
        blocks: [
          {
            kind: "p",
            text: "Each career track is a card — title, target role, description, and an ordered list of steps you can expand. Every step can carry its own description, required skills, and linked resources.",
          },
          {
            kind: "image",
            src: "/manual/career-roadmap.png",
            alt: "The Career Roadmap page with career track cards.",
          },
          {
            kind: "h3", text: "Creating a track",
          },
          {
            kind: "steps",
            items: [
              "Click New Track and fill in a Title, Target Role, and Description.",
              "Add steps one at a time — each with a title and a comma-separated list of required skills.",
              "Save. You can add or remove steps before saving.",
            ],
          },
          {
            kind: "p",
            text: "Click Enroll on any track to put a specific employee onto that path. A trash icon on the track card (with confirmation) deletes it entirely.",
          },
        ],
      },
      {
        id: "meetings",
        title: "Meetings & Action Items",
        icon: CalendarCheck,
        audience: "Everyone",
        access: "Requires the Meetings module to be enabled",
        summary: "Capture meeting notes, decisions, and trackable follow-up tasks.",
        blocks: [
          {
            kind: "image",
            src: "/manual/meetings.png",
            alt: "The Meetings page with meeting cards and action-item progress bars.",
          },
          {
            kind: "steps",
            items: [
              "Click New Meeting and fill in a Title, Date & Time, Description, and free-form Notes.",
              "Add Action Items — each with its own text, an Assignee from the employee list, and a due date. Add or remove rows as needed.",
              "Save. The meeting appears as a card with a progress bar showing how many action items are done.",
            ],
          },
          {
            kind: "p",
            text: "Open a meeting to see its notes and checklist. Click an action item's status icon to cycle it through open → in progress → done, or delete it outright. The meeting card itself can be deleted too (with confirmation).",
          },
        ],
      },
      {
        id: "assets",
        title: "Asset Lifecycle",
        icon: Boxes,
        audience: "Everyone",
        access: "Requires the Asset Management module to be enabled",
        summary: "Track company equipment from purchase through disposal.",
        blocks: [
          {
            kind: "p",
            text: "Assets move through five stages — Purchased → Assigned → Maintenance → Returned → Disposed — shown as a clickable lifecycle strip at the top; click a stage to filter the table by it. Warranty dates expiring within 30 days are flagged with a warning icon.",
          },
          {
            kind: "image",
            src: "/manual/assets.png",
            alt: "The Asset Lifecycle page with the five-stage filter strip and an asset table.",
          },
          {
            kind: "steps",
            items: [
              "Click Add Asset (or the edit pencil on an existing one).",
              "Fill in Asset Name, Type, Serial Number, Brand, Model, Purchase Date/Cost, and Warranty Expiry.",
              "When editing an existing asset you can also set its Status and who it's Assigned To, plus notes.",
            ],
          },
          {
            kind: "p",
            text: "Search by name/serial or filter by status; delete a row with the trash icon (confirmation required).",
          },
        ],
      },
      {
        id: "compliance",
        title: "Compliance Tracker",
        icon: ShieldCheck,
        audience: "Everyone",
        access: "Requires the Compliance module to be enabled",
        summary: "Track document expiries — visas, passports, certifications, insurance, and more.",
        blocks: [
          {
            kind: "p",
            text: "Three clickable summary tiles — Valid, Expiring Soon, Expired — both show counts and act as filters for the table below. \"Days Left\" is color-coded: red if overdue, amber if due within 30 days, green otherwise.",
          },
          {
            kind: "image",
            src: "/manual/compliance.png",
            alt: "The Compliance Tracker page with Valid, Expiring Soon, and Expired summary tiles above a document table.",
          },
          {
            kind: "steps",
            items: [
              "Click Add Item.",
              "Pick a Type (Passport, Visa, Certification, Insurance, Medical, Driver's License, Contract, Other).",
              "Fill in Name, Document Number, an optional Employee (leave blank for a company-wide item), Issue Date, Expiry Date, and Notes.",
            ],
          },
        ],
      },
      {
        id: "getting-help",
        title: "Getting Help (Support Tickets)",
        icon: LifeBuoy,
        audience: "Everyone",
        summary: "Raise and track support tickets directly with the WorkSphere team.",
        blocks: [
          {
            kind: "p",
            text: "The Support page lists your tickets — subject, priority, status, and last-updated time. Click New Ticket to open one: a subject, a priority (low/normal/high/urgent), and a description of the issue.",
          },
          {
            kind: "image",
            src: "/manual/support-tickets.png",
            alt: "The Support page listing tickets with subject, priority, status, and last-updated columns.",
          },
          {
            kind: "p",
            text: "Opening a ticket shows the full message thread, including replies from WorkSphere Support, with a box at the bottom to keep replying.",
          },
          {
            kind: "callout",
            tone: "info",
            text: "This page isn't currently linked from the sidebar — go directly to the /support URL in your workspace, or ask your admin.",
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "admin",
    label: "For Company Admins & Managers",
    description: "Running the company workspace: people, modules, money, and configuration.",
    chapters: [
      {
        id: "app-marketplace",
        title: "App Marketplace (Modules)",
        icon: Blocks,
        audience: "Company Admin",
        summary: "Turn optional HR modules on or off for your whole company.",
        blocks: [
          {
            kind: "p",
            text: "The App Marketplace (/modules) is what unlocks nearly everything else in this guide — Attendance, Skills Matrix, Recruitment, Analytics, Payroll, and more are all off by default until a Company Admin enables them here.",
          },
          {
            kind: "image",
            src: "/manual/app-marketplace.png",
            alt: "The App Marketplace page with three columns: Disabled modules, Active modules, and Coming Soon modules.",
            caption: "Drag a module card from Disabled into Active (or use the checkmark toggle) to switch it on for the whole company.",
          },
          {
            kind: "p",
            text: "Modules are shown in three lanes: Disabled, Active, and Coming Soon. Drag a card between Disabled and Active to switch it on or off, or use the small check/✕ toggle on the card. Coming Soon modules aren't released yet and can't be enabled.",
          },
          {
            kind: "callout",
            tone: "warning",
            text: "If a module isn't included in your subscription plan, it shows a lock icon and a \"Not in your plan\" badge — trying to enable it shows a message to contact your admin to add it to the plan, rather than turning it on.",
          },
        ],
      },
      {
        id: "view-as-employee",
        title: "Previewing as an Employee",
        icon: Eye,
        audience: "Manager & Company Admin",
        summary: "See exactly what a regular employee sees, without logging into a separate account.",
        blocks: [
          {
            kind: "p",
            text: "Because a Manager or Company Admin is usually an employee too (they have their own clock-in/out and leave balance), the app lets them flip into a stripped-down \"employee view\" to check what the rest of the team sees, or just to use their own attendance/leave without the extra admin clutter.",
          },
          { kind: "h3", text: "Turning it on" },
          {
            kind: "steps",
            items: [
              "Click your name/initials in the top-right corner of the header to open the user menu.",
              "Choose \"View as Employee.\"",
              "A brand-colored banner appears under the header confirming \"Viewing as Employee — the sidebar only shows what a regular employee sees,\" with an Exit link.",
            ],
          },
          {
            kind: "image",
            src: "/manual/view-as-employee.png",
            alt: "The dashboard with the green 'Viewing as Employee' banner under the header and a trimmed-down sidebar.",
          },
          { kind: "h3", text: "What changes while it's on" },
          {
            kind: "list",
            items: [
              "The sidebar drops every admin-only link — AI Advisor, Departments, App Marketplace, Resume Parser, Analytics, Payroll Simulator, Payroll Config, Developer API, Billing, and Branding all disappear.",
              "The Attendance page switches from the whole team's clock-in/out table to your own personal My Attendance view, so you can clock yourself in and out.",
              "The Leave page switches from the team's requests and Company Holidays to your own My Leave view (calendar + your own requests), so you can request time off for yourself.",
              "On the Employees directory and every profile page, \"Add employee,\" \"Edit,\" \"Delete,\" and every Add/remove control on the Projects, Assets, Training, Certificates, Documents, and Notes tabs disappear — you get the same read-only view an employee gets.",
              "On the Org Chart, cards stop being draggable — you can still click through to a profile, but reassigning who reports to whom is off.",
              "Pages that stay visible to everyone anyway — Employees (read-only), Skills Matrix, Knowledge Base, Recognition, AI Assistant, Career Roadmap, Meetings, Assets, Compliance — still show up, since employees use those too.",
            ],
          },
          { kind: "h3", text: "Turning it off" },
          {
            kind: "p",
            text: "Open the user menu again and choose \"Exit Employee View\" — or click Exit on the banner. Everything admin-facing comes straight back.",
          },
          {
            kind: "callout",
            tone: "info",
            text: "This is a preview only, not an actual permission change — your account keeps every admin capability the whole time, it's just hidden from view. Nothing about your role or access is altered, and you can switch it on/off as often as you like.",
          },
        ],
      },
      {
        id: "departments",
        title: "Departments",
        icon: Network,
        audience: "Company Admin",
        summary: "Simple CRUD for your organization's departments.",
        blocks: [
          {
            kind: "p",
            text: "A straightforward table of departments (name, description) with Add, Edit, and Delete (delete asks for confirmation first). Departments show up everywhere else as a filter and a field — the employee directory, profile forms, compliance items, and more.",
          },
          {
            kind: "image",
            src: "/manual/departments.png",
            alt: "The Departments page with a table of department names and descriptions.",
          },
        ],
      },
      {
        id: "org-chart",
        title: "Org Chart",
        icon: GitBranch,
        audience: "Everyone (viewing) · Company Admin (reassigning managers)",
        summary: "A visual reporting-line hierarchy, with drag-and-drop editing for Company Admins.",
        blocks: [
          {
            kind: "list",
            items: [
              "Switch to this view from the toggle at the top of the Employees page.",
              "Search to highlight a specific employee in the tree, without filtering the rest out.",
              "Zoom in/out or reset, with a live percentage readout.",
              "Click any card to jump to that person's full profile.",
            ],
          },
          {
            kind: "image",
            src: "/manual/org-chart.png",
            alt: "The Org Chart page with employee cards connected in a reporting-line tree, and a status dot on each card.",
          },
          {
            kind: "p",
            text: "Status dots on each card show at a glance whether someone is active (green), on leave (yellow), or terminated (red).",
          },
          {
            kind: "callout",
            tone: "info",
            text: "Only a Company Admin can drag one employee's card onto another to change who they report to (a dedicated drop zone also lets you promote someone to the root level). Everyone else — including a Manager, and anyone previewing with \"View as Employee\" — gets a view-only chart: cards aren't draggable, just clickable through to the profile.",
          },
        ],
      },
      {
        id: "team-leave-attendance",
        title: "Managing Team Attendance & Leave",
        icon: UserCheck,
        audience: "Manager & Company Admin",
        summary: "Approving leave, reviewing team attendance, and setting company holidays.",
        blocks: [
          { kind: "h3", text: "Team attendance" },
          {
            kind: "p",
            text: "Anyone with attendance view/manage permissions (managers and company admins) lands on the whole team's attendance — every employee's clock-in/out history, filterable by employee — instead of a personal clock-in view. To clock yourself in or out, turn on \"View as Employee\" first; that switches this page to your own personal view.",
          },
          {
            kind: "image",
            src: "/manual/team-attendance.png",
            alt: "The team Attendance view for a Manager or Company Admin, listing every employee's clock-in and clock-out history.",
          },
          {
            kind: "callout",
            tone: "info",
            text: "The attendance history table (both the team view and the personal \"View as Employee\" view) is paginated at 20 records per page.",
          },
          { kind: "h3", text: "Approving leave" },
          {
            kind: "p",
            text: "Anyone with leave approve/manage permissions lands on the whole team's leave requests instead of a personal calendar — with a pending-count badge — containing:",
          },
          {
            kind: "list",
            items: [
              "Requests — everyone's leave requests, filterable by status and by employee, with Approve / Reject buttons on pending requests that aren't your own.",
              "Company Holidays — visible only to Company Admins (a stricter permission than approval). Add a holiday's name and date, or remove one; holidays then appear on everyone's leave calendar automatically.",
            ],
          },
          {
            kind: "image",
            src: "/manual/team-leave-requests.png",
            alt: "The team Leave Requests view with a Requests tab and a Company Holidays tab, and a table of every employee's requests.",
          },
          {
            kind: "p",
            text: "To request your own leave or see your own calendar, turn on \"View as Employee\" first; that switches this page to your own personal view.",
          },
          {
            kind: "callout",
            tone: "tip",
            text: "Both Attendance and Leave switch from the team view to your own personal view while \"View as Employee\" is on — see \"Previewing as an Employee\" earlier in this guide.",
          },
        ],
      },
      {
        id: "recruitment",
        title: "Resume Parser (Recruitment)",
        icon: FileSearch,
        audience: "Company Admin / HR",
        access: "Requires the Recruitment module to be enabled",
        summary: "Upload a candidate resume and get structured data back instantly via AI.",
        blocks: [
          {
            kind: "image",
            src: "/manual/resume-parser.png",
            alt: "The Resume Parser page with a Parse Resume button and cards explaining what gets extracted from a resume.",
          },
          {
            kind: "steps",
            items: [
              "Click \"Parse resume\" to open the upload zone — drag a file in, or click to browse. PDF only, up to 10 MB.",
              "Watch the live status (\"Uploading… / Extracting text…\") while it processes.",
              "Review the extracted profile: name, email, phone, companies worked at, an AI-written summary, skills, work experience timeline, education, projects, and certifications.",
            ],
          },
          {
            kind: "p",
            text: "Past parses are listed on the left with a status badge (Parsed / Processing / Failed — failures show the error message); click any to reopen it, or delete it with the trash icon.",
          },
        ],
      },
      {
        id: "analytics",
        title: "Company Analytics",
        icon: LineChart,
        audience: "Manager & Company Admin",
        access: "Requires the Analytics module to be enabled",
        summary: "A read-only workforce reporting dashboard.",
        blocks: [
          {
            kind: "image",
            src: "/manual/analytics.png",
            alt: "The Company Analytics page with a KPI row, hiring/attrition/payroll trend charts, and a department breakdown table.",
          },
          {
            kind: "list",
            items: [
              "KPI row: total headcount, attendance rate, new hires this month, and this month's payroll cost with a trend vs. last month.",
              "Three 12-month trend charts: hiring, attrition, and payroll cost.",
              "A department breakdown table with headcount and utilisation per department.",
              "Payroll summary comparing this month, last month, and the growth percentage.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            text: "There's nothing to configure here — it's purely a reporting view, refreshed from live company data.",
          },
        ],
      },
      {
        id: "ai-advisor",
        title: "AI Workforce Advisor",
        icon: Sparkles,
        audience: "Manager & Company Admin",
        summary: "Proactive, AI-generated insights from live attendance, performance, and payroll data.",
        blocks: [
          {
            kind: "p",
            text: "Unlike the AI Assistant (a chatbot you ask questions), the Advisor surfaces things worth your attention on its own — a grid of insight cards generated from company data. Click Refresh to regenerate them.",
          },
          {
            kind: "image",
            src: "/manual/ai-workforce-advisor.png",
            alt: "The AI Workforce Advisor page with insight cards for a promotion opportunity and a payroll increase.",
          },
          {
            kind: "p",
            text: "When nothing needs attention, it simply says so: \"No signals right now — attendance, performance, and payroll all look healthy.\"",
          },
        ],
      },
      {
        id: "payroll-simulator",
        title: "Payroll Simulator",
        icon: Wallet,
        audience: "Manager & Company Admin",
        access: "Requires the Payroll module to be enabled",
        summary: "Model salary changes before applying them for real — nothing here is saved.",
        blocks: [
          {
            kind: "p",
            text: "Switch between Single Employee and Bulk (Department / All) modes.",
          },
          {
            kind: "image",
            src: "/manual/payroll-simulator.png",
            alt: "The Payroll Simulator page in Single Employee mode, showing current vs. new net pay.",
          },
          {
            kind: "list",
            items: [
              "Single: pick an employee, enter a new basic salary (tax and PF rates are prefilled and editable), and see current vs. new net pay side by side with a full breakdown.",
              "Bulk: pick a department (or leave it for everyone) and a flat salary-increase percentage; get a per-employee table plus current/new/increase totals for the whole group.",
            ],
          },
          {
            kind: "callout",
            tone: "tip",
            text: "This is purely a what-if calculator — no employee records or payslips are changed by running a simulation.",
          },
        ],
      },
      {
        id: "payroll-config",
        title: "Multi-Country Payroll Config",
        icon: Globe,
        audience: "Company Admin",
        access: "Requires the Payroll module to be enabled",
        summary: "Set up per-country payroll rules if you employ people in more than one country.",
        blocks: [
          {
            kind: "image",
            src: "/manual/payroll-config.png",
            alt: "The Multi-Country Payroll Config page with an Add Country button and its empty state before any country is configured.",
          },
          {
            kind: "steps",
            items: [
              "Click Add Country. Pick a Quick Preset (India, US, UK, UAE, Singapore, Australia, Canada, Germany) to auto-fill sensible defaults, or fill fields manually.",
              "Set Country Code, Country Name, Currency Code/Symbol, Tax Rate %, Provident Fund %, Payroll Frequency, and Timezone.",
              "Save. Each configured country appears as a card you can toggle Active/Inactive, edit, or delete.",
            ],
          },
        ],
      },
      {
        id: "developer-api",
        title: "Developer API",
        icon: Code2,
        audience: "Company Admin / Developer",
        access: "Requires the Developer API module to be enabled",
        summary: "Issue API keys and register webhooks to integrate WorkSphere with other systems.",
        blocks: [
          { kind: "h3", text: "API Keys" },
          {
            kind: "image",
            src: "/manual/developer-api.png",
            alt: "The Developer API page's API Keys tab with a New API Key button and the curl usage snippet.",
          },
          {
            kind: "steps",
            items: [
              "Click New API Key, name it, choose scopes (e.g. employees.read/write, leave.read/write, attendance.read, payroll.read, assets.read/write), and optionally set an expiry.",
              "The raw key is shown exactly once — blurred by default, with a reveal toggle and a copy button. Save it somewhere safe; it can't be retrieved again.",
              "Existing keys show a masked preview, last-used date, scopes, and a Revoke option.",
            ],
          },
          { kind: "h3", text: "Webhooks" },
          {
            kind: "steps",
            items: [
              "Click New Webhook: give it a name, an endpoint URL, and pick which events should trigger it.",
              "Registered webhooks show active/inactive status, any recent failure count, subscribed events, and when they last fired.",
            ],
          },
          {
            kind: "p",
            text: "A code snippet on the API Keys tab shows the exact curl syntax for authenticating with `Authorization: Bearer <YOUR_KEY>`.",
          },
        ],
      },
      {
        id: "branding",
        title: "Branding (White Label)",
        icon: Palette,
        audience: "Company Admin",
        access: "Requires the White Label module to be enabled",
        summary: "Customize how WorkSphere looks and feels for your company.",
        blocks: [
          {
            kind: "image",
            src: "/manual/branding.png",
            alt: "The Branding page with App Identity and Brand Colours forms on the left and a live login-screen preview on the right.",
          },
          {
            kind: "list",
            items: [
              "App Identity — app name, logo URL, favicon URL.",
              "Brand Colours — primary and secondary colors, with a native color picker, hex input, and ten preset swatches each.",
              "Login Page — a custom welcome message shown on your company's login screen.",
              "Domain & Support — a custom CNAME domain and a support email address.",
            ],
          },
          {
            kind: "p",
            text: "A live preview on the right mocks up the branded login screen as you edit. Click Save Branding to apply.",
          },
        ],
      },
      {
        id: "billing-tenant",
        title: "Company Billing",
        icon: CreditCard,
        audience: "Company Admin",
        summary: "View your subscription invoices and submit UPI payment references.",
        blocks: [
          {
            kind: "p",
            text: "The Billing page shows the UPI ID and payee name to pay your invoices to, plus a table of every invoice — period, amount, status, and any UPI reference you've already submitted.",
          },
          {
            kind: "image",
            src: "/manual/company-billing.png",
            alt: "The Company Billing page with the UPI ID and payee name to pay, and an invoice table.",
          },
          {
            kind: "steps",
            items: [
              "Find a pending invoice and click \"Submit payment.\"",
              "Enter the UPI transaction reference from your payment app.",
              "Submit — the invoice status changes to \"submitted\" while a Super Admin verifies and marks it paid.",
            ],
          },
        ],
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  {
    id: "super-admin",
    label: "Super Admin — Platform Operations",
    description: "Running WorkSphere itself, across every company on the platform. Lives at /admin, separate from any company workspace.",
    chapters: [
      {
        id: "platform-dashboard",
        title: "Platform Dashboard",
        icon: Gauge,
        audience: "Super Admin",
        summary: "Platform-wide health at a glance: companies, revenue, and risk signals.",
        blocks: [
          {
            kind: "image",
            src: "/manual/platform-dashboard.png",
            alt: "The Platform Dashboard with alert banners, stat cards, and a company status panel across every tenant.",
          },
          {
            kind: "list",
            items: [
              "Alert banners for companies waiting on approval, and trials ending within 7 days (with days remaining, linking straight to that company).",
              "Stat cards: total companies, pending approvals, total employees across every tenant, and monthly recurring revenue (MRR).",
              "Company status panel: counts of Active / Pending / Suspended / Rejected / On trial, plus annual run rate (ARR).",
              "\"Approaching plan limits\" — companies at 80%+ of their plan's employee cap.",
              "Revenue by plan — MRR and company count broken out per subscription plan.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            text: "This page is read-only and purely navigational — every number links onward to the page that lets you act on it.",
          },
        ],
      },
      {
        id: "companies",
        title: "Companies",
        icon: Building2,
        audience: "Super Admin",
        summary: "Approve, reject, suspend, and inspect every tenant on the platform.",
        blocks: [
          { kind: "h3", text: "Company list" },
          {
            kind: "p",
            text: "Search by name or email. Each row shows plan, usage (employee count vs. cap, highlighted if ≥80%), status, and join date, with actions that depend on status:",
          },
          {
            kind: "image",
            src: "/manual/platform-companies.png",
            alt: "The Companies page listing every tenant with plan, usage, status, join date, and Suspend/Modules actions.",
          },
          {
            kind: "table",
            headers: ["Status", "Available actions"],
            rows: [
              ["Pending approval", "Approve, Reject, or open Modules"],
              ["Rejected", "\"Approve anyway,\" or open Modules"],
              ["Approved / Active", "Suspend, or open Modules"],
              ["Suspended", "Reactivate, or open Modules"],
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            text: "Suspending a company immediately blocks sign-in for every user at that company. Every state change here goes through a confirmation dialog.",
          },
          { kind: "h3", text: "Company detail page" },
          {
            kind: "p",
            text: "Click into a company to see contact info (email, phone, address, timezone, currency), plan & usage (with trial end date), and its 10 most recent admin-activity-log entries. The same lifecycle actions (Approve / Reject / Suspend / Reactivate) are available here too, plus:",
          },
          {
            kind: "callout",
            tone: "warning",
            text: "\"Log in as admin\" impersonates that company's admin account and drops you into their /dashboard as them — useful for support and debugging. It's fully logged in the Activity Log, and a banner (\"Impersonating {user} — actions you take are logged\") stays visible the whole time, with an Exit link to leave.",
          },
        ],
      },
      {
        id: "company-modules",
        title: "Module Access per Company",
        icon: Layers,
        audience: "Super Admin",
        summary: "Control which marketplace modules a specific company is even allowed to see.",
        blocks: [
          {
            kind: "p",
            text: "This is a separate layer from the global module catalog below — think of it as \"what's in this company's plan,\" versus the catalog being \"what exists at all.\" A company can only enable a module for itself (from its own App Marketplace) if you've granted it access here first.",
          },
          {
            kind: "list",
            items: [
              "Two Kanban lanes: Inactive (\"not part of this company's plan\") and Active (\"available on this company's App Marketplace\"). Drag a module card between them to grant or revoke it — or use the arrow buttons as a non-drag alternative.",
              "Reorder modules within the Active lane by dragging — this sets the order the company sees them in their own marketplace.",
              "A \"Switched on\" badge marks modules the company has actually turned on for themselves (versus merely being granted access).",
              "Modules not yet released platform-wide show a clock icon.",
            ],
          },
          {
            kind: "image",
            src: "/manual/company-modules.png",
            alt: "The Module Access per Company page with Inactive and Active Kanban lanes for one company's granted modules.",
          },
        ],
      },
      {
        id: "module-catalog",
        title: "Module Catalog",
        icon: Blocks,
        audience: "Super Admin",
        summary: "Define the master list of modules that can ever appear in any company's marketplace.",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Add Module (or Edit on an existing one).",
              "Set Name, Slug (the unique key used everywhere else, e.g. skills-matrix), Icon (a Lucide icon name), Category, and Description.",
              "Toggle \"Listed in the marketplace\" (is_active) and \"Available to enable\" (is_available — uncheck to show it as \"Coming soon\").",
            ],
          },
          {
            kind: "p",
            text: "The table shows each module's category, how many companies have it enabled, and its availability/listing status. Delete removes it from the catalog entirely (confirmation required).",
          },
          {
            kind: "image",
            src: "/manual/module-catalog.png",
            alt: "The Module Catalog table listing every module with its category, companies-enabled count, and status.",
          },
        ],
      },
      {
        id: "plans",
        title: "Subscription Plans",
        icon: CreditCard,
        audience: "Super Admin",
        summary: "Define the pricing tiers companies can subscribe to.",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Add Plan (or Edit).",
              "Set Name, Slug, Price/month, Employee cap, and a list of Features (one per line).",
              "Toggle \"Plan is active\" to control whether it's visible to companies at all.",
            ],
          },
          {
            kind: "image",
            src: "/manual/subscription-plans.png",
            alt: "The Subscription Plans table listing each plan's price, employee cap, features, company count, and status.",
          },
          {
            kind: "p",
            text: "The list also shows how many companies are currently on each plan. Delete removes a plan (confirmation required) — do this carefully if companies are still on it.",
          },
        ],
      },
      {
        id: "platform-billing",
        title: "Platform Billing & Invoices",
        icon: Wallet,
        audience: "Super Admin",
        summary: "Manage UPI payment settings and every invoice issued to every tenant.",
        blocks: [
          {
            kind: "p",
            text: "The UPI ID and payee name set here are exactly what shows up on every company's own Billing page as \"where to pay.\"",
          },
          {
            kind: "image",
            src: "/manual/platform-billing.png",
            alt: "The Platform Billing page with UPI settings and a status filter above the full cross-tenant invoice table.",
          },
          { kind: "h3", text: "Invoices" },
          {
            kind: "list",
            items: [
              "Filter by status: All / Pending / Submitted / Paid / Overdue / Cancelled.",
              "\"Mark paid\" or \"Cancel\" on any invoice that isn't already paid/cancelled (both confirm before applying).",
              "\"Generate invoice\" opens a form: company, amount, period start/end, and optional notes — creates a new pending invoice tied to that company's current plan.",
            ],
          },
          {
            kind: "callout",
            tone: "info",
            text: "The lifecycle is pending → submitted (the company adds a UPI reference from their side) → paid / overdue / cancelled (set from here).",
          },
        ],
      },
      {
        id: "announcements",
        title: "Announcements",
        icon: Megaphone,
        audience: "Super Admin",
        summary: "Push banner messages into companies' dashboards, platform-wide or targeted.",
        blocks: [
          {
            kind: "steps",
            items: [
              "Click Add Announcement.",
              "Fill in a Title and Body, and pick a Level: Info, Warning, or Critical.",
              "Choose an Audience — All companies, or Specific companies (reveals a checklist to pick individually).",
              "Optionally set Starts / Ends dates, and toggle Active.",
            ],
          },
          {
            kind: "image",
            src: "/manual/announcements.png",
            alt: "The Announcements page with an Add Announcement button above a table of title, level, audience, and status.",
          },
          {
            kind: "p",
            text: "Live announcements appear as a dismissible colored banner across the top of the target companies' workspaces.",
          },
        ],
      },
      {
        id: "security",
        title: "Security",
        icon: Lock,
        audience: "Super Admin",
        summary: "Protect your own super-admin account with 2FA, and lock down platform access by IP.",
        blocks: [
          {
            kind: "image",
            src: "/manual/platform-security.png",
            alt: "The Security page with a Two-factor authentication card and an IP allowlist card.",
          },
          { kind: "h3", text: "Two-factor authentication" },
          {
            kind: "steps",
            items: [
              "Click \"Set up 2FA\" — you'll get a TOTP secret and QR/otpauth URL to add to an authenticator app (Google Authenticator, 1Password, etc.).",
              "Enter the 6-digit code it generates to confirm.",
              "Save the one-time recovery codes shown — you'll need one if you ever lose access to your authenticator.",
            ],
          },
          { kind: "h3", text: "IP allowlist" },
          {
            kind: "p",
            text: "Add an IP address (with an optional label) to restrict who can reach company management, billing, and other platform routes.",
          },
          {
            kind: "callout",
            tone: "warning",
            text: "Adding the very first entry immediately starts enforcing the restriction for every other super admin too — a confirmation warns you to make sure your own current IP is included before you save. An empty list means no restriction at all.",
          },
          {
            kind: "callout",
            tone: "tip",
            text: "This Security page — and only this page, along with 2FA — is deliberately excluded from the IP allowlist check itself, so you can never lock yourself out entirely.",
          },
        ],
      },
      {
        id: "activity-log",
        title: "Activity Log",
        icon: History,
        audience: "Super Admin",
        summary: "A read-only audit trail of every platform-management action taken by any super admin.",
        blocks: [
          {
            kind: "p",
            text: "Search by action or subject, and filter to a single company. Each entry shows the time, which admin performed it, a color-coded action badge (green = approve/create/grant, red = reject/delete/revoke, blue = update), the affected record, an expandable before/after diff when available, and the IP address it came from.",
          },
          {
            kind: "image",
            src: "/manual/activity-log.png",
            alt: "The Activity Log table with time, admin, action badge, subject, details, and IP columns.",
          },
          {
            kind: "p",
            text: "This log is populated automatically by actions elsewhere — company approvals/rejections, impersonation, invoice changes, module grants, feature-flag changes, data exports and purges, and more. There's nothing to edit here.",
          },
        ],
      },
      {
        id: "support-inbox",
        title: "Support Inbox",
        icon: Inbox,
        audience: "Super Admin",
        summary: "Triage and reply to every support ticket raised by every company.",
        blocks: [
          {
            kind: "p",
            text: "Filter by status (All / Open / In progress / Resolved / Closed). Each row shows subject, company, priority, status, and last update.",
          },
          {
            kind: "image",
            src: "/manual/support-inbox.png",
            alt: "The Support Inbox with a status filter above a table of tickets from every company.",
          },
          {
            kind: "p",
            text: "Opening a ticket shows the company name, a status dropdown you can change live, the full message thread (your replies are tagged \"(support)\"), and a reply box.",
          },
        ],
      },
      {
        id: "advanced-platform-capabilities",
        title: "Advanced: Feature Flags & Company Data",
        icon: Sparkles,
        audience: "Super Admin",
        summary: "Powerful platform actions that exist today without a dedicated screen in this build.",
        blocks: [
          {
            kind: "callout",
            tone: "warning",
            text: "The capabilities below are confirmed to exist in the backend but don't yet have a page in the admin UI reviewed for this guide. Treat them as \"ask engineering / use the API directly\" for now rather than something to click your way to.",
          },
          {
            kind: "list",
            items: [
              "Feature flags (global) — create, edit, and delete platform-wide feature flags.",
              "Feature flags (per company) — override a flag on/off for one tenant, or clear the override to fall back to the global default.",
              "Company data export — download a full JSON export of a tenant's data (users, departments, employees, attendance, leave, invoices, support tickets), GDPR-style.",
              "Company purge — permanently and irreversibly delete a company and all its data. The backend requires typing the exact company name to confirm.",
            ],
          },
          {
            kind: "p",
            text: "All four are fully recorded in the Activity Log when used (company.export, company.purge, feature_flag.create/update/delete, feature_flag.company_override).",
          },
        ],
      },
    ],
  },
];

export function findChapter(id: string): { group: ManualGroup; chapter: ManualChapter } | null {
  for (const group of MANUAL_GROUPS) {
    const chapter = group.chapters.find((c) => c.id === id);
    if (chapter) return { group, chapter };
  }
  return null;
}

export const DEFAULT_CHAPTER_ID = MANUAL_GROUPS[0].chapters[0].id;
