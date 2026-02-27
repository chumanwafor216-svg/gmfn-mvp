\# GMFN Baseline Freeze v1



\## Canonical folders



\- Backend: gmfn\_backend

\- Frontend: frontend

\- Quarantine store: \_QUARANTINE\_STORE (do not use)



---



\## Start commands (STABLE)



\### Backend (Windows PowerShell recommended)



cd "C:\\Users\\chukwuma pc\\gmfn\_mvp\\gmfn\_backend"

$env:GMFN\_DEV\_MODE="1"

.\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info



---



\### Frontend



cd "C:\\Users\\chukwuma pc\\gmfn\_mvp\\frontend"

npm run dev -- --port 5173 --strictPort



---



\## Rules



1\. Never hardcode http://127.0.0.1:8000 in frontend.

2\. All API calls must be relative (e.g. /auth, /clans, /loans).

3\. Vite proxy handles backend routing.

4\. Do not modify folder structure without version bump.

5\. Do not use quarantined folders.



---



\## Status at Freeze



\- Auth working

\- Clans working

\- Pool working

\- Loans router restored

\- Guarantor inbox restored

\- Swagger reachable

\- No structural conflicts



FREEZE DATE: 27 Feb 2026

