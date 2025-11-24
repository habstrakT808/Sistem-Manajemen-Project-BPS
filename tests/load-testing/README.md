# Load Testing Scripts

Folder ini berisi script dan konfigurasi untuk load testing.

## File

- `load-test-k6.js` - Script load testing menggunakan k6
- `locustfile.py` - Script load testing menggunakan Locust

## Cara Menggunakan

### k6 Load Testing

1. Install k6: https://k6.io/docs/getting-started/installation/
2. Edit `BASE_URL` di `load-test-k6.js` dengan URL aplikasi Anda
3. Jalankan: `k6 run load-test-k6.js`

### Locust Load Testing

1. Install Locust: `pip install locust`
2. Edit `host` di `locustfile.py` dengan URL aplikasi Anda
3. Jalankan: `python -m locust -f locustfile.py --host=http://localhost:3000`
4. Buka browser ke `http://localhost:8089` untuk melihat dashboard
