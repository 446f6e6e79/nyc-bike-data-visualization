[![Backend Tests](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/backend-tests.yml/badge.svg?branch=main)](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/frontend-tests.yml)

# NYC Bike Data Visualization

A comprehensive data visualization solution developed for advanced coursework at the University of Trento, Master's Degree in Computer Science.

**Course:** Data Visualization Lab  
**Professors:** Prof. Monica Moroni, Prof. Shahryar Noei  
**Authors:** Davide Donà, Andrea Blushi, Lorenzo Di Berardino

## Overview

This project focuses on the visualization of bike-sharing data from New York City, specifically utilizing the Citi Bike Trip Data. The goal is to create an interactive web application that allows users to explore and analyze the bike-sharing patterns in NYC through various visualizations and insights derived from the dataset.

## Repository Structure

```
data-visualisation/
├── README.md                         # Project overview (this file)
├── docker-compose.yml                # Docker Compose configuration for local development
├── dockers/                          # Dockerfiles for backend and frontend services
├── src/
│   └── backend                       # Backend server implementation (FastAPI)
│   └── frontend                      # Frontend application implementation (React)
├── scripts/
│   └── download_data.py              # Script to automate dataset downloading and merging
├── docs/
│   └── proposal/                     # Project proposal latex files
│   └── technical-report/             # Technical report latex files
│   └── report/                       # Final report latex files

```

## Run with Docker (Windows, Linux, macOS)

Prerequisites:

- Docker Desktop (Windows/macOS) or Docker Engine + Compose plugin (Linux)

Note: The image is built with the script `scripts/download_data.py` included with default values, so the dataset will be downloaded and merged automatically when the backend starts.

### Quick start with pre-built images

The easiest way to run the application is to use the pre-built images from the latest release.
No need to clone the repository or build anything, Docker will automatically pull the correct image for your architecture (linux/amd64, linux/arm64).

> **Default data range:** The images are built filled with default data starting from January 2025 to the last month released before the build date. If you want to customise the date range, please refer to the "Customise the date range" section below.

**1. Download `docker-compose.release.yml` from the [latest release](https://github.com/446f6e6e79/nyc-bike-data-visualization/releases/latest)**

**2. Run it:**

For Docker Engine:

```bash
docker compose -f docker-compose.release.yml up
```

For legacy Docker Compose:

```bash
docker-compose -f docker-compose.release.yml up
```

**3. Stop it:**

```bash
docker compose -f docker-compose.release.yml down
```

Note: You can also run it from the Docker Desktop built-in terminal in the same way.

### Quick start from source

Clone the repository and start all services with a single command:

```bash
git clone https://github.com/446f6e6e79/nyc-bike-data-visualization.git
cd nyc-bike-data-visualization
docker compose up --build
```

> **First run:** a dedicated seeder service downloads and processes the Citi Bike dataset before the backend starts. This can take several minutes depending on your connection. Subsequent starts are fast because the data is persisted in a Docker volume.

**Subsequent runs** (images already built, data already on volume):

```bash
docker compose up
```

**Stop without losing data:**

```bash
docker compose down
```

> Use `docker compose down -v` only if you want to wipe the database and downloaded data entirely and start fresh.

**Customise the date range** (optional) — by default the seeder downloads data starting from January 2025. The date range is **baked into the image at build time**, so you must pass the variables together with `--build`:

| Variable | Description | Example |
|---|---|---|
| `DATA_START_DATE` | Start month in `YYYYMM` format | `202501` |
| `DATA_END_DATE` | End month in `YYYYMM` format | `202603` |
| `DOWNLOAD_JC` | Set to `true` to include Jersey City data | `true` |

Inline (Linux/macOS):

```bash
DATA_START_DATE=202512 DATA_END_DATE=202603 docker compose up --build
```

On Windows (PowerShell):

```powershell
$env:DATA_START_DATE="202512"; $env:DATA_END_DATE="202603"; docker compose up --build
```

Or create a `.env` file in the repository root (Docker Compose picks it up automatically):

```env
DATA_START_DATE=202401
DATA_END_DATE=202412
# DOWNLOAD_JC=true
```

> **Note:** Setting these variables without `--build` has no effect. The date range is fixed in the already-built seeder image. To change the range after a previous build, always pass `--build` to rebuild the seeder image.

### Useful terminal checks

- Service status: `docker compose ps`
- Follow logs: `docker compose logs -f`
- Check backend logs: `docker compose logs -f backend`
- Check frontend logs: `docker compose logs -f frontend`

## Local development (Linux, macOS)

### Downloading the datasets

To make the process easier, we provided a Python script that automates the downloading and merging of the trip data files based on specified date ranges. The script is located in `scripts/download_data.py`.
Those files are downloaded from https://s3.amazonaws.com/tripdata/index.html.

To use the script, run the following command in your terminal:

```bash
export DATABASE_URL=postgresql://citibike:citibike@localhost:5432/citibike
python scripts/download_data.py
```

Database schema initialization in `scripts/download_data.py` executes ordered files from `postgre/schemas/`. For manual `psql` bootstrap, use `postgre/init.sql`.

The available options for the script are:

- `--start-date`: The start date for filtering files (in YYYYMM format). Default is "202501".
- `--end-date`: The end date for filtering files (in YYYYMM format). Default is "" (no end date).
- `--download-jc`: Include files from the Jersey City dataset (those starting with "JC-"). By default, these files are excluded.

### Backend

The backend server implementation for the bike-sharing data visualization project is located in the `src/backend`.
Go to [src/backend/README.md](src/backend/README.md) for detailed instructions on how to start the server and access the API documentation.

### Frontend

The frontend application implementation for the bike-sharing data visualization project is located in the `src/frontend`.
Go to [src/frontend/README.md](src/frontend/README.md) for detailed instructions on how to start the frontend application and access the user interface.

## Application access

Once the services are up and running, you can access the application through the following URLs:

- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`
