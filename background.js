const TRANSLATE_ENDPOINT = "https://chinese-pinyin-extension-e5ndqkzgi.vercel.app/api/translate";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "TRANSLATE_TEXT") {
    return false;
  }

  translateSelection(message.text)
    .then((translation) => sendResponse({ ok: true, translation }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

async function translateSelection(text) {
  const normalizedText = typeof text === "string" ? text.trim() : "";

  if (!normalizedText) {
    throw new Error("No text selected.");
  }

  if (TRANSLATE_ENDPOINT.includes("YOUR-VERCEL-PROJECT")) {
    throw new Error("Set your Vercel translate URL in background.js first.");
  }

  const response = await fetch(normalizeTranslateEndpoint(TRANSLATE_ENDPOINT), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: normalizedText })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Translation request failed.");
  }

  if (!data.translation) {
    throw new Error("No translation was returned.");
  }

  return data.translation;
}

function normalizeTranslateEndpoint(endpoint) {
  return endpoint.endsWith("/api/translate") ? endpoint : `${endpoint.replace(/\/$/, "")}/api/translate`;
}
