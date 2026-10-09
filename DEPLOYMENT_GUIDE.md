# 🚀 FertiFlow AI & n8n Cloud Hosting Guide

This guide walks you through hosting the entire **FertiFlow AI platform** and **n8n** in the cloud so it runs 24/7 independently of your local computer.

---

## 🏗️ Architecture Overview

```
                        ┌──────────────────────────────────────────────┐
                        │              CLOUD INFRASTRUCTURE            │
                        │                                              │
📱 Patient WhatsApp ───►│  n8n Gateway (Docker)                        │
                        │  https://n8n.yourdomain.com                  │
                        │        │                                     │
                        │        ▼ (Internal Network)                  │
💻 Clinic Staff ───────►│  FertiFlow Frontend  ──► FertiFlow Backend   │
   (Browser)            │  (React / Nginx)         (FastAPI: 8000)     │
                        └─────────┬──────────────────────┬─────────────┘
                                  │                      │
                                  ▼                      ▼
                         Supabase PostgreSQL       Google Gemini AI
                         (Already 24/7 Cloud)       (Cloud API)
```

---

## 🌟 Choose Your Hosting Method

| Option | Best For | Complexity | Cost | Free HTTPS |
|---|---|---|---|---|
| **Option 1: Railway / Render + Vercel** | Fastest, zero server maintenance | ⭐ Easy | Free / ~$5/mo | ✅ Included |
| **Option 2: Single Cloud VPS (Docker Compose)** | All-in-one container box (DigitalOcean / AWS / Hetzner) | ⭐⭐ Medium | ~$4–$6/mo | ✅ via Caddy/Certbot |

---

## Option 1: PaaS Deployment (Railway / Render + Vercel) — *Fastest*

### Step 1: Push Project to GitHub
Push your FertiFlow project to your GitHub account (make repository private or public).

### Step 2: Deploy n8n on Railway (1-Click)
1. Go to [railway.app](https://railway.app) and log in with GitHub.
2. Click **New Project** $\rightarrow$ **Deploy from Template** $\rightarrow$ Search for **n8n**.
3. Railway automatically spins up n8n with persistent storage and provides a free HTTPS domain:
   `https://n8n-production-xxxx.up.railway.app`
4. Open the domain, set your admin password, and import your 3 FertiFlow workflows from the `n8n/` folder!

### Step 3: Deploy FertiFlow Backend on Render or Railway
1. In [render.com](https://render.com) (or Railway), click **New Web Service**.
2. Select your GitHub repository.
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
6. Add Environment Variables:
   - `DATABASE_URL`: `your_supabase_postgres_url`
   - `GEMINI_API_KEY`: `your_gemini_key`
   - `SECRET_KEY`: `your_secret_key`
   - `N8N_ENABLED`: `true`
   - `N8N_OUTBOUND_WEBHOOK_URL`: `https://your-n8n-domain/webhook/fertiflow-outbound`
   - `N8N_DOCTOR_ALERT_WEBHOOK_URL`: `https://your-n8n-domain/webhook/fertiflow-doctor-alert`

### Step 4: Deploy Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) and import the repo.
2. Set **Root Directory**: `frontend`
3. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-backend-domain/api/v1`
4. Click **Deploy**. Vercel gives you an instant global HTTPS URL (e.g., `https://fertiflow.vercel.app`).

---

## Option 2: Single All-in-One Cloud VPS (Docker Compose)

You can run everything on any Linux VPS ($4/month on Hetzner, DigitalOcean, or free on Oracle Cloud):

### 1. Connect to your VPS:
```bash
ssh root@your-server-ip
```

### 2. Install Docker & Git:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
```

### 3. Clone Repository & Setup Environment:
```bash
git clone https://github.com/your-username/FertiFlow.git
cd FertiFlow
cp backend/.env.example backend/.env
# Edit backend/.env with your Supabase URL & Gemini API key:
nano backend/.env
```

### 4. Start the Entire Stack with One Command:
```bash
docker compose up -d --build
```

**Status Check:**
```bash
docker compose ps
```
All 3 containers (`fertiflow-backend`, `fertiflow-n8n`, and `fertiflow-frontend`) will be running and auto-restart on system reboots!

### 5. (Optional) Free SSL/HTTPS with Caddy:
Meta WhatsApp requires a valid `https://` webhook URL. Install Caddy for automatic free SSL:
```bash
sudo apt install -y caddy
```
Edit `/etc/caddy/Caddyfile`:
```caddy
# Your domains or free DuckDNS / No-IP subdomains:
clinic.yourdomain.com {
    reverse_proxy localhost:80
}

api.yourdomain.com {
    reverse_proxy localhost:8000
}

n8n.yourdomain.com {
    reverse_proxy localhost:5678
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```
Caddy automatically provisions SSL certificates from Let's Encrypt!

---

## 📱 Meta WhatsApp Cloud API Production Setup

Once your cloud n8n URL is live (e.g., `https://n8n.yourdomain.com`):

1. Go to [Meta for Developers](https://developers.facebook.com/) $\rightarrow$ **WhatsApp** $\rightarrow$ **Configuration**.
2. Set **Callback URL**:  
   `https://n8n.yourdomain.com/webhook/fertiflow-inbound-wa`
3. Set **Verify Token**: any secret string (e.g., `fertiflow_meta_token_2026`).
4. Subscribe to the **`messages`** webhook field.
5. In n8n, any message sent to your WhatsApp Business phone number will now instantly trigger FertiFlow in the cloud!
