const baseHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  Vary: "Origin",
};

const MAX_BODY_LENGTH = 4096;
const MAX_FIELD_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1024;
const MIN_FORM_ELAPSED_MS = 1200;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 5;
const DEFAULT_RATE_LIMIT_STORE_MAX = 5000;
const REQUEST_TYPES = new Set([
  "Rendez-vous",
  "Question",
  "Mise en relation",
  "BNI Connect",
  "BNI Linked",
  "Achat catalogue",
  "Service hologrammes",
  "Service marketing",
  "Service communication",
  "Objet personnalise",
  "Autre",
]);
const DISCORD_HOSTS = new Set(["discord.com", "discordapp.com", "canary.discord.com", "ptb.discord.com"]);
const LOCAL_ALLOWED_ORIGINS = [
  "http://localhost:8888",
  "http://127.0.0.1:8888",
  "http://localhost:3999",
  "http://127.0.0.1:3999",
];
const rateLimitStore = new Map();

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_WINDOW_MS = parsePositiveInteger(
  process.env.CONTACT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_RATE_LIMIT_WINDOW_MS
);
const RATE_LIMIT_MAX = parsePositiveInteger(process.env.CONTACT_RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX);
const RATE_LIMIT_STORE_MAX = parsePositiveInteger(
  process.env.CONTACT_RATE_LIMIT_STORE_MAX,
  DEFAULT_RATE_LIMIT_STORE_MAX
);

const getHeader = (headers, name) => {
  const target = name.toLowerCase();
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
  return entry ? String(entry[1]) : "";
};

const normalizeOrigin = (origin) => {
  if (!origin) {
    return "";
  }

  try {
    return new URL(origin).origin;
  } catch (error) {
    return "";
  }
};

const getAllowedOrigins = () => {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter(Boolean);

  const netlifyOrigins = [process.env.URL, process.env.DEPLOY_PRIME_URL]
    .map((origin) => normalizeOrigin(origin || ""))
    .filter(Boolean);

  const localOrigins =
    process.env.NETLIFY_DEV === "true" || process.env.ALLOW_LOCAL_ORIGINS === "true"
      ? LOCAL_ALLOWED_ORIGINS
      : [];

  return [...new Set([...configured, ...netlifyOrigins, ...localOrigins])];
};

const isAllowedOrigin = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);

  if (!normalizedOrigin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(normalizedOrigin);
};

const buildHeaders = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  const headers = { ...baseHeaders };

  if (normalizedOrigin && isAllowedOrigin(normalizedOrigin)) {
    headers["Access-Control-Allow-Origin"] = normalizedOrigin;
  }

  return headers;
};

const jsonResponse = (statusCode, body, origin) => ({
  statusCode,
  headers: buildHeaders(origin),
  body: body === "" ? "" : JSON.stringify(body),
});

const truncate = (value, limit) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3)}...` : trimmed;
};

const getClientKey = (event) => {
  const forwardedFor = getHeader(event.headers, "x-forwarded-for").split(",")[0].trim();
  return (
    getHeader(event.headers, "x-nf-client-connection-ip") ||
    getHeader(event.headers, "client-ip") ||
    forwardedFor ||
    "unknown"
  );
};

const pruneRateLimitStore = (now) => {
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  while (rateLimitStore.size > RATE_LIMIT_STORE_MAX) {
    const oldestKey = rateLimitStore.keys().next().value;

    if (!oldestKey) {
      return;
    }

    rateLimitStore.delete(oldestKey);
  }
};

const isRateLimited = (clientKey) => {
  const now = Date.now();

  pruneRateLimitStore(now);

  const current = rateLimitStore.get(clientKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (current.resetAt <= now) {
    rateLimitStore.set(clientKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    pruneRateLimitStore(now);
    return false;
  }

  current.count += 1;
  rateLimitStore.set(clientKey, current);
  pruneRateLimitStore(now);
  return current.count > RATE_LIMIT_MAX;
};

const isDiscordWebhookUrl = (webhookUrl) => {
  try {
    const parsedUrl = new URL(webhookUrl);
    return (
      parsedUrl.protocol === "https:" &&
      DISCORD_HOSTS.has(parsedUrl.hostname) &&
      parsedUrl.pathname.startsWith("/api/webhooks/")
    );
  } catch (error) {
    return false;
  }
};

exports.handler = async (event) => {
  const origin = getHeader(event.headers, "origin");

  if (!isAllowedOrigin(origin)) {
    return jsonResponse(403, { error: "Origine non autorisee." }, "");
  }

  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, "", origin);
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Methode non autorisee." }, origin);
  }

  if ((event.body || "").length > MAX_BODY_LENGTH) {
    return jsonResponse(413, { error: "Requete trop volumineuse." }, origin);
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return jsonResponse(400, { error: "Corps de requete invalide." }, origin);
  }

  if (truncate(payload.website, MAX_FIELD_LENGTH)) {
    return jsonResponse(400, { error: "Transmission refusee." }, origin);
  }

  const elapsedMs = Number(payload.elapsedMs);

  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_FORM_ELAPSED_MS) {
    return jsonResponse(400, { error: "Transmission trop rapide. Reessayez dans un instant." }, origin);
  }

  const name = truncate(payload.name, MAX_FIELD_LENGTH);
  const contact = truncate(payload.contact, MAX_FIELD_LENGTH);
  const requestType = truncate(payload.requestType, MAX_FIELD_LENGTH);
  const message = truncate(payload.message, MAX_MESSAGE_LENGTH);

  if (!name || !contact || !requestType || !message) {
    return jsonResponse(400, { error: "Tous les champs sont requis." }, origin);
  }

  if (!REQUEST_TYPES.has(requestType)) {
    return jsonResponse(400, { error: "Type de demande invalide." }, origin);
  }

  if (isRateLimited(getClientKey(event))) {
    return jsonResponse(429, { error: "Trop de demandes. Reessayez plus tard." }, origin);
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl || !isDiscordWebhookUrl(webhookUrl)) {
    return jsonResponse(
      500,
      { error: "Webhook Discord non configure. Ajoutez DISCORD_WEBHOOK_URL cote serveur." },
      origin
    );
  }

  const discordPayload = {
    username: "BNI Intake",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "Nouvelle demande depuis le site BNI",
        color: 23524,
        timestamp: new Date().toISOString(),
        fields: [
          {
            name: "Identifiant",
            value: name,
            inline: true,
          },
          {
            name: "Canal de retour",
            value: contact,
            inline: true,
          },
          {
            name: "Type de demande",
            value: requestType,
            inline: false,
          },
          {
            name: "Message",
            value: message,
            inline: false,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(details || "Reponse Discord non valide.");
    }

    return jsonResponse(200, { ok: true }, origin);
  } catch (error) {
    return jsonResponse(
      502,
      { error: "Le relais Discord a echoue. Verifiez le webhook et redeployez la fonction." },
      origin
    );
  }
};
