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

    return profile;
}

async function loadUserToken() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    const userToken = document.getElementById('userToken');

    if (!user) {
        userToken.textContent = 'Cap token assignat';
        return;
    }

    const { data, error } = await supabaseClient
        .from('tokens')
        .select('platform')
        .eq('usuari', user.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        userToken.textContent = 'Cap token assignat';
        return;
    }

    userToken.textContent = data?.platform ?? 'Cap token assignat';
}

export { checkAuth };

checkAuth();
loadUserToken();