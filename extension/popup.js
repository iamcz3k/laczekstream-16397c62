const SITE = "https://laczekstream.lovable.app";

const $ = (s) => document.querySelector(s);
let opts = { newtab: true, ctx: true };

function openUrl(path) {
  const url = path.startsWith("http") ? path : SITE + path;
  if (opts.newtab) chrome.tabs.create({ url });
  else chrome.tabs.update({ url });
}

// Tabs
document.querySelectorAll(".tab").forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    document.querySelectorAll(".pane").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    $("#pane-" + t.dataset.pane).classList.add("active");
    if (t.dataset.pane === "live") loadMatches();
  };
});

$("#search").onsubmit = (e) => {
  e.preventDefault();
  const v = $("#s").value.trim();
  if (v) openUrl(`/?q=${encodeURIComponent(v)}`);
};

document.querySelectorAll("[data-open]").forEach((b) => {
  b.onclick = () => openUrl(b.dataset.open);
});

async function loadMatches() {
  const box = $("#matches");
  box.innerHTML = '<div class="muted">Loading fixtures…</div>';
  try {
    const r = await fetch(`${SITE}/api/public/football-streams`);
    const j = await r.json();
    const list = (Array.isArray(j) ? j : j.matches || []).slice(0, 25);
    if (!list.length) { box.innerHTML = '<div class="muted">No fixtures right now.</div>'; return; }
    box.innerHTML = "";
    for (const m of list) {
      const b = document.createElement("button");
      b.className = "card";
      const when = m.date ? new Date(m.date).toLocaleString() : "";
      b.innerHTML = `${(m.title || "Match")}<small>${(m.category || "sport")} · ${when}</small>`;
      b.onclick = () => openUrl(`/?q=${encodeURIComponent(m.title || "")}&tab=football`);
      box.appendChild(b);
    }
  } catch {
    box.innerHTML = '<div class="muted">Could not load fixtures.</div>';
  }
}

function bindSwitch(id, key) {
  const el = $(id);
  el.onclick = () => {
    opts[key] = el.getAttribute("aria-checked") !== "true";
    el.setAttribute("aria-checked", String(opts[key]));
    chrome.storage.local.set({ opts });
  };
}
bindSwitch("#opt-newtab", "newtab");
bindSwitch("#opt-ctx", "ctx");

chrome.storage.local.get(["opts"], (data) => {
  opts = { ...opts, ...(data.opts || {}) };
  $("#opt-newtab").setAttribute("aria-checked", String(opts.newtab));
  $("#opt-ctx").setAttribute("aria-checked", String(opts.ctx));
  $("#status").textContent = "Ready";
});
