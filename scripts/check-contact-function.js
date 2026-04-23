const assert = require("node:assert/strict");
const { handler } = require("../netlify/functions/contact.js");

const baseEvent = {
  headers: {
    origin: "https://example.netlify.app",
    "x-nf-client-connection-ip": "127.0.0.1",
  },
};

const run = async () => {
  process.env.ALLOWED_ORIGINS = "https://example.netlify.app";
  delete process.env.URL;
  delete process.env.DEPLOY_PRIME_URL;
  delete process.env.DISCORD_WEBHOOK_URL;

  const forbiddenOriginResponse = await handler({
    headers: {
      origin: "https://evil.example",
      "x-nf-client-connection-ip": "127.0.0.9",
    },
    httpMethod: "POST",
    body: "{}",
  });
  assert.equal(forbiddenOriginResponse.statusCode, 403);

  const methodResponse = await handler({
    ...baseEvent,
    httpMethod: "GET",
    body: "",
  });
  assert.equal(methodResponse.statusCode, 405);

  const invalidJsonResponse = await handler({
    ...baseEvent,
    httpMethod: "POST",
    body: "{",
  });
  assert.equal(invalidJsonResponse.statusCode, 400);

  const tooFastResponse = await handler({
    ...baseEvent,
    headers: {
      ...baseEvent.headers,
      "x-nf-client-connection-ip": "127.0.0.2",
    },
    httpMethod: "POST",
    body: JSON.stringify({
      name: "Mia",
      contact: "discord",
      requestType: "Question",
      message: "Test",
      website: "",
      elapsedMs: 200,
    }),
  });
  assert.equal(tooFastResponse.statusCode, 400);

  const honeypotResponse = await handler({
    ...baseEvent,
    httpMethod: "POST",
    body: JSON.stringify({
      name: "Mia",
      contact: "discord",
      requestType: "Question",
      message: "Test",
      website: "https://spam.example",
      elapsedMs: 2000,
    }),
  });
  assert.equal(honeypotResponse.statusCode, 400);

  const missingWebhookResponse = await handler({
    ...baseEvent,
    httpMethod: "POST",
    body: JSON.stringify({
      name: "Mia",
      contact: "discord",
      requestType: "Achat catalogue",
      message: "Demande drone",
      website: "",
      elapsedMs: 2000,
    }),
  });
  assert.equal(missingWebhookResponse.statusCode, 500);

  console.log("contact function smoke tests passed");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
