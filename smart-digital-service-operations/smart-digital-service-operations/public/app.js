const state = {
  tickets: [],
  technicians: [],
  filters: { status: "", priority: "", q: "" }
};

const el = (id) => document.getElementById(id);

// ===== Clock =====
function tickClock() {
  el("clock").textContent = new Date().toLocaleTimeString();
}
setInterval(tickClock, 1000);
tickClock();

// ===== Data loading =====
async function loadTechnicians() {
  const res = await fetch("/api/technicians");
  state.technicians = await res.json();
}

async function loadStats() {
  const res = await fetch("/api/stats");
  const stats = await res.json();
  el("statTotal").textContent = stats.total;
  el("statOpen").textContent = stats.byStatus["Open"] || 0;
  el("statProgress").textContent = stats.byStatus["In Progress"] || 0;
  el("statRisk").textContent = stats.atRisk;
  el("statBreach").textContent = stats.breached;
}

async function loadTickets() {
  const params = new URLSearchParams();
  if (state.filters.status) params.set("status", state.filters.status);
  if (state.filters.priority) params.set("priority", state.filters.priority);
  if (state.filters.q) params.set("q", state.filters.q);

  const res = await fetch(`/api/tickets?${params.toString()}`);
  state.tickets = await res.json();
  renderTickets();
}

async function refreshAll() {
  await Promise.all([loadStats(), loadTickets()]);
}

// ===== SLA helpers =====
function slaInfo(ticket) {
  const deadline = new Date(ticket.createdAt).getTime() + ticket.slaHours * 3600 * 1000;
  const remaining = deadline - Date.now();

  if (ticket.status === "Resolved") {
    return { label: "Closed", cls: "sla-done" };
  }
  if (remaining <= 0) {
    return { label: `Breached ${fmtDuration(-remaining)} ago`, cls: "sla-breach" };
  }
  if (remaining < 2 * 3600 * 1000) {
    return { label: `${fmtDuration(remaining)} left`, cls: "sla-risk" };
  }
  return { label: `${fmtDuration(remaining)} left`, cls: "sla-ok" };
}

function fmtDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function technicianName(id) {
  if (!id) return "Unassigned";
  const t = state.technicians.find((tt) => tt.id === id);
  return t ? t.name : id;
}

// ===== Rendering =====
function renderTickets() {
  const body = el("ticketBody");
  body.innerHTML = "";

  el("emptyState").hidden = state.tickets.length !== 0;

  for (const ticket of state.tickets) {
    const tr = document.createElement("tr");
    tr.addEventListener("click", () => openDetail(ticket.id));

    const sla = slaInfo(ticket);
    const statusClass = ticket.status.replace(/\s+/g, "-");

    tr.innerHTML = `
      <td class="col-id">${ticket.id}</td>
      <td class="col-title">
        <div class="ticket-title">${escapeHtml(ticket.title)}</div>
      </td>
      <td>${escapeHtml(ticket.category)}</td>
      <td><span class="pill pill-priority-${ticket.priority}">${ticket.priority}</span></td>
      <td>
        <span class="status-wrap">
          <span class="status-dot ${statusClass}"></span>
          ${ticket.status}
        </span>
      </td>
      <td><span class="sla-timer ${sla.cls}">${sla.label}</span></td>
      <td class="assignee">${technicianName(ticket.assignee)}</td>
    `;
    body.appendChild(tr);
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// Re-render SLA countdowns every 30s without a full refetch
setInterval(() => { if (state.tickets.length) renderTickets(); }, 30000);

// ===== New ticket modal =====
el("openNewTicket").addEventListener("click", () => {
  el("newTicketBackdrop").hidden = false;
});
el("closeNewTicket").addEventListener("click", closeNewTicket);
el("cancelNewTicket").addEventListener("click", closeNewTicket);
el("newTicketBackdrop").addEventListener("click", (e) => {
  if (e.target === el("newTicketBackdrop")) closeNewTicket();
});

function closeNewTicket() {
  el("newTicketBackdrop").hidden = true;
  el("newTicketForm").reset();
}

el("newTicketForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const payload = {
    title: form.title.value,
    category: form.category.value,
    priority: form.priority.value,
    slaHours: form.slaHours.value,
    description: form.description.value
  };

  const res = await fetch("/api/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    closeNewTicket();
    await refreshAll();
  } else {
    const err = await res.json();
    alert(err.error || "Could not create the ticket.");
  }
});

// ===== Detail modal =====
async function openDetail(id) {
  const res = await fetch(`/api/tickets/${id}`);
  if (!res.ok) return;
  const ticket = await res.json();
  renderDetail(ticket);
  el("detailBackdrop").hidden = false;
}

el("closeDetail").addEventListener("click", () => { el("detailBackdrop").hidden = true; });
el("detailBackdrop").addEventListener("click", (e) => {
  if (e.target === el("detailBackdrop")) el("detailBackdrop").hidden = true;
});

function renderDetail(ticket) {
  el("detailTitle").textContent = `${ticket.id} · ${ticket.title}`;
  const sla = slaInfo(ticket);

  const statusOptions = ["Open", "In Progress", "On Hold", "Resolved"]
    .map((s) => `<option value="${s}" ${s === ticket.status ? "selected" : ""}>${s}</option>`)
    .join("");

  const techOptions = ['<option value="">Unassigned</option>']
    .concat(
      state.technicians
        .filter((t) => t.id !== "T-04")
        .map((t) => `<option value="${t.id}" ${t.id === ticket.assignee ? "selected" : ""}>${t.name} — ${t.team}</option>`)
    )
    .join("");

  const logHtml = [...ticket.log]
    .reverse()
    .map(
      (entry) => `
      <div class="log-entry">
        <div class="log-time">${new Date(entry.at).toLocaleString()}</div>
        <div>${escapeHtml(entry.note)}</div>
      </div>`
    )
    .join("");

  el("detailBody").innerHTML = `
    <div class="detail-meta">
      <div><div class="k">Category</div><div class="v">${escapeHtml(ticket.category)}</div></div>
      <div><div class="k">Priority</div><div class="v"><span class="pill pill-priority-${ticket.priority}">${ticket.priority}</span></div></div>
      <div><div class="k">SLA</div><div class="v sla-timer ${sla.cls}">${sla.label}</div></div>
    </div>

    <div class="detail-controls">
      <select id="statusSelect">${statusOptions}</select>
      <select id="assigneeSelect">${techOptions}</select>
    </div>

    <p class="log-title">Activity Log</p>
    <div id="logList">${logHtml}</div>

    <form class="note-form" id="noteForm">
      <input type="text" id="noteInput" placeholder="Add a status note…" />
      <button type="submit" class="btn btn-primary">Add</button>
    </form>
  `;

  el("statusSelect").addEventListener("change", (e) => updateTicket(ticket.id, { status: e.target.value }));
  el("assigneeSelect").addEventListener("change", (e) => updateTicket(ticket.id, { assignee: e.target.value }));
  el("noteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const note = el("noteInput").value.trim();
    if (!note) return;
    await updateTicket(ticket.id, { note });
    openDetail(ticket.id);
  });
}

async function updateTicket(id, patch) {
  const res = await fetch(`/api/tickets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (res.ok) {
    const updated = await res.json();
    renderDetail(updated);
    await refreshAll();
  }
}

// ===== Filters =====
document.querySelectorAll("[data-filter-status]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-filter-status]").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    state.filters.status = btn.dataset.filterStatus;
    loadTickets();
  });
});

el("priorityFilter").addEventListener("change", (e) => {
  state.filters.priority = e.target.value;
  loadTickets();
});

let searchDebounce;
el("searchInput").addEventListener("input", (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.filters.q = e.target.value.trim();
    loadTickets();
  }, 250);
});

// ===== Nav (view titles only — single-page dashboard keeps the queue visible) =====
const viewCopy = {
  dashboard: { title: "Operations Dashboard", sub: "Live status across all active service requests." },
  queue: { title: "Ticket Queue", sub: "Full manifest of logged service requests." },
  technicians: { title: "Technicians", sub: "Team assignment reference." }
};

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const copy = viewCopy[btn.dataset.view];
    el("viewTitle").textContent = copy.title;
    el("viewSub").textContent = copy.sub;
  });
});

// ===== Init =====
(async function init() {
  await loadTechnicians();
  await refreshAll();
  setInterval(refreshAll, 15000);
})();
