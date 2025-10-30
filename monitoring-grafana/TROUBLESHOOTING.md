# 🔧 Troubleshooting Guide - Grafana Monitoring

Common issues and their solutions.

---

## 🚨 Error: "Datasource [UID] was not found"

### **Symptom:**
Dashboard shows red error icons with message: `Datasource P1809F7CD0C75ACF3 was not found`

### **Cause:**
The dashboard is referencing a datasource UID that doesn't match your actual datasource.

### **Solution (Automatic - Recommended):**

```bash
cd monitoring-grafana
npm run fix-datasource
```

Or run directly:
```bash
./fix-datasource-uid.sh
```

This script will:
1. ✅ Get the actual datasource UID from Grafana
2. ✅ Update the dashboard JSON file
3. ✅ Create a backup of the old file
4. ✅ Restart Grafana

### **Solution (Manual):**

1. **Get the datasource UID:**
   ```bash
   curl -u admin:YOUR_PASSWORD http://localhost:5602/api/datasources | jq '.[] | {name, uid}'
   curl -u admin:P@ssw0rd -s http://localhost:5602/api/datasources
   ```

2. **Update the dashboard:**
   - Open `grafana/provisioning/dashboards/overview.json`
   - Find all occurrences of `"uid": "OLD_UID"`
   - Replace with `"uid": "NEW_UID"` (from step 1)

3. **Restart Grafana:**
   ```bash
   docker-compose restart grafana
   ```

### **Prevention (Permanent Fix):**

The datasource now has a fixed UID: `postgres-monitoring-ds`

If you recreate the monitoring stack from scratch, the UID will remain consistent.

---

## 🚨 Error: "No data" in all panels

### **Symptom:**
Dashboard loads but all panels show "No data"

### **Possible Causes & Solutions:**

#### **1. No logs in database**

**Check:**
```bash
npm run db:count
```

**Expected:** Should show a number > 0

**If it shows 0:**
- Your app is not logging to PostgreSQL
- Check if `MONITORING_DB_URL` is set in your app's `.env`
- Restart your application
- Make some requests to your app
- Wait 10 seconds (log buffer)
- Check count again

#### **2. Wrong time range selected**

**Solution:**
- Click time range selector (top right in Grafana)
- Select "Last 6 hours" or "Last 24 hours"
- Check the timestamp of your oldest log:
  ```bash
  docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "SELECT MIN(timestamp), MAX(timestamp) FROM app_logs;"
  ```

#### **3. Datasource not connected**

**Check:**
1. Go to Grafana → **Configuration** → **Data Sources**
2. Click **PostgreSQL Monitoring**
3. Scroll down and click **Save & Test**
4. Should show: "Database Connection OK"

**If it fails:**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres-monitoring

# Check if database exists
docker exec postgres-monitoring psql -U monitoring -l
```

#### **4. Dashboard query errors**

**Check panel errors:**
1. Click on any panel title
2. Select **Edit**
3. Check the **Query inspector** (bottom)
4. Look for error messages

---

## 🚨 PostgreSQL: "database does not exist"

### **Symptom:**
```
FATAL: database "monitoring" does not exist
```

### **Cause:**
Healthcheck or connection string uses wrong database name.

### **Solution:**

The database name is `monitoring_db` (not `monitoring`)

**Update docker-compose.yml healthcheck:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U monitoring -d monitoring_db"]
```

**Update connection strings:**
```env
MONITORING_DB_URL=postgresql://monitoring:PASSWORD@localhost:5433/monitoring_db
                                                                    ^^^^^^^^^^^^
```

---

## 🚨 Grafana: "legacy and unified alerting cannot both be enabled"

### **Symptom:**
Grafana keeps restarting with error:
```
failed to read unified alerting enabled setting:
legacy and unified alerting cannot both be enabled at the same time
```

### **Solution:**

Edit `grafana/grafana.ini`:
```ini
[alerting]
enabled = false  # Must be false if using unified alerting

[unified_alerting]
enabled = true
```

Then restart:
```bash
docker-compose restart grafana
```

---

## 🚨 Docker: Port already in use

### **Symptom:**
```
Error starting userland proxy: listen tcp4 0.0.0.0:5433:
bind: address already in use
```

### **Cause:**
Another service is using port 5433 or 5602

### **Solution:**

**Option 1: Stop conflicting service**
```bash
# Find what's using the port
lsof -i :5433
lsof -i :5602

# Stop it
kill <PID>
```

**Option 2: Change ports**

Edit `docker-compose.yml`:
```yaml
services:
  postgres-monitoring:
    ports:
      - "5434:5432"  # Changed from 5433

  grafana:
    ports:
      - "3000:3000"  # Changed from 5602
```

Don't forget to update connection strings!

---

## 🚨 Grafana: Can't login

### **Symptom:**
Login page shows "Invalid username or password"

### **Solution:**

**Check your password in `.env`:**
```bash
grep GRAFANA_ADMIN_PASSWORD .env
```

**Reset admin password:**
```bash
docker exec grafana grafana cli admin reset-admin-password YOUR_NEW_PASSWORD
```

---

## 🚨 High database size

### **Symptom:**
```bash
npm run db:size
# Shows: 5.2 GB
```

### **Solutions:**

**1. Run cleanup manually:**
```bash
npm run db:cleanup
```

**2. Reduce retention period:**

Edit `migrations/001_create_logs_tables.sql`:
```sql
-- Change from 30 days to 7 days
DELETE FROM app_logs WHERE timestamp < NOW() - INTERVAL '7 days';
```

**3. Vacuum database:**
```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "VACUUM FULL;"
```

**4. Schedule automatic cleanup:**

Add to crontab:
```bash
# Run cleanup daily at 2 AM
0 2 * * * cd /path/to/monitoring-grafana && npm run db:cleanup
```

---

## 🚨 Slow Grafana queries

### **Symptom:**
Dashboards take 10+ seconds to load

### **Solutions:**

**1. Check if indexes exist:**
```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db -c "\di"
```

Should show indexes like:
- `idx_app_logs_timestamp`
- `idx_app_logs_status`
- `idx_app_logs_uri`

**2. Analyze query performance:**
```bash
docker exec postgres-monitoring psql -U monitoring -d monitoring_db
```

```sql
EXPLAIN ANALYZE
SELECT COUNT(*) FROM app_logs
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

**3. Add more PostgreSQL memory:**

Edit `docker-compose.yml`:
```yaml
command:
  - "shared_buffers=512MB"  # Increase from 256MB
  - "effective_cache_size=2GB"  # Increase from 1GB
```

---

## 🚨 Container keeps restarting

### **Symptom:**
```bash
docker-compose ps
# Shows: Restarting (1) Less than a second ago
```

### **Solution:**

**Check logs:**
```bash
docker-compose logs postgres-monitoring
docker-compose logs grafana
```

**Common causes:**
1. **Out of memory** - Increase Docker memory limit
2. **Port conflict** - Change ports in docker-compose.yml
3. **Config error** - Check grafana.ini syntax
4. **Volume permission** - Check file permissions

---

## 🆘 Emergency Commands

### **Reset everything (DESTRUCTIVE!):**
```bash
cd monitoring-grafana
docker-compose down -v  # Deletes all data!
docker-compose up -d
```

### **View all logs:**
```bash
docker-compose logs -f
```

### **Connect to PostgreSQL:**
```bash
npm run db:connect
```

### **Check service health:**
```bash
docker-compose ps
curl http://localhost:5602/api/health
```

### **Backup before troubleshooting:**
```bash
npm run db:backup
```

---

## 📚 Additional Help

- **Full Documentation:** [README.md](README.md)
- **Quick Start:** [QUICK-START.md](QUICK-START.md)
- **Setup Complete:** [SETUP-COMPLETE.md](SETUP-COMPLETE.md)

---

## 🔍 Still Having Issues?

1. Check the logs: `docker-compose logs -f`
2. Check database is running: `npm run db:count`
3. Check Grafana health: `curl http://localhost:5602/api/health`
4. Try resetting datasource: `npm run fix-datasource`
5. Last resort: `docker-compose down -v && docker-compose up -d`

---

**Last Updated:** October 2024
