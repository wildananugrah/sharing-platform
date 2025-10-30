# 🖥️ Host Machine Monitoring Setup

Complete guide for monitoring your VM/host machine with Prometheus + Node Exporter + Grafana.

---

## 📋 Quick Overview

This setup monitors the **host machine** (your VM or physical server), not Docker containers. It tracks:

- **CPU**: Overall usage, per-core usage, load average
- **Memory**: RAM usage, available memory, cache/buffers
- **Disk**: Usage percentage, I/O operations, filesystem details
- **Network**: Traffic (RX/TX), packets, errors per interface
- **System**: Uptime, load average

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│         Host Machine (VM)                   │
│                                             │
│  /proc ─┐                                   │
│  /sys  ─┼──► Node Exporter ──► Prometheus  │
│  /     ─┘         :9100            :9090    │
│                                      │      │
└──────────────────────────────────────┼──────┘
                                       │
                                       │ PromQL
                                       ▼
                                  ┌──────────┐
                                  │ Grafana  │
                                  │  :5602   │
                                  └──────────┘
```

**Data Flow:**
1. **Node Exporter** reads metrics from `/proc`, `/sys`, and `/` (host filesystem)
2. **Prometheus** scrapes Node Exporter every 15 seconds
3. **Grafana** queries Prometheus and displays metrics in dashboards

---

## 🚀 Getting Started

### 1. Start the Stack

```bash
cd monitoring-grafana

# Option A: Use the helper script
./start-host-monitoring.sh

# Option B: Manual start
docker-compose up -d
```

### 2. Verify Services

```bash
# Check all services are running
docker-compose ps

# Expected output:
# NAME                STATUS              PORTS
# postgres-monitoring Up (healthy)        0.0.0.0:5433->5432/tcp
# prometheus          Up (healthy)        0.0.0.0:9090->9090/tcp
# node-exporter       Up                  0.0.0.0:9100->9100/tcp
# grafana             Up (healthy)        0.0.0.0:5602->3000/tcp
```

### 3. Access the Dashboard

1. **Open Grafana**: http://localhost:5602
2. **Login**: admin / (password from .env)
3. **Go to**: Dashboards → Host Machine Monitoring

---

## 📊 Dashboard Panels

The pre-built dashboard includes 10 panels:

### Row 1: Key Metrics (Gauges)
1. **CPU Usage** - Overall CPU utilization (0-100%)
2. **Memory Usage** - RAM usage percentage (0-100%)
3. **Disk Usage (Root)** - Root filesystem usage (0-100%)
4. **Memory Details** - Timeline showing used vs available memory

### Row 2: CPU and Network
5. **CPU Usage by Core** - Individual CPU core utilization
6. **Network Traffic** - Receive/transmit traffic per interface

### Row 3: Disk and Filesystems
7. **Disk I/O Operations** - Read/write IOPS per disk device
8. **Filesystem Usage Table** - All mounted filesystems with usage %

### Row 4: System Health
9. **System Load Average** - 1m, 5m, 15m load averages
10. **System Uptime** - How long the host has been running

---

## 🔍 Understanding the Metrics

### CPU Metrics

**CPU Usage (Overall)**
```promql
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
- Shows percentage of CPU being used
- Green (<70%), Yellow (70-90%), Red (>90%)

**CPU Usage by Core**
```promql
100 - (avg by(instance, cpu) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```
- Helpful to identify if load is balanced across cores
- Or if specific cores are maxed out

**Load Average**
```promql
node_load1, node_load5, node_load15
```
- Number of processes waiting for CPU time
- Ideal: Less than number of CPU cores
- Example: 4-core CPU → load should be < 4.0

---

### Memory Metrics

**Memory Usage (Overall)**
```promql
100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes)))
```
- Percentage of RAM being used
- Includes cache/buffers (automatically freed when needed)

**Memory Details**
```promql
node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes  # Used
node_memory_MemAvailable_bytes                                # Available
```
- Shows actual bytes used vs available
- Helps understand memory pressure

---

### Disk Metrics

**Disk Usage**
```promql
100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"})
```
- Shows percentage of disk space used
- Monitors root filesystem by default

**Disk I/O Operations**
```promql
irate(node_disk_reads_completed_total[5m])   # Read IOPS
irate(node_disk_writes_completed_total[5m])  # Write IOPS
```
- Shows disk activity (operations per second)
- High IOPS → disk is busy
- Helps identify disk bottlenecks

---

### Network Metrics

**Network Traffic**
```promql
irate(node_network_receive_bytes_total{device!~"lo|veth.*|docker.*"}[5m])   # Receive
irate(node_network_transmit_bytes_total{device!~"lo|veth.*|docker.*"}[5m])  # Transmit
```
- Shows bytes/sec received and transmitted
- Excludes loopback and Docker virtual interfaces
- Helps identify network saturation

---

## 🔧 Configuration

### Prometheus Configuration

Location: `monitoring-grafana/prometheus/prometheus.yml`

**Scrape Interval:**
```yaml
global:
  scrape_interval: 15s  # How often to collect metrics
```

**Node Exporter Target:**
```yaml
scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Node Exporter Configuration

Node Exporter runs with host access:
```yaml
volumes:
  - /proc:/host/proc:ro    # Process info
  - /sys:/host/sys:ro      # System info
  - /:/rootfs:ro           # Filesystem info
pid: host                  # Host PID namespace
```

This allows Node Exporter to see the **actual host metrics**, not container metrics.

---

## 📈 Custom Queries

### Useful PromQL Queries

**Find CPU-heavy processes (requires process exporter):**
```promql
topk(10, node_cpu_seconds_total)
```

**Memory usage trend (last 24h):**
```promql
100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))
```

**Disk space will run out in:**
```promql
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 24 * 3600)
```

**Network bandwidth utilization:**
```promql
rate(node_network_receive_bytes_total[5m]) * 8  # bits/sec
```

---

## 🚨 Setting Up Alerts (Optional)

### Example Alert Rules

Create `monitoring-grafana/prometheus/rules/host-alerts.yml`:

```yaml
groups:
  - name: host_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      # High memory usage
      - alert: HighMemoryUsage
        expr: 100 * (1 - ((node_memory_MemAvailable_bytes) / (node_memory_MemTotal_bytes))) > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for 5 minutes"

      # Disk space low
      - alert: DiskSpaceLow
        expr: 100 - ((node_filesystem_avail_bytes{mountpoint="/"} * 100) / node_filesystem_size_bytes{mountpoint="/"}) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space running low"
          description: "Disk usage is above 85%"
```

**Enable alerts in `prometheus.yml`:**
```yaml
rule_files:
  - "rules/*.yml"
```

---

## 🔍 Troubleshooting

### Issue: No data in Host Monitoring dashboard

**Check Node Exporter:**
```bash
# Is Node Exporter running?
docker-compose ps node-exporter

# Can you access metrics?
curl http://localhost:9100/metrics

# Should return hundreds of lines like:
# node_cpu_seconds_total{cpu="0",mode="idle"} 123456.78
```

**Check Prometheus:**
```bash
# Is Prometheus scraping Node Exporter?
curl http://localhost:9090/api/v1/targets

# Should show node-exporter target as "up"
```

**Check Prometheus UI:**
1. Open http://localhost:9090
2. Go to Status → Targets
3. Verify `node-exporter` shows as "UP"

---

### Issue: Metrics are 0 or wrong

**Verify Node Exporter has host access:**
```bash
# Check if volumes are mounted correctly
docker inspect node-exporter | grep -A 10 Mounts

# Should show /proc, /sys, / mounted
```

**Restart Node Exporter with proper permissions:**
```bash
docker-compose restart node-exporter
```

---

### Issue: High memory usage shown

This is often **normal** in Linux! Linux uses available RAM for caching.

**Check actual pressure:**
```bash
# SSH to your host
free -h

# Look at "available" column, not "free"
```

The dashboard uses `node_memory_MemAvailable_bytes` which accounts for reclaimable memory.

---

## 🎯 Best Practices

### 1. Set Baseline Metrics

After deployment, observe metrics for a week to understand:
- Normal CPU usage patterns
- Average memory consumption
- Typical disk I/O
- Network traffic patterns

### 2. Set Appropriate Alerts

Don't alert on temporary spikes:
```yaml
for: 5m  # Wait 5 minutes before alerting
```

### 3. Monitor Trends, Not Just Current Values

Use Grafana's time range selector:
- Last 1 hour: For troubleshooting
- Last 24 hours: For daily patterns
- Last 7 days: For weekly trends
- Last 30 days: For capacity planning

### 4. Regular Maintenance

**Check Prometheus data size:**
```bash
docker exec prometheus du -sh /prometheus
```

**Current retention:** 30 days (configurable in docker-compose.yml)

To change:
```yaml
command:
  - '--storage.tsdb.retention.time=60d'  # Keep 60 days
```

---

## 📚 Additional Resources

**Official Documentation:**
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [Prometheus](https://prometheus.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

**Community Dashboards:**
- [Node Exporter Full](https://grafana.com/grafana/dashboards/1860)
- [Node Exporter Quick](https://grafana.com/grafana/dashboards/11074)

You can import these dashboards:
1. Grafana → Dashboards → Import
2. Enter dashboard ID (e.g., 1860)
3. Select Prometheus datasource

---

## 🆘 Common Commands

```bash
# Start monitoring
cd monitoring-grafana
docker-compose up -d

# View logs
docker-compose logs -f prometheus
docker-compose logs -f node-exporter

# Restart services
docker-compose restart prometheus node-exporter

# Stop monitoring
docker-compose down

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Check Node Exporter metrics
curl http://localhost:9100/metrics | grep node_cpu

# Access Prometheus UI
open http://localhost:9090

# Access Grafana
open http://localhost:5602
```

---

## 📝 Summary

**What You Get:**
- ✅ Real-time host CPU, RAM, disk, network monitoring
- ✅ 10 pre-configured dashboard panels
- ✅ 30 days of metrics retention
- ✅ PromQL query interface
- ✅ Alerting capability (optional)

**Ports Used:**
- **9090**: Prometheus
- **9100**: Node Exporter
- **5602**: Grafana

**Resources:**
- **CPU**: ~2-5% on host
- **Memory**: ~200MB for Prometheus + Node Exporter
- **Disk**: ~1GB per 30 days of metrics

---

**Last Updated:** October 2024
**Version:** 1.0.0
