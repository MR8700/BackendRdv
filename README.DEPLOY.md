# 🚀 Déploiement Render - Checklist Production

## 1. Préparation Git
```
git add .
git commit -m "feat: production audit complete"
git push origin main
```

## 2. Render Dashboard

- **New Web Service** → GitHub repo
- **Build**: `npm ci --prod && npm prune --prod`
- **Start**: `node src/app.js`
- **Plan**: Starter ($7/mo)

## 3. Environment Variables (env.prod.example → Render)
```
NODE_ENV=production
PORT=10000

DB_HOST=mysql-xxx.onrender.com
DB_PORT=3306  
DB_NAME=clinique_prod
DB_USER=...
DB_PASSWORD=...

REDIS_URL=redis://red-xxx.upstash.io:...
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_EXPIRES_IN=30d
JWT_BLACKLIST_SECRET=$(openssl rand -base64 32)

CORS_ORIGINS=https://your-frontend.onrender.com
LOG_LEVEL=warn
MAIL_ENABLED=true
MAIL_TOKEN=...
RENDER_DISK_PATH=/opt/render/disks/uploads

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_AUTH=5
RATE_LIMIT_MAX_API=200
```

## 4. Render Disk (Uploads)
- Add Disk → Mount Path: `/opt/render/disks`
- Size: 10GB Starter

## 5. Test Post-Deploy
```
curl https://your-api.onrender.com/api/v1/health  # DB/Redis OK
curl -X POST /api/v1/auth/login -d '{"login":"admin","password":"Admin1234!"}'
```

## 6. Monitoring
- Render Logs → JSON Winston format
- Health checks automatiques OK

✅ **Production Ready - 0 downtime deploy**

