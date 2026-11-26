# Sweety: Blood Glucose Tracker

A mobile-first web app where a person with diabetes logs up to 4 blood glucose
readings a day and sees daily and monthly reports. Built with **Node.js +
Express 5**, **PostgreSQL** and **React (Vite)**.

<p>
  <img src="screenshots/02-today.png" width="200" alt="Today screen" />
  <img src="screenshots/04-add-reading.png" width="200" alt="Add reading sheet" />
  <img src="screenshots/06-reports.png" width="200" alt="Daily report" />
  <img src="screenshots/dark-02-today.png" width="200" alt="Today screen, dark mode" />
</p>

## Quick start (Docker, one command)

```bash
docker compose up --build
```

Open http://localhost:8080 and tap **Try the demo account**
(`demo@sweety.app` / `demo1234`). Compose starts PostgreSQL, applies the
schema, seeds the demo user with ~60 days of readings, and serves the API and
the built client from one container.

## Features

### Required

- **Sign up / log in** with name, email and password. Passwords are hashed with
  bcrypt and sessions use JWTs. Every query is scoped to the logged-in user.
- **Add, view, edit and delete readings.** Each reading has a date, one of 4
  slots (Morning (fasting), After breakfast, After lunch, After dinner) and a
  value in mg/dl.
- **Validation** on the server, with the exact messages from the brief shown in
  the UI:

  | Rule | Message |
  | --- | --- |
  | Value required | Please enter a glucose value. |
  | Whole number 40–600 | Value must be between 40 and 600 mg/dl. |
  | One reading per slot per day | You already have an After lunch reading for this date. |
  | Max 4 readings per day | You can add only 4 readings per day. |
  | No future dates | Date cannot be in the future. |

  The form runs the same checks before sending (instant feedback), and the API
  stays the source of truth. A unique `(user_id, date, slot)` constraint also
  protects against double submits.
- **Reports** with highest, lowest, average (1 decimal) and count, plus a
  friendly empty state:
  - **Daily**: the selected date, listing each reading with its slot.
  - **Month to date**: the 1st of the month to the selected date.
  - **Previous month**: the whole previous month.

### Bonus tasks from the brief

- **Pagination** on `GET /api/readings?page=1&limit=20` (used by History).
- **Chart**: every reading of the month, with the 70–180 mg/dl target band
  shaded and points coloured by range (Recharts, lazy-loaded).
- **Docker**: `docker-compose.yml` for PostgreSQL + the app.
- **Frontend tests** with React Testing Library for the reading form.

### Extras I added

- **Mobile-first design**: bottom tab bar, a bottom-sheet form with a large
  numeric input, a week strip, a 4-segment "day ring" per slot, and light/dark
  themes that follow the system.
- **Glucose ranges**: every reading is classed *low* (<70), *in range*
  (70–180) or *high* (>180), the standard "time in range" target. Reports
  return the low / in range / high split.
- **14-day insights** on the home screen: logging streak, time in range, average,
  per-slot averages, week-over-week trend, and short plain-language tips.
  This is pure, unit-tested logic in `server/src/glucose.js`.
- **AI weekly check-in (optional)**: if `ANTHROPIC_API_KEY` is set, the home
  screen offers a short check-in written by Claude from the aggregated 14-day
  numbers only (no name, email or raw log is sent). The prompt forbids
  diagnosis and medication advice. Without a key, the button is hidden and the
  rest of the app is unaffected.
- **CSV export** (Profile → Export readings) to share with a doctor.
- **Accessibility**: real form labels, radio-group slot picker, focus moved
  into the sheet and back to the opener, `role="alert"` errors, and
  reduced-motion support.

## Manual setup (without Docker)

Prerequisites: Node.js 18+ and PostgreSQL.

1. Install dependencies:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. Configure the server:

   ```bash
   cp .env.example server/.env
   # edit DATABASE_URL and JWT_SECRET (ANTHROPIC_API_KEY is optional)
   ```

3. Create the database and apply the schema:

   ```bash
   createdb sweety
   cd server && npm run db:setup
   ```

4. Seed the demo user (`demo@sweety.app` / `demo1234`, ~60 days of readings):

   ```bash
   cd server && npm run seed
   ```

## Run

```bash
# Terminal 1: API on http://localhost:4000
cd server && npm run dev

# Terminal 2: client on http://localhost:5173 (proxies /api to the API)
cd client && npm run dev
```

## Tests

**Server** (Jest + Supertest, 38 tests): auth, every validation rule,
per-user isolation, all three reports, pagination, insights, CSV export, and
unit tests for the range / streak / trend logic.

```bash
createdb sweety_test
cd server
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sweety_test npm test
```

The test run applies the schema to the test database automatically (Jest
`globalSetup`) and truncates its tables, so always point it at a throwaway
database, never your real one.

**Client** (Vitest + React Testing Library, 11 tests): the reading form's
validation messages, duplicate-slot handling, API error display, add (POST),
edit (PUT) and delete-with-confirmation.

```bash
cd client && npm test
```

## API

All `/api/readings`, `/api/reports` and `/api/insights` routes need
`Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Sign up (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/readings` | Own readings (`?date`, `?from`, `?to`, `?page`, `?limit`) |
| POST | `/api/readings` | Add a reading (`date`, `slot`, `value`) |
| PUT | `/api/readings/:id` | Edit a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/readings/export` | CSV of all own readings |
| GET | `/api/reports/daily?date=` | Daily report + that day's readings |
| GET | `/api/reports/month-to-date?date=` | 1st of month to the selected date |
| GET | `/api/reports/monthly?date=` | The whole previous month |
| GET | `/api/insights?date=` | 14-day streak, time in range, trend, tips |
| POST | `/api/insights/summary` | AI check-in (only when `ANTHROPIC_API_KEY` is set) |

## Project layout

```
sweety/
  server/
    src/routes/     auth, readings, reports, insights
    src/validate.js reading validation rules (one place, used by POST and PUT)
    src/glucose.js  ranges, streak and insights (pure functions)
    src/schema.sql  tables + unique (user_id, date, slot)
    tests/          Jest + Supertest
  client/
    src/pages/      Today, History, Reports, Profile, Login, Register
    src/components/ Sheet, DayRing, RangeBar, Icon
    src/ReadingForm.jsx
  Dockerfile, docker-compose.yml
```

## Screenshots

All in `screenshots/` (iPhone-size, 390×844 @2x):
login, today, insights, add reading, validation error, daily report, previous
month report, month chart, history, plus dark-mode versions of today and
reports.

## Notes

### Assumptions

- **A reading's date is a calendar day**, stored as a plain `DATE` and returned
  as a `YYYY-MM-DD` string so it never shifts with timezones. "Today" for
  the future-date rule is the server's local date. In Docker that is UTC; a
  multi-timezone product would store each user's timezone.
- **"Max 4 per day" follows from the 4 slots.** With one reading per slot, a
  fifth reading is always a duplicate slot, so that message appears first. The
  explicit 4-per-day check is still in the validator and the UI shows the
  message when a day is already full.
- **Ranges use 70–180 mg/dl**, the international "time in range" target.
  Fasting and after-meal targets differ in real care plans, so this is a
  sensible default, not a clinical rule; the Profile page says so.
- **The streak** looks back up to 60 days.
- **The seed** recreates only the demo user's readings each time it runs.

### What I would improve with more time

- Per-user target ranges and timezone in a settings screen.
- A doctor role that can view reports of assigned patients.
- Refresh tokens / http-only cookies instead of a 7-day JWT in localStorage,
  and rate limiting on login.
- Cache report results (e.g. Redis), cleared when a reading changes.
- A daily reminder job (BullMQ) for users with fewer than 4 readings.
- End-to-end tests (Playwright) for the main flows, and installable PWA
  support so it can live on the home screen.
