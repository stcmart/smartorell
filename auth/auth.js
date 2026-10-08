import { supabaseClient } from './supabase.js';

async function checkAuth() {

    const { data, error } =
        await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        window.location.href = "./auth/login.html";
        return;
    }

    if (!data.session) {
        window.location.href = "./auth/login.html";
        return;
    }

    const user = data.session.user;

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('email, role')
        .eq('id', user.id)
        .single();

    if (profileError) {
        console.error("Error carregant el perfil:", profileError);
        return;
    }

    console.log("Usuari:", profile.email);
    console.log("Rol:", profile.role);
    document.getElementById("username").textContent = profile.email;
    document.getElementById("userRole").textContent = profile.role;
}

checkAuth();