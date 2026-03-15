const STORAGE_KEY = "pinyinEnabled";

const enabledToggle = document.getElementById("enabled-toggle");
const clearButton = document.getElementById("clear-button");
const status = document.getElementById("status");

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
  const { [STORAGE_KEY]: storedValue = true } = await chrome.storage.local.get(STORAGE_KEY);
  enabledToggle.checked = storedValue;
  setStatus(storedValue ? "Pinyin is on for new selections." : "Pinyin is off.");
}

enabledToggle.addEventListener("change", async () => {
  const enabled = enabledToggle.checked;
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
  const delivered = await sendMessageToActiveTab({ type: "SET_ENABLED", enabled });

  if (delivered) {
    setStatus(enabled ? "Pinyin is on for new selections." : "Pinyin is off and the page was cleared.");
  }
});

clearButton.addEventListener("click", async () => {
  const delivered = await sendMessageToActiveTab({ type: "CLEAR_ANNOTATIONS" });

  if (delivered) {
    setStatus("The page is back to normal.");
  }
});

initializePopup();
