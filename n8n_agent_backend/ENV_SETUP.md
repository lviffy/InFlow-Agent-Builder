# n8n Agent Backend — Environment Variables

> For a full project-wide reference covering all services, see [ENV_SETUP.md](../ENV_SETUP.md) at the project root.

This document covers every environment variable used specifically by the **n8n Agent Backend** (port 8000).

Copy `.env.example` to `.env` and fill in the values before running the service.

```bash
cp .env.example .env
```

---

## AI Providers

At least **one** provider (Groq or Gemini) must be configured. The service uses Groq as the primary and falls back to Gemini automatically when all Groq keys are rate-limited.

---

### `GROQ_API_KEY1` / `GROQ_API_KEY2` / `GROQ_API_KEY3`

| Field | Value |
|---|---|
| Required | At least one (unless Gemini is set) |
| Model used | `llama-3.3-70b-versatile` |
| Format | `gsk_...` (starts with `gsk_`) |

**What it does:** Groq is the primary LLM provider. The service holds up to three separate Groq keys and round-robins through them. When a key hits its rate limit (HTTP 429), the service automatically retries with the next key. Using multiple keys dramatically increases throughput for concurrent users.

**How to get it:**

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create API Key**, give it a name (e.g. `inflow-1`)
5. Copy the key — it is only shown once
6. Repeat steps 4–5 to create additional keys (`inflow-2`, `inflow-3`) for rate-limit resilience

> **Free tier:** Groq offers a generous free tier with per-minute and per-day token limits. Multiple keys created under the same account share the same quota — for higher limits, create keys under separate accounts or upgrade to a paid plan.

---

### `GEMINI_API_KEY`

| Field | Value |
|---|---|
| Required | Only if no Groq keys are set |
| Model used | `gemini-2.0-flash` |
| Format | `AIza...` (starts with `AIza`) |

**What it does:** Google Gemini acts as the fallback LLM. The service switches to Gemini when every Groq key is exhausted or unavailable and returns to Groq once keys recover.

**How to get it:**

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with a Google account
3. Click **Get API Key** → **Create API key in new project** (or select an existing project)
4. Copy the generated key

Alternatively via Google Cloud Console:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the **Generative Language API** for your project
3. Navigate to **APIs & Services → Credentials → Create Credentials → API key**

> **Free tier:** Gemini API has a free tier (rate-limited). For production usage, billing must be enabled on the Google Cloud project.

---

## Backend Service

### `BACKEND_URL`

| Field | Value |
|---|---|
| Required | No (defaults to `http://localhost:3000`) |
| Format | Full URL with protocol, no trailing slash |
| Example | `http://localhost:3000` or `https://api.inflow.example.com` |

**What it does:** The URL of the main InFlow Node.js backend. The AI agent calls this service to execute on-chain actions (transfers, deployments, balance checks, etc.) after the LLM determines what tools to invoke. All tool calls are proxied through this URL.

**How to set it:**

- **Local development:** Leave as the default `http://localhost:3000` (start the backend with `cd backend && node server.js`)
- **Docker Compose (same host):** Because the container uses `network_mode: host`, `http://localhost:3000` still works
- **Remote/production deployment:** Set to the full public URL of your deployed backend, e.g. `https://api.yourapp.com`

---

## Quick-start Minimal Config

For local development you only need one Groq key:

```env
GROQ_API_KEY1=gsk_your_key_here
BACKEND_URL=http://localhost:3000
```

For production with full rate-limit resilience:

```env
GROQ_API_KEY1=gsk_key_one
GROQ_API_KEY2=gsk_key_two
GROQ_API_KEY3=gsk_key_three
GEMINI_API_KEY=AIza_fallback_key
BACKEND_URL=https://api.yourapp.com
```

---

## Validation

The service validates configuration at startup and will refuse to start if no AI provider is configured:

```
ValueError: At least one of GROQ_API_KEY1-3 or GEMINI_API_KEY must be set
```

Successful startup logs:

```
✓ Groq client 1 initialized
✓ Groq client 2 initialized
✓ Total 2 Groq client(s) initialized (Primary)
✓ Gemini configured (Fallback)
```
