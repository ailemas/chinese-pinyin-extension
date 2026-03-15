const STORAGE_KEY = "selectionMode";
const DEFAULT_MODE = "pinyin";

const clearButton = document.getElementById("clear-button");
const status = document.getElementById("status");
const modeInputs = Array.from(document.querySelectorAll('input[name="selection-mode"]'));

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(message) {
  status.textContent = message;
}

async function sendMessageToActiveTab(message) {
  const tab = await getActiveTab();

  if (!tab?.id) {
    setStatus("Open a normal web page to use Pinyin.");
    return false;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, message);
    return true;
  } catch (error) {
    setStatus("Reload the page after enabling the extension on this tab.");
    return false;
  }
}

async function initializePopup() {
  const { [STORAGE_KEY]: storedValue = DEFAULT_MODE } = await chrome.storage.local.get(STORAGE_KEY);
  const currentMode = normalizeMode(storedValue);
  const currentInput = modeInputs.find((input) => input.value === currentMode);

  if (currentInput) {
    currentInput.checked = true;
  }

  setStatus(getModeStatus(currentMode));
}

function normalizeMode(value) {
  return ["off", "pinyin", "translation"].includes(value) ? value : DEFAULT_MODE;
}

function getModeStatus(mode) {
  if (mode === "off") {
    return "Overlays are off and the page stays clear.";
  }

  if (mode === "translation") {
    return "English mode is on for new selections.";
  }

  return "Pinyin mode is on for new selections.";
}

for (const input of modeInputs) {
  input.addEventListener("change", async () => {
    if (!input.checked) {
      return;
    }

    const mode = normalizeMode(input.value);
    await chrome.storage.local.set({ [STORAGE_KEY]: mode });
    const delivered = await sendMessageToActiveTab({ type: "SET_MODE", mode });

    if (delivered) {
      setStatus(getModeStatus(mode));
    }
  });
}

clearButton.addEventListener("click", async () => {
  const delivered = await sendMessageToActiveTab({ type: "CLEAR_ANNOTATIONS" });

  if (delivered) {
    setStatus("The page is back to normal.");
  }
});

initializePopup();
