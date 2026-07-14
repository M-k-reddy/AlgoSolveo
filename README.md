# AlgoSolveo — LeetCode Mentor Extension

AlgoSolveo is an interactive, AI-powered LeetCode & DSA mentor side panel Chrome extension designed to help developers master coding interviews rather than copy-pasting solutions.

---

## 🗺️ Roadmap & Problems Source
The collapsible pattern roadmap in this extension is populated with **315 curated DSA problems across 49 patterns**. 
- **Source:** Compiled from curated, industry-standard DSA patterns and problem-solving tracks.
- **Format:** Grouped by structural patterns (e.g. Two Pointers, Sliding Window, Prefix Sum, Kadane's, Binary Search, etc.).
- **Interactive Features:** 
  - Clicking a problem title automatically opens its LeetCode page in a new tab and closes the roadmap panel.
  - Checkboxes track solved progress, persisting status in `chrome.storage.local` using problem URL slugs.

---

## 📚 Prompt Guidelines & Reference Styles
To ensure high-quality, beginner-friendly instruction, the extension implements 3 customizable **Tutor Styles** in the footer input area, aligned with standard reference repo formatting:

1. **Beginner-Friendly (Simple code & analogies):**
   - Assumes zero prior knowledge, uses analogies (e.g. supermarket lines for two-pointer swaps).
   - Breaks down intuition step-by-step.
   - Shows problem progression (e.g. 2Sum $\rightarrow$ 3Sum $\rightarrow$ 4Sum).
   - Loops and structures are written clearly without dense library hacks.
2. **Socratic (Guided questions):**
   - Prompts the user with conceptual questions (e.g. *"What does in-place mean?"*) and guides them to discover the logic themselves before providing solutions.
3. **Direct (Explanatory):**
   - Clean, highly condensed explanation focusing on key insights, a compact table trace, and performance metrics.

### ⚠️ Absolute Mandatory Code Rules
- **Brute Force is Mandatory:** Every tutor explanation *must* include a full, working brute force code block. To prevent complex code clutter, using standard Collections/helpers (like `HashSet` or `ArrayList` in Java) is allowed to avoid manual deduplication loops, keeping the brute force clean and under 15 lines.
- **Optimized is Mandatory:** The optimized solution *must* be included, written in standard, clean, interview-quality Java (standard APIs like `Arrays.sort()`, `Arrays.asList()`, and standard collections are permitted and expected).
- **Language Alignment:** All explanation text and code blocks are automatically translated and formatted in the user's preferred language.

---

## 🛠️ Technical Architecture

### 1. File Structure
- `manifest.json`: Configuration specifying Manifest V3 parameters, sidePanel, storage, activeTab, and scripting permissions.
- `background.js`: Service worker handling extension installation, sidebar behavior overrides, and tab activation change listeners.
- `content.js`: Injected script that scrapes problem metadata (title, difficulty, description, current language) from the LeetCode DOM.
- `sidepanel.html` & `sidepanel.css`: Clean, dark-themed responsive sidebar interface featuring collapsible trees, settings modal, and footer controls.
- `sidepanel.js`: Main coordinator orchestrating AI API calls, managing solved state, settings preservation, and synchronization of the footer style picker.
- `markdown.js`: Custom markdown renderer that supports code block parsing, table styling, and LaTeX formatting.

### 2. Editor Code Synchronization ("Grab Code")
When the user clicks the code bracket button `</>` in the footer:
- It queries the active LeetCode tab.
- Runs a script inside the page's execution context (`world: 'MAIN'`) to access LeetCode's direct Monaco editor instance:
  ```javascript
  window.monaco.editor.getModels()[0].getValue();
  ```
- Pulls the editor code directly into the side panel state to make it instantly accessible during "Review Code" or "Optimize" actions.
