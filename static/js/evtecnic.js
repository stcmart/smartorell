import { supabaseClient } from '../../auth/supabase.js';

export async function loadChargers() {

    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error || !session) {
        console.error('Cal iniciar sessió.');
        return;
    }

    const { data, error: functionError } =
        await supabaseClient.functions.invoke('get-chargers');

    if (functionError) {
        console.error('Error de la funció:', functionError);

        if (functionError.context) {
            console.error(
                'Resposta:',
                await functionError.context.text()
            );
        }

        return [];
    }

    console.log('Carregadors rebuts:', data.chargers);

    return data.chargers;
}