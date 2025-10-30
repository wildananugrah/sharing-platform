# 📊 Grafana + PostgreSQL Monitoring Setup

Complete monitoring solution for Task Management application using Grafana with PostgreSQL as the backend.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Dashboards](#dashboards)
- [Usage](#usage)
- [Production Deployment](#production-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         Your Next.js Application                │
│                                                 │
│  ┌──────────┐         ┌──────────────┐         │
│  │  Logger  │────────►│  PostgreSQL  │         │
│  │(Winston) │         │  Monitoring  │         │
│  └──────────┘         │   Database   │         │
│       │               │  (Port 5433) │         │
│       │               └──────┬───────┘         │
│       │                      │                  │
│       ▼ (Backup)             │ (Primary)        │
│  ┌──────────┐               │                  │
│  │   Logs   │               │                  │
│  │  Folder  │               │                  │
│  └──────────┘               │                  │
└─────────────────────────────┼──────────────────┘
                              │
                              │ SQL Queries
                              ▼
                        ┌──────────┐
                        │ Grafana  │◄─────────┐
                        │  :5602   │          │
                        └──────────┘          │
                                              │ PromQL
┌─────────────────────────────────────────────┼───┐
│              Host Machine (VM)              │   │
│                                             │   │
│  ┌──────────────┐      ┌──────────────┐   │   │
│  │ Node Exporter│─────►│  Prometheus  │───┘   │
│  │    :9100     │      │    :9090     │       │
│  └──────────────┘      └──────────────┘       │
│         │                                      │
│         │ Collects: CPU, RAM, Disk, Network   │
│         ▼                                      │
│  ┌──────────────┐                             │
│  │ Host Metrics │                             │
│  │ (/proc, /sys)│                             │
│  └──────────────┘                             │
└─────────────────────────────────────────────────┘
```

**Key Components:**
- **PostgreSQL Monitoring DB**: Separate database on port 5433 for application logs
- **Grafana**: Visualization dashboard on port 5602
- **Prometheus**: Time-series database on port 9090 for host metrics
- **Node Exporter**: Host metrics collector on port 9100
- **Dual Logging**: Winston writes to both files AND PostgreSQL
- **Host Monitoring**: CPU, RAM, Disk, Network monitoring of the VM itself
- **Isolation**: Monitoring infrastructure completely separate from app

---

## ✨ Features

### Monitoring Capabilities

**Application Monitoring:**
- ✅ **Real-time Metrics**: Request rate, response time, error rate
- ✅ **Performance Tracking**: P50, P95, P99 latency percentiles
- ✅ **Error Analysis**: Error tracking by status code and endpoint
- ✅ **User Activity**: Track active users and patterns
- ✅ **API Monitoring**: Endpoint-level performance metrics

**Host Machine Monitoring:**
- ✅ **CPU Monitoring**: Overall usage, per-core usage, load average
- ✅ **Memory Monitoring**: RAM usage, available memory, memory details
- ✅ **Disk Monitoring**: Disk usage, I/O operations, filesystem details
- ✅ **Network Monitoring**: Network traffic (receive/transmit), per interface
- ✅ **System Info**: Uptime, system load

**Dashboards:**
- ✅ **2 Pre-built Dashboards**: Application Overview + Host Monitoring
- ✅ **Custom Queries**: Create your own dashboards and panels

### Technical Features
- ✅ **Buffered Logging**: Batch inserts every 10 seconds (performance optimized)
- ✅ **Auto Cleanup**: Configurable data retention (default: 30 days)
- ✅ **Connection Pooling**: Efficient database connections
- ✅ **Graceful Degradation**: App continues if monitoring fails
- ✅ **Storage Efficient**: 70% less storage than Elasticsearch
- ✅ **Auto Provisioning**: Datasource and dashboards auto-configured

---

## 📋 Prerequisites

### System Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Node.js**: Version 18+ (for your app)
- **Memory**: Minimum 512MB (for monitoring stack)
- **Disk Space**: ~2GB for 30 days of logs

### Check Prerequisites
```bash
# Check Docker
docker --version

# Check Docker Compose
docker-compose --version

# Check disk space
df -h
```

---

## 🚀 Quick Start

### Step 1: Install PostgreSQL Client (for your app)

```bash
cd /path/to/your/app
npm install pg
```

### Step 2: Configure Environment

```bash
cd monitoring-grafana

# Copy environment file
cp .env.example .env

# Edit credentials (IMPORTANT: Change in production!)
nano .env
```

**Edit `.env`:**
```env
# PostgreSQL Monitoring Database
MONITORING_DB_USER=monitoring
MONITORING_DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# Grafana Admin
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE
```

### Step 3: Start Monitoring Stack

```bash
# Start PostgreSQL + Grafana
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output:**
```
NAME                   STATUS              PORTS
postgres-monitoring    Up (healthy)        0.0.0.0:5433->5432/tcp
prometheus             Up (healthy)        0.0.0.0:9090->9090/tcp
node-exporter          Up                  0.0.0.0:9100->9100/tcp
grafana                Up (healthy)        0.0.0.0:5602->3000/tcp
```

### Step 4: Configure Your Application

**Add to your app's `.env`:**
```env
# Monitoring Database Connection
MONITORING_DB_URL=postgresql://monitoring:YOUR_PASSWORD@localhost:5433/monitoring_db
```

**Important:** Replace `YOUR_PASSWORD` with the password from `monitoring-grafana/.env`

### Step 5: Verify Setup

```bash
# Test PostgreSQL connection
docker exec -it postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT COUNT(*) FROM app_logs;"

# Expected: Should show count (0 initially)
```

### Step 6: Access Monitoring

**Grafana Dashboard:**
1. **Open browser:** http://localhost:5602
2. **Login:**
   - Username: `admin`
   - Password: (from your `.env` file)
3. **View dashboards:**
   - **Application Overview**: Dashboards → Application Monitoring → Application Overview
   - **Host Monitoring**: Dashboards → Host Machine Monitoring

**Optional - Direct Access:**
- **Prometheus UI**: http://localhost:9090 (for querying metrics directly)
- **Node Exporter Metrics**: http://localhost:9100/metrics (raw metrics endpoint)

---

## ⚙️ Configuration

### Database Schema

The monitoring database includes 4 main tables:

1. **`app_logs`**: All application logs
2. **`app_metrics`**: Time-series metrics
3. **`api_endpoint_stats`**: Aggregated endpoint statistics
4. **`user_activity_stats`**: Daily user activity summaries

**Tables created automatically on first startup!**

### Data Retention

Default retention: **30 days** for logs, **90 days** for metrics

**To change retention:**

```sql
-- Connect to monitoring database
docker exec -it postgres-monitoring psql -U monitoring -d monitoring_db

-- Modify cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '60 days';  -- Changed to 60 days
    DELETE FROM app_metrics WHERE timestamp < NOW() - INTERVAL '180 days';
END;
$$ LANGUAGE plpgsql;
```

**Schedule automatic cleanup** (using cron):

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT cleanup_old_logs();"
```

### Logging Configuration

Your app automatically logs to PostgreSQL when `MONITORING_DB_URL` is set.

**How it works:**
1. Winston logs to files (immediate)
2. Winston ALSO logs to PostgreSQL (buffered)
3. Logs buffered for 10 seconds or 100 records (whichever comes first)
4. Batch insert to database (efficient!)

**To disable PostgreSQL logging temporarily:**
```bash
# Remove or comment out in your app's .env
# MONITORING_DB_URL=...
```

---

## 📊 Dashboards

### 1. Application Overview

**Location:** Dashboards → Application Monitoring → Application Overview

**Metrics:**
- Total Requests (24h)
- Average Response Time (1h)
- Error Rate % (1h)
- Active Users (1h)
- Request Rate Over Time (chart)
- Status Code Distribution (pie chart)
- Response Time Percentiles (P50, P95, P99)
- Top Endpoints (table)

**Refresh:** Every 30 seconds

**Use Case:** High-level health monitoring

---

### 2. Host Machine Monitoring

**Location:** Dashboards → Host Machine Monitoring

**Metrics:**
- **CPU Usage Gauge**: Overall CPU utilization with thresholds
- **Memory Usage Gauge**: RAM usage percentage
- **Disk Usage Gauge**: Root filesystem usage
- **Memory Details**: Timeline showing used vs available memory
- **CPU Usage by Core**: Individual CPU core utilization over time
- **Network Traffic**: Receive/transmit traffic per network interface
- **Disk I/O Operations**: Read/write operations per disk device
- **Filesystem Usage Table**: Detailed breakdown of all mounted filesystems
- **System Load Average**: 1m, 5m, and 15m load averages
- **System Uptime**: How long the host has been running

**Refresh:** Every 30 seconds

**Use Case:** Infrastructure monitoring, capacity planning, performance troubleshooting

**Data Source:** Prometheus (host metrics collected by Node Exporter)

---

### 3. Error Analysis Dashboard (Coming Soon)

**Metrics:**
- Error rate trends
- Error types distribution
- Stack trace viewer
- Failed endpoints ranking

---

### 4. User Activity Dashboard (Coming Soon)

**Metrics:**
- Most active users
- User request patterns
- Session analysis
- Geographic distribution

---

### 5. API Endpoints Dashboard (Coming Soon)

**Metrics:**
- Requests per endpoint
- Endpoint performance comparison
- Endpoint error rates
- Traffic patterns

---

## 📖 Usage

### Viewing Logs in Grafana

1. **Go to Explore** (compass icon in left sidebar)
2. **Select datasource:** PostgreSQL Monitoring
3. **Run query:**

```sql
SELECT timestamp, level, message, method, uri, status, elapsed_ms
FROM app_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 100;
```

### Common Queries

**Find all errors in last hour:**
```sql
SELECT *
FROM app_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND status >= 400
ORDER BY timestamp DESC;
```

**Get slowest requests:**
```sql
SELECT uri, method, AVG(elapsed_ms) as avg_time, COUNT(*) as count
FROM app_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND elapsed_ms IS NOT NULL
GROUP BY uri, method
ORDER BY avg_time DESC
LIMIT 10;
```

**Active users in last hour:**
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM app_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
  AND user_id IS NOT NULL;
```

**Error rate by hour:**
```sql
SELECT
  date_trunc('hour', timestamp) as hour,
  COUNT(*) FILTER (WHERE status >= 400) as errors,
  COUNT(*) as total,
  ROUND((COUNT(*) FILTER (WHERE status >= 400)::numeric / COUNT(*)) * 100, 2) as error_rate_pct
FROM app_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

### Viewing Host Metrics

**Using Grafana:**
1. Go to the **Host Machine Monitoring** dashboard
2. All 10 panels are pre-configured
3. Adjust time range as needed (default: last 1 hour)

**Using Prometheus Directly:**
Go to http://localhost:9090 and run PromQL queries:

**CPU usage:**
```promql
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Memory usage:**
```promql
100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes)))
```

**Disk usage:**
```promql
100 - ((node_filesystem_avail_bytes{mountpoint="/",fstype!="rootfs"} * 100) / node_filesystem_size_bytes{mountpoint="/",fstype!="rootfs"})
```

**Network traffic (bytes/sec):**
```promql
irate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*"}[5m])
irate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*"}[5m])
```

### Creating Custom Dashboards

1. **Click "+" → Dashboard**
2. **Add panel**
3. **Select datasource:** PostgreSQL Monitoring (for app logs) or Prometheus (for host metrics)
4. **Write SQL query or PromQL query**
5. **Choose visualization type**
6. **Save dashboard**

---

## 🌐 Production Deployment

### Step 1: Secure Environment Variables

```bash
# Generate strong passwords
openssl rand -base64 32

# Update .env with strong passwords
MONITORING_DB_PASSWORD=<strong-password-here>
GRAFANA_ADMIN_PASSWORD=<strong-password-here>
GRAFANA_SECRET_KEY=<random-secret-key>

# Update Grafana URL
GRAFANA_ROOT_URL=https://grafana.mhamzah.id
GRAFANA_DOMAIN=grafana.mhamzah.id
```

### Step 2: Deploy to Server

```bash
# SSH to your server
ssh user@your-server

# Navigate to project
cd ~/repo/belajar/54-task-mgmt-app/monitoring-grafana

# Pull latest changes
git pull

# Update .env with production values
nano .env

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Step 3: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/grafana.mhamzah.id`:

```nginx
server {
    listen 80;
    server_name grafana.mhamzah.id;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name grafana.mhamzah.id;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/grafana.mhamzah.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/grafana.mhamzah.id/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/grafana-access.log;
    error_log /var/log/nginx/grafana-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/grafana.mhamzah.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d grafana.mhamzah.id
```

### Step 5: Update Application Connection

**On your app server, update `.env`:**
```env
# Use production monitoring database
MONITORING_DB_URL=postgresql://monitoring:PASSWORD@localhost:5433/monitoring_db
```

### Step 6: Test Production Setup

```bash
# Test Grafana access
curl https://grafana.mhamzah.id/api/health

# Should return: {"database":"ok","version":"10.2.3"}
```

---

## 🔧 Maintenance

### Backup Database

```bash
# Backup monitoring database
docker exec postgres-monitoring pg_dump -U monitoring monitoring_db > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i postgres-monitoring psql -U monitoring monitoring_db < backup_20241026.sql
```

### View Database Size

```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "
SELECT
  pg_size_pretty(pg_database_size('monitoring_db')) as database_size,
  pg_size_pretty(pg_total_relation_size('app_logs')) as logs_table_size,
  (SELECT COUNT(*) FROM app_logs) as log_count;
"
```

### Manual Cleanup

```bash
# Clean logs older than 30 days
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT cleanup_old_logs();"

# Vacuum database (reclaim space)
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "VACUUM FULL;"
```

### Update Grafana

```bash
cd monitoring-grafana

# Pull new image
docker-compose pull grafana

# Restart Grafana
docker-compose up -d grafana
```

---

## 🔍 Troubleshooting

### Issue: Grafana Can't Connect to PostgreSQL

**Check:**
```bash
# 1. Is PostgreSQL running?
docker-compose ps postgres-monitoring

# 2. Test connection
docker exec -it postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT 1;"

# 3. Check Grafana logs
docker-compose logs grafana | grep -i postgres
```

**Fix:**
```bash
# Restart services
docker-compose restart postgres-monitoring grafana
```

---

### Issue: No Data in Dashboards

**Check:**
```bash
# 1. Is MONITORING_DB_URL set in your app?
echo $MONITORING_DB_URL

# 2. Check if logs exist in database
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT COUNT(*) FROM app_logs;"

# 3. Check your app logs
tail -f /path/to/app/logs/*.log | grep -i postgres
```

**Fix:**
1. Ensure `MONITORING_DB_URL` is set in your app's `.env`
2. Restart your application
3. Make some test requests to your app
4. Check database again

---

### Issue: High Database Size

**Check size:**
```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "
SELECT pg_size_pretty(pg_database_size('monitoring_db'));"
```

**Solutions:**
1. Run cleanup function more frequently
2. Reduce retention period
3. Vacuum database
4. Consider partitioning tables by date

---

### Issue: Slow Queries

**Check slow queries:**
```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

**Fix:**
- Add more indexes (already optimized in schema)
- Increase PostgreSQL memory
- Use materialized views for heavy aggregations

---

## 📚 Additional Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Grafana Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

---

## 🆘 Getting Help

**Common Commands:**

```bash
# View all logs
docker-compose logs -f

# Check service health
docker-compose ps

# Restart everything
docker-compose restart

# Stop everything
docker-compose down

# Remove everything (including data!)
docker-compose down -v
```

**Need Help?**
1. Check this documentation
2. View container logs: `docker-compose logs <service>`
3. Check GitHub issues
4. Contact DevOps team

---

## 📝 Summary

**What You Get:**
- ✅ Separate PostgreSQL database for monitoring (port 5433)
- ✅ Grafana dashboard (port 3000)
- ✅ Auto-provisioned datasource and dashboards
- ✅ Dual logging (files + database)
- ✅ 70% storage savings vs Elasticsearch
- ✅ Production-ready configuration

**Ports Used:**
- **5433**: PostgreSQL Monitoring Database
- **5602**: Grafana UI
- **9090**: Prometheus (host metrics storage)
- **9100**: Node Exporter (host metrics collector)

**Data Flow:**
```
Application Logs: App → Logger → Files (backup) + PostgreSQL → Grafana
Host Metrics:     Host VM → Node Exporter → Prometheus → Grafana
```

**Storage:**
- ~150MB per 30 days for 1000 requests/day
- Auto-cleanup keeps last 30 days

---

**Last Updated:** October 2024
**Version:** 1.0.0
**Author:** AI Assistant
