"use strict";

/* localStorage-backed store for invoices, clients and settings. */
window.MYGIR_STORE = (function () {
  const KEYS = {
    invoices: "mygir_invoices",
    clients: "mygir_clients",
    settings: "mygir_settings",
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  return {
    uid,

    /* ----- Settings ----- */
    getSettings() {
      return read(KEYS.settings, {
        language: "en",
        theme: "light",
        template: "modern",
        accentColor: "#2563eb",
        currency: "USD",
        taxLabel: "VAT",
        lastNumber: 0,
      });
    },
    saveSettings(s) { write(KEYS.settings, s); },
    nextNumber() {
      const s = this.getSettings();
      s.lastNumber = (s.lastNumber || 0) + 1;
      this.saveSettings(s);
      return s.lastNumber;
    },

    /* ----- Invoices ----- */
    getInvoices() { return read(KEYS.invoices, []); },
    saveInvoice(doc) {
      const list = this.getInvoices();
      if (!doc.id) doc.id = uid();
      doc.updatedAt = Date.now();
      const idx = list.findIndex((d) => d.id === doc.id);
      if (idx >= 0) list[idx] = doc; else list.unshift(doc);
      write(KEYS.invoices, list);
      return doc;
    },
    deleteInvoice(id) {
      write(KEYS.invoices, this.getInvoices().filter((d) => d.id !== id));
    },
    getInvoice(id) { return this.getInvoices().find((d) => d.id === id) || null; },

    /* ----- Clients ----- */
    getClients() { return read(KEYS.clients, []); },
    saveClient(client) {
      const list = this.getClients();
      if (!client.id) client.id = uid();
      const idx = list.findIndex((c) => c.id === client.id);
      if (idx >= 0) list[idx] = client; else list.unshift(client);
      write(KEYS.clients, list);
      return client;
    },
    deleteClient(id) {
      write(KEYS.clients, this.getClients().filter((c) => c.id !== id));
    },

    /* ----- Backup ----- */
    exportAll() {
      return {
        _app: "mygir",
        _version: "0.2",
        exportedAt: new Date().toISOString(),
        settings: this.getSettings(),
        invoices: this.getInvoices(),
        clients: this.getClients(),
      };
    },
    importAll(data) {
      if (!data || data._app !== "mygir") throw new Error("Not a Mygir backup file");
      if (data.settings) write(KEYS.settings, data.settings);
      if (Array.isArray(data.invoices)) write(KEYS.invoices, data.invoices);
      if (Array.isArray(data.clients)) write(KEYS.clients, data.clients);
    },
  };
})();
