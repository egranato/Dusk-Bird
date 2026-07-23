// Discord webhooks are always served from these two hosts under /api/webhooks/{id}/{token}.
// Restricting to this shape prevents the field from being used as an open SSRF target.
export const DISCORD_WEBHOOK_URL_REGEX =
  /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
