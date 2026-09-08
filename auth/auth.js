const SUPABASE_URL = "https://zfhkelulfbnotagrlenl.supabase.co";
const SUPABASE_KEY = "sb_publishable_TTrqEFYf1bjHlrAJrvo7QQ_qF-8AjIl";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function checkAuth() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        window.location.href = "/login.html";
        return;
    }

    if (!data.session) {
        window.location.href = "/login.html";
        return;
    }

    console.log("Usuari amb sessió:", data.session.user);
}

checkAuth();