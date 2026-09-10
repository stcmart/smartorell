import { supabaseClient } from './supabase.js';

async function checkAuth() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        window.location.href = "/auth/login.html";
        return;
    }

    if (!data.session) {
        window.location.href = "/auth/login.html";
        return;
    }

    console.log("Usuari amb sessió:", data.session.user);
}

checkAuth();