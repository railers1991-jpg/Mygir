"use strict";

/* Lightweight i18n: a global dictionary + helper. No build step, no deps. */
window.MYGIR_I18N = (function () {
  const dict = {
    en: {
      tagline: "Free invoice & quote generator — no sign-up, no watermark.",
      tab_editor: "Editor",
      tab_history: "History",
      tab_clients: "Clients",
      tab_settings: "Settings",

      seo_h1: "Free Invoice Generator",
      seo_sub: "Pick a template, fill in the details, and download a clean PDF. Everything stays in your browser.",

      sec_doc: "Document",
      doc_type: "Type",
      type_invoice: "Invoice",
      type_quote: "Quote / Estimate",
      status: "Status",
      status_draft: "Draft",
      status_unpaid: "Unpaid",
      status_paid: "Paid",
      template: "Template",
      tpl_modern: "Modern",
      tpl_classic: "Classic",
      tpl_minimal: "Minimal",

      sec_branding: "Branding",
      accent: "Accent color",
      logo: "Logo (optional)",
      remove_logo: "Remove logo",

      sec_from: "From (you)",
      from_name_ph: "Your name / company",
      from_details_ph: "Address, email, phone, tax ID…",
      sec_to: "Bill to (client)",
      to_name_ph: "Client name / company",
      to_details_ph: "Client address, email…",
      choose_client: "Choose saved client…",
      save_client: "Save client",

      sec_details: "Details",
      number: "Number",
      currency: "Currency",
      issue_date: "Issue date",
      due_date: "Due date",

      sec_items: "Line items",
      desc: "Description",
      qty: "Qty",
      price: "Price",
      tax: "Tax %",
      amount: "Amount",
      item_desc_ph: "Item description",
      add_item: "+ Add item",

      sec_totals: "Totals",
      tax_label: "Tax label",
      tax_label_ph: "VAT / GST / Sales tax",
      global_discount: "Global discount",
      percent: "%",
      fixed: "fixed",
      subtotal: "Subtotal",
      discount: "Discount",
      total: "Total",

      sec_notes: "Notes",
      notes_ph: "Payment details, bank account, thank-you note…",

      save: "💾 Save",
      download_pdf: "⬇ Download PDF",
      print: "🖨 Print",
      reset: "New / Reset",
      privacy: "🔒 Your data never leaves your device. Everything runs in your browser.",

      bill_to: "Bill to",
      issued: "Issued",
      due: "Due",

      history_title: "Saved documents",
      history_empty: "No saved documents yet. Fill the form and press Save.",
      clients_title: "Saved clients",
      clients_empty: "No saved clients yet. In the editor, fill “Bill to” and press “Save client”.",
      col_load: "Open",
      col_delete: "Delete",

      settings_title: "Settings",
      set_language: "Language",
      set_theme: "Theme",
      theme_light: "Light",
      theme_dark: "Dark",
      set_data: "Your data",
      export_data: "⬇ Export all data (JSON)",
      import_data: "⬆ Import data (JSON)",
      data_hint: "Back up or move your invoices and clients between devices.",

      footer: "Made with Mygir · 100% free · No account required · Your data stays on your device.",

      toast_saved: "Saved",
      toast_client_saved: "Client saved",
      toast_imported: "Data imported",
      confirm_reset: "Start a new blank document? Unsaved changes will be lost.",
      confirm_delete: "Delete this item?",
      paid_stamp: "PAID",
    },
    ru: {
      tagline: "Бесплатный генератор счетов и смет — без регистрации и водяных знаков.",
      tab_editor: "Редактор",
      tab_history: "История",
      tab_clients: "Клиенты",
      tab_settings: "Настройки",

      seo_h1: "Бесплатный генератор счетов",
      seo_sub: "Выбери шаблон, заполни поля и скачай аккуратный PDF. Все данные остаются в твоём браузере.",

      sec_doc: "Документ",
      doc_type: "Тип",
      type_invoice: "Счёт",
      type_quote: "Смета / КП",
      status: "Статус",
      status_draft: "Черновик",
      status_unpaid: "Не оплачен",
      status_paid: "Оплачен",
      template: "Шаблон",
      tpl_modern: "Современный",
      tpl_classic: "Классический",
      tpl_minimal: "Минимализм",

      sec_branding: "Брендинг",
      accent: "Цвет акцента",
      logo: "Логотип (необязательно)",
      remove_logo: "Убрать логотип",

      sec_from: "От кого (вы)",
      from_name_ph: "Ваше имя / компания",
      from_details_ph: "Адрес, email, телефон, ИНН…",
      sec_to: "Кому (клиент)",
      to_name_ph: "Имя клиента / компания",
      to_details_ph: "Адрес клиента, email…",
      choose_client: "Выбрать сохранённого клиента…",
      save_client: "Сохранить клиента",

      sec_details: "Реквизиты",
      number: "Номер",
      currency: "Валюта",
      issue_date: "Дата выставления",
      due_date: "Срок оплаты",

      sec_items: "Позиции",
      desc: "Описание",
      qty: "Кол-во",
      price: "Цена",
      tax: "Налог %",
      amount: "Сумма",
      item_desc_ph: "Описание позиции",
      add_item: "+ Добавить позицию",

      sec_totals: "Итоги",
      tax_label: "Название налога",
      tax_label_ph: "НДС / GST / налог",
      global_discount: "Общая скидка",
      percent: "%",
      fixed: "сумма",
      subtotal: "Подытог",
      discount: "Скидка",
      total: "Итого",

      sec_notes: "Примечания",
      notes_ph: "Реквизиты для оплаты, банк, благодарность…",

      save: "💾 Сохранить",
      download_pdf: "⬇ Скачать PDF",
      print: "🖨 Печать",
      reset: "Новый / Сброс",
      privacy: "🔒 Данные не покидают ваше устройство. Всё работает в браузере.",

      bill_to: "Кому",
      issued: "Выставлен",
      due: "Оплатить до",

      history_title: "Сохранённые документы",
      history_empty: "Пока нет сохранённых документов. Заполните форму и нажмите «Сохранить».",
      clients_title: "Сохранённые клиенты",
      clients_empty: "Пока нет клиентов. В редакторе заполните «Кому» и нажмите «Сохранить клиента».",
      col_load: "Открыть",
      col_delete: "Удалить",

      settings_title: "Настройки",
      set_language: "Язык",
      set_theme: "Тема",
      theme_light: "Светлая",
      theme_dark: "Тёмная",
      set_data: "Ваши данные",
      export_data: "⬇ Экспорт всех данных (JSON)",
      import_data: "⬆ Импорт данных (JSON)",
      data_hint: "Резервная копия или перенос счетов и клиентов между устройствами.",

      footer: "Сделано на Mygir · 100% бесплатно · Без регистрации · Данные остаются на вашем устройстве.",

      toast_saved: "Сохранено",
      toast_client_saved: "Клиент сохранён",
      toast_imported: "Данные импортированы",
      confirm_reset: "Начать новый пустой документ? Несохранённые изменения потеряются.",
      confirm_delete: "Удалить этот элемент?",
      paid_stamp: "ОПЛАЧЕНО",
    },
  };

  let current = "en";

  return {
    setLang(lang) { current = dict[lang] ? lang : "en"; },
    getLang() { return current; },
    locale() { return current === "ru" ? "ru-RU" : "en-US"; },
    t(key) {
      const table = dict[current] || dict.en;
      return table[key] != null ? table[key] : (dict.en[key] != null ? dict.en[key] : key);
    },
    langs: ["en", "ru"],
  };
})();
