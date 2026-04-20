import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Fehlende Umgebungsvariable: ${name}`);
    error.statusCode = 500;
    error.publicMessage = `Server-Konfiguration unvollständig: ${name}.`;
    throw error;
  }
  return value;
}

export function createAnonServerClient(jwt = '') {
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const publishableKey = requireEnv('SUPABASE_PUBLISHABLE_KEY');

  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: jwt
      ? {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      : undefined,
  });
}

export async function getUserFromJwt(jwt) {
  const supabase = createAnonServerClient();
  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) {
    const err = new Error(error?.message || 'Ungültige Sitzung.');
    err.statusCode = 401;
    err.publicMessage = 'Sitzung ungültig oder abgelaufen.';
    throw err;
  }
  return data.user;
}

export async function getOwnProfile(jwt, userId) {
  const supabase = createAnonServerClient(jwt);
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,username,discord_name,cfx_identifier,avatar_url,role,is_active')
    .eq('id', userId)
    .single();

  if (error || !data) {
    const err = new Error(error?.message || 'Profil nicht gefunden.');
    err.statusCode = 404;
    err.publicMessage = 'Profil nicht gefunden.';
    throw err;
  }

  return data;
}
