# CrossFit Movement Model

A dashboard for editing and managing CrossFit movement data, backed by a REST API and PostgreSQL.

## Quick Start

**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) installed and running.

```bash
docker compose up --build
```

Then open:
- **Dashboard:** http://localhost:8000
- **API docs (Swagger):** http://localhost:8000/docs

The database is seeded automatically from `data/movements.json` on first run.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/movements` | List all movements |
| GET | `/api/movements?category=Weightlifting` | Filter by category |
| GET | `/api/movements?movement_pattern=Push` | Filter by pattern |
| GET | `/api/movements?equipment=barbell` | Filter by equipment |
| GET | `/api/movements/{id}` | Get single movement |
| POST | `/api/movements` | Create movement |
| PUT | `/api/movements/{id}` | Update movement |
| DELETE | `/api/movements/{id}` | Delete movement |
| GET | `/api/schema` | Get JSON schema |

## Project Structure

```
├── api/
│   ├── main.py          # FastAPI app + routes
│   ├── models.py         # SQLAlchemy model
│   ├── database.py       # DB connection
│   └── seed.py           # Seeds DB from movements.json
├── dashboard/
│   ├── index.html        # HTML shell
│   ├── css/styles.css    # Styles
│   └── js/
│       ├── app.js        # State, API client, init
│       ├── renderer.js   # Form field renderers
│       └── editor.js     # Editor logic + CRUD
├── data/movements.json   # Seed data
├── schema/               # JSON schema
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Useful Commands

```bash
# Start
docker compose up --build

# Start in background
docker compose up --build -d

# View logs
docker compose logs -f api

# Stop
docker compose down

# Stop and wipe the database
docker compose down -v

# Rebuild after code changes
docker compose up --build
```
