# AlgoSolveo — LeetCode Mentor Extension

AlgoSolveo is an interactive, AI-powered LeetCode & DSA mentor side panel Chrome extension designed to help developers master coding interviews rather than copy-pasting solutions.

---

## 🚀 Getting Started & Installation

### 1. Load the Extension in Chrome
1. Download or clone this repository to your computer.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle the **Developer mode** switch in the top-right corner to **ON**.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `AlgoSolveo-main` folder (or the name of the folder where you extracted the ZIP).

### 2. Configure Your AI Provider
1. Click the **Extensions** (puzzle piece) icon in your Chrome toolbar and open **AlgoSolveo**.
2. Click the **Settings ⚙️** (gear icon) in the top-right of the side panel.
3. Choose your preferred AI Provider (e.g. **Groq**, **OpenAI**, or **Ollama**):
   - **Ollama Cloud / Server:** Leave the URL as `https://ollama.com/api`. To get your Ollama API key:
     1. Log in to the [Ollama website](https://ollama.com).
     2. Navigate to **Settings** (`https://ollama.com/settings`).
     3. Go to **Keys** (`https://ollama.com/settings/keys`) to create and copy your API key.
   - **Groq:** Get your API key from the [Groq Console](https://console.groq.com).
   - **OpenAI:** Get your API key from the [OpenAI Platform](https://platform.openai.com).
4. Enter your API key and choose the model, then click **Save Settings**.

### 3. Start Solving!
1. Open any problem on [LeetCode](https://leetcode.com/problems/).
2. Click the **Sync 🔄** button in the header if the problem details do not load automatically.
3. Click the code bracket icon **`</>`** in the chat footer to instantly grab code directly from the LeetCode code editor.
4. Select your preferred teaching style (**Beginner**, **Socratic**, or **Direct**) from the dropdown in the footer.
5. Ask a question or click any quick action button (e.g. **💡 Get Hint**, **📚 Explain Concept**, **🔍 Review Code**) to start!

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
