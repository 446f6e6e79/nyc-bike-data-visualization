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
3. **Navigate to the backend directory:**
   ```bash
   cd src/backend
   ```

## Starting the Server
To start the backend server, run the following command in your terminal:

```bash
UNSET HISTORICAL_DATA_DIR  # Remove the environment variable to use the default data directory
uvicorn main:app --reload
```
This will launch the FastAPI server with hot-reloading enabled, allowing you to see changes in real-time as you edit the code.

## Running Backend Tests
Run the backend integration tests against the committed mock dataset:

```bash
export HISTORICAL_DATA_DIR=tests/test_data
uvicorn main:app --host 127.0.0.1 --port 8000
```

In a second terminal, run:

```bash
cd src/backend
pytest tests/test_backend.py -q
```

## API Documentation
Once the server is running, you can access the automatically generated API documentation by navigating to:
```
http://localhost:8000/docs
```
This interactive documentation provides details about the available endpoints, request/response formats, and allows you to test the API directly from your browser.

## Project structure
```src/backend/
├── main.py                       # Main application entry point
├── models/                       # Contains the model definitions for API responses
├── tests/                        # Contains integration tests for the backend
├── services/                     # Contains the logic for data retrieval and processing
├── routes/                       # Contains the API route definitions
```