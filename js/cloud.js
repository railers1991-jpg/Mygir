"use strict";

/* Supabase-backed auth + data layer. Falls back to disabled when not configured. */
window.MYGIR_CLOUD = (function () {
  let db = null;
  let user = null;
  const listeners = [];

  function isConfigured() {
    const cfg = window.MYGIR_SUPABASE;
    return !!(
      cfg &&
      cfg.url && cfg.anonKey &&
      cfg.url.indexOf("YOUR_") === -1 &&
      cfg.anonKey.indexOf("YOUR_") === -1 &&
      window.supabase && typeof window.supabase.createClient === "function"
    );
  }

  async function init() {
    if (!isConfigured()) return false;
    const cfg = window.MYGIR_SUPABASE;
    db = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { data } = await db.auth.getSession();
    user = data && data.session ? data.session.user : null;
    db.auth.onAuthStateChange((_event, session) => {
      user = session ? session.user : null;
      listeners.forEach((fn) => fn(user));
    });
    return true;
  }

  function onAuthChange(fn) { listeners.push(fn); }
  function enabled() { return !!db; }
  function currentUser() { return user; }

  /* ---------- Auth ---------- */
  async function signUp(email, password) {
    const { data, error } = await db.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    user = data.user;
    return data;
  }
  async function signOut() {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    user = null;
  }

  /* ---------- Field mapping (doc <-> invoice row) ---------- */
  function nullIfEmpty(v) { return v === "" || v == null ? null : v; }
  function numOrZero(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

  function docToRow(doc, companyId) {
    return {
      company_id: companyId,
      doc_type: doc.docType || "invoice",
      status: doc.status || "draft",
      number: doc.number || null,
      from_name: doc.fromName || null,
      from_details: doc.fromDetails || null,
      client_name: doc.toName || null,
      client_details: doc.toDetails || null,
      currency: doc.currency || "USD",
      issue_date: nullIfEmpty(doc.issueDate),
      due_date: nullIfEmpty(doc.dueDate),
      tax_label: doc.taxLabel || null,
      payment_url: doc.paymentUrl || null,
      discount_value: numOrZero(doc.discountValue),
      discount_type: doc.discountType || "percent",
      notes: doc.notes || null,
      template: doc.template || "modern",
      accent_color: doc.accentColor || null,
      logo: doc.logo || null,
      items: Array.isArray(doc.items) ? doc.items : [],
      updated_at: new Date().toISOString(),
    };
  }
  function rowToDoc(row) {
    return {
      id: row.id,
      docType: row.doc_type,
      status: row.status,
      number: row.number || "",
      toName: row.client_name || "",
      toDetails: row.client_details || "",
      currency: row.currency || "USD",
      issueDate: row.issue_date || "",
      dueDate: row.due_date || "",
      taxLabel: row.tax_label || "",
      paymentUrl: row.payment_url || "",
      discountValue: row.discount_value != null ? String(row.discount_value) : "",
      discountType: row.discount_type || "percent",
      notes: row.notes || "",
      template: row.template || "modern",
      accentColor: row.accent_color || "#2563eb",
      logo: row.logo || "",
      fromName: row.from_name || "",
      fromDetails: row.from_details || "",
      publicId: row.public_id || "",
      isPublic: !!row.is_public,
      items: Array.isArray(row.items) ? row.items : [],
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    };
  }

  /* ---------- Companies ---------- */
  async function listCompanies() {
    const { data, error } = await db.from("companies").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function saveCompany(company) {
    let res;
    if (company.id) {
      const patch = { ...company };
      delete patch.id; delete patch.owner; delete patch.created_at;
      res = await db.from("companies").update(patch).eq("id", company.id).select().single();
    } else {
      res = await db.from("companies").insert(company).select().single();
    }
    if (res.error) throw res.error;
    return res.data;
  }
  async function deleteCompany(id) {
    const { error } = await db.from("companies").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---------- Clients ---------- */
  async function listClients(companyId) {
    const { data, error } = await db.from("clients").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function saveClient(companyId, client) {
    const { data, error } = await db.from("clients")
      .insert({ company_id: companyId, name: client.name, details: client.details || null })
      .select().single();
    if (error) throw error;
    return data;
  }
  async function deleteClient(id) {
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---------- Invoices ---------- */
  async function listInvoices(companyId) {
    const { data, error } = await db.from("invoices").select("*").eq("company_id", companyId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToDoc);
  }
  async function saveInvoice(companyId, doc) {
    const row = docToRow(doc, companyId);
    let res;
    if (doc.id) {
      res = await db.from("invoices").update(row).eq("id", doc.id).select().single();
    } else {
      res = await db.from("invoices").insert(row).select().single();
    }
    if (res.error) throw res.error;
    return rowToDoc(res.data);
  }
  async function deleteInvoice(id) {
    const { error } = await db.from("invoices").delete().eq("id", id);
    if (error) throw error;
  }
  function randToken() {
    return (Date.now().toString(36) +
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/gi, "");
  }
  async function makePublic(invoiceId) {
    const token = randToken();
    const { data, error } = await db.from("invoices")
      .update({ is_public: true, public_id: token })
      .eq("id", invoiceId).select("public_id").single();
    if (error) throw error;
    return data.public_id;
  }
  async function getPublicInvoice(publicId) {
    const { data, error } = await db.from("invoices")
      .select("*").eq("public_id", publicId).eq("is_public", true).single();
    if (error) throw error;
    return rowToDoc(data);
  }
  async function countInvoices(companyId) {
    const { count, error } = await db.from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    if (error) throw error;
    return count || 0;
  }

  /* ---------- Expenses ---------- */
  async function listExpenses(companyId) {
    const { data, error } = await db.from("expenses").select("*").eq("company_id", companyId).order("date", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function saveExpense(companyId, exp) {
    const { data, error } = await db.from("expenses")
      .insert({ company_id: companyId, date: exp.date || null, description: exp.description || null, amount: parseFloat(exp.amount) || 0, currency: exp.currency || "USD" })
      .select().single();
    if (error) throw error;
    return data;
  }
  async function deleteExpense(id) {
    const { error } = await db.from("expenses").delete().eq("id", id);
    if (error) throw error;
  }

  /* ---------- Plan (free / pro) ---------- */
  async function getPlan() {
    if (!user) return "free";
    // make sure a profile row exists, without overwriting an existing plan
    await db.from("profiles").upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
    const { data, error } = await db.from("profiles").select("plan").eq("id", user.id).single();
    if (error || !data) return "free";
    return data.plan || "free";
  }

  return {
    isConfigured, init, onAuthChange, enabled, currentUser,
    signUp, signIn, signOut,
    listCompanies, saveCompany, deleteCompany,
    listClients, saveClient, deleteClient,
    listInvoices, saveInvoice, deleteInvoice, countInvoices,
    makePublic, getPublicInvoice,
    listExpenses, saveExpense, deleteExpense,
    getPlan,
    docToRow, rowToDoc,
  };
})();
