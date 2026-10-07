import { supabaseClient } from "../auth/supabase.js";

const logoutButton = document.getElementById("logoutButton");

logoutButton.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Error al tancar sessió:", error);
        return;
    }

    window.location.href = "./auth/login.html";
});