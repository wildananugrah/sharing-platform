# ⚡ Quick Start Guide - Grafana Monitoring

Get up and running in 5 minutes!

---

## 🎯 Prerequisites

```bash
# Install PostgreSQL client for your app
cd /path/to/your/app
npm install pg
```

---

## 🚀 Setup (First Time Only)

### 1. Configure Environment

```bash
cd monitoring-grafana
cp .env.example .env
nano .env  # Change passwords!
```

### 2. Start Monitoring Stack

```bash
./start.sh
```

Or manually:
```bash
docker-compose up -d
```

### 3. Configure Your App

Add to your app's `.env`:
```env
MONITORING_DB_URL=postgresql://monitoring:YOUR_PASSWORD@localhost:5433/monitoring_db
```

**Replace `YOUR_PASSWORD` with password from `monitoring-grafana/.env`**

### 4. Restart Your App

```bash
# If using Docker
docker-compose restart

# If using PM2
pm2 restart all

# If using npm
npm run dev
```

---

## 📊 Access Grafana

1. **Open:** http://localhost:3000
2. **Login:**
   - Username: `admin`
   - Password: (from `.env` file)
3. **View Dashboards:**
   - Click **Dashboards** → **Browse**
   - Open **Application Overview**

---

## ✅ Verify It's Working

### Test Database Connection

```bash
# Check PostgreSQL is running
docker-compose ps postgres-monitoring

# Test connection
docker exec -it postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT COUNT(*) FROM app_logs;"
```

### Generate Test Traffic

```bash
# Make requests to your app
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/taskgroups

# Wait 10 seconds (for log buffer to flush)
sleep 10

# Check if logs were inserted
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT COUNT(*) FROM app_logs;"
```

### View Logs in Database

```bash
docker exec -it postgres-monitoring psql -U monitoring -d monitoring_db
```

Then run:
```sql
-- See recent logs
SELECT timestamp, level, method, uri, status, elapsed_ms
FROM app_logs
ORDER BY timestamp DESC
LIMIT 10;

-- Exit
\q
```

---

## 🎨 View in Grafana

1. Go to http://localhost:3000
2. Login
3. **Dashboards** → **Browse** → **Application Monitoring** → **Application Overview**
4. You should see:
   - Total Requests count
   - Average Response Time
   - Request rate chart
   - Status code distribution

---

## 🛑 Stop Monitoring Stack

```bash
cd monitoring-grafana
docker-compose down
```

To remove all data:
```bash
docker-compose down -v
```

---

## 📝 Common Commands

```bash
# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Restart Grafana
docker-compose restart grafana

# Restart PostgreSQL
docker-compose restart postgres-monitoring

# View database size
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT pg_size_pretty(pg_database_size('monitoring_db'));"
```

---

## 🌐 Production Deployment

See [README.md](README.md#production-deployment) for complete production setup guide.

**Quick checklist:**
- ✅ Change all passwords in `.env`
- ✅ Set up Nginx reverse proxy
- ✅ Configure SSL with Let's Encrypt
- ✅ Update `GRAFANA_ROOT_URL` in `.env`
- ✅ Schedule database cleanup cron job

---

## 🆘 Troubleshooting

### No logs showing in Grafana?

1. Check if `MONITORING_DB_URL` is set in your app's `.env`
2. Restart your app
3. Make test requests to your app
4. Wait 10 seconds (log buffer flushes every 10s)
5. Check database: `docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT COUNT(*) FROM app_logs;"`

### Can't connect to Grafana?

```bash
# Check if Grafana is running
docker-compose ps grafana

# View Grafana logs
docker-compose logs grafana

# Restart Grafana
docker-compose restart grafana
```

### PostgreSQL connection error?

```bash
# Check if PostgreSQL is running
docker-compose ps postgres-monitoring

# Test connection
docker exec postgres-monitoring pg_isready -U monitoring

# View PostgreSQL logs
docker-compose logs postgres-monitoring
```

---

## 📖 Full Documentation

For complete documentation, see [README.md](README.md)

---

**That's it! You're monitoring! 🎉**
