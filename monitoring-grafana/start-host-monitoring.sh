#!/bin/bash

# Start Host Monitoring Stack
# Starts PostgreSQL, Prometheus, Node Exporter, and Grafana

set -e

echo "🚀 Starting Host Monitoring Stack..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "💡 Please copy .env.example to .env and configure your credentials"
    exit 1
fi

# Start all services
echo "📦 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
echo ""

# Wait for PostgreSQL
COUNTER=0
until docker-compose exec -T postgres-monitoring pg_isready -U monitoring -d monitoring_db > /dev/null 2>&1 || [ $COUNTER -eq 30 ]; do
    echo "   Waiting for PostgreSQL... ($COUNTER/30)"
    sleep 2
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "❌ PostgreSQL failed to start"
    exit 1
fi

echo "✅ PostgreSQL is ready"

# Wait for Prometheus
COUNTER=0
until curl -s http://localhost:9090/-/healthy > /dev/null 2>&1 || [ $COUNTER -eq 30 ]; do
    echo "   Waiting for Prometheus... ($COUNTER/30)"
    sleep 2
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "❌ Prometheus failed to start"
    exit 1
fi

echo "✅ Prometheus is ready"

# Wait for Node Exporter
COUNTER=0
until curl -s http://localhost:9100/metrics > /dev/null 2>&1 || [ $COUNTER -eq 30 ]; do
    echo "   Waiting for Node Exporter... ($COUNTER/30)"
    sleep 2
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "❌ Node Exporter failed to start"
    exit 1
fi

echo "✅ Node Exporter is ready"

# Wait for Grafana
COUNTER=0
until curl -s http://localhost:5602/api/health > /dev/null 2>&1 || [ $COUNTER -eq 30 ]; do
    echo "   Waiting for Grafana... ($COUNTER/30)"
    sleep 2
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "❌ Grafana failed to start"
    exit 1
fi

echo "✅ Grafana is ready"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Host Monitoring Stack Started Successfully!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Access Points:"
echo ""
echo "   Grafana:          http://localhost:5602"
echo "   Prometheus:       http://localhost:9090"
echo "   Node Exporter:    http://localhost:9100/metrics"
echo "   PostgreSQL:       localhost:5433"
echo ""
echo "🔐 Grafana Login:"
echo "   Username: admin"
echo "   Password: (check your .env file)"
echo ""
echo "📈 Available Dashboards:"
echo "   • Application Overview (requires MONITORING_DB_URL in app)"
echo "   • Host Machine Monitoring (ready now!)"
echo ""
echo "💡 Next Steps:"
echo "   1. Configure your app's .env with MONITORING_DB_URL"
echo "   2. Restart your application"
echo "   3. Open Grafana and explore the dashboards"
echo ""
echo "📚 For more information, see README.md"
echo ""
