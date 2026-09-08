const SUPABASE_URL = "https://zfhkelulfbnotagrlenl.supabase.co";
const SUPABASE_KEY = "sb_publishable_TTrqEFYf1bjHlrAJrvo7QQ_qF-8AjIl";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const form = document.querySelector("#login-form");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(error);
        alert("Correu o contrasenya incorrectes.");
        return;
    }

    console.log("Usuari autenticat:", data.user);

    // Aquí pots redirigir a la pàgina principal
    window.location.href = "index.html";
});

console.log("login.js carregat");
console.log("Supabase:", window.supabase);