const STORAGE_KEY = "pinyinEnabled";
const WRAPPER_CLASS = "blue-pinyin-selection";
const CHINESE_CLASS = "blue-pinyin-char";
const PINYIN_CLASS = "blue-pinyin-text";
const STYLE_ID = "blue-pinyin-selection-style";
const CHINESE_CHAR_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

let enabled = true;
let activeWrappers = [];
let selectionTimer = null;

injectStyles();
hydrateState();

document.addEventListener("mouseup", scheduleSelectionProcessing, true);
document.addEventListener("keyup", scheduleSelectionProcessing, true);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "SET_ENABLED") {
    enabled = Boolean(message.enabled);

    if (!enabled) {
      clearAnnotations();
    }
  }

  if (message?.type === "CLEAR_ANNOTATIONS") {
    clearAnnotations();
  }

  sendResponse?.({ ok: true });
  return false;
});

async function hydrateState() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  enabled = stored[STORAGE_KEY] ?? true;

  if (!enabled) {
    clearAnnotations();
  }
}

function scheduleSelectionProcessing() {
  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(processSelection, 20);
}

function processSelection() {
  if (!enabled) {
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
  for (const wrapper of activeWrappers) {
    if (!wrapper.isConnected) {
      continue;
    }

    const fragment = document.createDocumentFragment();

    for (const child of Array.from(wrapper.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains(WRAPPER_CLASS)) {
        const rubyText = child.querySelector(`.${CHINESE_CLASS}`)?.textContent ?? child.textContent ?? "";
        fragment.append(document.createTextNode(rubyText));
      } else {
        fragment.append(child.cloneNode(true));
      }
    }

    wrapper.replaceWith(fragment);
  }

  activeWrappers = [];
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
  `;

  (document.head || document.documentElement).appendChild(style);
}
