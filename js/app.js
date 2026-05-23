"use strict";

const STORAGE_KEY = "mygir-invoice-draft";

const $ = (id) => document.getElementById(id);

const state = {
  logoDataUrl: "",
  items: [],
};

/* ---------- Money formatting ---------- */
function fmt(amount) {
  const symbol = $("currency").value;
  const n = Number.isFinite(amount) ? amount : 0;
  return symbol + n.toFixed(2);
}

/* ---------- Line items ---------- */
function makeItem(data = {}) {
  return {
    desc: data.desc || "",
    qty: data.qty != null ? data.qty : 1,
    price: data.price != null ? data.price : 0,
    tax: data.tax != null ? data.tax : 0,
  };
}

function renderItemsForm() {
  const container = $("itemsContainer");
  container.innerHTML = "";

  const head = document.createElement("div");
  head.className = "item-head";
  head.innerHTML =
    "<span>Description</span><span>Qty</span><span>Price</span><span>Tax%</span><span></span>";
  container.appendChild(head);

  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-row";

    const desc = document.createElement("input");
    desc.type = "text";
    desc.placeholder = "Item description";
    desc.value = item.desc;
    desc.addEventListener("input", () => { item.desc = desc.value; update(); });

    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "0";
    qty.step = "1";
    qty.value = item.qty;
    qty.addEventListener("input", () => { item.qty = parseFloat(qty.value) || 0; update(); });

    const price = document.createElement("input");
    price.type = "number";
    price.min = "0";
    price.step = "0.01";
    price.value = item.price;
    price.addEventListener("input", () => { item.price = parseFloat(price.value) || 0; update(); });

    const tax = document.createElement("input");
    tax.type = "number";
    tax.min = "0";
    tax.step = "0.01";
    tax.value = item.tax;
    tax.addEventListener("input", () => { item.tax = parseFloat(tax.value) || 0; update(); });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.textContent = "×";
    remove.title = "Remove item";
    remove.addEventListener("click", () => {
      state.items.splice(index, 1);
      if (state.items.length === 0) state.items.push(makeItem());
      renderItemsForm();
      update();
    });

    row.append(desc, qty, price, tax, remove);
    container.appendChild(row);
  });
}

/* ---------- Totals calculation (tax per item) ---------- */
function calcTotals() {
  let subtotal = 0;
  let tax = 0;
  state.items.forEach((it) => {
    const line = (it.qty || 0) * (it.price || 0);
    subtotal += line;
    tax += line * ((it.tax || 0) / 100);
  });

  const discountValue = parseFloat($("discountValue").value) || 0;
  const discountType = $("discountType").value;
  let discount = 0;
  if (discountValue > 0) {
    discount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
  }

  const total = subtotal + tax - discount;
  return { subtotal, tax, discount, total };
}

/* ---------- Preview rendering ---------- */
function setText(id, value, fallback) {
  $(id).textContent = value && value.trim() ? value : (fallback || "");
}

function update() {
  document.documentElement.style.setProperty("--accent", $("accentColor").value);

  // Logo
  const pvLogo = $("pvLogo");
  if (state.logoDataUrl) {
    pvLogo.src = state.logoDataUrl;
    pvLogo.classList.remove("hidden");
    $("removeLogo").classList.remove("hidden");
  } else {
    pvLogo.classList.add("hidden");
    $("removeLogo").classList.add("hidden");
  }

  setText("pvFromName", $("fromName").value, "Your name / company");
  setText("pvFromDetails", $("fromDetails").value, "");
  setText("pvToName", $("toName").value, "Client name");
  setText("pvToDetails", $("toDetails").value, "");
  setText("pvInvoiceNumber", $("invoiceNumber").value, "INV-001");
  setText("pvIssueDate", $("issueDate").value, "—");
  setText("pvDueDate", $("dueDate").value, "—");

  // Items
  const tbody = $("pvItems");
  tbody.innerHTML = "";
  state.items.forEach((it) => {
    const line = (it.qty || 0) * (it.price || 0);
    const tr = document.createElement("tr");
    const cells = [
      it.desc || "—",
      String(it.qty || 0),
      fmt(it.price || 0),
      (it.tax || 0) + "%",
      fmt(line),
    ];
    cells.forEach((c, i) => {
      const td = document.createElement("td");
      td.textContent = c;
      if (i > 0) td.className = "col-num";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const t = calcTotals();
  $("pvSubtotal").textContent = fmt(t.subtotal);
  $("pvTax").textContent = fmt(t.tax);
  $("pvTotal").textContent = fmt(t.total);

  if (t.discount > 0) {
    $("pvDiscountRow").classList.remove("hidden");
    $("pvDiscount").textContent = "-" + fmt(t.discount);
  } else {
    $("pvDiscountRow").classList.add("hidden");
  }

  const notes = $("notes").value;
  if (notes && notes.trim()) {
    $("pvNotesBlock").classList.remove("hidden");
    $("pvNotes").textContent = notes;
  } else {
    $("pvNotesBlock").classList.add("hidden");
  }

  saveDraft();
}

/* ---------- Persistence (localStorage, stays on device) ---------- */
function saveDraft() {
  const draft = {
    accentColor: $("accentColor").value,
    logoDataUrl: state.logoDataUrl,
    fromName: $("fromName").value,
    fromDetails: $("fromDetails").value,
    toName: $("toName").value,
    toDetails: $("toDetails").value,
    invoiceNumber: $("invoiceNumber").value,
    currency: $("currency").value,
    issueDate: $("issueDate").value,
    dueDate: $("dueDate").value,
    discountValue: $("discountValue").value,
    discountType: $("discountType").value,
    notes: $("notes").value,
    items: state.items,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    /* storage may be unavailable (private mode) — ignore */
  }
}

function loadDraft() {
  let draft = null;
  try {
    draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (e) {
    draft = null;
  }
  if (!draft) return false;

  $("accentColor").value = draft.accentColor || "#2563eb";
  state.logoDataUrl = draft.logoDataUrl || "";
  $("fromName").value = draft.fromName || "";
  $("fromDetails").value = draft.fromDetails || "";
  $("toName").value = draft.toName || "";
  $("toDetails").value = draft.toDetails || "";
  $("invoiceNumber").value = draft.invoiceNumber || "";
  $("currency").value = draft.currency || "$";
  $("issueDate").value = draft.issueDate || "";
  $("dueDate").value = draft.dueDate || "";
  $("discountValue").value = draft.discountValue || "";
  $("discountType").value = draft.discountType || "percent";
  $("notes").value = draft.notes || "";
  state.items = Array.isArray(draft.items) && draft.items.length
    ? draft.items.map(makeItem)
    : [makeItem()];
  return true;
}

/* ---------- PDF export ---------- */
function downloadPdf() {
  const fileName = ($("invoiceNumber").value.trim() || "invoice") + ".pdf";
  const element = $("invoice");
  const opt = {
    margin: 10,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };
  if (typeof html2pdf === "undefined") {
    alert("PDF library failed to load. Check your connection and try again, or use Print → Save as PDF.");
    return;
  }
  html2pdf().set(opt).from(element).save();
}

/* ---------- Init ---------- */
function init() {
  const hadDraft = loadDraft();
  if (!hadDraft) {
    state.items = [makeItem({ desc: "", qty: 1, price: 0, tax: 0 })];
    $("issueDate").value = new Date().toISOString().slice(0, 10);
  }

  renderItemsForm();
  update();

  // Re-render preview on any field change
  [
    "accentColor", "fromName", "fromDetails", "toName", "toDetails",
    "invoiceNumber", "currency", "issueDate", "dueDate",
    "discountValue", "discountType", "notes",
  ].forEach((id) => {
    $(id).addEventListener("input", update);
    $(id).addEventListener("change", update);
  });

  $("addItem").addEventListener("click", () => {
    state.items.push(makeItem());
    renderItemsForm();
    update();
  });

  $("logoInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { state.logoDataUrl = reader.result; update(); };
    reader.readAsDataURL(file);
  });

  $("removeLogo").addEventListener("click", () => {
    state.logoDataUrl = "";
    $("logoInput").value = "";
    update();
  });

  $("downloadPdf").addEventListener("click", downloadPdf);
  $("printBtn").addEventListener("click", () => window.print());

  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Clear all fields and start a new invoice?")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  });
}

document.addEventListener("DOMContentLoaded", init);
