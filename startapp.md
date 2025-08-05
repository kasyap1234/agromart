# Start the App (No Technical Skills Needed)

This guide helps you run Agromart on your computer without needing to write code. Follow the steps in order. If something fails, check the Troubleshooting section at the end.

What you will get
- A backend API running at http://localhost:8080
- A website (frontend) running at http://localhost:3000
- A ready account you can log in with:
  - Email: admin@example.com
  - Password: password

Prerequisites (install once)
1) Docker Desktop
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/
   - After installation, start Docker Desktop and keep it running.

2) Git (only if you need to download the project)
   - https://git-scm.com/downloads

3) Optional: A code editor such as VS Code to view files (not required to run).

Project layout (for awareness)
- docker-compose.dev.yml — starts the app for local testing
- apps/server — backend (Go)
- apps/client — frontend (Next.js)
- apps/server/sql/schema — database migrations

Quick start (recommended)
1) Open a terminal
   - macOS: Spotlight → “Terminal”
   - Windows: Command Prompt or PowerShell
   - Linux: Your preferred terminal

2) Go to the project folder
   Example:
   - macOS/Linux: cd /path/to/Agromart
   - Windows: cd C:\path\to\Agromart

3) Start everything
   Run this command:
   docker compose -f docker-compose.dev.yml up --build

   What this does:
   - Starts PostgreSQL database
   - Runs database setup (migrations)
   - Starts the backend API on port 8080
   - Starts the frontend website on port 3000

   First run can take a few minutes while Docker downloads images.

4) Open the app
   - Backend health: http://localhost:8080/health
     You should see a small JSON response saying the server is healthy.
   - Frontend website: http://localhost:3000
     You should see the login page.

5) Log in
   - Email: admin@example.com
   - Password: password

How to stop
- Press Ctrl + C in the terminal to stop.
- To fully remove containers and the local database files (reset to fresh state):
  docker compose -f docker-compose.dev.yml down -v

Common tasks
- See running services:
  docker compose -f docker-compose.dev.yml ps
- View backend logs:
  docker compose -f docker-compose.dev.yml logs -f backend
- View frontend logs:
  docker compose -f docker-compose.dev.yml logs -f frontend
- Rebuild after changes:
  docker compose -f docker-compose.dev.yml up --build

Troubleshooting
1) “This site can’t be reached” at http://localhost:3000
   - Cause: Frontend not started yet.
   - Fix: Ensure Docker Desktop is running, then in the project folder run:
     docker compose -f docker-compose.dev.yml up --build
   - Check logs:
     docker compose -f docker-compose.dev.yml logs --tail=200 frontend

2) Backend health check fails at http://localhost:8080/health
   - Cause: Backend still starting or database not ready.
   - Fix: Wait 30–60 seconds and refresh. The backend waits for the database and applies setup automatically.
   - See logs:
     docker compose -f docker-compose.dev.yml logs --tail=200 backend

3) Database version mismatch error
   - Symptom in logs: “The data directory was initialized by PostgreSQL version 15, which is not compatible with this version 17”
   - Fix (this resets local data):
     docker compose -f docker-compose.dev.yml down -v
     docker compose -f docker-compose.dev.yml up --build

4) Port already in use
   - Symptom: Errors mentioning port 3000 (frontend) or 8080 (backend) already used.
   - Fix: Close other apps using those ports, or change the ports in docker-compose.dev.yml, then run:
     docker compose -f docker-compose.dev.yml up --build

5) Slow first run or “pulling image” messages
   - Normal. Docker is downloading images. Subsequent runs will be faster.

Environment details (defaults)
- API URL: http://localhost:8080
- Frontend URL: http://localhost:3000
- Database: PostgreSQL
- JWT Secret: A sample value is set for local development in compose

Resetting admin password (if you changed it and forgot)
- Easiest: Reset your dev database:
  docker compose -f docker-compose.dev.yml down -v
  docker compose -f docker-compose.dev.yml up --build
- Then log in again with:
  Email: admin@example.com
  Password: password

Manual route checks (optional)
- Health:
  - Browser: http://localhost:8080/health
- Login via API (example using curl):
  curl -X POST http://localhost:8080/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@example.com","password":"password"}'

If you get stuck
- Ensure Docker Desktop is running and updated to the latest version.
- Re-run: docker compose -f docker-compose.dev.yml up --build
- Share the output of:
  docker compose -f docker-compose.dev.yml ps
  docker compose -f docker-compose.dev.yml logs --tail=200

Appendix: What the startup file does
- docker-compose.dev.yml creates three services:
  - db: PostgreSQL database (stores data on your machine)
  - backend: API server (applies database setup automatically, runs on 8080)
  - frontend: Website (runs on 3000 and talks to API 8080)
- The system creates a demo admin user automatically:
  - Email: admin@example.com
  - Password: password

You’re done! Keep the terminal open while testing. When finished, press Ctrl + C to stop.