// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SCRAPE_PROBLEM") {
    scrapeLeetCodeProblem().then((details) => {
      sendResponse(details);
    }).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // Keep the channel open for asynchronous sendResponse
  }
});

// Fallback: Scrape code from the Monaco Editor DOM
function getCodeFromDOM() {
  const lines = document.querySelectorAll('.monaco-editor .view-line');
  if (lines.length > 0) {
    // Reconstruct the lines. Monaco DOM line elements are usually in order.
    // However, some elements might contain special helper icons/markers.
    // textContent contains the code text for that line.
    return Array.from(lines)
      .map(line => line.textContent)
      .join('\n');
  }
  return "";
}

// Scrape title, difficulty, description and code
async function scrapeLeetCodeProblem() {
  // Title
  let title = "";
  const titleSelectors = [
    'div.text-title-large',
    'span.text-title-large',
    '[data-cy="question-title"]',
    'h4',
    '.question-title'
  ];
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      title = el.textContent.trim();
      break;
    }
  }

  // Fallback title from page title
  if (!title && document.title) {
    title = document.title.replace(" - LeetCode", "").replace(" - LeetCode Describe", "").trim();
  }

  // Difficulty
  let difficulty = "Medium"; // Default fallback
  const diffSelectors = [
    'div.text-difficulty-easy', 'div.text-difficulty-medium', 'div.text-difficulty-hard',
    'span.text-difficulty-easy', 'span.text-difficulty-medium', 'span.text-difficulty-hard',
    '.text-sd-easy', '.text-sd-medium', '.text-sd-hard'
  ];
  for (const selector of diffSelectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim()) {
      difficulty = el.textContent.trim();
      break;
    }
  }

  // If selectors failed, search the text content of divs in the left panel
  if (!difficulty) {
    const elements = document.querySelectorAll('div, span');
    for (const el of elements) {
      if (el.children.length === 0) {
        const text = el.textContent.trim();
        if (text === "Easy" || text === "Medium" || text === "Hard") {
          difficulty = text;
          break;
        }
      }
    }
  }

  // Description & Constraints
  let description = "";
  const descSelectors = [
    'div.elfjS',                  // Modern layout container
    'div[class*="content__"]',     // Older layout content
    'div.question-content',
    '.question-description'
  ];
  for (const selector of descSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      description = el.innerText.trim();
      break;
    }
  }

  // Code editor: Fallback to DOM content in content script
  let code = getCodeFromDOM();

  // Identify preferred language from the LeetCode language dropdown UI if possible
  let language = "Python";
  const langButton = document.querySelector('button[id^="headlessui-listbox-button"]');
  if (langButton && langButton.textContent) {
    language = langButton.textContent.trim();
  } else {
    // Resilient fallback: search all button elements for a match
    const supportedLangs = ["Java", "Python", "Python3", "C++", "C", "C#", "JavaScript", "TypeScript", "Go", "Rust", "Swift", "Kotlin"];
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      if (supportedLangs.includes(text)) {
        language = text;
        break;
      }
    }
  }

  // Extract slug from URL if possible
  let slug = "";
  const urlMatch = window.location.pathname.match(/\/problems\/([^/]+)/);
  if (urlMatch) {
    slug = urlMatch[1];
  }

  return {
    title,
    difficulty,
    description,
    code,
    language,
    url: window.location.href,
    slug
  };
}
