# Smart Digital Service Operations

A base project for a service-operations console: log service requests (tickets),
route them to technicians, track status, and monitor SLA deadlines in real time —
all from a single-page dashboard styled like an ops control room.

## Features

- **Dashboard** with live counts: total requests, open, in progress, SLA at risk, SLA breached
- **Ticket queue** with filters (status, priority) and search by ID/title
- **Create requests** with category, priority, and an SLA target in hours
- **Ticket detail view**: change status, reassign technician, add activity-log notes
- **Live SLA countdowns** that color-shift as a deadline approaches or is breached
- Zero external database — data persists to a local JSON file (`data/tickets.json`),
  so the project runs immediately with no setup

## Tech Stack

- **Backend:** Node.js + Express (REST API)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework/build step required)
- **Storage:** JSON file (swap `db.js` for a real database later — Postgres, MongoDB, etc.)

## Getting Started

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

The first run seeds `data/tickets.json` with sample tickets. Delete that file at
any time to reset to the seed data.

## Project Structure

```
smart-digital-service-operations/
├── server.js          # Express app + REST API routes
├── db.js              # File-backed data store (read/write JSON)
├── package.json
├── data/
│   └── tickets.json   # Auto-created on first run
└── public/
    ├── index.html      # Dashboard markup
    ├── style.css        # Control-room themed styling
    └── app.js            # Frontend logic (fetch calls, rendering, modals)
```

## API Reference

| Method | Route                | Description                              |
|--------|-----------------------|-------------------------------------------|
| GET    | `/api/tickets`        | List tickets (`?status=&priority=&q=`)    |
| GET    | `/api/tickets/:id`    | Get one ticket                            |
| POST   | `/api/tickets`        | Create a ticket                           |
| PATCH  | `/api/tickets/:id`    | Update status, assignee, or add a note    |
| DELETE | `/api/tickets/:id`    | Delete a ticket                           |
| GET    | `/api/technicians`    | List technicians                          |
| GET    | `/api/stats`          | Dashboard summary stats                   |

**Create a ticket:**
```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Wi-Fi drops in Lab 4","category":"Network","priority":"High","slaHours":8}'
```

**Update a ticket:**
```bash
curl -X PATCH http://localhost:3000/api/tickets/SVC-1001 \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress","assignee":"T-01","note":"Dispatched technician."}'
```

## Extending This Base Project

This is intentionally a starting point. Natural next steps:
- Add authentication (roles: requester, technician, admin)
- Swap the JSON file store for Postgres/MySQL/MongoDB
- Add email or push notifications on SLA breach
- Add charts (ticket volume over time, resolution time by category)
- Add file attachments to tickets
