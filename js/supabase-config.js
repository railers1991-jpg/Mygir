"use strict";

/*
 * Supabase connection settings.
 *
 * HOW TO ENABLE CLOUD ACCOUNTS (one-time, ~5 minutes):
 *   1. Create a free project at https://supabase.com
 *   2. In the project: SQL Editor → paste the contents of supabase/schema.sql → Run
 *   3. Project Settings → API → copy "Project URL" and the "anon public" key
 *   4. Paste them below, replacing the YOUR_... placeholders, and commit.
 *
 * The anon key is SAFE to expose in front-end code — Row Level Security in the
 * database (see supabase/schema.sql) is what actually protects user data.
 *
 * Until real values are filled in, the app runs in offline guest mode
 * (data saved only in this browser) and login/registration stay hidden.
 */
window.MYGIR_SUPABASE = {
  url: "https://fglgnvelinixsuiprhid.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbGdudmVsaW5peHN1aXByaGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NTM4OTEsImV4cCI6MjA5NTEyOTg5MX0.wfS6iXivUy0O97TKqUNPe0EUuZuiRRp-ebJ00w0z9r4",
};
