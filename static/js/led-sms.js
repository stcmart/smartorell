
import { supabaseClient } from '../../auth/supabase.js';

let senyalitzacioSims = {};

export async function loadSenyalitzacioSims() {
    const { data, error } = await supabaseClient.rpc(
        'get_senyalitzacio_led_sims'
    );

    if (error) {
        console.error('Error carregant SIMs:', error);
        return;
    }

    senyalitzacioSims = data ?? {};
}

document.addEventListener('click', event => {
    const button = event.target.closest('.led-sms-button');
    if (!button) return;

    const sims = senyalitzacioSims[button.dataset.ledGroup] ?? [];

    if (!sims.length) {
        console.warn('No hi ha SIMs per aquest grup');
        return;
    }

    const recipients = sims
        .map(numero => String(numero).trim())
        .filter(Boolean)
        .join(',');

    const message = encodeURIComponent(button.dataset.message ?? '');

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    const isIOS =
        /iPad|iPhone|iPod/i.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    window.location.href = isIOS
        ? `sms:${recipients}&body=${message}`
        : `sms:${recipients}?body=${message}`;
});

loadSenyalitzacioSims();
