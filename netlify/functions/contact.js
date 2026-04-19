const jsonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const MAX_FIELD_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1800;

const truncate = (value, limit) => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit - 3)}...` : trimmed;
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: jsonHeaders,
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Methode non autorisee." }),
    };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "Webhook Discord non configure. Ajoutez DISCORD_WEBHOOK_URL cote serveur.",
      }),
    };
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Corps de requete invalide." }),
    };
  }

  const name = truncate(payload.name, MAX_FIELD_LENGTH);
  const contact = truncate(payload.contact, MAX_FIELD_LENGTH);
  const requestType = truncate(payload.requestType, MAX_FIELD_LENGTH);
  const message = truncate(payload.message, MAX_MESSAGE_LENGTH);

  if (!name || !contact || !requestType || !message) {
    return {
      statusCode: 400,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Tous les champs sont requis." }),
    };
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

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: jsonHeaders,
      body: JSON.stringify({
        error: "Le relais Discord a echoue. Verifiez le webhook et redeployez la fonction.",
      }),
    };
  }
};
