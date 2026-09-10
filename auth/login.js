import { supabaseClient } from './supabase.js';

const form = document.querySelector("#login-form");

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        console.error(error);
        alert("Correu o contrasenya incorrectes.");
        return;
    }

    console.log("Usuari autenticat:", data.user);

    window.location.href = "../app.html";
});