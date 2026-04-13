#!/usr/bin/env bash
set -euo pipefail

echo "=== Tracker Development Setup ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "pnpm is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }

echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "Docker: $(docker --version)"

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo ".env already exists, skipping"
fi

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Start Docker services
echo "Starting Docker services..."
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d

# Wait for Postgres
echo "Waiting for PostgreSQL..."
until docker exec tracker-postgres pg_isready -U tracker_user -d tracker_db > /dev/null 2>&1; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Wait for Redis
echo "Waiting for Redis..."
until docker exec tracker-redis redis-cli ping > /dev/null 2>&1; do
  sleep 1
done
echo "Redis is ready!"

echo ""
echo "=== Setup complete! ==="
echo "Run 'pnpm dev' to start all apps"
echo "PostgreSQL: localhost:5432"
echo "Redis:      localhost:6379"
echo "MinIO:      localhost:9000 (console: localhost:9001)"
echo "Mailpit:    localhost:8025"
