# 🚀 WearWise - Vercel Deployment Guide

WearWise is fully configured for seamless deployment on **Vercel** with Next.js 16 (Frontend) and FastAPI (Backend running via Vercel Python Serverless Functions).

---

## 🌟 Choose Your Deployment Method

| Method | Best For | Complexity | Setup Steps |
| :--- | :--- | :--- | :--- |
| **Method 1 (Recommended)** | **Single Unified Project** (Both Frontend + Backend on 1 URL) | 🟢 1-Click | Import repository, set env vars, click Deploy |
| **Method 2** | **Separate Deployments** (Frontend on Vercel, Backend separate) | 🟡 2 Projects | Deploy backend first, then point frontend to backend URL |

---

## ⚡ Method 1: Unified Monorepo on Vercel (Recommended)

In this mode, Vercel hosts both the Next.js UI and the FastAPI Python backend under **one single domain** (e.g. `https://wearwise.vercel.app`). There are **zero CORS issues** because both share the same origin!

### Step 1: Push Your Code to GitHub
Ensure all latest files are committed and pushed to your GitHub repository:
```bash
git add .
git commit -m "Prepare WearWise for Vercel deployment"
git push origin main
```

### Step 2: Import Project on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** -> **"Project"**.
3. Locate and select your **WearWise** repository, then click **Import**.

### Step 3: Project Settings
- **Project Name**: `wearwise` (or your preferred name)
- **Framework Preset**: `Next.js` (automatically detected)
- **Root Directory**: Leave as `./` (default project root)

### Step 4: Add Environment Variables
Open the **Environment Variables** accordion and add:

| Name | Example Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AQ.Ab8RN6...` | Required for Gemini Multimodal Vision & AI Stylist Chat |
| `SECRET_KEY` | `your-long-random-secret-key-32-chars` | Required for signing JWT authentication tokens |
| `DATABASE_URL` | `postgresql://postgres:...@...supabase.co:5432/postgres` | *(Recommended)* PostgreSQL connection string (see Database section below) |

> **Note**: If you do not provide a `DATABASE_URL`, WearWise will automatically use an in-memory `/tmp/wearwise.db` fallback seeded with existing data for testing/demo sessions.

### Step 5: Click Deploy! 🚀
Vercel will automatically build the Next.js pages and set up the Python Serverless functions. Once finished, click **"Continue to Dashboard"** or open your live production URL!

---

## 🌐 Method 2: Split Deployment (Separate Projects)

If you prefer deploying the Frontend and Backend as two separate projects in Vercel:

### 1. Deploy the Backend Project
1. In Vercel, click **Add New...** -> **Project** and select `WearWise`.
2. Name it `wearwise-backend`.
3. Set **Root Directory** to `backend`.
4. Add Environment Variables:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `SECRET_KEY`: Your JWT secret key
   - `DATABASE_URL`: Your PostgreSQL URL
5. Click **Deploy**. Copy the generated URL (e.g., `https://wearwise-backend.vercel.app`).

### 2. Deploy the Frontend Project
1. In Vercel, click **Add New...** -> **Project** and select `WearWise` again.
2. Name it `wearwise-frontend`.
3. Set **Root Directory** to `frontend`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://wearwise-backend.vercel.app` (your backend URL from step 1)
5. Click **Deploy**!

---

## 🗄️ Setting Up Free Cloud Database (Supabase / Neon)

Vercel serverless functions are ephemeral (instances shut down when inactive). To ensure your registered users, style preferences, uploaded wardrobe items, and saved outfits persist forever, connect a **free managed PostgreSQL database**:

### Using Supabase (Recommended - Free Tier)
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **"New Project"**, name it `wearwise`, and choose a database password.
3. Once created, go to **Project Settings** -> **Database**.
4. Under **Connection String**, select **URI** (or **Session Pooler**).
5. Copy the connection string (it looks like `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`).
6. Replace `[YOUR-PASSWORD]` with your real password.
7. Paste this as `DATABASE_URL` in your Vercel Environment Variables.

FastAPI will automatically create all required tables (`users`, `wardrobe_items`, `outfits`, `style_profiles`) upon the first request!

---

## 🛠️ Verification & Health Check

After deployment, verify that everything is running properly:

1. **Backend Health Check**:
   Open: `https://<your-vercel-domain>/health`
   Expected response:
   ```json
   {"status": "healthy"}
   ```

2. **Interactive API Documentation**:
   Open: `https://<your-vercel-domain>/docs`
   Swagger UI will open, allowing you to test endpoints directly.

3. **Frontend Application**:
   Open: `https://<your-vercel-domain>`
   - Sign up a new user or log in.
   - Go to **Wardrobe** -> Drag & drop a clothing photograph.
   - Verify that Google Gemini Vision AI tags the garment accurately.
   - Go to **AI Stylist** -> Chat with the AI stylist to receive wardrobe recommendations!

---

## 🛡️ Built-in Serverless Protections

WearWise includes production-grade optimizations specifically for Vercel:
- **Serverless Temp Storage**: Image uploads are written to `/tmp/wearwise_uploads` to prevent read-only filesystem crashes on AWS Lambda/Vercel.
- **Dynamic CORS**: All `*.vercel.app` preview branches and custom domains are allowed automatically without manual CORS configuration.
- **Smart Origin Detection**: Frontend auto-detects whether it's running locally on `localhost:8000` or deployed on the same Vercel domain with relative API paths.
- **Prefix Interceptor**: Backend routes work interchangeably with or without `/api/` prefix.
