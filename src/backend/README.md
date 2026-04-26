# Backend

This directory contains the backend server implementation for the bike-sharing data visualization project. It is built using FastAPI, a modern web framework for building APIs with Python.

It offers endpoints to retrieve real-time and historical data about bike stations, including their locations, available bikes, and docks.

## Setup Instructions

1. **Create a virtual environment (optional but recommended):**

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install the required dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Run commands from the project root directory** (the directory containing `src/`):

## Starting the PostgreSQL Server

The project uses a PostgreSQL 16 database. Both options below use the same credentials:

| Setting  | Value      |
|----------|------------|
| Database | `citibike` |
| User     | `citibike` |
| Password | `citibike` |

### Option A: Docker Compose (recommended)

From the project root:

```bash
docker compose up postgres -d
```

This starts a `postgres:16-alpine` container named `NYC-Bike-Visualisation-Postgres` on port `5432`.

To stop the server:

```bash
docker compose stop postgres
```

### Option B: Manual Setup (without Docker)

1. **Install PostgreSQL 16:**

   - macOS: `brew install postgresql@16 && brew services start postgresql@16`
   - Linux (Ubuntu/Debian): `sudo apt install postgresql-16 && sudo systemctl start postgresql`

2. **Create the user and database:**

   ```bash
   psql postgres -c "CREATE USER citibike WITH PASSWORD 'citibike';"
   psql postgres -c "CREATE DATABASE citibike OWNER citibike;"
   ```

3. **Initialize the schemas:**

   ```bash
   export DATABASE_URL=postgresql://citibike:citibike@localhost:5432/citibike
   psql "$DATABASE_URL" -f postgres/init.sql
   ```

Set the connection URL before running the backend or any scripts:

```bash
export DATABASE_URL=postgresql://citibike:citibike@localhost:5432/citibike
```

## Starting the Server

Make sure you have downloaded the dataset first — see [Downloading the datasets](../../README.md#downloading-the-datasets) in the root README.

```bash
uvicorn src.backend.main:app --reload
```

This will launch the FastAPI server with hot-reloading enabled, allowing you to see changes in real-time as you edit the code. The server will be accessible at `http://localhost:8000`.

## Running Backend Tests

Tests run against a dedicated `citibike_test` database, separate from the development `citibike` DB.

**1. Create the test database** (one-time setup):

```bash
psql postgres -c "CREATE DATABASE citibike_test OWNER citibike;"
```

**2. Point to the test database and seed it:**

```bash
export DATABASE_URL=postgresql://citibike:citibike@localhost:5432/citibike_test
python scripts/load_test_data.py
```

**3. Start the server:**

```bash
uvicorn src.backend.main:app --host 127.0.0.1 --port 8000
```

**4. In a second terminal, run the tests:**

```bash
pytest src/backend/tests -q
```

## API Documentation

Once the server is running, you can access the automatically generated API documentation by navigating to:

```
http://localhost:8000/docs
```

This interactive documentation provides details about the available endpoints, request/response formats, and allows you to test the API directly from your browser.

## Project structure

```
src/backend/
├── main.py                       # Application entry point
├── config.py                     # Environment-sensitive configuration
├── db.py                         # Connection pool
├── models/                       # API response models
│   ├── bike_route.py
│   ├── ride.py
│   ├── station.py
│   └── stats/
│       ├── date_range.py
│       ├── station_flow_counts.py
│       ├── station_ride_counts.py
│       └── stats.py
├── routes/                       # Thin endpoint handlers
│   ├── bike_routes.py
│   ├── stations.py
│   └── stats.py
├── services/                     # Data retrieval and processing logic
│   ├── bike_routes.py
│   ├── gbfs.py                   # Real-time station status (Lyft GBFS feed)
│   └── stats/
│       ├── stats.py              # Orchestrator
│       ├── utils.py              # Shared helpers
│       ├── coverage.py
│       ├── station_flow_counts.py
│       └── station_ride_counts.py
└── tests/                        # Integration tests
    ├── test_data/                # Fixture CSVs
    ├── test_bike_routes.py
    ├── test_stations.py
    ├── test_stats.py
    ├── test_docs.py
    └── test_helpers.py
```