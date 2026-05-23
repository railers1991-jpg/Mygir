"use strict";

(function () {
  const I18N = window.MYGIR_I18N;
  const STORE = window.MYGIR_STORE;
  const CLOUD = window.MYGIR_CLOUD;
  const CURRENT_KEY = "mygir_current";

  const el = (id) => document.getElementById(id);

  let companies = [];
  let currentCompanyId = null;
  let authMode = "login";
  let plan = "free";
  let historyDocs = [];

  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function isOverdue(d) {
    return d.status !== "paid" && d.dueDate && d.dueDate < todayISO();
  }

  const FREE_MAX_COMPANIES = 1;
  const FREE_MAX_INVOICES = 5;

  function cloudOn() { return CLOUD && CLOUD.enabled() && !!CLOUD.currentUser(); }
  function isPro() { return plan === "pro"; }
  function currentCompany() { return companies.find((c) => c.id === currentCompanyId) || null; }

  const TITLES = {
    en: { invoice: "INVOICE", quote: "QUOTE" },
    ru: { invoice: "СЧЁТ", quote: "СМЕТА" },
  };
  const NUM_PREFIX = { invoice: "INV-", quote: "QUO-" };
  function numPrefix(type) {
    const s = settings || {};
    return type === "quote" ? (s.quotePrefix || "QUO-") : (s.invoicePrefix || "INV-");
  }

  let settings = STORE.getSettings();
  let doc = loadCurrent();

  /* ============ Helpers ============ */
  function pad(n) { return String(n).padStart(4, "0"); }

  function blankDoc() {
    const num = STORE.nextNumber();
    return {
      id: null,
      docType: "invoice",
      status: "draft",
      template: settings.template || "modern",
      accentColor: settings.accentColor || "#2563eb",
      logo: "",
      fromName: "",
      fromDetails: "",
      toName: "",
      toDetails: "",
      number: numPrefix("invoice") + pad(num),
      currency: settings.currency || "USD",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      taxLabel: settings.taxLabel || "VAT",
      paymentUrl: "",
      discountValue: "",
      discountType: "percent",
      notes: "",
      items: [{ desc: "", qty: 1, price: 0, tax: 0 }],
    };
  }

  function loadCurrent() {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return blankDoc();
  }
  function persistCurrent() {
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(doc)); } catch (e) {}
  }

  function formatMoney(n) {
    const val = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat(I18N.locale(), { style: "currency", currency: doc.currency || "USD" }).format(val);
    } catch (e) {
      return val.toFixed(2);
    }
  }
  function formatDate(v) {
    if (!v) return "—";
    try { return new Date(v).toLocaleDateString(I18N.locale()); } catch (e) { return v; }
  }
  function formatCur(n, cur) {
    try { return new Intl.NumberFormat(I18N.locale(), { style: "currency", currency: cur || "USD" }).format(n || 0); }
    catch (e) { return (n || 0).toFixed(2); }
  }

  function toast(msg) {
    const t = el("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.add("hidden"), 1800);
  }

  /* ============ i18n application ============ */
  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const val = I18N.t(node.getAttribute("data-i18n"));
      if (node.childElementCount > 0) {
        // Element wraps child controls (e.g. <label>Text <input></label>):
        // only update the leading text node so the controls are preserved.
        let textNode = node.firstChild;
        while (textNode && textNode.nodeType !== 3) textNode = textNode.nextSibling;
        if (textNode) textNode.nodeValue = val;
        else node.insertBefore(document.createTextNode(val), node.firstChild);
      } else {
        node.textContent = val;
      }
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((node) => {
      node.setAttribute("placeholder", I18N.t(node.getAttribute("data-i18n-ph")));
    });
    document.documentElement.lang = I18N.getLang();
    el("langToggle").textContent = I18N.getLang().toUpperCase();
  }

  /* ============ Line items form ============ */
  function renderItems() {
    const c = el("itemsContainer");
    c.innerHTML = "";

    const head = document.createElement("div");
    head.className = "item-head";
    head.innerHTML =
      `<span>${I18N.t("desc")}</span><span>${I18N.t("qty")}</span>` +
      `<span>${I18N.t("price")}</span><span>${I18N.t("tax")}</span><span></span>`;
    c.appendChild(head);

    doc.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "item-row";

      const desc = document.createElement("input");
      desc.type = "text";
      desc.placeholder = I18N.t("item_desc_ph");
      desc.value = item.desc;
      desc.addEventListener("input", () => { item.desc = desc.value; update(); });

      const qty = mkNum(item.qty, "1", (v) => { item.qty = v; });
      const price = mkNum(item.price, "0.01", (v) => { item.price = v; });
      const tax = mkNum(item.tax, "0.01", (v) => { item.tax = v; });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-item";
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        doc.items.splice(index, 1);
        if (doc.items.length === 0) doc.items.push({ desc: "", qty: 1, price: 0, tax: 0 });
        renderItems();
        update();
      });

      row.append(desc, qty, price, tax, remove);
      c.appendChild(row);
    });
  }
  function mkNum(value, step, onChange) {
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.step = step;
    inp.value = value;
    inp.addEventListener("input", () => { onChange(parseFloat(inp.value) || 0); update(); });
    return inp;
  }

  /* ============ Totals ============ */
  function calcTotals() {
    let subtotal = 0, tax = 0;
    doc.items.forEach((it) => {
      const line = (it.qty || 0) * (it.price || 0);
      subtotal += line;
      tax += line * ((it.tax || 0) / 100);
    });
    const dVal = parseFloat(doc.discountValue) || 0;
    let discount = 0;
    if (dVal > 0) discount = doc.discountType === "percent" ? subtotal * (dVal / 100) : dVal;
    return { subtotal, tax, discount, total: subtotal + tax - discount };
  }

  /* ============ Read inputs -> doc ============ */
  function syncFromInputs() {
    doc.docType = el("docType").value;
    doc.status = el("docStatus").value;
    doc.accentColor = el("accentColor").value;
    doc.fromName = el("fromName").value;
    doc.fromDetails = el("fromDetails").value;
    doc.toName = el("toName").value;
    doc.toDetails = el("toDetails").value;
    doc.number = el("invoiceNumber").value;
    doc.currency = el("currency").value;
    doc.issueDate = el("issueDate").value;
    doc.dueDate = el("dueDate").value;
    doc.taxLabel = el("taxLabel").value;
    doc.paymentUrl = el("paymentUrl").value;
    doc.discountValue = el("discountValue").value;
    doc.discountType = el("discountType").value;
    doc.notes = el("notes").value;
  }

  /* ============ doc -> inputs ============ */
  function fillInputs() {
    el("docType").value = doc.docType;
    el("docStatus").value = doc.status;
    el("accentColor").value = doc.accentColor;
    el("fromName").value = doc.fromName;
    el("fromDetails").value = doc.fromDetails;
    el("toName").value = doc.toName;
    el("toDetails").value = doc.toDetails;
    el("invoiceNumber").value = doc.number;
    el("currency").value = doc.currency;
    el("issueDate").value = doc.issueDate;
    el("dueDate").value = doc.dueDate;
    el("taxLabel").value = doc.taxLabel;
    el("paymentUrl").value = doc.paymentUrl || "";
    el("discountValue").value = doc.discountValue;
    el("discountType").value = doc.discountType;
    el("notes").value = doc.notes;
    setActiveTemplate(doc.template);
    el("convertBtn").classList.toggle("hidden", doc.docType !== "quote");
    renderItems();
  }

  function setActiveTemplate(tpl) {
    doc.template = tpl;
    document.querySelectorAll(".tpl-chip").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-tpl") === tpl);
    });
  }

  /* ============ Render preview ============ */
  function setText(id, value) { el(id).textContent = value; }

  function renderPreview() {
    document.documentElement.style.setProperty("--accent", doc.accentColor);

    const inv = el("invoice");
    inv.className = "invoice tpl-" + (doc.template || "modern");

    // Logo
    const logo = el("pvLogo");
    if (doc.logo) { logo.src = doc.logo; logo.classList.remove("hidden"); el("removeLogo").classList.remove("hidden"); }
    else { logo.classList.add("hidden"); el("removeLogo").classList.add("hidden"); }

    // Title / status
    setText("pvTitle", (TITLES[I18N.getLang()] || TITLES.en)[doc.docType]);
    el("paidStamp").classList.toggle("hidden", doc.status !== "paid");

    setText("pvFromName", doc.fromName || I18N.t("from_name_ph"));
    setText("pvFromDetails", doc.fromDetails);
    setText("pvInvoiceNumber", doc.number);
    setText("pvBillToLabel", I18N.t("bill_to"));
    setText("pvToName", doc.toName || I18N.t("to_name_ph"));
    setText("pvToDetails", doc.toDetails);
    setText("pvIssuedLabel", I18N.t("issued"));
    setText("pvDueLabel", I18N.t("due"));
    setText("pvIssueDate", formatDate(doc.issueDate));
    setText("pvDueDate", formatDate(doc.dueDate));

    setText("thDesc", I18N.t("desc"));
    setText("thQty", I18N.t("qty"));
    setText("thPrice", I18N.t("price"));
    setText("thTax", I18N.t("tax"));
    setText("thAmount", I18N.t("amount"));

    const tbody = el("pvItems");
    tbody.innerHTML = "";
    doc.items.forEach((it) => {
      const line = (it.qty || 0) * (it.price || 0);
      const tr = document.createElement("tr");
      [it.desc || "—", String(it.qty || 0), formatMoney(it.price || 0), (it.tax || 0) + "%", formatMoney(line)]
        .forEach((c, i) => {
          const td = document.createElement("td");
          td.textContent = c;
          if (i > 0) td.className = "col-num";
          tr.appendChild(td);
        });
      tbody.appendChild(tr);
    });

    const t = calcTotals();
    setText("pvSubtotalLabel", I18N.t("subtotal"));
    setText("pvTotalLabel", I18N.t("total"));
    setText("pvSubtotal", formatMoney(t.subtotal));
    setText("pvTaxLabel", doc.taxLabel || I18N.t("tax").replace(" %", ""));
    setText("pvTax", formatMoney(t.tax));
    setText("pvTotal", formatMoney(t.total));

    if (t.discount > 0) {
      el("pvDiscountRow").classList.remove("hidden");
      setText("pvDiscountLabel", I18N.t("discount"));
      setText("pvDiscount", "-" + formatMoney(t.discount));
    } else {
      el("pvDiscountRow").classList.add("hidden");
    }

    if (doc.paymentUrl && /^https?:\/\//i.test(doc.paymentUrl)) {
      el("pvPayBlock").classList.remove("hidden");
      const link = el("pvPayLink");
      link.href = doc.paymentUrl;
      link.textContent = I18N.t("pay_now");
    } else {
      el("pvPayBlock").classList.add("hidden");
    }

    if (doc.notes && doc.notes.trim()) {
      el("pvNotesBlock").classList.remove("hidden");
      setText("pvNotesLabel", I18N.t("sec_notes"));
      setText("pvNotes", doc.notes);
    } else {
      el("pvNotesBlock").classList.add("hidden");
    }

    const convert = el("convertBtn");
    if (convert) convert.classList.toggle("hidden", doc.docType !== "quote");
  }

  function update() {
    syncFromInputs();
    renderPreview();
    persistCurrent();
  }

  /* ============ Views / tabs ============ */
  function switchView(name) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    el("view-" + name).classList.add("active");
    if (name === "history") renderHistory();
    if (name === "clients") renderClients();
    if (name === "profile") renderProfile();
    if (name === "dashboard") renderDashboard();
    if (name === "expenses") renderExpenses();
  }

  /* ============ Dashboard / analytics ============ */
  function invoiceTax(d) {
    let tax = 0;
    (d.items || []).forEach((it) => { tax += (it.qty || 0) * (it.price || 0) * ((it.tax || 0) / 100); });
    return tax;
  }

  async function renderDashboard() {
    const host = el("dashboardContent");
    host.innerHTML = "";
    let docs, expenses;
    try {
      docs = cloudOn() ? (currentCompanyId ? await CLOUD.listInvoices(currentCompanyId) : []) : STORE.getInvoices();
      expenses = await getExpenseList();
    } catch (e) {
      host.innerHTML = `<div class="empty-state">${escapeHtml(e.message || String(e))}</div>`;
      return;
    }

    const from = el("dashFrom").value, to = el("dashTo").value;
    const inRange = (dateStr) => {
      const dt = (dateStr || "").slice(0, 10);
      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    };
    docs = docs.filter((d) => inRange(d.issueDate));
    expenses = (expenses || []).filter((x) => inRange(x.date));

    // Visit counter (signed-in only; whole-site, ignores date filter)
    if (cloudOn()) {
      try {
        const v = await CLOUD.getViewStats();
        const vis = document.createElement("div");
        vis.className = "dash-cards";
        vis.appendChild(card(I18N.t("dash_visits_total"), String(v.total), "accent"));
        vis.appendChild(card(I18N.t("dash_visits_today"), String(v.today)));
        host.appendChild(vis);
      } catch (e) { /* counter table may not exist yet — ignore */ }
    }

    if (!docs.length && !expenses.length) {
      host.innerHTML += `<div class="empty-state">${I18N.t("dash_empty")}</div>`;
      return;
    }

    const byCur = {};
    const clientsSet = new Set();
    function grp(cur) {
      return byCur[cur] || (byCur[cur] = { invoiced: 0, paid: 0, outstanding: 0, tax: 0, expenses: 0, count: 0, monthly: {}, clients: {} });
    }
    docs.forEach((d) => {
      const cur = d.currency || "USD";
      const total = invoiceTotal(d);
      const g = grp(cur);
      g.invoiced += total; g.count += 1; g.tax += invoiceTax(d);
      if (d.status === "paid") g.paid += total; else g.outstanding += total;
      const m = (d.issueDate || "").slice(0, 7);
      if (m) g.monthly[m] = (g.monthly[m] || 0) + total;
      const cname = (d.toName || "").trim();
      if (cname) { g.clients[cname] = (g.clients[cname] || 0) + total; clientsSet.add(cname); }
    });
    expenses.forEach((x) => { grp(x.currency || "USD").expenses += (parseFloat(x.amount) || 0); });

    // Top counters (currency-agnostic)
    const counters = document.createElement("div");
    counters.className = "dash-cards";
    counters.appendChild(card(I18N.t("dash_documents"), String(docs.length)));
    counters.appendChild(card(I18N.t("dash_clients"), String(clientsSet.size)));
    host.appendChild(counters);

    // Per-currency blocks, dominant first
    Object.keys(byCur).sort((a, b) => byCur[b].count - byCur[a].count).forEach((cur) => {
      const g = byCur[cur];
      const tag = document.createElement("div");
      tag.className = "dash-cur-tag";
      tag.textContent = cur;
      host.appendChild(tag);

      const cards = document.createElement("div");
      cards.className = "dash-cards";
      cards.appendChild(card(I18N.t("dash_invoiced"), formatCur(g.invoiced, cur), "accent"));
      cards.appendChild(card(I18N.t("dash_paid"), formatCur(g.paid, cur), "good"));
      cards.appendChild(card(I18N.t("dash_outstanding"), formatCur(g.outstanding, cur), "warn"));
      cards.appendChild(card(I18N.t("dash_tax"), formatCur(g.tax, cur)));
      cards.appendChild(card(I18N.t("dash_expenses"), formatCur(g.expenses, cur), "warn"));
      cards.appendChild(card(I18N.t("dash_profit"), formatCur(g.paid - g.expenses, cur), "good"));
      host.appendChild(cards);

      // Monthly bar chart (last 6 months present)
      const months = Object.keys(g.monthly).sort();
      if (months.length) {
        const recent = months.slice(-6);
        const max = Math.max.apply(null, recent.map((m) => g.monthly[m]));
        const sec = document.createElement("div");
        sec.className = "dash-section";
        const h = document.createElement("h3");
        h.textContent = I18N.t("dash_by_month");
        sec.appendChild(h);
        const chart = document.createElement("div");
        chart.className = "bar-chart";
        recent.forEach((m) => {
          const colEl = document.createElement("div");
          colEl.className = "bar-col";
          const v = document.createElement("div");
          v.className = "bar-val";
          v.textContent = Math.round(g.monthly[m]);
          const bar = document.createElement("div");
          bar.className = "bar";
          bar.style.height = (max > 0 ? Math.max(2, (g.monthly[m] / max) * 100) : 2) + "%";
          const lab = document.createElement("div");
          lab.className = "bar-label";
          lab.textContent = monthLabel(m);
          colEl.append(v, bar, lab);
          chart.appendChild(colEl);
        });
        sec.appendChild(chart);
        host.appendChild(sec);
      }

      // Top clients
      const top = Object.keys(g.clients).map((n) => ({ n, v: g.clients[n] })).sort((a, b) => b.v - a.v).slice(0, 5);
      if (top.length) {
        const sec = document.createElement("div");
        sec.className = "dash-section";
        const h = document.createElement("h3");
        h.textContent = I18N.t("dash_top_clients");
        sec.appendChild(h);
        const listEl = document.createElement("div");
        listEl.className = "top-list";
        top.forEach((t) => {
          const row = document.createElement("div");
          row.className = "top-row";
          row.innerHTML = `<span class="name">${escapeHtml(t.n)}</span><span class="amt">${formatCur(t.v, cur)}</span>`;
          listEl.appendChild(row);
        });
        sec.appendChild(listEl);
        host.appendChild(sec);
      }
    });
  }

  function card(label, value, cls) {
    const d = document.createElement("div");
    d.className = "dash-card" + (cls ? " " + cls : "");
    d.innerHTML = `<div class="label"></div><div class="value"></div>`;
    d.querySelector(".label").textContent = label;
    d.querySelector(".value").textContent = value;
    return d;
  }
  function monthLabel(m) {
    try { return new Date(m + "-01").toLocaleDateString(I18N.locale(), { month: "short", year: "2-digit" }); }
    catch (e) { return m; }
  }

  /* ============ Expenses ============ */
  async function getExpenseList() {
    if (cloudOn()) return currentCompanyId ? await CLOUD.listExpenses(currentCompanyId) : [];
    return STORE.getExpenses();
  }
  async function renderExpenses() {
    const list = el("expensesList");
    list.innerHTML = "";
    if (!el("expDate").value) el("expDate").value = todayISO();
    let exps;
    try { exps = await getExpenseList(); }
    catch (e) { list.innerHTML = `<div class="empty-state">${escapeHtml(e.message || String(e))}</div>`; return; }
    if (!exps.length) { list.innerHTML = `<div class="empty-state">${I18N.t("expenses_empty")}</div>`; return; }
    exps.forEach((x) => {
      const rec = document.createElement("div");
      rec.className = "record";
      rec.innerHTML =
        `<div class="record-main">
           <div class="record-title">${escapeHtml(x.description || "—")}</div>
           <div class="record-sub">${escapeHtml(x.date || "")}</div>
         </div>
         <span class="record-amount">${formatCur(parseFloat(x.amount) || 0, x.currency)}</span>`;
      rec.append(mkBtn(I18N.t("col_delete"), "link-btn", async () => {
        if (!confirm(I18N.t("confirm_delete"))) return;
        if (cloudOn()) { try { await CLOUD.deleteExpense(x.id); } catch (e) { alert(e.message || e); return; } }
        else STORE.deleteExpense(x.id);
        renderExpenses();
      }));
      list.appendChild(rec);
    });
  }
  async function addExpense() {
    const amount = parseFloat(el("expAmount").value) || 0;
    const exp = {
      date: el("expDate").value || todayISO(),
      description: el("expDesc").value,
      amount: amount,
      currency: el("expCurrency").value,
    };
    if (!amount && !exp.description.trim()) return;
    try {
      if (cloudOn()) {
        if (!currentCompanyId) { toast(I18N.t("login_required_cloud")); return; }
        await CLOUD.saveExpense(currentCompanyId, exp);
      } else {
        STORE.saveExpense(exp);
      }
      el("expDesc").value = ""; el("expAmount").value = "";
      renderExpenses();
      toast(I18N.t("toast_saved"));
    } catch (e) { alert(e.message || e); }
  }

  function convertToInvoice() {
    if (doc.docType !== "quote") return;
    doc.docType = "invoice";
    doc.id = null; doc.publicId = ""; doc.isPublic = false;
    doc.status = "draft";
    doc.number = numPrefix("invoice") + pad(STORE.nextNumber());
    fillInputs(); update();
    toast(I18N.t("convert_to_invoice"));
  }

  function renderProfile() {
    el("profileEmail").textContent = (cloudOn() && CLOUD.currentUser().email) || "—";
    el("setLanguage").value = settings.language || "en";
    el("setTheme").value = settings.theme || "light";
    el("invoicePrefix").value = settings.invoicePrefix || "INV-";
    el("quotePrefix").value = settings.quotePrefix || "QUO-";
    renderPlan();
    renderCompanies();
  }

  /* ============ Companies + auth (cloud) ============ */
  function applyCompanyToDoc() {
    const co = currentCompany();
    if (!co) return;
    doc.fromName = co.name || "";
    const lines = [co.address, co.email, co.phone, co.tax_id].filter(Boolean);
    doc.fromDetails = lines.join("\n");
    if (co.accent_color) doc.accentColor = co.accent_color;
    if (!doc.paymentUrl && co.payment_url) doc.paymentUrl = co.payment_url;
  }

  async function loadCompanies() {
    if (!cloudOn()) { companies = []; currentCompanyId = null; return; }
    companies = await CLOUD.listCompanies();
    const saved = STORE.getSettings().lastCompanyId;
    if (saved && companies.some((c) => c.id === saved)) currentCompanyId = saved;
    else currentCompanyId = companies.length ? companies[0].id : null;
  }

  function populateCompanySwitcher() {
    const sel = el("companySwitcher");
    if (!cloudOn() || companies.length === 0) { sel.classList.add("hidden"); return; }
    sel.classList.remove("hidden");
    sel.innerHTML = "";
    companies.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id; o.textContent = c.name || "—";
      if (c.id === currentCompanyId) o.selected = true;
      sel.appendChild(o);
    });
  }

  function renderCompanies() {
    const list = el("companiesList");
    const hint = el("companiesLoginHint");
    const form = el("companyForm");
    if (!cloudOn()) {
      hint.classList.remove("hidden");
      form.classList.add("hidden");
      el("addCompany").classList.add("hidden");
      list.innerHTML = "";
      return;
    }
    hint.classList.add("hidden");
    el("addCompany").classList.remove("hidden");
    list.innerHTML = "";
    if (companies.length === 0) {
      list.innerHTML = `<div class="empty-state">${I18N.t("companies_empty")}</div>`;
      return;
    }
    companies.forEach((c) => {
      const rec = document.createElement("div");
      rec.className = "record";
      rec.innerHTML =
        `<div class="record-main">
           <div class="record-title">${escapeHtml(c.name || "—")}</div>
           <div class="record-sub">${escapeHtml(c.tax_id || c.email || "")}</div>
         </div>`;
      if (c.id === currentCompanyId) {
        const b = document.createElement("span");
        b.className = "badge paid"; b.textContent = "✓";
        rec.appendChild(b);
      }
      const useBtn = document.createElement("button");
      useBtn.className = "secondary-btn small";
      useBtn.textContent = I18N.getLang() === "ru" ? "Выбрать" : "Select";
      useBtn.addEventListener("click", () => selectCompany(c.id));
      const editBtn = document.createElement("button");
      editBtn.className = "secondary-btn small";
      editBtn.textContent = I18N.t("col_load");
      editBtn.addEventListener("click", () => openCompanyForm(c));
      const del = document.createElement("button");
      del.className = "link-btn";
      del.textContent = I18N.t("col_delete");
      del.addEventListener("click", async () => {
        if (!confirm(I18N.t("confirm_delete"))) return;
        try { await CLOUD.deleteCompany(c.id); } catch (e) { alert(e.message || e); return; }
        await loadCompanies(); populateCompanySwitcher(); renderCompanies();
      });
      rec.append(useBtn, editBtn, del);
      list.appendChild(rec);
    });
  }

  function selectCompany(id) {
    currentCompanyId = id;
    const s = STORE.getSettings(); s.lastCompanyId = id; STORE.saveSettings(s);
    populateCompanySwitcher();
    applyCompanyToDoc(); fillInputs(); update();
    renderCompanies();
  }

  function openCompanyForm(c) {
    el("companyForm").classList.remove("hidden");
    el("companyId").value = c ? c.id : "";
    el("companyName").value = c ? (c.name || "") : "";
    el("companyTaxId").value = c ? (c.tax_id || "") : "";
    el("companyPhone").value = c ? (c.phone || "") : "";
    el("companyEmail").value = c ? (c.email || "") : "";
    el("companyAddress").value = c ? (c.address || "") : "";
    el("companyPaymentUrl").value = c ? (c.payment_url || "") : "";
  }

  async function saveCompanyForm() {
    const name = el("companyName").value.trim();
    if (!name) return;
    const id = el("companyId").value;
    if (!id && !isPro()) {
      let existing = companies;
      try { existing = await CLOUD.listCompanies(); } catch (e) {}
      if (existing.length >= FREE_MAX_COMPANIES) { openUpgrade("limit_companies"); return; }
    }
    const payload = {
      name,
      tax_id: el("companyTaxId").value || null,
      phone: el("companyPhone").value || null,
      email: el("companyEmail").value || null,
      address: el("companyAddress").value || null,
      payment_url: el("companyPaymentUrl").value || null,
    };
    if (id) payload.id = id;
    try {
      const saved = await CLOUD.saveCompany(payload);
      await loadCompanies();
      if (!id) currentCompanyId = saved.id;
      const s = STORE.getSettings(); s.lastCompanyId = currentCompanyId; STORE.saveSettings(s);
      el("companyForm").classList.add("hidden");
      populateCompanySwitcher(); renderCompanies();
      toast(I18N.t("toast_saved"));
    } catch (e) { alert(e.message || e); }
  }

  function openUpgrade(reasonKey) {
    if (reasonKey) toast(I18N.t(reasonKey));
    el("upgradeModal").classList.remove("hidden");
  }
  function closeUpgrade() { el("upgradeModal").classList.add("hidden"); }

  function renderPlan() {
    const fs = el("planFieldset");
    if (!cloudOn()) { fs.classList.add("hidden"); return; }
    fs.classList.remove("hidden");
    el("planValue").textContent = I18N.t(isPro() ? "plan_pro" : "plan_free");
    el("upgradeBtn").classList.toggle("hidden", isPro());
  }

  function openAuth() {
    authMode = "login";
    syncAuthModal();
    el("authError").classList.add("hidden");
    const configured = CLOUD && CLOUD.isConfigured();
    el("authForm").classList.toggle("hidden", !configured);
    el("authNotConfigured").classList.toggle("hidden", configured);
    el("authModal").classList.remove("hidden");
  }
  function closeAuth() { el("authModal").classList.add("hidden"); }
  function syncAuthModal() {
    const reg = authMode === "register";
    el("authTitle").textContent = I18N.t(reg ? "auth_register_title" : "auth_login_title");
    el("authSubmit").textContent = I18N.t(reg ? "auth_submit_register" : "auth_submit_login");
    el("authToggle").textContent = I18N.t(reg ? "auth_have_account" : "auth_no_account");
  }
  async function submitAuth() {
    const email = el("authEmail").value.trim();
    const password = el("authPassword").value;
    const err = el("authError");
    err.classList.add("hidden");
    if (!email || !password) return;
    try {
      if (authMode === "register") {
        await CLOUD.signUp(email, password);
        toast(I18N.t("auth_check_email"));
        authMode = "login"; syncAuthModal();
      } else {
        await CLOUD.signIn(email, password);
        closeAuth();
        await refreshAuthUI();
      }
    } catch (e) {
      err.textContent = e.message || String(e);
      err.classList.remove("hidden");
    }
  }

  async function refreshAuthUI() {
    const btn = el("accountBtn");
    if (cloudOn()) {
      btn.textContent = CLOUD.currentUser().email || I18N.t("account");
      try { plan = await CLOUD.getPlan(); } catch (e) { plan = "free"; }
      await loadCompanies();
      populateCompanySwitcher();
      if (currentCompanyId) applyCompanyToDoc();
      fillInputs(); update();
    } else {
      btn.textContent = I18N.t("sign_in");
      plan = "free";
      companies = []; currentCompanyId = null;
      el("companySwitcher").classList.add("hidden");
    }
    renderPlan();
    populateClientPicker();
  }

  /* ============ History ============ */
  async function renderHistory() {
    const list = el("historyList");
    list.innerHTML = "";
    try {
      historyDocs = cloudOn() ? (currentCompanyId ? await CLOUD.listInvoices(currentCompanyId) : []) : STORE.getInvoices();
    } catch (e) {
      historyDocs = [];
      list.innerHTML = `<div class="empty-state">${escapeHtml(e.message || String(e))}</div>`;
      return;
    }
    renderHistoryList();
  }

  function renderHistoryList() {
    const list = el("historyList");
    list.innerHTML = "";
    const q = (el("historySearch").value || "").trim().toLowerCase();
    const f = el("historyFilter").value;

    const docs = historyDocs.filter((d) => {
      if (q) {
        const hay = ((d.number || "") + " " + (d.toName || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (f === "overdue") return isOverdue(d);
      if (f) return (d.status || "draft") === f;
      return true;
    });

    if (historyDocs.length === 0) {
      list.innerHTML = `<div class="empty-state">${I18N.t("history_empty")}</div>`;
      return;
    }
    if (docs.length === 0) {
      list.innerHTML = `<div class="empty-state">—</div>`;
      return;
    }

    docs.forEach((d) => {
      const total = invoiceTotal(d);
      const overdue = isOverdue(d);
      const badgeCls = overdue ? "overdue" : (d.status || "draft");
      const badgeTxt = overdue ? I18N.t("status_overdue") : I18N.t("status_" + (d.status || "draft"));
      const rec = document.createElement("div");
      rec.className = "record";
      rec.innerHTML =
        `<div class="record-main">
           <div class="record-title">${escapeHtml(d.number || "—")} · ${escapeHtml(d.toName || "—")}</div>
           <div class="record-sub">${formatDateForCode(d.issueDate)} · ${escapeHtml((TITLES[I18N.getLang()] || TITLES.en)[d.docType] || "")}</div>
         </div>
         <span class="badge ${badgeCls}">${badgeTxt}</span>
         <span class="record-amount">${formatMoneyFor(d, total)}</span>`;

      const open = mkBtn(I18N.t("col_load"), "secondary-btn small", () => {
        doc = JSON.parse(JSON.stringify(d));
        if (cloudOn() && !doc.fromName) applyCompanyToDoc();
        fillInputs(); update(); switchView("editor");
      });
      const dup = mkBtn(I18N.t("duplicate"), "secondary-btn small", () => duplicateDoc(d));
      rec.append(open, dup);

      if (d.status !== "paid") {
        rec.append(mkBtn(I18N.t("reminder"), "secondary-btn small", () => copyReminder(d)));
      }
      if (cloudOn() && d.id) {
        rec.append(mkBtn(I18N.t("share"), "secondary-btn small", () => shareInvoice(d)));
      }
      rec.append(mkBtn(I18N.t("col_delete"), "link-btn", async () => {
        if (!confirm(I18N.t("confirm_delete"))) return;
        if (cloudOn()) { try { await CLOUD.deleteInvoice(d.id); } catch (e) { alert(e.message || e); return; } }
        else STORE.deleteInvoice(d.id);
        renderHistory();
      }));
      list.appendChild(rec);
    });
  }

  function mkBtn(text, cls, onClick) {
    const b = document.createElement("button");
    b.className = cls; b.textContent = text;
    b.addEventListener("click", onClick);
    return b;
  }

  function duplicateDoc(d) {
    const copy = JSON.parse(JSON.stringify(d));
    copy.id = null;
    copy.publicId = ""; copy.isPublic = false;
    copy.status = "draft";
    copy.issueDate = todayISO();
    copy.number = NUM_PREFIX[copy.docType] + pad(STORE.nextNumber());
    doc = copy;
    fillInputs(); update(); switchView("editor");
    toast(I18N.t("duplicate"));
  }

  function reminderText(d) {
    const total = formatMoneyFor(d, invoiceTotal(d));
    if (I18N.getLang() === "ru") {
      return `Здравствуйте${d.toName ? ", " + d.toName : ""}!\n\n` +
        `Напоминаем об оплате счёта ${d.number || ""} на сумму ${total}` +
        `${d.dueDate ? ` (срок оплаты: ${formatDateForCode(d.dueDate)})` : ""}.\n` +
        `Будем благодарны за оплату. Спасибо!`;
    }
    return `Hello${d.toName ? ", " + d.toName : ""},\n\n` +
      `This is a friendly reminder about invoice ${d.number || ""} for ${total}` +
      `${d.dueDate ? ` (due ${formatDateForCode(d.dueDate)})` : ""}.\n` +
      `We'd appreciate your payment. Thank you!`;
  }
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((resolve) => {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); resolve();
    });
  }
  async function copyReminder(d) {
    await copyToClipboard(reminderText(d));
    toast(I18N.t("reminder_copied"));
  }

  async function shareInvoice(d) {
    if (!cloudOn() || !d.id) { toast(I18N.t("share_login")); return; }
    try {
      const token = d.publicId || await CLOUD.makePublic(d.id);
      const url = location.origin + location.pathname + "?invoice=" + token;
      await copyToClipboard(url);
      toast(I18N.t("share_copied"));
    } catch (e) { alert(e.message || e); }
  }

  function exportHistoryCsv() {
    if (!historyDocs.length) return;
    const head = ["Number", "Type", "Status", "Client", "Issue date", "Due date", "Currency", "Total"];
    const rows = historyDocs.map((d) => [
      d.number || "", d.docType || "", isOverdue(d) ? "overdue" : (d.status || ""),
      d.toName || "", d.issueDate || "", d.dueDate || "", d.currency || "",
      invoiceTotal(d).toFixed(2),
    ]);
    const csv = [head].concat(rows)
      .map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mygir-invoices.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  function invoiceTotal(d) {
    let sub = 0, tax = 0;
    (d.items || []).forEach((it) => { const l = (it.qty || 0) * (it.price || 0); sub += l; tax += l * ((it.tax || 0) / 100); });
    const dv = parseFloat(d.discountValue) || 0;
    const disc = dv > 0 ? (d.discountType === "percent" ? sub * (dv / 100) : dv) : 0;
    return sub + tax - disc;
  }
  function formatMoneyFor(d, n) {
    try { return new Intl.NumberFormat(I18N.locale(), { style: "currency", currency: d.currency || "USD" }).format(n); }
    catch (e) { return (n || 0).toFixed(2); }
  }
  function formatDateForCode(v) { if (!v) return "—"; try { return new Date(v).toLocaleDateString(I18N.locale()); } catch (e) { return v; } }

  /* ============ Clients ============ */
  async function getClientList() {
    if (cloudOn()) return currentCompanyId ? await CLOUD.listClients(currentCompanyId) : [];
    return STORE.getClients();
  }
  async function populateClientPicker() {
    const sel = el("clientPicker");
    let clients;
    try { clients = await getClientList(); } catch (e) { clients = []; }
    sel.innerHTML = `<option value="">${I18N.t("choose_client")}</option>`;
    clients.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name || "—";
      sel.appendChild(o);
    });
  }
  async function renderClients() {
    const list = el("clientsList");
    list.innerHTML = "";
    let clients;
    try { clients = await getClientList(); } catch (e) {
      list.innerHTML = `<div class="empty-state">${(e.message || e)}</div>`; return;
    }
    if (clients.length === 0) {
      list.innerHTML = `<div class="empty-state">${I18N.t("clients_empty")}</div>`;
      return;
    }
    clients.forEach((c) => {
      const rec = document.createElement("div");
      rec.className = "record";
      rec.innerHTML =
        `<div class="record-main">
           <div class="record-title">${escapeHtml(c.name || "—")}</div>
           <div class="record-sub">${escapeHtml((c.details || "").split("\n")[0] || "")}</div>
         </div>`;
      const use = document.createElement("button");
      use.className = "secondary-btn small";
      use.textContent = I18N.t("col_load");
      use.addEventListener("click", () => { doc.toName = c.name; doc.toDetails = c.details; fillInputs(); update(); switchView("editor"); });
      const del = document.createElement("button");
      del.className = "link-btn";
      del.textContent = I18N.t("col_delete");
      del.addEventListener("click", async () => {
        if (!confirm(I18N.t("confirm_delete"))) return;
        if (cloudOn()) { try { await CLOUD.deleteClient(c.id); } catch (e) { alert(e.message || e); return; } }
        else STORE.deleteClient(c.id);
        renderClients(); populateClientPicker();
      });
      rec.append(use, del);
      list.appendChild(rec);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  /* ============ PDF ============ */
  function downloadPdf() {
    const fileName = (doc.number || "invoice").replace(/[^\w\-]+/g, "_") + ".pdf";
    if (typeof html2pdf === "undefined") {
      alert("PDF library failed to load. Use Print → Save as PDF instead.");
      return;
    }
    html2pdf().set({
      margin: 8,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(el("invoice")).save();
  }

  /* ============ Settings: language / theme ============ */
  function setLang(lang) {
    I18N.setLang(lang);
    settings.language = I18N.getLang();
    STORE.saveSettings(settings);
    el("setLanguage").value = settings.language;
    applyI18n();
    renderItems();
    renderPreview();
    populateClientPicker();
    el("accountBtn").textContent = cloudOn() ? (CLOUD.currentUser().email || I18N.t("account")) : I18N.t("sign_in");
    syncAuthModal();
  }
  function setTheme(theme) {
    settings.theme = theme === "dark" ? "dark" : "light";
    STORE.saveSettings(settings);
    document.documentElement.setAttribute("data-theme", settings.theme);
    el("setTheme").value = settings.theme;
    el("themeToggle").textContent = settings.theme === "dark" ? "☀️" : "🌙";
  }

  /* ============ Backup ============ */
  function exportData() {
    const blob = new Blob([JSON.stringify(STORE.exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mygir-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        STORE.importAll(JSON.parse(reader.result));
        settings = STORE.getSettings();
        setLang(settings.language || "en");
        setTheme(settings.theme || "light");
        populateClientPicker();
        renderHistory();
        renderClients();
        toast(I18N.t("toast_imported"));
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  /* ============ Save current doc ============ */
  async function saveCurrent() {
    syncFromInputs();
    if (cloudOn()) {
      if (!currentCompanyId) { switchView("companies"); toast(I18N.t("login_required_cloud")); return; }
      try {
        if (!doc.id && !isPro()) {
          const count = await CLOUD.countInvoices(currentCompanyId);
          if (count >= FREE_MAX_INVOICES) { openUpgrade("limit_invoices"); return; }
        }
        const saved = await CLOUD.saveInvoice(currentCompanyId, doc);
        doc.id = saved.id;
        doc.updatedAt = saved.updatedAt;
        persistCurrent();
        toast(I18N.t("toast_saved"));
      } catch (e) {
        alert("Save failed: " + (e.message || e));
      }
    } else {
      const saved = STORE.saveInvoice(JSON.parse(JSON.stringify(doc)));
      doc.id = saved.id;
      persistCurrent();
      toast(I18N.t("toast_saved"));
    }
  }

  function newDoc() {
    doc = blankDoc();
    fillInputs();
    update();
  }

  /* ============ Public viewer mode ============ */
  async function tryViewerMode() {
    const pid = new URLSearchParams(location.search).get("invoice");
    if (!pid) return false;
    document.body.classList.add("viewer-mode");
    I18N.setLang(settings.language || "en");
    applyI18n();
    el("viewerBar").classList.remove("hidden");
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    el("view-editor").classList.add("active");
    el("viewerDownload").addEventListener("click", downloadPdf);
    try {
      if (!(CLOUD && CLOUD.isConfigured())) throw new Error("not configured");
      await CLOUD.init();
      doc = await CLOUD.getPublicInvoice(pid);
      renderPreview();
    } catch (e) {
      const scroll = document.querySelector(".preview-scroll");
      if (scroll) scroll.innerHTML = `<div class="empty-state" style="padding:24px">${I18N.t("viewer_error")}</div>`;
    }
    return true;
  }

  /* ============ Init ============ */
  async function init() {
    if (await tryViewerMode()) return;

    // field listeners
    ["docType", "docStatus", "accentColor", "fromName", "fromDetails", "toName", "toDetails",
     "invoiceNumber", "currency", "issueDate", "dueDate", "taxLabel", "discountValue",
     "discountType", "notes"].forEach((id) => {
      el(id).addEventListener("input", update);
      el(id).addEventListener("change", update);
    });

    // template chips
    el("templatePicker").addEventListener("click", (e) => {
      const chip = e.target.closest(".tpl-chip");
      if (!chip) return;
      setActiveTemplate(chip.dataset.tpl);
      settings.template = chip.dataset.tpl;
      STORE.saveSettings(settings);
      update();
    });

    // items
    el("addItem").addEventListener("click", () => {
      doc.items.push({ desc: "", qty: 1, price: 0, tax: 0 });
      renderItems();
      update();
    });

    // logo
    el("logoInput").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => { doc.logo = r.result; update(); };
      r.readAsDataURL(file);
    });
    el("removeLogo").addEventListener("click", () => { doc.logo = ""; el("logoInput").value = ""; update(); });

    // clients
    el("clientPicker").addEventListener("change", async (e) => {
      const id = e.target.value;
      if (!id) return;
      const list = await getClientList();
      const c = list.find((x) => x.id === id);
      if (c) { doc.toName = c.name; doc.toDetails = c.details; fillInputs(); update(); }
    });
    el("saveClient").addEventListener("click", async () => {
      const name = el("toName").value.trim();
      if (!name) return;
      const details = el("toDetails").value;
      try {
        if (cloudOn()) {
          if (!currentCompanyId) { toast(I18N.t("login_required_cloud")); return; }
          await CLOUD.saveClient(currentCompanyId, { name, details });
        } else {
          STORE.saveClient({ name, details });
        }
        populateClientPicker();
        toast(I18N.t("toast_client_saved"));
      } catch (e) { alert(e.message || e); }
    });

    // actions
    el("saveDoc").addEventListener("click", saveCurrent);
    el("downloadPdf").addEventListener("click", downloadPdf);
    el("printBtn").addEventListener("click", () => window.print());
    el("convertBtn").addEventListener("click", convertToInvoice);
    el("resetBtn").addEventListener("click", () => { if (confirm(I18N.t("confirm_reset"))) newDoc(); });

    // tabs
    el("tabs").addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (tab) switchView(tab.dataset.view);
    });

    // history toolbar
    el("historySearch").addEventListener("input", renderHistoryList);
    el("historyFilter").addEventListener("change", renderHistoryList);
    el("exportCsv").addEventListener("click", exportHistoryCsv);

    // expenses + dashboard period
    el("addExpense").addEventListener("click", addExpense);
    el("dashFrom").addEventListener("change", renderDashboard);
    el("dashTo").addEventListener("change", renderDashboard);

    // numbering settings
    el("invoicePrefix").addEventListener("change", (e) => { settings.invoicePrefix = e.target.value || "INV-"; STORE.saveSettings(settings); });
    el("quotePrefix").addEventListener("change", (e) => { settings.quotePrefix = e.target.value || "QUO-"; STORE.saveSettings(settings); });

    // top toggles
    el("langToggle").addEventListener("click", () => {
      const langs = I18N.langs;
      const next = langs[(langs.indexOf(I18N.getLang()) + 1) % langs.length];
      setLang(next);
    });
    el("themeToggle").addEventListener("click", () => setTheme(settings.theme === "dark" ? "light" : "dark"));

    // settings controls
    el("setLanguage").addEventListener("change", (e) => setLang(e.target.value));
    el("setTheme").addEventListener("change", (e) => setTheme(e.target.value));
    el("exportData").addEventListener("click", exportData);
    el("importData").addEventListener("click", () => el("importFile").click());
    el("importFile").addEventListener("change", (e) => { if (e.target.files[0]) importData(e.target.files[0]); });

    // account / auth
    el("accountBtn").addEventListener("click", () => {
      if (cloudOn()) switchView("profile");
      else openAuth();
    });
    el("signOutBtn").addEventListener("click", async () => {
      if (confirm(I18N.t("confirm_signout"))) { await CLOUD.signOut(); await refreshAuthUI(); switchView("editor"); }
    });
    el("authClose").addEventListener("click", closeAuth);
    el("authModal").addEventListener("click", (e) => { if (e.target === el("authModal")) closeAuth(); });
    el("authToggle").addEventListener("click", () => { authMode = authMode === "login" ? "register" : "login"; syncAuthModal(); });
    el("authSubmit").addEventListener("click", submitAuth);

    // company controls
    el("companySwitcher").addEventListener("change", (e) => selectCompany(e.target.value));
    el("addCompany").addEventListener("click", () => openCompanyForm(null));
    el("saveCompany").addEventListener("click", saveCompanyForm);

    // plan / upgrade
    el("upgradeBtn").addEventListener("click", () => openUpgrade());
    el("upgradeClose").addEventListener("click", closeUpgrade);
    el("upgradeModal").addEventListener("click", (e) => { if (e.target === el("upgradeModal")) closeUpgrade(); });
    el("upgradeCta").addEventListener("click", () => { toast(I18N.t("payment_soon")); closeUpgrade(); });

    // initial render (guarded so a failure never disables the UI above)
    try {
      setLang(settings.language || "en");
      setTheme(settings.theme || "light");
      el("setLanguage").value = settings.language || "en";
      el("setTheme").value = settings.theme || "light";
      fillInputs();
      populateClientPicker();
      update();
    } catch (e) { console.error("Mygir init render error:", e); }

    // cloud bootstrap (fully optional; never blocks the UI)
    try {
      if (CLOUD && CLOUD.isConfigured()) {
        await CLOUD.init();
        CLOUD.onAuthChange(() => { refreshAuthUI().catch(function () {}); });
        await refreshAuthUI();
      }
    } catch (e) { console.error("Mygir cloud init error:", e); }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
