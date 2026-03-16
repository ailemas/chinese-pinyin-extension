export default async function handler(request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    return response.status(200).end();
  }

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";

  if (!text) {
    return response.status(400).json({ error: "Missing text." });
  }

  if (!process.env.DEEPL_API_KEY) {
    return response.status(500).json({ error: "Missing DEEPL_API_KEY." });
  }

  try {
    const deeplResponse = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: [text],
        source_lang: "ZH",
        target_lang: "EN"
      })
    });

    const data = await deeplResponse.json().catch(() => ({}));

    if (!deeplResponse.ok) {
      return response.status(deeplResponse.status).json({
        error: data.message || data.detail || "DeepL request failed."
      });
    }

    const translation = data.translations?.[0]?.text?.trim();

    if (!translation) {
      return response.status(502).json({ error: "DeepL returned no translation." });
    }

    return response.status(200).json({ translation });
  } catch (error) {
    return response.status(500).json({ error: "Server error while contacting DeepL." });
  }
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
