const DATA_PATHS = {
  overallTarget: "../Targets/overall_target_sheet_pm_2026.csv",
  monthlyProgramSource: "../overalll targets/03_overall_monthly_program_source_targets.csv",
  revisedFunnel: "../revised plan 2026/program_monthly_funnel_plan_2026.csv",
  scripts: [
    {
      program: "Residential Campus",
      path: "../marketing scripts/program_Residential_Campus/program_Residential_Campus_hindi/program_Residential_Campus_hindi_hinglish_20_30s_script_bank.csv",
    },
    {
      program: "Sprint Hospitality",
      path: "../marketing scripts/program_SPRINT_Certification_Hospitality/program_SPRINT_Certification_Hospitality_hindi/program_SPRINT_Certification_Hospitality_hindi_hinglish_20_30s_script_bank.csv",
    },
    {
      program: "SMART BVOC Hospitality",
      path: "../marketing scripts/program_SMART_BVOC_Hospitality/program_SMART_BVOC_Hospitality_hindi/program_SMART_BVOC_Hospitality_hindi_hinglish_20_30s_script_bank.csv",
    },
  ],
};

const state = {
  overallTarget: [],
  monthlyProgramSource: [],
  revisedFunnel: [],
  scripts: [],
  filters: {
    month: "All",
    program: "All",
    source: "All",
    scriptProgram: "All",
    scriptSearch: "",
  },
};

const nf = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const cf = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function parseCSV(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"') {
      if (inQuotes && n === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      row.push(cur);
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && n === "\n") i++;
      row.push(cur);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.length || row.length) {
    row.push(cur);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function fmtNum(v) {
  return nf.format(Math.round(n(v)));
}

function fmtCurrency(v) {
  return cf.format(n(v));
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))];
}

async function loadCSV(path) {
  const res = await fetch(encodeURI(path));
  if (!res.ok) throw new Error(`Failed: ${path}`);
  return parseCSV(await res.text());
}

function el(id) {
  return document.getElementById(id);
}

function setStatus(msg, good = true) {
  const node = el("loadStatus");
  node.textContent = msg;
  node.style.background = good ? "#eaf6ef" : "#fde7e7";
  node.style.color = good ? "#1f6a43" : "#8a1f1f";
  node.style.borderColor = good ? "#b9e5c8" : "#f0b8b8";
}

function renderCards(containerId, cards) {
  const root = el(containerId);
  root.innerHTML = cards
    .map(
      (c) =>
        `<article class="kpi"><div class="label">${c.label}</div><div class="value">${c.value}</div></article>`
    )
    .join("");
}

function renderBars(containerId, rows, valueFormatter = fmtNum) {
  const root = el(containerId);
  if (!rows.length) {
    root.innerHTML = "<p>No data for selected filters.</p>";
    return;
  }
  const maxVal = Math.max(...rows.map((r) => n(r.value)), 1);
  root.innerHTML = rows
    .map((r) => {
      const pct = (n(r.value) / maxVal) * 100;
      return `<div class="bar-row">
        <div class="bar-label" title="${r.label}">${r.label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(2)}%"></div></div>
        <div class="bar-val">${valueFormatter(r.value)}</div>
      </div>`;
    })
    .join("");
}

function renderTable(tableId, rows, columns, maxRows = 300) {
  const table = el(tableId);
  if (!rows.length) {
    table.innerHTML = "<thead><tr><th>No data</th></tr></thead>";
    return;
  }
  const show = rows.slice(0, maxRows);
  const head = `<thead><tr>${columns.map((c) => `<th>${c}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${show
    .map((r) => `<tr>${columns.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  table.innerHTML = head + body;
}

function drawLineChart(svgId, labels, series) {
  const svg = el(svgId);
  const w = 900;
  const h = 320;
  const pad = { top: 24, right: 20, bottom: 52, left: 60 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const values = series.flatMap((s) => s.values).map((v) => n(v));
  const maxY = Math.max(...values, 1);

  const xStep = labels.length > 1 ? cw / (labels.length - 1) : cw;
  const x = (i) => pad.left + i * xStep;
  const y = (v) => pad.top + ch - (n(v) / maxY) * ch;

  const parts = [];

  for (let i = 0; i <= 4; i++) {
    const gy = pad.top + (ch / 4) * i;
    const gv = Math.round(maxY - (maxY / 4) * i);
    parts.push(`<line x1="${pad.left}" y1="${gy}" x2="${w - pad.right}" y2="${gy}" stroke="#eadfce" stroke-width="1"/>`);
    parts.push(`<text x="${pad.left - 8}" y="${gy + 4}" text-anchor="end" font-size="10" fill="#6e6355">${fmtNum(gv)}</text>`);
  }

  labels.forEach((lbl, i) => {
    parts.push(`<text x="${x(i)}" y="${h - 24}" text-anchor="middle" font-size="10" fill="#6e6355">${lbl}</text>`);
  });

  series.forEach((s) => {
    const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
    parts.push(`<path d="${d}" fill="none" stroke="${s.color}" stroke-width="3"/>`);
    s.values.forEach((v, i) => {
      parts.push(`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${s.color}"/>`);
    });
  });

  parts.push(`<rect x="${pad.left}" y="${pad.top}" width="${cw}" height="${ch}" fill="none" stroke="#dfcfb6" stroke-width="1"/>`);

  let lx = pad.left;
  const ly = 14;
  series.forEach((s) => {
    parts.push(`<rect x="${lx}" y="${ly - 8}" width="10" height="10" fill="${s.color}" rx="2"/>`);
    parts.push(`<text x="${lx + 15}" y="${ly}" font-size="11" fill="#5e513f">${s.name}</text>`);
    lx += 120;
  });

  svg.innerHTML = parts.join("");
}

function setFilterOptions(selectId, options) {
  const select = el(selectId);
  const val = select.value;
  select.innerHTML = ["All", ...options].map((o) => `<option value="${o}">${o}</option>`).join("");
  if (["All", ...options].includes(val)) select.value = val;
}

function byFilter(row, key, value) {
  return value === "All" || (row[key] ?? "") === value;
}

function refreshOverview() {
  const rows = state.overallTarget.filter((r) => !/^total$/i.test((r.Program || "").trim()));
  const totalEnr = rows.reduce((s, r) => s + n(r["Enrolments (Overall)"]), 0);
  const pmEnr = rows.reduce((s, r) => s + n(r["Enrolment by PM"]), 0);
  const totalPmBudget = rows.reduce((s, r) => s + n(r["PM Budget (Pre GST)"]), 0);
  const totalBookings = rows.reduce((s, r) => s + n(r["Bookings"]), 0);
  const totalRevenue = rows.reduce((s, r) => s + n(r["Emversity Revenue"]), 0);

  renderCards("overviewCards", [
    { label: "Programs", value: fmtNum(rows.length) },
    { label: "Total Enrollments", value: fmtNum(totalEnr) },
    { label: "PM Enrollments", value: fmtNum(pmEnr) },
    { label: "PM Budget", value: fmtCurrency(totalPmBudget) },
    { label: "Emversity Revenue", value: fmtCurrency(totalRevenue) },
  ]);

  renderBars(
    "programBudgetBars",
    rows.map((r) => ({ label: r.Program, value: n(r["PM Budget (Pre GST)"]) })).sort((a, b) => b.value - a.value),
    fmtCurrency
  );

  renderBars(
    "programEnrollBars",
    rows.map((r) => ({ label: r.Program, value: n(r["Enrolment by PM"]) })).sort((a, b) => b.value - a.value),
    fmtNum
  );

  const tableRows = [
    ...rows,
    {
      Program: "TOTAL",
      "Enrolments (Overall)": fmtNum(totalEnr),
      "% Contribution of PM": "",
      "Enrolment by PM": fmtNum(pmEnr),
      AOV: "",
      Bookings: fmtCurrency(totalBookings),
      "Emversity Revenue %": "",
      "Emversity Revenue": fmtCurrency(totalRevenue),
      "Budgeted CAC (PM)": "",
      "PM Budget (Pre GST)": fmtCurrency(totalPmBudget),
    },
  ];

  renderTable("overallTable", tableRows, [
    "Program",
    "Enrolments (Overall)",
    "% Contribution of PM",
    "Enrolment by PM",
    "AOV",
    "Bookings",
    "Emversity Revenue %",
    "Emversity Revenue",
    "Budgeted CAC (PM)",
    "PM Budget (Pre GST)",
  ]);
}

function refreshFunnel() {
  const f = state.filters;
  const rows = state.monthlyProgramSource.filter(
    (r) => byFilter(r, "month", f.month) && byFilter(r, "program", f.program) && byFilter(r, "source", f.source)
  );

  const spend = rows.reduce((s, r) => s + n(r.spend), 0);
  const leads = rows.reduce((s, r) => s + n(r.target_leads), 0);
  const appt = rows.reduce((s, r) => s + n(r.target_appointments), 0);
  const demos = rows.reduce((s, r) => s + n(r.target_demos), 0);
  const enr = rows.reduce((s, r) => s + n(r.target_enrollments), 0);
  const cpl = leads > 0 ? spend / leads : 0;

  renderCards("funnelCards", [
    { label: "Spend", value: fmtCurrency(spend) },
    { label: "Leads", value: fmtNum(leads) },
    { label: "Appointments", value: fmtNum(appt) },
    { label: "Demos", value: fmtNum(demos) },
    { label: "Enrollments", value: fmtNum(enr) },
  ]);

  const sourceAgg = uniq(rows.map((r) => r.source)).map((source) => ({
    label: source,
    value: rows.filter((r) => r.source === source).reduce((s, r) => s + n(r.spend), 0),
  }));
  renderBars("sourceBars", sourceAgg.sort((a, b) => b.value - a.value), fmtCurrency);

  const monthly = uniq(rows.map((r) => `${n(r.month_no)}|${r.month}`))
    .sort((a, b) => n(a.split("|")[0]) - n(b.split("|")[0]))
    .map((x) => ({ key: x, month: x.split("|")[1] }));

  const labels = monthly.map((m) => m.month);
  const spendSeries = monthly.map((m) => rows.filter((r) => `${n(r.month_no)}|${r.month}` === m.key).reduce((s, r) => s + n(r.spend), 0));
  const enrollSeries = monthly.map((m) => rows.filter((r) => `${n(r.month_no)}|${r.month}` === m.key).reduce((s, r) => s + n(r.target_enrollments), 0));

  drawLineChart("trendChart", labels.length ? labels : ["-"], [
    { name: "Spend", values: labels.length ? spendSeries : [0], color: "#7a2e10" },
    { name: "Enrollments", values: labels.length ? enrollSeries : [0], color: "#2f6ca3" },
  ]);

  renderTable(
    "funnelTable",
    rows.map((r) => ({
      month: r.month,
      program: r.program,
      source: r.source,
      spend: fmtCurrency(r.spend),
      target_leads: fmtNum(r.target_leads),
      target_appointments: fmtNum(r.target_appointments),
      target_demos: fmtNum(r.target_demos),
      target_enrollments: fmtNum(r.target_enrollments),
      target_cpl: fmtCurrency(r.target_cpl),
    })),
    [
      "month",
      "program",
      "source",
      "spend",
      "target_leads",
      "target_appointments",
      "target_demos",
      "target_enrollments",
      "target_cpl",
    ]
  );
}

function refreshProgramView() {
  const f = state.filters;
  const rows = state.revisedFunnel.filter((r) => byFilter(r, "month", f.month) && byFilter(r, "program", f.program));

  const budget = rows.reduce((s, r) => s + n(r.monthly_budget), 0);
  const leads = rows.reduce((s, r) => s + n(r.target_leads), 0);
  const appt = rows.reduce((s, r) => s + n(r.target_appointments), 0);
  const demos = rows.reduce((s, r) => s + n(r.target_demos), 0);
  const enr = rows.reduce((s, r) => s + n(r.target_enrollments), 0);

  renderCards("programCards", [
    { label: "Monthly Budget", value: fmtCurrency(budget) },
    { label: "Leads", value: fmtNum(leads) },
    { label: "Appointments", value: fmtNum(appt) },
    { label: "Demos", value: fmtNum(demos) },
    { label: "Enrollments", value: fmtNum(enr) },
  ]);

  const monthly = uniq(rows.map((r) => r.month));
  const ordered = state.revisedFunnel
    .map((r) => r.month)
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .filter((m) => monthly.includes(m));

  const budgetSeries = ordered.map((m) => rows.filter((r) => r.month === m).reduce((s, r) => s + n(r.monthly_budget), 0));
  const enrollSeries = ordered.map((m) => rows.filter((r) => r.month === m).reduce((s, r) => s + n(r.target_enrollments), 0));

  drawLineChart("programTrendChart", ordered.length ? ordered : ["-"], [
    { name: "Budget", values: ordered.length ? budgetSeries : [0], color: "#7a2e10" },
    { name: "Enrollments", values: ordered.length ? enrollSeries : [0], color: "#2f6ca3" },
  ]);

  renderBars(
    "funnelMixBars",
    [
      { label: "Leads", value: leads },
      { label: "Appointments", value: appt },
      { label: "Demos", value: demos },
      { label: "Enrollments", value: enr },
    ],
    fmtNum
  );

  renderTable(
    "programTable",
    rows.map((r) => ({
      month: r.month,
      program: r.program,
      monthly_budget: fmtCurrency(r.monthly_budget),
      google_spend: fmtCurrency(r.google_spend),
      meta_spend: fmtCurrency(r.meta_spend),
      target_leads: fmtNum(r.target_leads),
      target_appointments: fmtNum(r.target_appointments),
      target_demos: fmtNum(r.target_demos),
      target_enrollments: fmtNum(r.target_enrollments),
      blended_lead_to_enroll_rate: `${(n(r.blended_lead_to_enroll_rate) * 100).toFixed(2)}%`,
    })),
    [
      "month",
      "program",
      "monthly_budget",
      "google_spend",
      "meta_spend",
      "target_leads",
      "target_appointments",
      "target_demos",
      "target_enrollments",
      "blended_lead_to_enroll_rate",
    ]
  );
}

function refreshScripts() {
  const f = state.filters;
  let rows = state.scripts.filter((r) => byFilter(r, "program_name", f.scriptProgram));

  if (f.scriptSearch) {
    const q = f.scriptSearch.toLowerCase();
    rows = rows.filter((r) =>
      [r.angle, r.hook, r.problem, r.solution, r.proof, r.cta, r.full, r.usp_tags, r.target_segment]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const avgWords = rows.length ? rows.reduce((s, r) => s + n(r.word_count), 0) / rows.length : 0;

  renderCards("scriptCards", [
    { label: "Scripts", value: fmtNum(rows.length) },
    { label: "Avg Word Count", value: avgWords.toFixed(1) },
    { label: "Unique Angles", value: fmtNum(uniq(rows.map((r) => r.angle)).length) },
    { label: "Unique Emotions", value: fmtNum(uniq(rows.map((r) => r.primary_emotion)).length) },
    { label: "Unique Segments", value: fmtNum(uniq(rows.map((r) => r.target_segment)).length) },
  ]);

  const angleAgg = uniq(rows.map((r) => r.angle))
    .map((a) => ({ label: a, value: rows.filter((r) => r.angle === a).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  renderBars("angleBars", angleAgg, fmtNum);

  const bins = ["50-59", "60-64", "65-69", "70+"];
  const wcAgg = bins.map((b) => {
    let c = 0;
    rows.forEach((r) => {
      const w = n(r.word_count);
      if (b === "50-59" && w >= 50 && w <= 59) c++;
      if (b === "60-64" && w >= 60 && w <= 64) c++;
      if (b === "65-69" && w >= 65 && w <= 69) c++;
      if (b === "70+" && w >= 70) c++;
    });
    return { label: b, value: c };
  });
  renderBars("wordCountBars", wcAgg, fmtNum);

  renderTable(
    "scriptsTable",
    rows.map((r) => ({
      program_name: r.program_name,
      script_id: r.script_id,
      angle: r.angle,
      hook: r.hook,
      cta: r.cta,
      word_count: r.word_count,
      primary_emotion: r.primary_emotion,
      usp_tags: r.usp_tags,
      target_segment: r.target_segment,
    })),
    [
      "program_name",
      "script_id",
      "angle",
      "hook",
      "cta",
      "word_count",
      "primary_emotion",
      "usp_tags",
      "target_segment",
    ],
    500
  );
}

function refreshAll() {
  refreshOverview();
  refreshFunnel();
  refreshProgramView();
  refreshScripts();
}

function initTabs() {
  const tabs = [...document.querySelectorAll(".tab")];
  const filtersPanel = document.querySelector(".filters");
  const toggleScriptFilters = (activeTab) => {
    filtersPanel.classList.toggle("show-scripts", activeTab === "scripts");
  };

  const initialActive = tabs.find((t) => t.classList.contains("active"))?.dataset.tab || "overview";
  toggleScriptFilters(initialActive);

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ["overview", "funnel", "programs", "scripts"].forEach((name) => {
        el(`${name}Tab`).classList.toggle("active", name === btn.dataset.tab);
      });
      toggleScriptFilters(btn.dataset.tab);
    });
  });
}

function initFilters() {
  const onFilter = () => {
    state.filters.month = el("monthFilter").value;
    state.filters.program = el("programFilter").value;
    state.filters.source = el("sourceFilter").value;
    state.filters.scriptProgram = el("scriptProgramFilter").value;
    state.filters.scriptSearch = el("scriptSearch").value.trim();
    refreshAll();
  };

  ["monthFilter", "programFilter", "sourceFilter", "scriptProgramFilter"].forEach((id) => {
    el(id).addEventListener("change", onFilter);
  });
  el("scriptSearch").addEventListener("input", onFilter);

  setFilterOptions("monthFilter", uniq(state.monthlyProgramSource.map((r) => r.month)));
  setFilterOptions("programFilter", uniq(state.monthlyProgramSource.map((r) => r.program)));
  setFilterOptions("sourceFilter", uniq(state.monthlyProgramSource.map((r) => r.source)));
  setFilterOptions("scriptProgramFilter", uniq(state.scripts.map((r) => r.program_name)));
}

async function init() {
  try {
    const [overallTarget, monthlyProgramSource, revisedFunnel] = await Promise.all([
      loadCSV(DATA_PATHS.overallTarget),
      loadCSV(DATA_PATHS.monthlyProgramSource),
      loadCSV(DATA_PATHS.revisedFunnel),
    ]);

    const scriptData = await Promise.all(
      DATA_PATHS.scripts.map(async (entry) => {
        const rows = await loadCSV(entry.path);
        return rows.map((r) => ({ ...r, program_name: entry.program }));
      })
    );

    state.overallTarget = overallTarget;
    state.monthlyProgramSource = monthlyProgramSource;
    state.revisedFunnel = revisedFunnel;
    state.scripts = scriptData.flat();

    initTabs();
    initFilters();
    refreshAll();

    setStatus("Data loaded. Dashboard ready.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to load data. Run from local server (http://localhost).", false);
  }
}

init();
