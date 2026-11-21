/*
 * Public runtime configuration for the Supabase-backed build.
 *
 * Fill in the two values below from your Supabase project:
 *   Project Settings -> API -> Project URL
 *   Project Settings -> API -> Project API keys -> anon / public
 *
 * The anon key is designed to be public. It is safe to ship in a static
 * website *only because* the database uses Row Level Security (see
 * supabase/schema.sql). Never put the service_role key in this file.
 *
 * Leave both values empty to keep using the local Express + SQLite server
 * (npm.cmd start). The static production build refuses to run with empty
 * values unless it is built with --allow-unconfigured.
 */
window.NotesConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',

  /*
   * Set to true if your Supabase project has "Confirm email" enabled.
   * This only changes the message shown after sign-up; the adapter detects
   * the real state from Supabase's response.
   */
  emailConfirmation: false
};
