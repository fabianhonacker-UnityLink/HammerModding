import { Router } from 'express';
import { getUserFromJwt, getOwnProfile } from '../lib/supabase.js';
import { extractDiscordIdentityFromUser, getDiscordFeatureConfig, getGuildMembershipStatus } from '../lib/discord.js';

export const discordRouter = Router();

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function normalizeOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || '';
}

function buildDiscordDisplayName({ identity, profile }) {
  return normalizeOptionalString(
    profile?.discord_name
      || identity?.globalName
      || identity?.username,
  );
}

discordRouter.get('/status', async (req, res, next) => {
  try {
    const jwt = getBearerToken(req);
    if (!jwt) {
      const error = new Error('Fehlender Login-Token.');
      error.statusCode = 401;
      error.publicMessage = 'Bitte zuerst einloggen.';
      throw error;
    }

    const authUser = await getUserFromJwt(jwt);
    let profile = null;
    try {
      profile = await getOwnProfile(jwt, authUser.id);
    } catch (_error) {
      profile = null;
    }

    const config = getDiscordFeatureConfig();
    const identity = extractDiscordIdentityFromUser(authUser);
    const membership = identity?.discordUserId
      ? await getGuildMembershipStatus({ discordUserId: identity.discordUserId })
      : {
          configured: config.configured,
          checked: false,
          inGuild: false,
          guildId: config.guildId,
          guildName: config.guildName,
          inviteUrl: config.inviteUrl,
          checkedAt: new Date().toISOString(),
          member: null,
        };

    const discordDisplayName = buildDiscordDisplayName({ identity, profile });

    res.json({
      ok: true,
      configured: config.configured,
      requiredForCheckout: config.requiredForCheckout,
      manualLinkingEnabled: config.manualLinkingEnabled,
      guildId: config.guildId,
      guildName: config.guildName,
      inviteUrl: config.inviteUrl,
      connected: Boolean(identity?.discordUserId),
      discordUserId: identity?.discordUserId || '',
      discordDisplayName,
      inGuild: Boolean(membership?.inGuild),
      checked: Boolean(membership?.checked),
      checkedAt: membership?.checkedAt || new Date().toISOString(),
      roleCount: Array.isArray(membership?.member?.roles) ? membership.member.roles.length : 0,
      joinedAt: normalizeOptionalString(membership?.member?.joined_at),
      nick: normalizeOptionalString(membership?.member?.nick),
    });
  } catch (error) {
    next(error);
  }
});
