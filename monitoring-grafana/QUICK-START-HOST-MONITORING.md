# 🚀 Quick Start: Host Monitoring

Monitor your VM's CPU, RAM, Disk, and Network in 3 steps.

---

## Step 1: Start Services

```bash
cd monitoring-grafana
./start-host-monitoring.sh
```

**Or manually:**
```bash
docker-compose up -d
```

---

## Step 2: Access Grafana

Open: **http://localhost:5602**

Login:
- **Username**: admin
- **Password**: (from your .env file)

---

## Step 3: View Dashboard

Go to: **Dashboards → Host Machine Monitoring**

You'll see:
- ✅ CPU Usage (overall + per core)
- ✅ Memory Usage (gauge + timeline)
- ✅ Disk Usage (gauge + I/O + table)
- ✅ Network Traffic (RX/TX per interface)
- ✅ System Load & Uptime

---

## 🔗 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Grafana** | http://localhost:5602 | Dashboards and visualization |
| **Prometheus** | http://localhost:9090 | Query metrics with PromQL |
| **Node Exporter** | http://localhost:9100/metrics | Raw metrics endpoint |
| **PostgreSQL** | localhost:5433 | Application logs database |

---

## 📊 What Gets Monitored

### CPU Monitoring
- Overall CPU usage percentage
- Individual CPU core usage
- System load average (1m, 5m, 15m)

### Memory Monitoring
- RAM usage percentage
- Used vs Available memory
- Memory timeline

### Disk Monitoring
- Disk usage percentage per filesystem
- Disk I/O operations (read/write IOPS)
- All mounted filesystems table

### Network Monitoring
- Network traffic (bytes/sec received and transmitted)
- Per network interface
- Excludes loopback and Docker interfaces

### System Information
- System uptime
- Load averages

---

## 🛠️ Useful Commands

```bash
# View all services status
npm run ps
# or: docker-compose ps

# View logs
npm run logs                    # All services
npm run logs:prometheus         # Prometheus only
npm run logs:node-exporter      # Node Exporter only

# Check Prometheus targets
npm run prometheus:targets

# View raw metrics
npm run prometheus:metrics

# Restart services
npm run restart

# Stop services
npm run stop
```

---

## 🔍 Troubleshooting

### No data in dashboard?

1. **Check services are running:**
   ```bash
   docker-compose ps
   ```
   All should show "Up" or "Up (healthy)"

2. **Check Prometheus targets:**
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
   Should show `node-exporter` as "up"

3. **Check Node Exporter metrics:**
   ```bash
   curl http://localhost:9100/metrics | head
   ```
   Should return metrics starting with `node_`

4. **Restart services:**
   ```bash
   docker-compose restart prometheus node-exporter
   ```

### Dashboard shows wrong datasource error?

Run the fix script:
```bash
npm run fix-datasource
```

---

## 📚 Learn More

- **Full Documentation**: [README.md](README.md)
- **Host Monitoring Guide**: [HOST-MONITORING.md](HOST-MONITORING.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 💡 Pro Tips

1. **Set time range** in Grafana (top-right):
   - Last 1 hour (troubleshooting)
   - Last 24 hours (daily patterns)
   - Last 7 days (weekly trends)

2. **Refresh rate** is 30 seconds by default
   - Change it in dashboard settings

3. **Create custom dashboards**:
   - Click "+" → Dashboard
   - Select Prometheus datasource
   - Write PromQL queries

4. **Example PromQL queries**:
   ```promql
   # CPU usage
   100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

   # Memory usage
   100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))

   # Disk usage
   100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})
   ```

---

**That's it! Your host monitoring is ready.** 🎉

For application log monitoring, configure `MONITORING_DB_URL` in your app's `.env` file.
