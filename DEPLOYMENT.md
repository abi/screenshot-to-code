# 🚀 Deployment Guide for Image-to-Code

## Option 1: Vercel (Recommended - Easy & Free)

**Best for:** Frontend + Serverless backend, easy deployment

### Steps:
1. Push your code to GitHub
2. Connect GitHub repo to Vercel
3. Set environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY` 
   - `GEMINI_API_KEY`
4. Deploy automatically on push

### Quick Deploy:
```bash
chmod +x scripts/deploy-vercel.sh
./scripts/deploy-vercel.sh
```

---

## Option 2: Railway (Full Docker Support)

**Best for:** Full-stack apps with Docker, databases

### Steps:
1. Create Railway account
2. Install Railway CLI: `curl -fsSL https://railway.app/install.sh | sh`
3. Run deployment script:
```bash
chmod +x scripts/deploy-railway.sh
./scripts/deploy-railway.sh
```

---

## Option 3: DigitalOcean App Platform

**Best for:** Scalable production deployments

### Steps:
1. Push code to GitHub
2. Create new app in DigitalOcean
3. Connect GitHub repo
4. Use `Dockerfile.production` for build
5. Set environment variables
6. Deploy

---

## Option 4: AWS/GCP/Azure

**Best for:** Enterprise deployments

### AWS (ECS + Fargate):
```bash
# Build and push to ECR
docker build -f Dockerfile.production -t image-to-code .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag image-to-code:latest <account>.dkr.ecr.us-east-1.amazonaws.com/image-to-code:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/image-to-code:latest
```

---

## Option 5: Self-Hosted VPS

**Best for:** Full control, custom domains

### Steps:
1. Get a VPS (DigitalOcean Droplet, Linode, etc.)
2. Install Docker and Docker Compose
3. Clone your repo
4. Set environment variables
5. Run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## Environment Variables Required

For any deployment, you'll need:

```env
# API Keys (at least one required)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  
GEMINI_API_KEY=your_gemini_key_here

# Optional
REPLICATE_API_KEY=your_replicate_key_here

# Production settings
IS_PROD=true
NUM_VARIANTS=4
```

---

## Performance Tips

1. **Enable CDN** for static assets
2. **Use Redis** for caching (add to docker-compose)
3. **Set up monitoring** (Sentry, LogRocket)
4. **Use HTTPS** (Let's Encrypt for self-hosted)

---

## Quick Start (Recommended)

For fastest deployment:

1. **Vercel** (easiest):
   ```bash
   ./scripts/deploy-vercel.sh
   ```

2. **Railway** (Docker support):
   ```bash
   ./scripts/deploy-railway.sh
   ```

Choose based on your needs!
