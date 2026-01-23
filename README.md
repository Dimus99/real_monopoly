# Political Monopoly

A satirical political Monopoly game.

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Local Development

#### Database Setup

1. Start PostgreSQL locally or use Docker:

```bash
docker run -d --name monopoly_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=monopoly \
  -p 5432:5432 \
  postgres:15-alpine
```

2. Create `.env` file in backend directory:

```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/monopoly
BOT_TOKEN=
DEBUG=true
ALLOW_ORIGINS=*
```

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn main:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose

```bash
docker-compose up --build
```

## Database Migrations (Alembic)

### Creating a new migration

After modifying models in `backend/db/models.py`:

```bash
cd backend
source venv/bin/activate
alembic revision --autogenerate -m "Description of changes"
```

### Applying migrations

```bash
alembic upgrade head
```

### Rollback

```bash
alembic downgrade -1  # Rollback one version
alembic downgrade base  # Rollback all
```

### View migration history

```bash
alembic history
alembic current
```

## Railway Deployment

### Environment Variables Required

Set these in Railway:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Auto-set by Railway PostgreSQL addon |
| `BOT_TOKEN` | Telegram bot token for auth |
| `ALLOW_ORIGINS` | CORS origins (e.g., `https://your-frontend.com`) |
| `DEBUG` | Set to `false` in production |

### Deployment Steps

1. Connect your GitHub repo to Railway
2. Add PostgreSQL addon (Railway will set `DATABASE_URL` automatically)
3. Set environment variables
4. Deploy!

Migrations run automatically on each deploy via the `Procfile` command.

## Project Structure

```
├── backend/
│   ├── alembic/           # Database migrations
│   │   └── versions/      # Migration files
│   ├── db/                # Database layer
│   │   ├── base.py        # SQLAlchemy engine config
│   │   ├── models.py      # SQLAlchemy ORM models
│   │   └── service.py     # Database CRUD operations
│   ├── routes/            # API routes
│   ├── auth.py            # Authentication
│   ├── database.py        # Database adapter
│   ├── game_engine.py     # Game logic
│   ├── main.py            # FastAPI app
│   └── socket_manager.py  # WebSocket manager
├── frontend/              # React frontend
└── docker-compose.yml
```

## API Documentation

When running locally, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc