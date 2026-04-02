# Frontend

This directory contains the frontend application for the bike-sharing data visualization project. It is built using React and Vite to provide an interactive user interface for exploring bike station and usage data.

The frontend consumes data exposed by the backend API and renders charts and summary statistics for the selected dataset.

## Backend Dependency

For live project data, ensure the backend server is running.
Go to [src/backend/README.md](../backend/README.md) for detailed backend startup instructions and API documentation.

## Setup Instructions

1. **Install Node.js (if not already installed):**

   Use a recent LTS version of Node.js (Node 20+ recommended).
2. **Navigate to the frontend directory:**

   ```bash
   cd src/frontend
   ```

3. **Install dependencies:**

   ```bash
   npm ci
   ```

## Starting the Frontend Development Server

To start the frontend development server, run the following command in your terminal:

```bash
npm run dev
```

This will launch the Vite development server with hot-reloading enabled, so UI changes appear immediately as you edit the code.

By default, the app is available at:

```bash
http://localhost:5173
```

## Previewing the App

To create a production build and preview it locally, run:

```bash
npm run build
npm run preview
```

This will build the app and serve the optimized production version.

## Running Frontend Tests

To run the frontend unit and integration tests, use the following command:

```bash
npm run test
```

## Project structure

```text
src/frontend/
├── main.jsx                  # App entry point
├── App.jsx                   # Root layout and routing
├── clients/                  # API client and React Query helpers
├── components/               # Shared UI used across features
├── features/                 # Feature-first modules
│   ├── header/               # Global header and filter controls
│   ├── map/                  # Interactive map page and map layers
│   ├── temporal/             # Time-based charts 
│   └── weather/              # Weather impact visualizations
├── services/                 # Shared API-facing service functions
├── styles/                   # Shared/global stylesheet entrypoints
├── tests/                    # Frontend tests
└── utils/                    # Cross-feature utilities
```

Example feature layout:

```text
src/frontend/features/header/
├── AppHeader.jsx            # Feature entry component used by App.jsx
├── components/              # Header-specific UI pieces
├── hooks/                   # State and interaction logic for header filters
├── services/                # Feature-specific API helpers
├── styles/                  # Header-only styles
└── utils/                   # Small formatting and helper functions
```


