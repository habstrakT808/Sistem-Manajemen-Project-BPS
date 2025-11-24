# Testing

Folder ini berisi file-file terkait testing dan demo.

## Struktur

- `load-testing/` - Script dan konfigurasi untuk load testing
  - `load-test-k6.js` - Script load testing menggunakan k6
  - `locustfile.py` - Script load testing menggunakan Locust

- `demo/` - Demo pages dan HTML untuk screenshot dokumentasi
  - `audit-log-interface.html` - Demo Audit Log Interface
  - `generate-monitoring-data.html` - Demo System Resource Monitoring
  - `mfa-setup-page.html` - Demo Multi-Factor Authentication Setup
  - `security-audit-report.html` - Demo Security Audit Report
  - `ssl-certificate-info.html` - Demo SSL Certificate Information
  - `stress-test-dashboard.html` - Demo Stress Testing Dashboard
  - `vulnerability-scan-results.html` - Demo Vulnerability Scan Results

## Cara Menggunakan

### Load Testing

**Menggunakan k6:**

```bash
cd tests/load-testing
k6 run load-test-k6.js
```

**Menggunakan Locust:**

```bash
cd tests/load-testing
python -m locust -f locustfile.py --host=http://localhost:3000
```

### Demo Pages

Buka file HTML di browser untuk melihat demo atau mengambil screenshot untuk dokumentasi.
