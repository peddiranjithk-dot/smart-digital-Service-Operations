const express = require("express");
const path = require("path");
const { readStore, writeStore } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const STATUSES = ["Open", "In Progress", "On Hold", "Resolved"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function nextTicketId(tickets) {
  const nums = tickets
    .map((t) => parseInt(t.id.replace("SVC-", ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `SVC-${max + 1}`;
}

// ---- Tickets ----

app.get("/api/tickets", (req, res) => {
  const { status, priority, category, q } = req.query;
  let { tickets } = readStore();

  if (status) tickets = tickets.filter((t) => t.status === status);
  if (priority) tickets = tickets.filter((t) => t.priority === priority);
  if (category) tickets = tickets.filter((t) => t.category === category);
  if (q) {
    const needle = q.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.id.toLowerCase().includes(needle)
    );
  }

  tickets = [...tickets].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(tickets);
});

app.get("/api/tickets/:id", (req, res) => {
  const { tickets } = readStore();
  const ticket = tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  res.json(ticket);
});

app.post("/api/tickets", (req, res) => {
  const { title, category, priority, slaHours, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required." });
  }
  if (priority && !PRIORITIES.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority." });
  }

  const store = readStore();
  const now = new Date().toISOString();
  const ticket = {
    id: nextTicketId(store.tickets),
    title: title.trim(),
    category: category || "General",
    priority: priority || "Medium",
    status: "Open",
    assignee: null,
    createdAt: now,
    updatedAt: now,
    slaHours: Number(slaHours) > 0 ? Number(slaHours) : 24,
    log: [
      {
        at: now,
        note: description && description.trim() ? description.trim() : "Ticket created."
      }
    ]
  };

  store.tickets.push(ticket);
  writeStore(store);
  res.status(201).json(ticket);
});

app.patch("/api/tickets/:id", (req, res) => {
  const { status, assignee, note } = req.body;
  const store = readStore();
  const ticket = store.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    ticket.status = status;
  }
  if (assignee !== undefined) ticket.assignee = assignee || null;

  const now = new Date().toISOString();
  ticket.updatedAt = now;
  if (note && note.trim()) {
    ticket.log.push({ at: now, note: note.trim() });
  } else if (status) {
    ticket.log.push({ at: now, note: `Status changed to ${status}.` });
  }

  writeStore(store);
  res.json(ticket);
});

app.delete("/api/tickets/:id", (req, res) => {
  const store = readStore();
  const idx = store.tickets.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Ticket not found." });
  store.tickets.splice(idx, 1);
  writeStore(store);
  res.status(204).end();
});

// ---- Technicians ----

app.get("/api/technicians", (req, res) => {
  const { technicians } = readStore();
  res.json(technicians);
});

// ---- Stats ----

app.get("/api/stats", (req, res) => {
  const { tickets } = readStore();
  const now = Date.now();

  const byStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tickets.filter((t) => t.status === s).length;
    return acc;
  }, {});

  const breached = tickets.filter((t) => {
    if (t.status === "Resolved") return false;
    const deadline = new Date(t.createdAt).getTime() + t.slaHours * 3600 * 1000;
    return now > deadline;
  }).length;

  const atRisk = tickets.filter((t) => {
    if (t.status === "Resolved") return false;
    const deadline = new Date(t.createdAt).getTime() + t.slaHours * 3600 * 1000;
    const remaining = deadline - now;
    return remaining > 0 && remaining < 2 * 3600 * 1000;
  }).length;

  res.json({
    total: tickets.length,
    byStatus,
    breached,
    atRisk,
    critical: tickets.filter((t) => t.priority === "Critical" && t.status !== "Resolved").length
  });
});

app.listen(PORT, () => {
  console.log(`Smart Digital Service Operations running at http://localhost:${PORT}`);
});
