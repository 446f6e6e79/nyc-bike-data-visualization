[![Backend Tests](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/backend-tests.yml/badge.svg?branch=main)](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/backend-tests.yml)
[![Docker CI](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/docker-check.yml/badge.svg)](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/docker-check.yml)
[![Frontend Tests](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/446f6e6e79/nyc-bike-data-visualization/actions/workflows/frontend-tests.yml)
# Nyc Bike Data Visualization

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

## Backend
The backend server implementation for the bike-sharing data visualization project is located in the `src/backend`.
Go to [src/backend/README.md](src/backend/README.md) for detailed instructions on how to start the server and access the API documentation.

## Frontend
The frontend application implementation for the bike-sharing data visualization project is located in the `src/frontend`.
Go to [src/frontend/README.md](src/frontend/README.md) for detailed instructions on how to start the frontend application and access the user interface.

## Downloading the datasets
The datasets needed for the project can be downloaded from the Citi Bike Trip Data page at https://s3.amazonaws.com/tripdata/index.html

To make the process easier, we provided a Python script that automates the downloading and merging of the trip data files based on specified date ranges. The script is located in `scripts/download_data.py`.

To use the script, run the following command in your terminal:

```bash
python scripts/download_data.py
```
The available options for the script are:
- `--start-date`: The start date for filtering files (in YYYYMM format). Default is "202601".
- `--end-date`: The end date for filtering files (in YYYYMM format). Default is "" (no end date).
- `--download-jc`: Include files from the Jersey City dataset (those starting with "JC-"). By default, these files are excluded.

## Run with Docker (Windows, Linux, macOS)

Prerequisites:
- Docker Desktop (Windows/macOS) or Docker Engine + Compose plugin (Linux)
- Run commands from the repository root (`data-visualisation/`)
- Use the script in `scripts/download_data.py` to download the datasets before starting the services (see instructions below)

### Start all services (build images and run backend + frontend):

macOS/Linux:
```bash
cd /path/to/data-visualisation
docker compose up --build
```

Windows PowerShell:
```powershell
cd C:\path\to\data-visualisation
docker compose up --build
```

Windows CMD:
```cmd
cd C:\path\to\data-visualisation
docker compose up --build
```

### Run in background (detached mode):

macOS/Linux:
```bash
docker compose up --build -d
```

Windows PowerShell/CMD:
```powershell
docker compose up --build -d
```

### Stop services:

macOS/Linux:
```bash
docker compose down
```

Windows PowerShell/CMD:
```powershell
docker compose down
```

### Useful checks:
- Service status: `docker compose ps`
- Follow logs: `docker compose logs -f`

Application URLs:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

Note: Use `docker compose` (with a space). If your system only supports the legacy command, replace it with `docker-compose`.
