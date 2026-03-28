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
├── main.jsx                      # Frontend entry point
├── App.jsx                       # Root React component
├── App.css                       # Global styles
├── index.html                    # HTML template used by Vite
├── package.json                  # Frontend scripts and dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── api-data/                     # API constants and request configuration
├── components/                   # Reusable React UI components
├── map/                          # Map-related components and utilities
├── pages/                        # React components for different app pages
├── hooks/                        # Custom React hooks
└── tests/                        # Frontend unit and integration tests
```
