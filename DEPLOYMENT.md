# Deployment Guide

## Quick Start

### Local Development

1. **Prerequisites:**
   ```bash
   # Install Node.js 18+
   node --version

   # Install Redis (or use Docker)
   redis-cli ping

   # Install PostgreSQL (or use Docker)
   psql --version
   ```

2. **Setup:**
   ```bash
   npm install
   npm run build
   ```

3. **Configure Environment:**
   Create `.env` file:
   ```env
   PORT=3000
   REDIS_HOST=localhost
   REDIS_PORT=6379
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=order_engine
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   ```

4. **Start Services:**
   ```bash
   # Start Redis
   redis-server

   # Start PostgreSQL
   # (varies by OS)

   # Start application
   npm start
   ```

## Production Deployment

### Render.com

1. **Create Account:** Sign up at [render.com](https://render.com)

2. **Create Web Service:**
   - New → Web Service
   - Connect GitHub repository
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Add Redis:**
   - New → Redis
   - Note connection details

4. **Add PostgreSQL:**
   - New → PostgreSQL
   - Note connection details

5. **Set Environment Variables:**
   ```
   PORT=3000
   REDIS_HOST=<from-redis-service>
   REDIS_PORT=6379
   REDIS_PASSWORD=<from-redis-service>
   POSTGRES_HOST=<from-postgres-service>
   POSTGRES_PORT=5432
   POSTGRES_DB=order_engine
   POSTGRES_USER=<from-postgres-service>
   POSTGRES_PASSWORD=<from-postgres-service>
   ```

6. **Deploy:**
   - Click "Deploy"
   - Wait for deployment
   - Note your public URL

### Heroku

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   heroku login
   ```

2. **Create App:**
   ```bash
   heroku create your-app-name
   ```

3. **Add Addons:**
   ```bash
   heroku addons:create heroku-redis:mini
   heroku addons:create heroku-postgresql:mini
   ```

4. **Set Config:**
   ```bash
   heroku config:set NODE_ENV=production
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

### Railway

1. **Create Account:** [railway.app](https://railway.app)

2. **New Project:**
   - Deploy from GitHub repo

3. **Add Services:**
   - Add Redis
   - Add PostgreSQL

4. **Set Variables:**
   - Configure environment variables

5. **Deploy:**
   - Automatic on git push

## Docker Deployment

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - POSTGRES_HOST=postgres
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=order_engine
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Build and Run

```bash
docker-compose up -d
```

## Health Checks

After deployment, verify:

1. **Health Endpoint:**
   ```bash
   curl https://your-app-url/health
   ```

2. **Submit Test Order:**
   ```bash
   curl -X POST https://your-app-url/api/orders/execute \
     -H "Content-Type: application/json" \
     -d '{"tokenIn":"SOL","tokenOut":"USDC","amount":10,"orderType":"MARKET"}'
   ```

3. **Check Logs:**
   - Monitor application logs
   - Check for errors
   - Verify database connections

## Troubleshooting

### Common Issues

1. **Redis Connection Failed:**
   - Verify REDIS_HOST and REDIS_PORT
   - Check Redis is running
   - Verify network connectivity

2. **PostgreSQL Connection Failed:**
   - Verify POSTGRES_HOST and credentials
   - Check database exists
   - Verify SSL settings if required

3. **Port Already in Use:**
   - Change PORT environment variable
   - Check for running processes

4. **Build Failures:**
   - Ensure Node.js 18+ is installed
   - Check npm install completes
   - Verify all dependencies are available

## Monitoring

### Recommended Monitoring

- **Application Logs:** Monitor stdout/stderr
- **Redis Metrics:** Monitor memory usage
- **PostgreSQL Metrics:** Monitor connection pool
- **Queue Metrics:** Monitor job processing rate
- **Error Tracking:** Set up error tracking (e.g., Sentry)

### Health Check Endpoint

The `/health` endpoint returns:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

Use this for load balancer health checks.

