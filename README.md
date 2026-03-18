# Data Visualization Project

A comprehensive data visualization solution developed for advanced coursework at the University of Trento, Master's Degree in Computer Science.

**Course:** Data Visualization Lab  
**Professors:** Prof. Monica Moroni, Prof. Shahryar Noei  
**Authors:** Davide Donà, Andrea Blushi, Lorenzo Di Berardino

---

## Overview

This project delivers a complete data visualization solution comprising three key deliverables:

1. **Data Visualization Proposal** – Initial project concept and visualization strategy
2. **Technical Report with Dataset Description** – Detailed analysis of the dataset and technical implementation
3. **Written and Video Report** – Final comprehensive documentation with multimedia presentation

The accompanying source code provides the complete Python implementation of the visualization solution.

---

## Repository Structure

```
data-visualisation/
├── README.md                          # Project overview (this file)
├── src/
│   └── main.py                       # Python visualization implementation
├── docs/
│   ├── setup.tex                     # Shared LaTeX preamble and configuration
│   ├── chapters/                     # Shared LaTeX chapter content
│   │   └── example.tex              
│   ├── media/                        # Images, logos, and media assets
│   │   └── uni_logo.jpg
│   ├── proposal/                     # First deliverable: Data Visualization Proposal
│   │   ├── main.tex
│   │   └── proposal.pdf
│   ├── technical-report/             # Second deliverable: Technical Report
│   │   ├── main.tex
│   │   └── technical-report.pdf
│   └── report/                       # Third deliverable: Final Report
│       ├── main.tex
│       └── report.pdf
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
