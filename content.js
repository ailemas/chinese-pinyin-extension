const STORAGE_KEY = "selectionMode";
const DEFAULT_MODE = "pinyin";
const WRAPPER_CLASS = "pinyin-overlay-selection";
const CHINESE_CLASS = "pinyin-overlay-char";
const PINYIN_CLASS = "pinyin-overlay-text";
const TRANSLATION_OVERLAY_CLASS = "pinyin-overlay-translation-overlay";
const TRANSLATION_TITLE_CLASS = "pinyin-overlay-translation-title";
const TRANSLATION_TEXT_CLASS = "pinyin-overlay-translation-text";
const STYLE_ID = "pinyin-overlay-style";
const CHINESE_CHAR_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

let mode = DEFAULT_MODE;
let activeWrappers = [];
let activeOverlay = null;
let selectionTimer = null;
let requestSequence = 0;

const translator = createTranslator();

injectStyles();
hydrateState();

document.addEventListener("mouseup", scheduleSelectionProcessing, true);
document.addEventListener("keyup", scheduleSelectionProcessing, true);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SET_MODE") {
    mode = normalizeMode(message.mode);
    clearAnnotations();
  }

  if (message?.type === "CLEAR_ANNOTATIONS") {
    clearAnnotations();
  }

  sendResponse?.({ ok: true });
  return false;
});

async function hydrateState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  mode = normalizeMode(stored[STORAGE_KEY]);
  clearAnnotations();
}

function scheduleSelectionProcessing() {
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(processSelection, 20);
}

async function processSelection() {
  if (mode === "off") {
    return;
  }

  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    clearAnnotations();
    return;
  }

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString().trim();

  if (!selectedText || !CHINESE_CHAR_PATTERN.test(selectedText)) {
    clearAnnotations();
    return;
  }

  if (mode === "translation") {
    const currentRequest = ++requestSequence;
    clearAnnotations();

    const translation = await translator.translate(selectedText);

    if (currentRequest !== requestSequence || mode !== "translation") {
      return;
    }

    showTranslationOverlay(range, translation);
    selection.removeAllRanges();
    return;
  }

  const segments = collectSelectedTextSegments(range);

  if (segments.length === 0) {
    clearAnnotations();
    return;
  }

  clearAnnotations();

  for (const segment of segments.reverse()) {
    annotateSegment(segment);
  }

  selection.removeAllRanges();
}

function normalizeMode(value) {
  return ["off", "pinyin", "translation"].includes(value) ? value : DEFAULT_MODE;
}

function collectSelectedTextSegments(range) {
  const segments = [];
  const root = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    ? range.commonAncestorContainer.parentNode
    : range.commonAncestorContainer;

  if (!root) {
    return segments;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (!range.intersectsNode(node)) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest(`.${WRAPPER_CLASS}`)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let currentNode = walker.currentNode;

  if (currentNode?.nodeType === Node.TEXT_NODE && range.intersectsNode(currentNode)) {
    addSegment(currentNode, range, segments);
  }

  while (walker.nextNode()) {
    addSegment(walker.currentNode, range, segments);
  }

  return segments.filter((segment) => segment.start < segment.end);
}

function addSegment(node, range, segments) {
  const start = node === range.startContainer ? range.startOffset : 0;
  const end = node === range.endContainer ? range.endOffset : node.nodeValue.length;

  if (start === end) {
    return;
  }

  segments.push({ node, start, end });
}

function annotateSegment(segment) {
  const { node, start, end } = segment;

  if (!node.parentNode || !node.nodeValue) {
    return;
  }

  let selectedNode = node;

  if (end < selectedNode.nodeValue.length) {
    selectedNode.splitText(end);
  }

  if (start > 0) {
    selectedNode = selectedNode.splitText(start);
  }

  const selectedText = selectedNode.nodeValue;

  if (!selectedText || !CHINESE_CHAR_PATTERN.test(selectedText)) {
    return;
  }

  const wrapper = document.createElement("span");
  wrapper.className = WRAPPER_CLASS;
  wrapper.dataset.originalText = selectedText;
  wrapper.innerHTML = window.pinyinPro.html(selectedText, {
    wrapNonChinese: false,
    resultClass: WRAPPER_CLASS,
    chineseClass: CHINESE_CLASS,
    pinyinClass: PINYIN_CLASS
  });

  selectedNode.parentNode.replaceChild(wrapper, selectedNode);
  activeWrappers.push(wrapper);
}

function clearAnnotations() {
  requestSequence += 1;

  for (const wrapper of activeWrappers) {
    if (!wrapper.isConnected) {
      continue;
    }

    wrapper.replaceWith(document.createTextNode(wrapper.dataset.originalText ?? wrapper.textContent ?? ""));
  }

  activeWrappers = [];

  if (activeOverlay?.isConnected) {
    activeOverlay.remove();
  }

  activeOverlay = null;
}

function showTranslationOverlay(range, translation) {
  if (!translation) {
    return;
  }

  const rect = range.getBoundingClientRect();

  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = TRANSLATION_OVERLAY_CLASS;
  overlay.innerHTML = `
    <div class="${TRANSLATION_TITLE_CLASS}">English</div>
    <div class="${TRANSLATION_TEXT_CLASS}">${escapeHtml(translation)}</div>
  `;

  const top = window.scrollY + rect.top - 12;
  const left = window.scrollX + rect.left;

  overlay.style.top = `${Math.max(window.scrollY + 8, top)}px`;
  overlay.style.left = `${left}px`;

  document.body.appendChild(overlay);
  activeOverlay = overlay;
}

function createTranslator() {
  return {
    async translate(text) {
      return mockTranslateChineseToEnglish(text);
    }
  };
}

function mockTranslateChineseToEnglish(text) {
  const normalized = text.replace(/\s+/g, "");
  const phraseDictionary = new Map([
    ["你好", "hello"],
    ["谢谢", "thank you"],
    ["再见", "goodbye"],
    ["对不起", "sorry"],
    ["没关系", "it's okay"],
    ["我爱你", "I love you"],
    ["中国", "China"],
    ["美国", "United States"],
    ["老师", "teacher"],
    ["学生", "student"],
    ["今天", "today"],
    ["明天", "tomorrow"],
    ["昨天", "yesterday"],
    ["吃饭", "eat a meal"],
    ["喝水", "drink water"]
  ]);

  if (phraseDictionary.has(normalized)) {
    return phraseDictionary.get(normalized);
  }

  const characterDictionary = new Map([
    ["我", "I / me"],
    ["你", "you"],
    ["他", "he / him"],
    ["她", "she / her"],
    ["们", "plural marker"],
    ["是", "to be"],
    ["的", "possessive particle"],
    ["不", "not"],
    ["在", "at / in"],
    ["有", "have / there is"],
    ["人", "person"],
    ["中", "middle / China"],
    ["国", "country"],
    ["学", "study"],
    ["生", "student / life"],
    ["老", "old"],
    ["师", "teacher"],
    ["天", "day / sky"],
    ["气", "air / weather"],
    ["好", "good"],
    ["吃", "eat"],
    ["喝", "drink"],
    ["水", "water"],
    ["看", "look / watch"],
    ["书", "book"],
    ["猫", "cat"],
    ["狗", "dog"]
  ]);

  const glosses = Array.from(normalized)
    .filter((character) => CHINESE_CHAR_PATTERN.test(character))
    .map((character) => characterDictionary.get(character))
    .filter(Boolean);

  if (glosses.length > 0) {
    return glosses.join(" | ");
  }

  return `Mock translation preview for "${text}". Swap the translator adapter in content.js for a real API later.`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${WRAPPER_CLASS} {
      display: inline;
    }

    .${WRAPPER_CLASS} ruby {
      ruby-position: over;
    }

    .${WRAPPER_CLASS} .${CHINESE_CLASS} {
      color: inherit;
    }

    .${WRAPPER_CLASS} .${PINYIN_CLASS} {
      color: #1f6eeb;
      font-size: 0.72em;
      font-weight: 700;
      letter-spacing: 0.02em;
      user-select: none;
    }

    .${TRANSLATION_OVERLAY_CLASS} {
      position: absolute;
      z-index: 2147483647;
      max-width: min(320px, calc(100vw - 24px));
      padding: 10px 12px;
      border: 1px solid rgba(31, 110, 235, 0.24);
      border-radius: 14px;
      background: linear-gradient(180deg, rgba(248, 252, 255, 0.98), rgba(229, 241, 255, 0.98));
      box-shadow: 0 16px 32px rgba(18, 48, 79, 0.16);
      color: #12304f;
      pointer-events: none;
      backdrop-filter: blur(8px);
    }

    .${TRANSLATION_TITLE_CLASS} {
      margin-bottom: 4px;
      color: #1f6eeb;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .${TRANSLATION_TEXT_CLASS} {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
}
