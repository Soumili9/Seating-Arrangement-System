# Seating Arrangement System

*Smart Examination Seating Management*

An internal tool for the Controller of Examinations' office that automates
examination seating allocation. Upload department and room-capacity data,
and generate a conflict-free seating plan in minutes, for a single
semester or a combined class test, with live analytics and a one-click
export to Excel.

## Features

- **Automated room allocation**: best-fit placement with a configurable
  minimum-split rule, so no allocation fragment is ever too small
- **Two allocation modes**: full semester allocation, or class-test mode
  pairing two year groups with a suggested optimal combination
- **Interactive results**: searchable, sortable, filterable results table
  with pagination
- **Live analytics dashboard**: room utilization, department-wise
  strength, and capacity-usage charts generated directly from the
  allocation data
- **Excel import/export**: reads existing department and room-capacity
  workbooks, exports a finished allotment sheet
- **Authentication**: gated behind office credentials, with a
  security-question password-recovery flow

## Tech stack

**Frontend**
- React 19
- TanStack Table (sortable/filterable results table)
- Recharts (analytics charts)
- Framer Motion (animations and transitions)
- Sonner (toast notifications)
- Lucide (icons)

**Backend**
- Flask (Python)
- pandas / openpyxl (Excel processing and allocation logic)
- Gunicorn (production WSGI server)

**Deployment**
- Frontend hosted on [Vercel](https://vercel.com)
- Backend hosted on [Render](https://render.com)

## Project structure

```
.
├── app.py                  # Flask backend / allocation API
├── requirements.txt        # Python dependencies
├── Procfile                 # Render start command
├── sample_department_data.xlsx
├── sample_room_data.xlsx
└── frontend/                # React application
    ├── public/
    └── src/
        ├── App.js
        └── components/
            ├── LandingPage.js
            ├── ResultsTable.js
            ├── AllocationCharts.js
            ├── ServerUnreachable.js
            └── SettingsModal.js
```

## Running locally

**Backend**
```bash
pip install -r requirements.txt
python app.py
```
Runs on `http://localhost:5000`.

**Frontend**
```bash
cd frontend
npm install
npm start
```
Runs on `http://localhost:3000` and talks to the backend above by default.

## Deployment

The backend deploys to Render using `gunicorn app:app`, reading `PORT` from
the environment. The frontend deploys to Vercel, configured with a
`REACT_APP_API_URL` environment variable pointing at the deployed backend's
`/api` endpoint.

## License

MIT. See [LICENSE](LICENSE).

## Developer

Soumili Chatterjee
