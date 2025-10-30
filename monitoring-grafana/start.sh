#!/bin/bash

# Grafana Monitoring Stack - Start Script
# This script starts the Grafana monitoring stack with PostgreSQL

set -e

echo "🚀 Starting Grafana Monitoring Stack..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo "⚠️  IMPORTANT: Edit .env and set secure passwords!"
    echo ""
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for PostgreSQL
echo "🔄 Waiting for PostgreSQL..."
timeout 60 bash -c 'until docker exec postgres-monitoring pg_isready -U monitoring > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ PostgreSQL failed to start in time"
    docker-compose logs postgres-monitoring
    exit 1
}
echo "✅ PostgreSQL is ready"

# Wait for Grafana
echo "🔄 Waiting for Grafana..."
timeout 60 bash -c 'until curl -s http://localhost:5602/api/health > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Grafana failed to start in time"
    docker-compose logs grafana
    exit 1
}
echo "✅ Grafana is ready"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Grafana Monitoring Stack Started Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Grafana UI:         http://localhost:5602"
echo "🗄️  PostgreSQL Port:   5433"
echo ""
echo "🔑 Default Credentials:"
echo "   Username: admin"
echo "   Password: (check .env file)"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:5602 in your browser"
echo "   2. Login with credentials above"
echo "   3. Add MONITORING_DB_URL to your app's .env:"
echo "      MONITORING_DB_URL=postgresql://monitoring:PASSWORD@localhost:5433/monitoring_db"
echo "   4. Restart your application"
echo ""
echo "📖 Documentation: ./README.md"
echo ""
echo "🔍 View logs:   docker-compose logs -f"
echo "🛑 Stop stack:  docker-compose down"
echo ""
