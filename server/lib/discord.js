const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';

function normalizeOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

export function getDiscordFeatureConfig() {
  const guildId = normalizeOptionalString(process.env.DISCORD_GUILD_ID);
  const botToken = normalizeOptionalString(process.env.DISCORD_BOT_TOKEN);
  const guildName = normalizeOptionalString(process.env.DISCORD_GUILD_NAME) || 'Hammer Modding';
  const inviteUrl = normalizeOptionalString(process.env.DISCORD_INVITE_URL);
  const manualLinkingEnabled = ['1', 'true', 'yes', 'on'].includes(
    normalizeOptionalString(process.env.SUPABASE_DISCORD_MANUAL_LINKING_ENABLED).toLowerCase(),
  );
  const configured = Boolean(guildId && botToken);

  let requiredForCheckout = configured;
  const explicitRequirement = normalizeOptionalString(process.env.DISCORD_REQUIRED_FOR_CHECKOUT).toLowerCase();
  if (explicitRequirement) {
    requiredForCheckout = !['0', 'false', 'no', 'off'].includes(explicitRequirement);
  }

  return {
    configured,
    requiredForCheckout,
    guildId,
    guildName,
    inviteUrl,
    manualLinkingEnabled,
  };
}

export function extractDiscordIdentityFromUser(authUser) {
  if (!authUser || typeof authUser !== 'object') return null;

  const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
  const discordIdentity = identities.find((identity) => String(identity?.provider || '').toLowerCase() === 'discord') || null;
  const identityData = discordIdentity?.identity_data && typeof discordIdentity.identity_data === 'object'
    ? discordIdentity.identity_data
    : {};

  const discordUserId = normalizeOptionalString(
    discordIdentity?.provider_id
      || identityData?.provider_id
      || identityData?.user_id
      || identityData?.sub
      || identityData?.id
      || authUser?.user_metadata?.provider_id,
  );

  if (!discordUserId) return null;

  return {
    discordUserId,
    username: normalizeOptionalString(identityData?.username || authUser?.user_metadata?.preferred_username || authUser?.user_metadata?.user_name),
    globalName: normalizeOptionalString(identityData?.global_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name),
    avatar: normalizeOptionalString(identityData?.avatar),
    email: normalizeOptionalString(identityData?.email || authUser?.email),
  };
}

async function discordApiGet(path) {
  const config = getDiscordFeatureConfig();
  if (!config.configured) {
    const error = new Error('Discord-Konfiguration unvollständig.');
    error.statusCode = 503;
    error.publicMessage = 'Discord-Konfiguration unvollständig.';
    throw error;
  }

  const response = await fetch(`${DISCORD_API_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      Accept: 'application/json',
    },
  });

  return response;
}

export async function getGuildMembershipStatus({ discordUserId }) {
  const config = getDiscordFeatureConfig();
  if (!config.configured || !discordUserId) {
    return {
      configured: config.configured,
      checked: false,
      inGuild: false,
      guildId: config.guildId,
      guildName: config.guildName,
      inviteUrl: config.inviteUrl,
      checkedAt: new Date().toISOString(),
      member: null,
    };
  }

  const response = await discordApiGet(`/guilds/${encodeURIComponent(config.guildId)}/members/${encodeURIComponent(String(discordUserId))}`);

  if (response.status === 404) {
    return {
      configured: true,
      checked: true,
      inGuild: false,
      guildId: config.guildId,
      guildName: config.guildName,
      inviteUrl: config.inviteUrl,
      checkedAt: new Date().toISOString(),
      member: null,
    };
  }

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || 'Discord-Anfrage fehlgeschlagen.';
    const error = new Error(detail);
    error.statusCode = response.status;
    error.publicMessage = `Discord-Fehler: ${detail}`;
    throw error;
  }

  return {
    configured: true,
    checked: true,
    inGuild: true,
    guildId: config.guildId,
    guildName: config.guildName,
    inviteUrl: config.inviteUrl,
    checkedAt: new Date().toISOString(),
    member: payload,
  };
}
