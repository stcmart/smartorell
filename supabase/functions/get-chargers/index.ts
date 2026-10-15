const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {

    if (req.method === 'OPTIONS') {
      return new Response('ok', {
      headers: corsHeaders,
      });
    }

    try {

        // ─────────────────────────
        // Variables Supabase
        // ─────────────────────────

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error("Falten variables de Supabase");
        }

        // ─────────────────────────
        // Token de sessió
        // ─────────────────────────

        const authHeader = req.headers.get("Authorization");

        if (!authHeader) {
            return new Response(
                JSON.stringify({
                    error: "No autenticat"
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        // ─────────────────────────
        // Obtenir usuari actual
        // ─────────────────────────

        const userResponse = await fetch(
            `${supabaseUrl}/auth/v1/user`,
            {
                headers: {
                  ...corsHeaders,
                    "apikey": supabaseAnonKey,
                    "Authorization": authHeader
                }
            }
        );

        if (!userResponse.ok) {
            return new Response(
                JSON.stringify({
                    error: "Sessió no vàlida"
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const user = await userResponse.json();

        // ─────────────────────────
        // Buscar token de l'usuari
        // ─────────────────────────

        const tokenResponse = await fetch(
            `${supabaseUrl}/rest/v1/tokens?usuari=eq.${user.id}&platform=eq.etecnic&select=token`,
            {
                headers: {
                  ...corsHeaders,
                    "apikey": supabaseAnonKey,
                    "Authorization": authHeader
                }
            }
        );

        if (!tokenResponse.ok) {

            console.error(
                await tokenResponse.text()
            );

            return new Response(
                JSON.stringify({
                    error: "Error obtenint el token"
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const tokens = await tokenResponse.json();

        if (!tokens.length) {
            return new Response(
                JSON.stringify({
                    error: "Cap token d'eTecnic assignat"
                }),
                {
                    status: 403,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const etecnicToken = tokens[0].token;

        // ─────────────────────────
        // API eTecnic
        // ─────────────────────────

        const chargerResponse = await fetch(
            "https://etecnic.net/api/v1/etecnic/charger/list.json?get_all=true",
            {
                method: "GET",
                headers: {
                  ...corsHeaders,
                    "Authorization":
                        `Token token=${etecnicToken}`
                }
            }
        );

        if (!chargerResponse.ok) {

            return new Response(
                JSON.stringify({
                    error: "Error consultant l'API eTecnic"
                }),
                {
                    status: chargerResponse.status,
                    headers: {
                      ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const data = await chargerResponse.json();

        // ─────────────────────────
        // Retornar carregadors
        // ─────────────────────────

        return new Response(
            JSON.stringify(data),
            {
                status: 200,
                headers: {
                  ...corsHeaders,
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            }
        );

    } catch (error) {

        console.error(error);

        return new Response(
            JSON.stringify({
                error: "Error intern"
            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );
    }
});