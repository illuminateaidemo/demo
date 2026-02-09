# Project Intelligence Platform

An enterprise-grade, full-stack application for managing projects, clients, resources, timesheets, expenses, and financial reporting. Built with a **Python / FastAPI** backend and a **React / TypeScript** frontend.

## Key Features

- **Client & Project Management** — track clients, engagements, milestones, and deliverables.
- **Resource Planning** — assign team members, monitor utilisation, and forecast capacity.
- **Timesheets & Expenses** — submit, review, and approve time entries and expense claims.
- **Financial Dashboards** — real-time revenue, cost, and margin analytics powered by Recharts.
- **Approval Workflows** — configurable multi-level approval chains for time and expenses.
- **Role-Based Access Control** — JWT authentication with granular permission policies.

## Tech Stack

| Layer       | Technology                                          |
| ----------- | --------------------------------------------------- |
| Backend API | FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2       |
| Frontend    | React 18, TypeScript, Tailwind CSS, React Router v6 |
| Charts      | Recharts                                            |
| Auth        | python-jose (JWT), passlib (bcrypt)                 |
| Testing     | pytest, React Testing Library                       |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/routes/      # FastAPI route handlers
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request / response schemas
│   │   ├── services/        # Business logic layer
│   │   ├── core/            # Config, security, database setup
│   │   └── middleware/      # Custom ASGI middleware
│   ├── alembic/             # Database migrations
│   ├── tests/               # Backend test suite
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/      # UI components (layout, clients, projects, …)
│   │   ├── pages/           # Top-level route pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client functions
│   │   ├── store/           # Zustand state management
│   │   ├── types/           # Shared TypeScript types
│   │   └── utils/           # Helper utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── docs/                    # Architecture & onboarding docs
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm 9+ (or yarn / pnpm)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000** with interactive docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm start
```

The UI will be available at **http://localhost:3000**.

## License

MIT
