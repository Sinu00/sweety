# Sweety - Blood Glucose Tracker

A small web app where a diabetes patient records up to 4 blood glucose readings
a day and views daily and monthly reports. Built with Node.js + Express,
PostgreSQL and React (Vite).

## Features

- Sign up / log in (passwords hashed with bcrypt, JWT sessions). Each user only
  ever sees their own readings.
- Add, view, edit and delete readings. Each reading has a date, one of 4 time
  slots (Morning fasting, After breakfast, After lunch, After dinner) and a
  value in mg/dl.
- Validation with clear UI error messages: value required, whole number between
  40 and 600, one reading per slot per day, max 4 readings per day, no future
  dates.
- Reports (highest, lowest, average rounded to 1 decimal, reading count, with a
  friendly empty state):
  - **Daily** - the selected date, listing each reading with its slot.
  - **Month-to-date** - the 1st of the month through the selected date.
  - **Monthly** - the whole previous month.
- Bonus: pagination on `GET /api/readings` (`?page=1&limit=20`), a line chart
  of the month's readings (Recharts), and React Testing Library tests for the
  reading form.

## Project layout

```
sweety/
  server/   Express API (src/routes, src/validate.js, src/schema.sql, tests/)
  client/   React app (Vite)
```

## Prerequisites

- Node.js 18+
- A PostgreSQL server (local install or Docker)

## Setup

1. Install dependencies:

   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. Configure environment:

   ```bash
   cp .env.example server/.env
   # edit server/.env: DATABASE_URL and JWT_SECRET
   ```

3. Create the database and apply the schema:

   ```bash
   createdb sweety
   cd server && npm run db:setup
   ```

   (Or apply `server/src/schema.sql` with psql.)

4. (Optional) Seed a demo user - `demo@sweety.app` / `demo1234` with about 60
   days of readings:

   ```bash
   cd server && npm run seed
   ```

## Run

Terminal 1 (API on http://localhost:4000):

```bash
cd server && npm run dev
```

Terminal 2 (client on http://localhost:5173, proxies /api to the server):

```bash
cd client && npm run dev
```

Open http://localhost:5173 and log in with the demo account or create your own.

## Tests

Server tests (Jest + Supertest - auth, every validation rule, per-user
isolation, all three reports, pagination):

```bash
createdb sweety_test
cd server
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sweety_test npm test
```

The test run applies the schema to the test database automatically (Jest
`globalSetup`) and truncates its tables, so always point it at a throwaway
database, never your real one.

Client tests (Vitest + React Testing Library - the reading form):

```bash
cd client && npm test
```

## API overview

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Sign up (`name`, `email`, `password`) |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/readings` | List own readings (`?date`, `?from`, `?to`, `?page`, `?limit`) |
| POST | `/api/readings` | Add a reading (`date`, `slot`, `value`) |
| PUT | `/api/readings/:id` | Edit a reading |
| DELETE | `/api/readings/:id` | Delete a reading |
| GET | `/api/reports/daily?date=` | Daily report + that day's readings |
| GET | `/api/reports/month-to-date?date=` | 1st of month to selected date |
| GET | `/api/reports/monthly?date=` | Whole previous month |

All `/api/readings` and `/api/reports` routes require
`Authorization: Bearer <token>`.

## Screenshots

See the `screenshots/` folder:

1. `01-login.png` - login page
2. `02-dashboard.png` - adding a reading and the paginated history
3. `03-add-reading.png` - the add-reading form
4. `04-reports.png` - daily / month-to-date / previous-month reports
5. `05-chart.png` - the monthly line chart
6. `06-validation-error.png` - a validation error shown in the UI

## Notes

- **Assumption: one calendar day = the server's local day.** A reading's date
  is stored as a plain `DATE` (no timezone), and "today" for the
  future-date check is the server's local date. For a single-user patient app
  this is the least surprising behaviour; a multi-timezone product would store
  the user's timezone.
- **Auth:** stateless JWT (7-day expiry) in an `Authorization` header keeps the
  API simple; refresh tokens or http-only cookies would be the next step for
  production hardening.
- **"Max 4 readings per day" is enforced by the 4 slots themselves** (one
  reading per slot per day, unique constraint in the database), so a fifth
  reading for a day is always a duplicate-slot error. The explicit count rule
  is still checked in validation.
- With more time I would add: a doctor role that can view assigned patients'
  reports, Docker packaging, and HbA1c-style long-term averages.
- The seed script wipes and regenerates only the demo user's readings.
