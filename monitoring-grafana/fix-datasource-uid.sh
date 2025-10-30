#!/bin/bash

# Fix Grafana Dashboard Datasource UID
# This script updates the dashboard to use the correct datasource UID

set -e

echo "🔧 Fixing Grafana dashboard datasource UID..."

# Wait for Grafana to be ready
echo "⏳ Waiting for Grafana to be ready..."
COUNTER=0
until curl -s http://localhost:5602/api/health > /dev/null 2>&1 || [ $COUNTER -eq 30 ]; do
    sleep 2
    COUNTER=$((COUNTER + 1))
done

if [ $COUNTER -eq 30 ]; then
    echo "❌ Grafana is not responding after 60 seconds"
    exit 1
fi

# Get admin password from .env
ADMIN_PASSWORD=$(grep GRAFANA_ADMIN_PASSWORD .env | cut -d '=' -f2)
if [ -z "$ADMIN_PASSWORD" ]; then
    echo "⚠️  GRAFANA_ADMIN_PASSWORD not found in .env, using default 'admin'"
    ADMIN_PASSWORD="admin"
fi

# Get the actual datasource UID from Grafana
echo "🔍 Retrieving datasource UID from Grafana..."
DATASOURCE_UID=$(curl -u admin:$ADMIN_PASSWORD -s http://localhost:5602/api/datasources | jq -r '.[] | select(.name=="PostgreSQL Monitoring") | .uid')

if [ -z "$DATASOURCE_UID" ]; then
    echo "❌ Could not find datasource 'PostgreSQL Monitoring'"
    echo "💡 Make sure Grafana is running and the datasource is provisioned"
    exit 1
fi

echo "✅ Found datasource UID: $DATASOURCE_UID"

# Update the dashboard JSON file
DASHBOARD_FILE="./grafana/provisioning/dashboards/overview.json"

if [ ! -f "$DASHBOARD_FILE" ]; then
    echo "❌ Dashboard file not found: $DASHBOARD_FILE"
    exit 1
fi

echo "📝 Updating dashboard file..."

# Create backup
cp "$DASHBOARD_FILE" "$DASHBOARD_FILE.backup"

# Replace all datasource UIDs in the dashboard
# This regex finds all occurrences of "uid": "SOME_UID" after "type": "postgres"
sed -i.tmp -E "s|(\"type\": \"postgres\",.*\"uid\": \")[^\"]+(\")|\1${DATASOURCE_UID}\2|g" "$DASHBOARD_FILE"
rm -f "$DASHBOARD_FILE.tmp"

echo "✅ Dashboard updated successfully!"

# Restart Grafana to reload the dashboard
echo "🔄 Restarting Grafana..."
docker-compose restart grafana > /dev/null 2>&1

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Dashboard Datasource UID Fixed!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📊 Datasource UID: $DATASOURCE_UID"
echo "📁 Dashboard updated: $DASHBOARD_FILE"
echo "💾 Backup saved: $DASHBOARD_FILE.backup"
echo ""
echo "🌐 Access Grafana: http://localhost:5602"
echo "   Refresh your browser to see the changes"
echo ""
