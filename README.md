# Live Task Board

A beginner-friendly, shared task board with instant updates across browser tabs. Create, edit, delete, and move tasks between **To do**, **In progress**, and **Done**. Includes a Live/Disconnected indicator and connected-user count.

## Stack
- **Frontend:** React 18, Vite, Axios, Socket.IO client, plain CSS
- **Backend:** Node.js, Express, pg (parameterized SQL), Redis client, Socket.IO
- **Persistence:** PostgreSQL 16; **cache:** Redis 7 (cache-aside, 60-second TTL)
- **Tests:** Jest, Supertest, Socket.IO client

## Prerequisites
Node.js 20+ with npm, Docker Desktop (or running PostgreSQL and Redis), Git. Ports 5173, 4000, 5432, 6379 must be available.

## Setup
From the repository root:
```bash
docker compose up -d
docker compose ps
```
Open a **backend terminal**:
```bash
cd backend
npm install
cp .env.example .env
npm run db:init
npm run dev
```
On Windows PowerShell use `copy .env.example .env`. Expect `Database initialized` and `Server running on http://localhost:4000`. Visit `http://localhost:4000/api/health`; expect `{"status":"ok","db":"up","redis":"up"}`.

Open a **second terminal** from the repository root:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Open **http://localhost:5173**. Expect the board and a **Live · 1 user online** indicator.

## Tests
Keep PostgreSQL and Redis running. Initialize the schema first; stop the backend dev server if desired. In `backend/` run:
```bash
npm test
```
The tests cover health, create/validation, list/cache, update/validation, delete/404 and a WebSocket broadcast. Test-created records are cleaned up. Redis is optional at runtime, but must be running to demonstrate `X-Cache: HIT`.

Build the frontend in `frontend/` with `npm run build`.

## Demonstrate real-time updates
Open `http://localhost:5173` in two tabs. Both should show **2 users online**. Add a task in one tab: it appears in the other without refreshing. Edit its title or status, then delete it; both tabs update. Close one tab and the other shows **1 user online**. Open DevTools → Network → WS to inspect Socket.IO frames.

## Demonstrate Redis caching
Use Postman or curl:
```bash
curl -i http://localhost:4000/api/tasks
curl -i http://localhost:4000/api/tasks
```
Expect first response `X-Cache: MISS` and second `X-Cache: HIT` (within 60 seconds). Create/update/delete a task and the next GET returns `MISS` again. Check TTL with `docker compose exec redis redis-cli TTL tasks:all`. Redis outages cause PostgreSQL fallback, not task API failure.

## Architecture
React → Express REST API → PostgreSQL. GET task list checks Redis before PostgreSQL; writes invalidate Redis. After successful writes, Socket.IO broadcasts the task change to all clients. The frontend applies events directly to local state and refetches on reconnection.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `ECONNREFUSED 5432` | Run `docker compose up -d`; check `docker compose ps`. |
| PostgreSQL password failure | Match `DATABASE_URL` in `backend/.env` to database credentials. |
| `relation tasks does not exist` | Run `npm run db:init` inside `backend/`. |
| Redis connection errors | Start Redis; the API can still operate with PostgreSQL. |
| `EADDRINUSE 4000` | Stop the old backend process or change `PORT` and `VITE_API_URL`. |
| Browser CORS error | Set backend `CLIENT_URL=http://localhost:5173` and restart. |
| Disconnected indicator | Check backend process, port and frontend `VITE_API_URL`. |
| `npm` not recognized | Install Node.js LTS and restart the terminal. |
| Jest hangs | Ensure no other process or test run is holding open sockets; tests close their own resources. |

## Repository layout
```text
live-task-board/
├── docker-compose.yml
├── .gitignore
├── API.md
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── db/schema.sql
│   ├── scripts/initDb.js
│   ├── tests/tasks.test.js
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── socket.js
│       ├── config/db.js
│       ├── config/redis.js
│       └── routes/tasks.js
└── frontend/
    ├── .env.example
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── socket.js
        ├── styles.css
        └── components/
            ├── TaskForm.jsx
            ├── TaskList.jsx
            ├── TaskItem.jsx
            └── ConnectionStatus.jsx
```

## Publishing to GitHub
Create an empty GitHub repository, then run from the project root:
```bash
git init
git add .
git status
git commit -m "Build Live Task Board"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/live-task-board.git
git push -u origin main
```
Check that `.env` and `node_modules` are absent from `git status`. The included `.env.example` values are local development defaults, not production credentials. Change credentials before any public deployment.

See [API.md](API.md) for endpoints, examples, status codes and WebSocket payloads.
