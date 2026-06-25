# ICS - Intelligent Container Solutions

Web platform for managing empty container returns between Truckers, Shipping Lines, and Depots (CY).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 7 Web API |
| Frontend | React 18 + Vite + TypeScript + MUI |
| State | Redux Toolkit |
| Database | MySQL 8 |
| Cache | Redis 7 |
| ORM | Entity Framework Core (Pomelo) |
| Auth | JWT + Refresh Token |
| QR | QRCoder |

## Project Structure

```
ecms/                       # repository folder (legacy name)
├── backend/
│   ├── ECMS.API/           # REST API controllers
│   ├── ECMS.Application/   # DTOs, interfaces
│   ├── ECMS.Domain/        # Entities, enums
│   ├── ECMS.Infrastructure/# Services, JWT, QR
│   └── ECMS.Persistence/   # EF Core, migrations, seed
├── frontend/               # React SPA (branded as ICS)
├── docker/                 # Docker & Nginx config
└── ECMS.sln
```

## Prerequisites

- .NET 7 SDK
- Node.js 20+
- MySQL 8 (XAMPP or Docker)
- Redis 7 (optional for Phase 2)

## Quick Start (Local)

### 1. Database

Create the database (XAMPP MySQL):

```sql
CREATE DATABASE IF NOT EXISTS ecms;
```

Update `backend/ECMS.API/appsettings.json` if your MySQL credentials differ from `root` with no password.

### 2. Backend

```bash
cd backend/ECMS.API
dotnet run
```

API runs at `http://localhost:5275` with Swagger at `/swagger`.

On first run, migrations and seed data are applied automatically.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`.

### 4. E2E tests (Playwright)

Requires the **API** (`localhost:5275`) and **frontend** (`localhost:5173`) to be running.

```bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e
```

The happy-path test walks through: trucker pre-advice → evaluator approval → depot scheduling → trucker payment → depot verification → trucker QR download.

## Demo Accounts

| Role | Username | Password |
|------|----------|----------|
| Administrator | admin | Admin@123 |
| Trucker | trucker1 | Trucker@123 |
| Shipping Line Evaluator | evaluator1 | Evaluator@123 |
| Depot Personnel | depot1 | Depot@123 |

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | `POST /api/auth/login`, `register`, `refresh`, `logout` |
| Pre-Advice | `GET/POST/PUT/DELETE /api/preadvice` |
| Evaluation | `GET /api/evaluations`, `POST approve/reject` |
| Scheduling | `GET/POST/PUT /api/schedules` |
| Payments | `POST /api/payments/upload`, `GET status/{id}` |
| QR | `GET /api/qr/{id}`, `GET download/{id}` |
| LOGICTECK | `POST /api/logicteck/validate-qr` |
| Dashboard | `GET /api/dashboard/{role}` |

## Docker

```bash
cd docker
docker compose up -d --build
```

- Frontend: http://localhost
- API: http://localhost:5275

## Development Roadmap

See **[docs/PLAN.md](docs/PLAN.md)** for the full sprint plan, **[docs/DESIGN.md](docs/DESIGN.md)** for architecture, and **[docs/TASKS.md](docs/TASKS.md)** for the live task board.

See **[docs/TRUCKER-TRACK.md](docs/TRUCKER-TRACK.md)** for the end-to-end trucker journey and demo steps.

- **Phase 1 (MVP) — ~45% complete:** Auth, Pre-Advice, Evaluation, Scheduling, Payments, QR, Dashboards
- **Phase 2:** Email/SMS notifications, advanced reports, Redis caching
- **Phase 3:** LOGICTECK gate integration, mobile app, BI dashboard

## License

Proprietary — internal use.
