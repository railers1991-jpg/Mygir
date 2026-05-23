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
  url: "YOUR_SUPABASE_URL",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
};
