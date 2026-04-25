#!/usr/bin/env bash
set -euo pipefail

TAG="local-test"
BUILD_IMAGES=false
RUN_TESTS=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)    TAG="$2"; shift 2 ;;
    --build)  BUILD_IMAGES=true; shift ;;
    --test)   RUN_TESTS=true; shift ;;
    *)        echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_PREFIX="local/nyc-bike-data-visualisation"
OUT_DIR="$REPO_ROOT/data/release"

mkdir -p "$OUT_DIR"

if ! python3 -c "import yaml" 2>/dev/null; then
  echo "Installing pyyaml..."; pip install pyyaml -q
fi

# --- Compose file generation ---
echo "Generating docker-compose.release.yml..."
REPO_ROOT="$REPO_ROOT" TAG="$TAG" IMAGE_PREFIX="$IMAGE_PREFIX" OUT_DIR="$OUT_DIR" python3 - <<'EOF'
import os, yaml, pathlib

tag = os.environ["TAG"]
prefix = os.environ["IMAGE_PREFIX"]
repo_root = pathlib.Path(os.environ["REPO_ROOT"])
out_dir = pathlib.Path(os.environ["OUT_DIR"])

image_map = {
    "dockers/Dockerfile.backend":  f"{prefix}-backend:{tag}",
    "dockers/Dockerfile.frontend": f"{prefix}-frontend:{tag}",
    "dockers/Dockerfile.postgres": f"{prefix}-postgres:{tag}",
}

with open(repo_root / "docker-compose.yml") as f:
    compose = yaml.safe_load(f)

for svc in compose["services"].values():
    build = svc.pop("build", {})
    dockerfile = build.get("dockerfile")
    if dockerfile in image_map:
        svc["image"] = image_map[dockerfile]

out = out_dir / "docker-compose.release.yml"
with open(out, "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)
print(f"Written: {out}")
EOF

test -s "$OUT_DIR/docker-compose.release.yml" || { echo "ERROR: docker-compose.release.yml missing/empty"; exit 1; }
echo "docker-compose.release.yml generated."

# --- Tests ---
if [ "$RUN_TESTS" = true ]; then
  echo ""
  echo "=== Running tests ==="

  # Start a temporary postgres container
  docker run -d --name release-test-postgres \
    -e POSTGRES_USER=citibike \
    -e POSTGRES_PASSWORD=citibike \
    -e POSTGRES_DB=citibike \
    -p 5432:5432 \
    postgres:16-alpine

  cleanup() {
    kill "$SERVER_PID" 2>/dev/null || true
    docker rm -f release-test-postgres 2>/dev/null || true
  }
  trap cleanup EXIT

  echo "Waiting for postgres..."
  for i in $(seq 30); do
    docker exec release-test-postgres pg_isready -U citibike -q && break
    sleep 1
  done

  docker exec release-test-postgres psql -U citibike -c "CREATE DATABASE citibike_test;" -q
  docker exec release-test-postgres psql -U citibike -d citibike_test -c "GRANT ALL ON SCHEMA public TO citibike;" -q

  pip install -r "$REPO_ROOT/requirements.txt" -q

  echo "Seeding test database..."
  DATABASE_URL="postgresql://citibike:citibike@localhost:5432/citibike_test" \
    python3 "$REPO_ROOT/scripts/load_test_data.py"

  echo "Starting backend server..."
  DATABASE_URL="postgresql://citibike:citibike@localhost:5432/citibike_test" \
    python3 -m uvicorn src.backend.main:app --host 127.0.0.1 --port 8000 &
  SERVER_PID=$!

  for i in $(seq 30); do
    python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/docs', timeout=2)" 2>/dev/null && break
    sleep 1
  done

  echo "--- Backend tests ---"
  (cd "$REPO_ROOT/src/backend" && pytest tests -q)

  echo "--- Frontend tests ---"
  (cd "$REPO_ROOT/src/frontend" && npm ci --silent && npm test)

  echo "=== All tests passed ==="
fi

# --- Image builds ---
if [ "$BUILD_IMAGES" = true ]; then
  echo ""
  echo "=== Building images ==="

  echo "[1/3] Building backend..."
  docker build -f "$REPO_ROOT/dockers/Dockerfile.backend" -t "${IMAGE_PREFIX}-backend:${TAG}" "$REPO_ROOT"
  docker save "${IMAGE_PREFIX}-backend:${TAG}" -o "$OUT_DIR/backend.tar"

  echo "[2/3] Building frontend..."
  docker build -f "$REPO_ROOT/dockers/Dockerfile.frontend" -t "${IMAGE_PREFIX}-frontend:${TAG}" "$REPO_ROOT"
  docker save "${IMAGE_PREFIX}-frontend:${TAG}" -o "$OUT_DIR/frontend.tar"

  echo "[3/3] Building postgres..."
  docker build -f "$REPO_ROOT/dockers/Dockerfile.postgres" -t "${IMAGE_PREFIX}-postgres:${TAG}" "$REPO_ROOT"
  docker save "${IMAGE_PREFIX}-postgres:${TAG}" -o "$OUT_DIR/postgres.tar"

  echo "=== Images saved to $OUT_DIR ==="
fi

echo ""
echo "Output directory: $OUT_DIR"
