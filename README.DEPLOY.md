# 🚀 Render + Railway MySQL Deployment Guide

## **1. Render Dashboard**
```
Service Type: Web Service
Repository: GitHub
Build Command: npm ci
Start Command: npx sequelize-cli db:migrate && node src/app.js
Instance Type: Starter (€7)
Disks: Name=uploads, Size=10GB, Mount=/opt/render/disks/uploads
```

## **2. Railway MySQL Env Vars**
```
DB_HOST=roundhouse.proxy.rlwy.net
DB_PORT=42618
DB_USER=root
DB_PASSWORD=...
DB_NAME=railway
MYSQL_URL=mysql://root:...@roundhouse.proxy.rlwy.net:42618/railway
```

## **3. Render Env Vars (Railway)**
```
NODE_ENV=production
PORT=10000
DB_HOST=roundhouse.proxy.rlwy.net
DB_PORT=42618
DB_USER=root
DB_PASSWORD=your_railway_pass
DB_NAME=railway
REDIS_URL=...
JWT_SECRET=openssl rand -base64 64
RENDER_DISK_PATH=/opt/render/disks/uploads
CORS_ORIGINS=https://your-frontend.onrender.com
```

## **4. Test Deploy**
```
1. Deploy → View Logs
2. Wait migrations (60s max)
3. /api/v1/health → 200 OK
4. POST /auth/login → JWT OK
```

## **5. Monitoring**
```
Logs Render → Winston JSON
Health: /api/v1/health
Metrics: Railway dashboard
```

## **6. Scale**
```
Horizontal: 2 instances
DB: Railway 10GB
Disk: Render 50GB
CDN: Uploads via Cloudflare
```

