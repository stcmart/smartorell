import { supabaseClient } from './supabase.js';

// ELEMENTS DEL DOM

const $ = id => document.getElementById(id);

const form = $("login-form");
const emailInput = $("email");
const passwordInput = $("password");
const welcomeTitle = $("welcome-title");
const backButton = $("back-button");

const loginError = $("login-error");
const loginErrorMessage = $("login-error-message");

const requestSent = $("request-sent");
const requestEmailDisplay = $("request-email-display");

const forgotPasswordLink = $("forgot-password-link");

const otpSection = $("otp-section");
const otpInputs = [...document.querySelectorAll(".otp-input")];
const resendOtpButton = $("resend-otp");
const otpResendMessage = $("otp-resend-message");

const resetSection = $("reset-password-section");
const newPasswordInput = $("new-password");
const confirmPasswordInput = $("confirm-password");

const passwordUpdatedSection = $("password-updated-section");

// CONFIGURACIÓ

const RESEND_COOLDOWN = 60;

let recoveryEmail = "";
let recoveryCodeMode = false;
let recoveryMode = false;
let resendInterval = null;
let resendRemaining = 0;

// COMPROVAR ELEMENTS

const requiredElements = {
    form,
    emailInput,
    passwordInput,
    welcomeTitle,
    backButton,
    loginError,
    loginErrorMessage,
    forgotPasswordLink,
    otpSection,
    resendOtpButton,
    otpResendMessage,
    resetSection,
    newPasswordInput,
    confirmPasswordInput,
    passwordUpdatedSection
};

for (const [name, element] of Object.entries(requiredElements)) {
    if (!element) {
        throw new Error(`Falta l'element HTML: ${name}`);
    }
}

if (otpInputs.length !== 6) {
    throw new Error("Calen exactament 6 camps .otp-input al HTML.");
}

// MISSATGES

function showError(message) {
    loginErrorMessage.textContent = message;
    loginError.classList.add("visible");
}

function hideError() {
    loginError.classList.remove("visible");
}

// REGISTRE

async function requestRegistration(email) {
    const { data, error } = await supabaseClient.rpc(
        "request_registration",
        { user_email: email }
    );

    if (error) {
        console.error(error);
        showError("No s'ha pogut enviar la sol·licitud.");
        return;
    }

    if (!data.created) {
        showError(`Ja has enviat una sol·licitud. Estat actual: ${data.status}`);
        return;
    }

    form.classList.add("request-sent-step");
    welcomeTitle.textContent = "Sol·licitud enviada";

    if (requestEmailDisplay) {
        requestEmailDisplay.textContent = email;
    }

    requestSent.hidden = false;
}

// COMPTE ENRERE OTP

function updateResendMessage() {
    const minutes = Math.floor(resendRemaining / 60);
    const seconds = resendRemaining % 60;

    otpResendMessage.innerHTML = `
        Espera <strong>${minutes > 0 ? `${minutes} min ` : ""}${seconds} s</strong>
    `;
}

function startResendCountdown() {
    clearInterval(resendInterval);

    resendRemaining = RESEND_COOLDOWN;
    resendOtpButton.hidden = true;

    updateResendMessage();

    resendInterval = setInterval(() => {
        resendRemaining--;
        updateResendMessage();

        if (resendRemaining <= 0) {
            clearInterval(resendInterval);
            otpResendMessage.textContent = "";
            resendOtpButton.hidden = false;
        }
    }, 1000);
}

// ENVIAR CODI DE RECUPERACIÓ

async function sendRecoveryCode() {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(
        recoveryEmail
    );

    if (error) {
        console.error(error);
        showError("No s'ha pogut enviar el codi de recuperació.");
        return false;
    }

    otpInputs.forEach(input => input.value = "");
    startResendCountdown();

    return true;
}

// OBLIDAR CONTRASENYA

forgotPasswordLink.addEventListener("click", async event => {
    event.preventDefault();
    hideError();

    recoveryEmail = emailInput.value.trim();

    if (!recoveryEmail) {
        showError("Introdueix primer el teu correu electrònic.");
        emailInput.focus();
        return;
    }

    try {
        const { data, error } = await supabaseClient.rpc(
            "check_allowed_email",
            { user_email: recoveryEmail }
        );

        if (error || !data) {
            showError("No s'ha pogut validar el correu electrònic.");
            return;
        }

        if (!await sendRecoveryCode()) return;

        recoveryCodeMode = true;

        form.classList.remove("password-step");
        form.classList.add("reset-code-step");

        welcomeTitle.textContent = "Restablir contrasenya";

        otpSection.hidden = false;

        emailInput.required = false;
        passwordInput.required = false;

        otpInputs[0].focus();

    } catch (error) {
        console.error(error);
        showError("Hi ha hagut un error. Torna-ho a intentar.");
    }
});

// REENVIAR CODI

resendOtpButton.addEventListener("click", async () => {
    hideError();
    resendOtpButton.disabled = true;

    try {
        if (await sendRecoveryCode()) {
            otpInputs[0].focus();
        }
    } catch (error) {
        console.error(error);
        showError("No s'ha pogut reenviar el codi.");
    } finally {
        resendOtpButton.disabled = false;
    }
});

// GESTIÓ DELS CAMPS OTP

otpInputs.forEach((input, index) => {

    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);

        hideError();

        if (input.value && index < 5) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", event => {
        if (event.key === "Backspace" && !input.value && index > 0) {
            otpInputs[index - 1].focus();
        }

        if (event.key === "ArrowLeft" && index > 0) {
            otpInputs[index - 1].focus();
        }

        if (event.key === "ArrowRight" && index < 5) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("paste", event => {
        event.preventDefault();

        const digits = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

        digits.split("").forEach((digit, i) => {
            otpInputs[i].value = digit;
        });

        otpInputs[Math.min(digits.length, 5)].focus();
    });
});

// BOTÓ TORNAR

backButton.addEventListener("click", event => {
    event.preventDefault();

    if (recoveryMode) return;

    clearInterval(resendInterval);

    form.classList.remove(
        "password-step",
        "request-sent-step",
        "reset-code-step",
        "reset-password-step"
    );

    requestSent.hidden = true;
    otpSection.hidden = true;
    resetSection.hidden = true;

    otpInputs.forEach(input => input.value = "");

    emailInput.disabled = false;
    emailInput.required = true;

    passwordInput.value = "";
    passwordInput.required = false;

    newPasswordInput.value = "";
    newPasswordInput.required = false;

    confirmPasswordInput.value = "";
    confirmPasswordInput.required = false;

    recoveryCodeMode = false;
    recoveryMode = false;
    recoveryEmail = "";

    welcomeTitle.textContent = "Benvingut";

    hideError();
    emailInput.focus();
});

// NETEJAR ERRORS

[
    emailInput,
    passwordInput,
    newPasswordInput,
    confirmPasswordInput,
    ...otpInputs
].forEach(input => {
    input.addEventListener("input", hideError);
});

// SUBMIT: LOGIN, REGISTRE I RECUPERACIÓ

form.addEventListener("submit", async event => {
    event.preventDefault();
    hideError();

    // 0. CONFIRMACIÓ DE CONTRASENYA ACTUALITZADA

    if (form.classList.contains("password-updated-step")) {
        form.classList.remove("password-updated-step");

        passwordUpdatedSection.hidden = true;
        backButton.hidden = false;

        emailInput.value = "";
        passwordInput.value = "";

        emailInput.disabled = false;
        emailInput.required = true;
        passwordInput.required = false;

        form.classList.remove(
            "password-step",
            "reset-code-step",
            "reset-password-step"
        );

        welcomeTitle.textContent = "Benvingut";

        emailInput.focus();
        return;
    }

    try {

        // 1. VERIFICAR CODI OTP

        if (recoveryCodeMode) {
            const token = otpInputs.map(input => input.value).join("");

            if (token.length !== 6) {
                showError("Introdueix els 6 dígits del codi.");
                return;
            }

            const { error } = await supabaseClient.auth.verifyOtp({
                email: recoveryEmail,
                token,
                type: "recovery"
            });

            if (error) {
                console.error(error);
                showError("El codi no és vàlid o ha caducat.");
                return;
            }

            recoveryCodeMode = false;
            recoveryMode = true;

            clearInterval(resendInterval);

            otpSection.hidden = true;
            resetSection.hidden = false;

            form.classList.remove("reset-code-step");
            form.classList.add("reset-password-step");

            welcomeTitle.textContent = "Restablir contrasenya";

            newPasswordInput.required = true;
            confirmPasswordInput.required = true;

            newPasswordInput.focus();
            return;
        }

        // 2. ACTUALITZAR CONTRASENYA

        if (recoveryMode) {
            const password = newPasswordInput.value;
            const confirmation = confirmPasswordInput.value;

            if (password.length < 8) {
                showError("La contrasenya ha de tenir almenys 8 caràcters.");
                return;
            }

            if (password !== confirmation) {
                showError("Les contrasenyes no coincideixen.");
                return;
            }

            // Comprovar contrasenya actual i les 5 anteriors

            const { data: isReused, error: reuseError } =
                await supabaseClient.rpc("password_is_reused", {
                    candidate_password: password
                });

            if (reuseError) {
                console.error(reuseError);
                showError("No s'ha pogut validar la contrasenya. Torna-ho a provar.");
                return;
            }

            if (isReused) {
                showError(
                    "No pots reutilitzar la contrasenya actual ni les 5 anteriors."
                );

                newPasswordInput.focus();
                return;
            }

            // Actualitzar contrasenya

            const { error } = await supabaseClient.auth.updateUser({
                password
            });

            if (error) {
                console.error(error);
                showError("No s'ha pogut actualitzar la contrasenya.");
                return;
            }

            // Mostrar confirmació

            recoveryMode = false;

            resetSection.hidden = true;
            passwordUpdatedSection.hidden = false;

            form.classList.remove("reset-password-step");
            form.classList.add("password-updated-step");

            newPasswordInput.value = "";
            confirmPasswordInput.value = "";

            newPasswordInput.required = false;
            confirmPasswordInput.required = false;

            welcomeTitle.textContent = "";
            backButton.hidden = true;

            return;
        }

        // 3. LOGIN / REGISTRE

        const email = emailInput.value.trim();

        if (!email) return;

        // Comprovar correu

        if (!form.classList.contains("password-step")) {
            const { data: validEmail, error: domainError } =
                await supabaseClient.rpc("check_allowed_email", {
                    user_email: email
                });

            if (domainError || !validEmail) {
                console.error(domainError);

                showError(
                    domainError
                        ? "Hi ha hagut un error. Torna-ho a intentar."
                        : "Correu no vàlid, contacti amb administrador."
                );

                return;
            }

            // Comprovar usuari

            const { data: users, error: userError } =
                await supabaseClient.rpc("check_user_email", {
                    user_email: email
                });

            if (userError) {
                console.error(userError);
                showError("Hi ha hagut un error. Torna-ho a intentar.");
                return;
            }

            // Si no existeix, sol·licitar registre

            if (!users || users.length === 0) {
                await requestRegistration(email);
                return;
            }

            // Si existeix, demanar contrasenya

            welcomeTitle.textContent =
                `Benvingut, ${users[0].nom ?? ""}`;

            form.classList.add("password-step");

            passwordInput.required = true;
            passwordInput.focus();

            return;
        }

        // Iniciar sessió

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password: passwordInput.value
        });

        if (error) {
            console.error(error);
            showError("Contrasenya incorrecta.");
            return;
        }

        window.location.href = "../app.html";

    } catch (error) {
        console.error(error);
        showError("Hi ha hagut un error. Torna-ho a intentar.");
    }
});