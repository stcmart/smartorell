const SUPABASE_URL = "https://zfhkelulfbnotagrlenl.supabase.co";
const SUPABASE_KEY = "sb_publishable_TTrqEFYf1bjHlrAJrvo7QQ_qF-8AjIl";

export const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);