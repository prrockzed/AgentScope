# Hosting AgentScope for Free (Oracle Cloud)

This guide starts from zero — no Oracle account, nothing deployed — and walks you through hosting AgentScope completely free on Oracle Cloud's Always Free tier. Your code is already on GitHub, so that is our starting point.

---

## Port Map (No Conflicts)

AgentScope uses these **host** ports. They are chosen to not conflict with other projects sharing the same VM:

| Service    | Host Port | Container Port |
|------------|-----------|----------------|
| Frontend   | 13000     | 3000           |
| Backend    | 18080     | 8080           |
| Runtime    | 18000     | 8000           |
| PostgreSQL | 15432     | 5432           |
| Prometheus | 19090     | 9090           |
| Grafana    | 13001     | 3000           |

---

## Architecture

Two deployment options are described in this guide:

**Option A — Full Cloud (API keys only)**
```
Oracle VM
  ├── Frontend   (Next.js)  :13000
  ├── Backend    (Spring Boot) :18080
  ├── Runtime    (FastAPI + LangGraph) :18000
  ├── PostgreSQL :15432
  ├── Prometheus :19090
  └── Grafana    :13001

All LLM calls → Groq / OpenAI / Gemini (API keys in .env)
```

**Option B — Hybrid (Oracle cloud + your local Ollama)**
```
Oracle VM (same as above)
    │
    │ Tailscale VPN  (100.x.x.x:11434)
    │
Your Local Machine
  └── Ollama  :11434
```

Option B lets you run local models (llama3, mistral, etc.) for free without any API keys. The Oracle VM contacts your local machine's Ollama over a private VPN tunnel.

---

## Step 1 — Create an Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Sign up — credit card required for identity verification, but it is **never charged** for Always Free resources.
3. Choose a **Home Region** close to you. You cannot change this later. The Always Free Ampere A1 compute is available in all regions.
4. Complete email verification and sign in to the OCI Console.

---

## Step 2 — Create the VM Instance

1. In the OCI Console, go to **Compute → Instances → Create Instance**.
2. **Name**: `agentscope` (or anything you like)
3. **Image**: Ubuntu 22.04 (recommended — better Docker support than Oracle Linux)
4. **Shape**: Click "Change Shape" → Select **Ampere** → **VM.Standard.A1.Flex**
   - Set **OCPUs: 2** and **Memory: 12 GB**
   - This leaves 2 OCPU + 12 GB for your other project on the same 4 OCPU / 24 GB Always Free allocation.
5. **Networking**: Leave defaults (a new VCN will be created). Make sure "Assign a public IPv4 address" is **enabled**.
6. **SSH keys**: Upload your public key (`~/.ssh/id_rsa.pub`) or generate a new pair. Download the private key — you need it to SSH in.
7. Click **Create**. Wait ~2 minutes for the instance to reach Running state.
8. Copy the **Public IP address** from the instance details page. You will use this throughout this guide.

---

## Step 3 — Open Firewall Ports

Oracle has two layers of firewall: Security Lists (cloud-level) and iptables (OS-level). Both need to be updated.

### 3a. Oracle Security List

1. In the OCI Console, go to **Networking → Virtual Cloud Networks → your VCN → Security Lists → Default Security List**.
2. Click **Add Ingress Rules** and add one rule per port:

| Source CIDR | IP Protocol | Destination Port |
|-------------|-------------|-----------------|
| 0.0.0.0/0   | TCP         | 13000           |
| 0.0.0.0/0   | TCP         | 18080           |
| 0.0.0.0/0   | TCP         | 18000           |
| 0.0.0.0/0   | TCP         | 13001           |
| 0.0.0.0/0   | TCP         | 19090           |

> You do not need to expose port 15432 (PostgreSQL) unless you want external DB access — leave it closed.

### 3b. Ubuntu iptables (on the VM)

SSH into the VM first (see Step 4), then run:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 13000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 18080 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 18000 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 13001 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 19090 -j ACCEPT
sudo netfilter-persistent save
```

---

## Step 4 — Provision the VM

SSH in:
```bash
ssh -i ~/.ssh/your-private-key ubuntu@<YOUR_ORACLE_PUBLIC_IP>
```

Install Docker and Docker Compose:
```bash
# Update packages
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (no sudo needed for docker commands)
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 5 — Clone the Repository

```bash
git clone https://github.com/prrockzed/AgentScope.git
cd AgentScope
```

---

## Step 6 — Configure API Keys (Without Exposing Them)

Your docker-compose.yml reads API keys from environment variables using `${VAR:-}` syntax. The correct approach is to create a `.env` file **directly on the server** — this file is never committed to git (it is already in `.gitignore` or should be added).

```bash
# In the AgentScope directory on the Oracle VM:
nano .env
```

Paste your keys (only fill in the ones you have — everything is optional):
```
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

**Why this is safe:**
- `.env` is never pushed to GitHub — it only exists on the server.
- Even if someone reads your public repo, they see only `${GROQ_API_KEY:-}` — the actual key is only on your VM.
- You do not need to change any code. The docker-compose.yml already handles this correctly.

**If you do not have any API keys**, skip this step entirely and use only local Ollama models (Option B below).

---

## Step 7 — Deploy

The frontend in the repo uses a dev target (with hot-reload). For production on a server, create a production override file:

```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << 'EOF'
services:
  frontend:
    build:
      context: ./frontend
      target: runner
      args:
        NEXT_PUBLIC_API_URL: http://<YOUR_ORACLE_PUBLIC_IP>:18080
        NEXT_PUBLIC_WS_URL: ws://<YOUR_ORACLE_PUBLIC_IP>:18080
    environment:
      NEXT_PUBLIC_API_URL: http://<YOUR_ORACLE_PUBLIC_IP>:18080
      NEXT_PUBLIC_WS_URL: ws://<YOUR_ORACLE_PUBLIC_IP>:18080
EOF
```

Replace `<YOUR_ORACLE_PUBLIC_IP>` with your actual Oracle VM public IP.

> **Why `args` and not just `environment`**: `NEXT_PUBLIC_*` values are baked into the JavaScript bundle at build time by Next.js — they are not read at runtime. They must be passed as Docker build arguments (`args`) so Next.js can inline them during `npm run build`. The `environment` entries make the same values available as runtime env vars, which is harmless but not what Next.js reads.

> **Why no `volumes` entry**: The base `docker-compose.yml` frontend service has no volumes. Dev-only volumes (hot reload, `./frontend:/app` bind mount) live in `docker-compose.override.yml`, which Docker Compose loads automatically for local development but **ignores** when you pass explicit `-f` flags. The prod command uses explicit `-f` flags, so the override is never applied on the server.

Start everything:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Check that all containers are running:
```bash
docker compose ps
```

Check backend logs if something is wrong:
```bash
docker compose logs backend --tail=50
```

---

## Step 8 — Access the App

| Service    | URL                                          |
|------------|----------------------------------------------|
| Frontend   | `http://<YOUR_ORACLE_IP>:13000`              |
| Backend API| `http://<YOUR_ORACLE_IP>:18080/api`          |
| Grafana    | `http://<YOUR_ORACLE_IP>:13001` (admin/admin)|
| Prometheus | `http://<YOUR_ORACLE_IP>:19090`              |

Open the frontend URL in your browser and AgentScope should load fully.

---

## Option B — Hybrid: Oracle Backend + Your Local Ollama

This lets you run local models (llama3, mistral, deepseek, etc.) without any API keys. The Oracle VM's runtime container connects to Ollama running on your local machine over a private network.

### Why you cannot just use your local IP

The Oracle VM is on the internet — it cannot reach `localhost` on your laptop or a private LAN IP. You need a tunnel or VPN.

### Method 1 — Tailscale (Recommended)

Tailscale is free for personal use and creates a private VPN between any devices you own.

**On your local machine:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
Note the Tailscale IP shown (format: `100.x.x.x`).

Make sure Ollama is reachable on all interfaces (not just localhost):
```bash
# Add to ~/.bashrc or run before starting Ollama:
export OLLAMA_HOST=0.0.0.0
ollama serve
```

**On the Oracle VM:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

**Set the Ollama URL in your `.env` on Oracle:**
```
OLLAMA_BASE_URL=http://100.x.x.x:11434
```
Replace `100.x.x.x` with your local machine's Tailscale IP.

Restart the runtime container:
```bash
docker compose restart runtime
```

Now when you select an Ollama model in AgentScope, the Oracle runtime will call your local Ollama. No API keys needed.

### Method 2 — Cloudflare Tunnel (No account needed for quick use)

On your local machine:
```bash
# Install cloudflared
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install cloudflared

# Make Ollama listen on all interfaces
export OLLAMA_HOST=0.0.0.0
ollama serve &

# Create a temporary public tunnel
cloudflared tunnel --url http://localhost:11434
```

Cloudflared prints a public HTTPS URL like `https://random-words.trycloudflare.com`. Put this in your Oracle `.env`:
```
OLLAMA_BASE_URL=https://random-words.trycloudflare.com
```

> Note: The free trycloudflare.com URL changes every time you run the tunnel. Tailscale gives you a stable IP and is better for permanent setup.

---

## Deploying Updates After Code Changes

When you push new code to GitHub, the deployed version does **not** update automatically. You need to pull and rebuild on the Oracle VM.

SSH into the VM and run:
```bash
cd AgentScope
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Docker will only rebuild images whose source files changed. Unchanged services restart instantly from cache.

**What each command does:**
- `git pull` — fetches your latest code from GitHub
- `--build` — rebuilds Docker images for any service whose files changed
- `-d` — runs in detached (background) mode

**To check that the new version is running:**
```bash
docker compose ps
docker compose logs backend --tail=20
```

**To restart a single service without rebuilding everything:**
```bash
docker compose restart frontend
# or rebuild just one:
docker compose up --build -d backend
```

**Database migrations run automatically** on backend startup via Flyway. If you added a new migration (e.g., V20__...), it will apply itself when the backend container restarts after `git pull` + `up --build`.

---

## Stopping and Starting the Stack

```bash
# Stop all containers (data is preserved in volumes)
docker compose down

# Start again
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop and delete all data (volumes too) — use only if you want a clean slate
docker compose down -v
```

---

## Troubleshooting

**Frontend shows "Failed to fetch" or blank runs page**
- The frontend env vars `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` must point to the Oracle VM's public IP, not `localhost`. Make sure your `docker-compose.prod.yml` has the correct IP.

**Backend not starting**
- Check `docker compose logs backend`. Most likely cause is the database migration failing or the DB not being ready.
- Run `docker compose logs postgres` to check PostgreSQL status.

**Port already in use**
- Run `sudo ss -tlnp | grep <port>` to see what is using the port.
- If it is your other project, the AgentScope ports in this repo (13000, 18080, 18000, 13001, 19090, 15432) should not conflict.

**Ollama models not available in hybrid mode**
- Check that Ollama is running with `OLLAMA_HOST=0.0.0.0` on your local machine.
- Verify the Tailscale connection: from the Oracle VM, run `curl http://100.x.x.x:11434/api/tags`.
- Check runtime logs: `docker compose logs runtime --tail=30`.

**Out of disk space**
- Clean unused Docker layers: `docker system prune -f`
- Check disk usage: `df -h`
