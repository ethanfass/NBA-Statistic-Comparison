# NBA Player Comparison App

A React + Flask app for comparing NBA players by season and career. Search players, pick seasons, and view stats in tables and radar charts.

---

## Features

- Search for players with autocomplete
- Select seasons (e.g. 24-25)
- Side-by-side season averages with highlights
- Season and career radar charts (normalized)
- Career averages table
- Fallback player list if NBA API isn’t available

## Tech Stack

- Frontend: React, Recharts, CSS
- Backend: Flask (Python), Flask-CORS, pandas, nba_api

# Setup
## Backend

'''text
cd backend
pip install flask flask-cors nba_api pandas
python server.py
```
- Runs at http://127.0.0.1:5000

## Frontend

```text
cd frontend
npm install
npm start
```
- Opens at http://localhost:3000

## Notes

- Season format: YY-YY (e.g. 24-25)
- If you only see ~10 players, that’s the fallback list (full list needs NBA API access).
- Keep both backend and frontend running at the same time.
