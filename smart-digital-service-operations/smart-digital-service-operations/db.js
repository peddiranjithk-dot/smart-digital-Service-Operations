/**
 * Lightweight file-backed data store.
 * Uses a JSON file instead of a database server, so the base project
 * runs immediately with zero external setup. Swap this module out for
 * a real database (Postgres, MongoDB, etc.) as the project grows.
 */
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "tickets.json");

function ensureStore() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      tickets: seedTickets(),
      technicians: [
        { id: "T-01", name: "A. Rao", team: "Network" },
        { id: "T-02", name: "S. Iyer", team: "Applications" },
        { id: "T-03", name: "M. Fernandes", team: "Field Ops" },
        { id: "T-04", name: "Unassigned", team: "-" }
      ]
    };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
}

function seedTickets() {
  const now = Date.now();
  const hrs = (h) => new Date(now - h * 3600 * 1000).toISOString();
  return [
    {
      id: "SVC-1001",
      title: "Core switch intermittent packet loss - Block C",
      category: "Network",
      priority: "Critical",
      status: "In Progress",
      assignee: "T-01",
      createdAt: hrs(3),
      updatedAt: hrs(1),
      slaHours: 4,
      log: [
        { at: hrs(3), note: "Ticket created from monitoring alert." },
        { at: hrs(1), note: "Assigned to A. Rao. Investigating uplink." }
      ]
    },
    {
      id: "SVC-1002",
      title: "ERP login failure for finance team",
      category: "Application",
      priority: "High",
      status: "Open",
      assignee: null,
      createdAt: hrs(2),
      updatedAt: hrs(2),
      slaHours: 8,
      log: [{ at: hrs(2), note: "Ticket created by user report." }]
    },
    {
      id: "SVC-1003",
      title: "Replace faulty badge reader - Gate 2",
      category: "Facilities",
      priority: "Medium",
      status: "Resolved",
      assignee: "T-03",
      createdAt: hrs(30),
      updatedAt: hrs(20),
      slaHours: 24,
      log: [
        { at: hrs(30), note: "Ticket created." },
        { at: hrs(26), note: "Technician dispatched." },
        { at: hrs(20), note: "Reader replaced and tested." }
      ]
    },
    {
      id: "SVC-1004",
      title: "Printer queue stuck on 3rd floor",
      category: "Hardware",
      priority: "Low",
      status: "Open",
      assignee: null,
      createdAt: hrs(5),
      updatedAt: hrs(5),
      slaHours: 48,
      log: [{ at: hrs(5), note: "Ticket created." }]
    },
    {
      id: "SVC-1005",
      title: "VPN certificate expiring for remote sales team",
      category: "Network",
      priority: "High",
      status: "In Progress",
      assignee: "T-02",
      createdAt: hrs(10),
      updatedAt: hrs(4),
      slaHours: 8,
      log: [
        { at: hrs(10), note: "Ticket created." },
        { at: hrs(4), note: "Renewing certificate, testing rollout." }
      ]
    }
  ];
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

module.exports = { readStore, writeStore };
