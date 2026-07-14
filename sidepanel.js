// State Management
let state = {
  preferredLanguage: "Python",
  tutorStyle: "Socratic",
  interviewerPersonality: "Neutral",
  autoSyncCode: false,
  activeMode: "AUTO", // AUTO, TUTOR, HINT, REVIEW, INTERVIEW, PATTERN
  activeProblem: null, // { title, difficulty, description, code, language, url }
  chatHistory: [], // { role: 'user'|'model', text: string, mode: string }
  sessions: {}, // Maps problemTitle -> chatHistory array
  solvedProblems: [], // List of solved LeetCode problem IDs for pattern roadmap
  
  // Multi-Provider settings
  provider: "groq", // groq, ollama, openai
  groqKey: "",
  groqModel: "llama-3.3-70b-versatile",
  ollamaUrl: "http://localhost:11434",
  ollamaKey: "",
  ollamaModel: "llama3",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  activeGroqModels: [] // Cache for active Groq models fetched dynamically
};

// UI Elements
const chatHistoryEl = document.getElementById("chat-history");
const chatInputEl = document.getElementById("chat-input");
const sendMsgBtn = document.getElementById("send-msg-btn");
const syncProblemBtn = document.getElementById("sync-problem-btn");
const grabCodeBtn = document.getElementById("grab-code-btn");
const codeSyncBadge = document.getElementById("code-sync-badge");
const toggleSettingsBtn = document.getElementById("toggle-settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const clearChatBtn = document.getElementById("clear-chat-btn");
const headerClearChatBtn = document.getElementById("header-clear-chat-btn");
const typingIndicator = document.getElementById("typing-indicator");

// Saved Chats Elements
const toggleHistoryBtn = document.getElementById("toggle-history-btn");
const closeHistoryBtn = document.getElementById("close-history-btn");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");

// Pattern Roadmap Elements
const toggleRoadmapBtn = document.getElementById("toggle-roadmap-btn");
const closeRoadmapBtn = document.getElementById("close-roadmap-btn");
const roadmapPanel = document.getElementById("roadmap-panel");
const roadmapList = document.getElementById("roadmap-list");


// Settings Inputs
const providerSelect = document.getElementById("provider-select");
const languageSelect = document.getElementById("language-select");
const tutorStyleSelect = document.getElementById("tutor-style");
const footerTutorStyleSelect = document.getElementById("footer-tutor-style");
const interviewerPersonalitySelect = document.getElementById("interviewer-personality");
const autoSyncCodeCheckbox = document.getElementById("auto-sync-code");

// Provider Groups
const groqGroup = document.getElementById("groq-group");
const ollamaGroup = document.getElementById("ollama-group");
const openaiGroup = document.getElementById("openai-group");

const groqKeyInput = document.getElementById("groq-key-input");
const groqModelSelect = document.getElementById("groq-model-select");

const ollamaUrlInput = document.getElementById("ollama-url-input");
const ollamaKeyInput = document.getElementById("ollama-key-input");
const ollamaModelSelect = document.getElementById("ollama-model-select");
const ollamaModelInput = document.getElementById("ollama-model-input");

const openaiKeyInput = document.getElementById("openai-key-input");
const openaiModelSelect = document.getElementById("openai-model-select");

// Mode Tabs
const modeTabs = document.querySelectorAll(".mode-tab");

// Problem Info Elements
const problemInfoEl = document.getElementById("problem-info");
const problemTitleEl = document.getElementById("problem-title");
const problemDifficultyEl = document.getElementById("problem-difficulty");
const languageModal = document.getElementById("language-modal");
const langOptBtns = document.querySelectorAll(".lang-opt-btn");

// Initialize Settings and Listeners on Load
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  setupEventListeners();
  updateProviderUI();
  await loadGroqModelsDynamically();
  await syncFromActiveTab();
  
  // Welcome message if chat history is empty
  if (state.chatHistory.length > 0) {
    renderChatHistory();
  }
});

// Load Settings from Chrome Storage
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      [
        "preferredLanguage", "tutorStyle", "interviewerPersonality", "autoSyncCode", 
        "chatHistory", "provider", "groqKey", "groqModel", 
        "ollamaUrl", "ollamaKey", "ollamaModel", "openaiKey", "openaiModel", "sessions",
        "hasSelectedLanguage", "solvedProblems"
      ],
      (result) => {
        state.preferredLanguage = result.preferredLanguage || "Python";
        state.hasSelectedLanguage = result.hasSelectedLanguage || false;
        state.tutorStyle = result.tutorStyle || "Socratic";
        state.interviewerPersonality = result.interviewerPersonality || "Neutral";
        state.autoSyncCode = !!result.autoSyncCode;
        state.chatHistory = result.chatHistory || [];
        state.sessions = result.sessions || {};
        state.solvedProblems = result.solvedProblems || [];
        
        state.provider = result.provider || "groq";
        // Migrate old provider values to groq
        if (state.provider === "chrome-ai" || state.provider === "gemini") {
          state.provider = "groq";
        }
        state.groqKey = result.groqKey || "";
        state.groqModel = result.groqModel || "llama-3.3-70b-versatile";
        state.ollamaUrl = result.ollamaUrl || "http://localhost:11434";
        state.ollamaKey = result.ollamaKey || "";
        state.ollamaModel = result.ollamaModel || "llama3";
        state.openaiKey = result.openaiKey || "";
        state.openaiModel = result.openaiModel || "gpt-4o-mini";
        
        // Sync values to UI settings inputs
        providerSelect.value = state.provider;
        languageSelect.value = state.preferredLanguage;
        tutorStyleSelect.value = state.tutorStyle;
        if (footerTutorStyleSelect) {
          footerTutorStyleSelect.value = state.tutorStyle;
        }
        interviewerPersonalitySelect.value = state.interviewerPersonality;
        autoSyncCodeCheckbox.checked = state.autoSyncCode;
        
        groqKeyInput.value = state.groqKey;
        groqModelSelect.value = state.groqModel;
        ollamaUrlInput.value = state.ollamaUrl;
        if (ollamaKeyInput) ollamaKeyInput.value = state.ollamaKey;
        const standardOllamaModels = ["gpt-oss:20b"];
        if (standardOllamaModels.includes(state.ollamaModel)) {
          ollamaModelSelect.value = state.ollamaModel;
          ollamaModelInput.classList.add("hidden");
          ollamaModelInput.value = state.ollamaModel;
        } else {
          ollamaModelSelect.value = "custom";
          ollamaModelInput.value = state.ollamaModel;
          ollamaModelInput.classList.remove("hidden");
        }
        openaiKeyInput.value = state.openaiKey;
        openaiModelSelect.value = state.openaiModel;
        
        resolve();
      }
    );
  });
}

// Dynamically fetch and load active Groq models from API (keeps up to 5 best models)
async function loadGroqModelsDynamically() {
  if (!state.groqKey) return;
  try {
    const url = "https://api.groq.com/openai/v1/models";
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${state.groqKey}` }
    });
    if (res.ok) {
      const data = await res.json();
      
      // Curated list of elite coding and reasoning models
      const ELITE_GROQ_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "deepseek-r1-distill-llama-70b",
        "deepseek-r1-distill-qwen-32b",
        "gemma2-9b-it"
      ];

      // Get model IDs active on this user account
      const returnedIds = data.data.map(m => m.id);

      // Only include elite models that are active on the account
      let activeModels = ELITE_GROQ_MODELS.filter(id => returnedIds.includes(id));
      
      // Fallback: If none of the curated models are found, get other valid text models
      if (activeModels.length === 0) {
        const textModels = data.data
          .filter(m => {
            const id = m.id.toLowerCase();
            return !id.includes("whisper") && 
                   !id.includes("vision") && 
                   !id.includes("guard") && 
                   !id.includes("specdec") && 
                   !id.includes("scout") && 
                   !id.includes("audio") && 
                   !id.includes("moderation");
          })
          .map(m => m.id);
        
        activeModels = textModels.slice(0, 5);
      } else {
        // Enforce the 5-model limit on the final list
        activeModels = activeModels.slice(0, 5);
      }
      
      if (activeModels.length > 0) {
        state.activeGroqModels = activeModels;
        
        // Clear and rebuild the select options
        const originalValue = groqModelSelect.value || state.groqModel;
        groqModelSelect.innerHTML = "";
        
        activeModels.forEach(modelId => {
          const opt = document.createElement("option");
          opt.value = modelId;
          // Format model name nicely for UI presentation
          let displayName = modelId;
          if (modelId === "llama-3.3-70b-versatile") displayName = "Llama 3.3 70B (Versatile - Smartest)";
          else if (modelId === "llama-3.1-8b-instant") displayName = "Llama 3.1 8B (Instant - High Limit)";
          else if (modelId.includes("deepseek")) displayName = `${modelId} (DeepSeek Reasoning)`;
          else if (modelId.includes("gemma")) displayName = `${modelId} (Google)`;
          
          opt.textContent = displayName;
          groqModelSelect.appendChild(opt);
        });
        
        // Select original model if still valid, otherwise default to first available
        if (activeModels.includes(originalValue)) {
          groqModelSelect.value = originalValue;
        } else if (activeModels.includes(state.groqModel)) {
          groqModelSelect.value = state.groqModel;
        } else {
          groqModelSelect.value = activeModels[0];
          state.groqModel = activeModels[0];
        }
      }
    }
  } catch (e) {
    console.error("Failed to dynamically load Groq models:", e);
  }
}



const ROADMAP_PATTERNS = {
  "Array — Two Pointers": {
    problems: [
      { title: "Move Zeroes", slug: "move-zeroes", difficulty: "Easy" },
      { title: "Two Sum II", slug: "two-sum-ii-input-array-is-sorted", difficulty: "Medium" },
      { title: "3Sum", slug: "3sum", difficulty: "Medium" },
      { title: "Sort Colors", slug: "sort-colors", difficulty: "Medium" },
      { title: "Container With Most Water", slug: "container-with-most-water", difficulty: "Medium" },
      { title: "Trapping Rain Water", slug: "trapping-rain-water", difficulty: "Hard" },
    ]
  },
  "Array — Sliding Window": {
    problems: [
      { title: "Maximum Sum Subarray of Size K", slug: "maximum-sum-of-distinct-subarrays-with-length-k", difficulty: "Easy" },
      { title: "Max Consecutive Ones", slug: "max-consecutive-ones", difficulty: "Easy" },
      { title: "Max Consecutive Ones III", slug: "max-consecutive-ones-iii", difficulty: "Medium" },
      { title: "Subarray Product Less Than K", slug: "subarray-product-less-than-k", difficulty: "Medium" },
      { title: "Fruits Into Baskets", slug: "fruit-into-baskets", difficulty: "Medium" },
      { title: "Minimum Size Subarray Sum", slug: "minimum-size-subarray-sum", difficulty: "Medium" },
      { title: "Sliding Window Maximum", slug: "sliding-window-maximum", difficulty: "Hard" },
      { title: "Subarray with K Distinct Integers", slug: "subarrays-with-k-different-integers", difficulty: "Hard" },
    ]
  },
  "Array — Prefix Sum": {
    problems: [
      { title: "Find Pivot Index", slug: "find-pivot-index", difficulty: "Easy" },
      { title: "Subarray Sum Equals K", slug: "subarray-sum-equals-k", difficulty: "Medium" },
      { title: "Matrix Block Sum", slug: "matrix-block-sum", difficulty: "Medium" },
      { title: "Product of Array Except Self", slug: "product-of-array-except-self", difficulty: "Medium" },
      { title: "Continuous Subarray Sum", slug: "continuous-subarray-sum", difficulty: "Medium" },
      { title: "Subarray Sum Divisible by K", slug: "subarray-sums-divisible-by-k", difficulty: "Medium" },
    ]
  },
  "Array — Kadane's Algorithm": {
    problems: [
      { title: "Maximum Subarray", slug: "maximum-subarray", difficulty: "Medium" },
      { title: "Maximum Product Subarray", slug: "maximum-product-subarray", difficulty: "Medium" },
      { title: "Maximum Sum Circular Subarray", slug: "maximum-sum-circular-subarray", difficulty: "Medium" },
      { title: "Maximum Absolute Sum of Any Subarray", slug: "maximum-absolute-sum-of-any-subarray", difficulty: "Medium" },
    ]
  },
  "Strings — Palindrome": {
    problems: [
      { title: "Reverse a String", slug: "reverse-string", difficulty: "Easy" },
      { title: "Valid Palindrome", slug: "valid-palindrome", difficulty: "Easy" },
      { title: "Valid Palindrome II", slug: "valid-palindrome-ii", difficulty: "Easy" },
      { title: "Longest Palindromic Substring", slug: "longest-palindromic-substring", difficulty: "Medium" },
      { title: "Palindromic Substrings", slug: "palindromic-substrings", difficulty: "Medium" },
    ]
  },
  "Strings — Sliding Window": {
    problems: [
      { title: "Find All Anagrams in a String", slug: "find-all-anagrams-in-a-string", difficulty: "Medium" },
      { title: "Longest Substring Without Repeating Characters", slug: "longest-substring-without-repeating-characters", difficulty: "Medium" },
      { title: "Permutation in String", slug: "permutation-in-string", difficulty: "Medium" },
      { title: "Minimum Window Substring", slug: "minimum-window-substring", difficulty: "Hard" },
      { title: "Substring with Concatenation of All Words", slug: "substring-with-concatenation-of-all-words", difficulty: "Hard" },
    ]
  },
  "Binary Search — Classic": {
    problems: [
      { title: "Binary Search", slug: "binary-search", difficulty: "Easy" },
      { title: "Sqrt(x)", slug: "sqrtx", difficulty: "Easy" },
      { title: "Search Insert Position", slug: "search-insert-position", difficulty: "Easy" },
      { title: "Search in Rotated Sorted Array", slug: "search-in-rotated-sorted-array", difficulty: "Medium" },
      { title: "Find Minimum in Rotated Sorted Array", slug: "find-minimum-in-rotated-sorted-array", difficulty: "Medium" },
      { title: "Find Peak Element", slug: "find-peak-element", difficulty: "Medium" },
      { title: "Find First and Last Position of Element", slug: "find-first-and-last-position-of-element-in-sorted-array", difficulty: "Medium" },
      { title: "Search a 2D Matrix", slug: "search-a-2d-matrix", difficulty: "Medium" },
      { title: "Search a 2D Matrix II", slug: "search-a-2d-matrix-ii", difficulty: "Medium" },
    ]
  },
  "Binary Search on Answers": {
    problems: [
      { title: "Koko Eating Bananas", slug: "koko-eating-bananas", difficulty: "Medium" },
      { title: "Capacity To Ship Packages Within D Days", slug: "capacity-to-ship-packages-within-d-days", difficulty: "Medium" },
      { title: "Min Speed to Arrive on Time", slug: "minimum-speed-to-arrive-on-time", difficulty: "Medium" },
      { title: "Min Days to Make M Bouquets", slug: "minimum-number-of-days-to-make-m-bouquets", difficulty: "Medium" },
      { title: "Magnetic Force Between Two Balls", slug: "magnetic-force-between-two-balls", difficulty: "Medium" },
      { title: "Split Array Largest Sum", slug: "split-array-largest-sum", difficulty: "Hard" },
    ]
  },
  "Stack — Monotonic": {
    problems: [
      { title: "Next Greater Element I", slug: "next-greater-element-i", difficulty: "Easy" },
      { title: "Next Greater Element II", slug: "next-greater-element-ii", difficulty: "Medium" },
      { title: "Daily Temperatures", slug: "daily-temperatures", difficulty: "Medium" },
      { title: "Online Stock Span", slug: "online-stock-span", difficulty: "Medium" },
      { title: "Asteroid Collision", slug: "asteroid-collision", difficulty: "Medium" },
      { title: "Largest Rectangle in Histogram", slug: "largest-rectangle-in-histogram", difficulty: "Hard" },
      { title: "Maximal Rectangle", slug: "maximal-rectangle", difficulty: "Hard" },
    ]
  },
  "Stack — Expressions": {
    problems: [
      { title: "Basic Calculator II", slug: "basic-calculator-ii", difficulty: "Medium" },
      { title: "Evaluate Reverse Polish Notation", slug: "evaluate-reverse-polish-notation", difficulty: "Medium" },
      { title: "Decode String", slug: "decode-string", difficulty: "Medium" },
      { title: "Basic Calculator I", slug: "basic-calculator", difficulty: "Hard" },
    ]
  },
  "Stack — Simulation": {
    problems: [
      { title: "Backspace String Compare", slug: "backspace-string-compare", difficulty: "Easy" },
      { title: "Remove All Adjacent Duplicates", slug: "remove-all-adjacent-duplicates-in-string", difficulty: "Easy" },
      { title: "Make the String Great", slug: "make-the-string-great", difficulty: "Easy" },
      { title: "Minimum String Length After Removing Substrings", slug: "minimum-string-length-after-removing-substrings", difficulty: "Medium" },
    ]
  },
  "Stack — Parenthesis": {
    problems: [
      { title: "Valid Parentheses", slug: "valid-parentheses", difficulty: "Easy" },
      { title: "Minimum Add to Make Parentheses Valid", slug: "minimum-add-to-make-parentheses-valid", difficulty: "Medium" },
      { title: "Score of Parentheses", slug: "score-of-parentheses", difficulty: "Medium" },
      { title: "Longest Valid Parentheses", slug: "longest-valid-parentheses", difficulty: "Hard" },
    ]
  },
  "Stack — Design": {
    problems: [
      { title: "Implement Queue using Stacks", slug: "implement-queue-using-stacks", difficulty: "Easy" },
      { title: "Implement Stack using Queues", slug: "implement-stack-using-queues", difficulty: "Easy" },
      { title: "Min Stack", slug: "min-stack", difficulty: "Medium" },
      { title: "Design Stack with Increment Operation", slug: "design-a-stack-with-increment-operation", difficulty: "Medium" },
    ]
  },
  "Stack — Greedy": {
    problems: [
      { title: "Remove K Digits", slug: "remove-k-digits", difficulty: "Medium" },
      { title: "Remove Duplicate Letters", slug: "remove-duplicate-letters", difficulty: "Medium" },
      { title: "Smallest Subsequence of Distinct Characters", slug: "smallest-subsequence-of-distinct-characters", difficulty: "Medium" },
      { title: "Minimum Remove to Make Valid Parentheses", slug: "minimum-remove-to-make-valid-parentheses", difficulty: "Medium" },
      { title: "Create Maximum Number", slug: "create-maximum-number", difficulty: "Hard" },
    ]
  },
  "Recursion — Linear": {
    problems: [
      { title: "Fibonacci Number", slug: "fibonacci-number", difficulty: "Easy" },
      { title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy" },
      { title: "Pow(x, n)", slug: "powx-n", difficulty: "Medium" },
      { title: "Unique Paths", slug: "unique-paths", difficulty: "Medium" },
      { title: "House Robber", slug: "house-robber", difficulty: "Medium" },
    ]
  },
  "Recursion — Divide & Conquer": {
    problems: [
      { title: "Median of Two Sorted Arrays", slug: "median-of-two-sorted-arrays", difficulty: "Hard" },
      { title: "Reverse Linked List (Recursive)", slug: "reverse-linked-list", difficulty: "Easy" },
      { title: "Merge 2 Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "Easy" },
      { title: "Generate All Subsets", slug: "subsets", difficulty: "Medium" },
      { title: "Target Sum / Count Subsequences", slug: "target-sum", difficulty: "Medium" },
    ]
  },
  "Linked List — Basics & Fast/Slow": {
    problems: [
      { title: "Middle of the Linked List", slug: "middle-of-the-linked-list", difficulty: "Easy" },
      { title: "Linked List Cycle", slug: "linked-list-cycle", difficulty: "Easy" },
      { title: "Intersection of Two Linked Lists", slug: "intersection-of-two-linked-lists", difficulty: "Easy" },
      { title: "Remove Nth Node from End", slug: "remove-nth-node-from-end-of-list", difficulty: "Medium" },
      { title: "Linked List Cycle II", slug: "linked-list-cycle-ii", difficulty: "Medium" },
      { title: "Odd-Even Linked List", slug: "odd-even-linked-list", difficulty: "Medium" },
      { title: "Design Linked List", slug: "design-linked-list", difficulty: "Medium" },
    ]
  },
  "Linked List — Reversal": {
    problems: [
      { title: "Reverse a Linked List", slug: "reverse-linked-list", difficulty: "Easy" },
      { title: "Palindrome Linked List", slug: "palindrome-linked-list", difficulty: "Easy" },
      { title: "Reverse Linked List II", slug: "reverse-linked-list-ii", difficulty: "Medium" },
      { title: "Maximum Twin Sum of a Linked List", slug: "maximum-twin-sum-of-a-linked-list", difficulty: "Medium" },
      { title: "Swap Nodes in Pairs", slug: "swap-nodes-in-pairs", difficulty: "Medium" },
      { title: "Rotate List", slug: "rotate-list", difficulty: "Medium" },
      { title: "Reverse Nodes in k-Group", slug: "reverse-nodes-in-k-group", difficulty: "Hard" },
    ]
  },
  "Linked List — Merge & Sort": {
    problems: [
      { title: "Merge Two Sorted Lists", slug: "merge-two-sorted-lists", difficulty: "Easy" },
      { title: "Remove Duplicates from Sorted List", slug: "remove-duplicates-from-sorted-list", difficulty: "Easy" },
      { title: "Add Two Numbers", slug: "add-two-numbers", difficulty: "Medium" },
      { title: "Sort List", slug: "sort-list", difficulty: "Medium" },
      { title: "Reorder List", slug: "reorder-list", difficulty: "Medium" },
      { title: "Partition List", slug: "partition-list", difficulty: "Medium" },
      { title: "Copy List with Random Pointer", slug: "copy-list-with-random-pointer", difficulty: "Medium" },
      { title: "Merge K Sorted Lists", slug: "merge-k-sorted-lists", difficulty: "Hard" },
    ]
  },
  "Doubly Linked List": {
    problems: [
      { title: "LRU Cache", slug: "lru-cache", difficulty: "Medium" },
      { title: "Flatten Multilevel DLL", slug: "flatten-a-multilevel-doubly-linked-list", difficulty: "Medium" },
      { title: "LFU Cache", slug: "lfu-cache", difficulty: "Hard" },
    ]
  },
  "HashMap — Frequency & Prefix": {
    problems: [
      { title: "Majority Element", slug: "majority-element", difficulty: "Easy" },
      { title: "Top K Frequent Elements", slug: "top-k-frequent-elements", difficulty: "Medium" },
      { title: "Sort Characters By Frequency", slug: "sort-characters-by-frequency", difficulty: "Medium" },
    ]
  },
  "Tree — DFS": {
    problems: [
      { title: "Inorder Traversal", slug: "binary-tree-inorder-traversal", difficulty: "Easy" },
      { title: "Symmetric Tree", slug: "symmetric-tree", difficulty: "Easy" },
      { title: "Diameter of Binary Tree", slug: "diameter-of-binary-tree", difficulty: "Easy" },
      { title: "Balanced Binary Tree", slug: "balanced-binary-tree", difficulty: "Easy" },
      { title: "Maximum Depth of Binary Tree", slug: "maximum-depth-of-binary-tree", difficulty: "Easy" },
      { title: "Path Sum", slug: "path-sum", difficulty: "Easy" },
      { title: "Subtree of Another Tree", slug: "subtree-of-another-tree", difficulty: "Easy" },
      { title: "Path Sum II", slug: "path-sum-ii", difficulty: "Medium" },
      { title: "Path Sum III", slug: "path-sum-iii", difficulty: "Medium" },
      { title: "Count Complete Tree Nodes", slug: "count-complete-tree-nodes", difficulty: "Medium" },
      { title: "All Nodes Distance K in Binary Tree", slug: "all-nodes-distance-k-in-binary-tree", difficulty: "Medium" },
      { title: "Binary Tree Maximum Path Sum", slug: "binary-tree-maximum-path-sum", difficulty: "Hard" },
      { title: "Binary Tree Cameras", slug: "binary-tree-cameras", difficulty: "Hard" },
    ]
  },
  "Tree — BFS / Level Order": {
    problems: [
      { title: "Binary Tree Level Order Traversal", slug: "binary-tree-level-order-traversal", difficulty: "Medium" },
      { title: "Binary Tree Zigzag Level Order Traversal", slug: "binary-tree-zigzag-level-order-traversal", difficulty: "Medium" },
      { title: "Average of Levels in Binary Tree", slug: "average-of-levels-in-binary-tree", difficulty: "Easy" },
      { title: "Binary Tree Right Side View", slug: "binary-tree-right-side-view", difficulty: "Medium" },
      { title: "Vertical Order Traversal", slug: "vertical-order-traversal-of-a-binary-tree", difficulty: "Medium" },
      { title: "Maximum Width of Binary Tree", slug: "maximum-width-of-binary-tree", difficulty: "Medium" },
    ]
  },
  "Tree — LCA & Construction": {
    problems: [
      { title: "Invert Binary Tree", slug: "invert-binary-tree", difficulty: "Easy" },
      { title: "Lowest Common Ancestor of Binary Tree", slug: "lowest-common-ancestor-of-a-binary-tree", difficulty: "Medium" },
      { title: "Flatten Binary Tree to Linked List", slug: "flatten-binary-tree-to-linked-list", difficulty: "Medium" },
      { title: "Construct Binary Tree from Preorder & Inorder", slug: "construct-binary-tree-from-preorder-and-inorder-traversal", difficulty: "Medium" },
      { title: "Construct Binary Tree from Inorder & Postorder", slug: "construct-binary-tree-from-inorder-and-postorder-traversal", difficulty: "Medium" },
      { title: "Kth Ancestor of a Tree Node", slug: "kth-ancestor-of-a-tree-node", difficulty: "Hard" },
      { title: "Serialize and Deserialize Binary Tree", slug: "serialize-and-deserialize-binary-tree", difficulty: "Hard" },
    ]
  },
  "Binary Search Tree": {
    problems: [
      { title: "Convert Sorted Array to BST", slug: "convert-sorted-array-to-binary-search-tree", difficulty: "Easy" },
      { title: "Search in a BST", slug: "search-in-a-binary-search-tree", difficulty: "Easy" },
      { title: "Insert into a BST", slug: "insert-into-a-binary-search-tree", difficulty: "Medium" },
      { title: "Validate Binary Search Tree", slug: "validate-binary-search-tree", difficulty: "Medium" },
      { title: "Delete Node in a BST", slug: "delete-node-in-a-bst", difficulty: "Medium" },
      { title: "Kth Smallest Element in BST", slug: "kth-smallest-element-in-a-bst", difficulty: "Medium" },
      { title: "Convert BST to Greater Tree", slug: "convert-bst-to-greater-tree", difficulty: "Medium" },
      { title: "Binary Search Tree Iterator", slug: "binary-search-tree-iterator", difficulty: "Medium" },
      { title: "Lowest Common Ancestor of BST", slug: "lowest-common-ancestor-of-a-binary-search-tree", difficulty: "Medium" },
      { title: "Recover BST", slug: "recover-binary-search-tree", difficulty: "Medium" },
      { title: "Maximum Sum BST in Binary Tree", slug: "maximum-sum-bst-in-binary-tree", difficulty: "Hard" },
    ]
  },
  "Graph — BFS": {
    problems: [
      { title: "01 Matrix", slug: "01-matrix", difficulty: "Medium" },
      { title: "Clone Graph", slug: "clone-graph", difficulty: "Medium" },
      { title: "Rotting Oranges", slug: "rotting-oranges", difficulty: "Medium" },
      { title: "Shortest Path in Binary Matrix", slug: "shortest-path-in-binary-matrix", difficulty: "Medium" },
      { title: "Word Ladder", slug: "word-ladder", difficulty: "Hard" },
    ]
  },
  "Graph — DFS": {
    problems: [
      { title: "Flood Fill", slug: "flood-fill", difficulty: "Easy" },
      { title: "Number of Islands", slug: "number-of-islands", difficulty: "Medium" },
      { title: "All Paths from Source to Target", slug: "all-paths-from-source-to-target", difficulty: "Medium" },
      { title: "Find Eventual Safe States", slug: "find-eventual-safe-states", difficulty: "Medium" },
      { title: "Count Provinces", slug: "number-of-provinces", difficulty: "Medium" },
      { title: "Surrounded Regions", slug: "surrounded-regions", difficulty: "Medium" },
      { title: "Is Graph Bipartite", slug: "is-graph-bipartite", difficulty: "Medium" },
      { title: "Critical Connections in a Network", slug: "critical-connections-in-a-network", difficulty: "Hard" },
    ]
  },
  "Graph — Topological Sort": {
    problems: [
      { title: "Course Schedule", slug: "course-schedule", difficulty: "Medium" },
      { title: "Course Schedule II", slug: "course-schedule-ii", difficulty: "Medium" },
      { title: "Find Eventual Safe States", slug: "find-eventual-safe-states", difficulty: "Medium" },
      { title: "Alien Dictionary", slug: "alien-dictionary", difficulty: "Hard" },
      { title: "Reconstruct Itinerary", slug: "reconstruct-itinerary", difficulty: "Hard" },
    ]
  },
  "Graph — Union Find & MST": {
    problems: [
      { title: "Redundant Connection", slug: "redundant-connection", difficulty: "Medium" },
      { title: "Connecting Cities (Min Cost)", slug: "min-cost-to-connect-all-points", difficulty: "Medium" },
      { title: "Accounts Merge", slug: "accounts-merge", difficulty: "Medium" },
      { title: "Number of Islands II", slug: "number-of-islands", difficulty: "Medium" },
    ]
  },
  "Graph — Shortest Path": {
    problems: [
      { title: "Network Delay Time", slug: "network-delay-time", difficulty: "Medium" },
      { title: "Cheapest Flights Within K Stops", slug: "cheapest-flights-within-k-stops", difficulty: "Medium" },
      { title: "Swim in Rising Water", slug: "swim-in-rising-water", difficulty: "Medium" },
      { title: "Path With Minimum Effort", slug: "path-with-minimum-effort", difficulty: "Medium" },
      { title: "Find the City With Smallest Neighbors", slug: "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance", difficulty: "Medium" },
    ]
  },
  "Heap — Top K Elements": {
    problems: [
      { title: "Top K Frequent Elements", slug: "top-k-frequent-elements", difficulty: "Medium" },
      { title: "K Frequent Words", slug: "top-k-frequent-words", difficulty: "Medium" },
      { title: "Kth Largest Element in an Array", slug: "kth-largest-element-in-an-array", difficulty: "Medium" },
      { title: "Find K Pairs with Smallest Sums", slug: "find-k-pairs-with-smallest-sums", difficulty: "Medium" },
      { title: "Find Median from Data Stream", slug: "find-median-from-data-stream", difficulty: "Hard" },
      { title: "Merge K Sorted Lists", slug: "merge-k-sorted-lists", difficulty: "Hard" },
      { title: "Smallest Range Covering K Lists", slug: "smallest-range-covering-elements-from-k-lists", difficulty: "Hard" },
    ]
  },
  "Heap — Sliding & Design": {
    problems: [
      { title: "Task Scheduler", slug: "task-scheduler", difficulty: "Medium" },
      { title: "Reorganize String", slug: "reorganize-string", difficulty: "Medium" },
      { title: "Sliding Window Maximum", slug: "sliding-window-maximum", difficulty: "Hard" },
      { title: "Sliding Window Median", slug: "sliding-window-median", difficulty: "Hard" },
    ]
  },
  "Backtracking — Choice Based": {
    problems: [
      { title: "Subsets", slug: "subsets", difficulty: "Medium" },
      { title: "Subsets II", slug: "subsets-ii", difficulty: "Medium" },
      { title: "Combination Sum", slug: "combination-sum", difficulty: "Medium" },
      { title: "Combination Sum II", slug: "combination-sum-ii", difficulty: "Medium" },
      { title: "Permutations", slug: "permutations", difficulty: "Medium" },
      { title: "Permutations II", slug: "permutations-ii", difficulty: "Medium" },
      { title: "Generate Parentheses", slug: "generate-parentheses", difficulty: "Medium" },
      { title: "Palindrome Partitioning", slug: "palindrome-partitioning", difficulty: "Medium" },
      { title: "Restore IP Addresses", slug: "restore-ip-addresses", difficulty: "Medium" },
    ]
  },
  "Backtracking — Constraint Based": {
    problems: [
      { title: "Partition to K Equal Sum Subsets", slug: "partition-to-k-equal-sum-subsets", difficulty: "Medium" },
      { title: "Word Search", slug: "word-search", difficulty: "Medium" },
      { title: "Path with Maximum Gold", slug: "path-with-maximum-gold", difficulty: "Medium" },
      { title: "N-Queens", slug: "n-queens", difficulty: "Hard" },
      { title: "Sudoku Solver", slug: "sudoku-solver", difficulty: "Hard" },
      { title: "Word Search II", slug: "word-search-ii", difficulty: "Hard" },
      { title: "Unique Paths III", slug: "unique-paths-iii", difficulty: "Hard" },
    ]
  },
  "Backtracking — Sequence Gen": {
    problems: [
      { title: "Letter Combinations of a Phone Number", slug: "letter-combinations-of-a-phone-number", difficulty: "Medium" },
      { title: "All Possible Full Binary Trees", slug: "all-possible-full-binary-trees", difficulty: "Medium" },
      { title: "Expression Add Operators", slug: "expression-add-operators", difficulty: "Hard" },
      { title: "Word Break II", slug: "word-break-ii", difficulty: "Hard" },
    ]
  },
  "Greedy — Intervals": {
    problems: [
      { title: "Merge Intervals", slug: "merge-intervals", difficulty: "Medium" },
      { title: "Insert Interval", slug: "insert-interval", difficulty: "Medium" },
      { title: "Non-overlapping Intervals", slug: "non-overlapping-intervals", difficulty: "Medium" },
      { title: "Minimum Arrows to Burst Balloons", slug: "minimum-number-of-arrows-to-burst-balloons", difficulty: "Medium" },
      { title: "Jump Game", slug: "jump-game", difficulty: "Medium" },
      { title: "Jump Game II", slug: "jump-game-ii", difficulty: "Medium" },
      { title: "Car Pooling", slug: "car-pooling", difficulty: "Medium" },
      { title: "Min Taps to Water Garden", slug: "minimum-number-of-taps-to-open-to-water-a-garden", difficulty: "Hard" },
    ]
  },
  "Greedy — Sorting": {
    problems: [
      { title: "Maximum Units on a Truck", slug: "maximum-units-on-a-truck", difficulty: "Easy" },
      { title: "Largest Number", slug: "largest-number", difficulty: "Medium" },
      { title: "Partition Labels", slug: "partition-labels", difficulty: "Medium" },
      { title: "Next Permutation", slug: "next-permutation", difficulty: "Medium" },
      { title: "Candy Distribution", slug: "candy", difficulty: "Hard" },
    ]
  },
  "DP — 1D Linear": {
    problems: [
      { title: "Climbing Stairs", slug: "climbing-stairs", difficulty: "Easy" },
      { title: "House Robber", slug: "house-robber", difficulty: "Medium" },
      { title: "Decode Ways", slug: "decode-ways", difficulty: "Medium" },
    ]
  },
  "DP — 2D Grid": {
    problems: [
      { title: "Unique Paths", slug: "unique-paths", difficulty: "Medium" },
      { title: "Unique Paths II", slug: "unique-paths-ii", difficulty: "Medium" },
      { title: "Minimum Path Sum", slug: "minimum-path-sum", difficulty: "Medium" },
      { title: "Minimum Falling Path Sum", slug: "minimum-falling-path-sum", difficulty: "Medium" },
      { title: "Dungeon Game", slug: "dungeon-game", difficulty: "Hard" },
      { title: "Cherry Pickup", slug: "cherry-pickup", difficulty: "Hard" },
    ]
  },
  "DP — Strings": {
    problems: [
      { title: "Longest Common Subsequence", slug: "longest-common-subsequence", difficulty: "Medium" },
      { title: "Longest Palindromic Subsequence", slug: "longest-palindromic-subsequence", difficulty: "Medium" },
      { title: "Edit Distance", slug: "edit-distance", difficulty: "Medium" },
      { title: "Shortest Common Supersequence", slug: "shortest-common-supersequence", difficulty: "Medium" },
      { title: "Minimum Insertions to Make Palindrome", slug: "minimum-insertion-steps-to-make-a-string-palindrome", difficulty: "Medium" },
      { title: "Regular Expression Matching", slug: "regular-expression-matching", difficulty: "Hard" },
      { title: "Distinct Subsequences", slug: "distinct-subsequences", difficulty: "Hard" },
      { title: "Palindrome Partitioning II", slug: "palindrome-partitioning-ii", difficulty: "Hard" },
    ]
  },
  "DP — Intervals": {
    problems: [
      { title: "Burst Balloons", slug: "burst-balloons", difficulty: "Hard" },
      { title: "Minimum Cost to Merge Stones", slug: "minimum-cost-to-merge-stones", difficulty: "Hard" },
      { title: "Min Cost to Cut a Stick", slug: "minimum-cost-to-cut-a-stick", difficulty: "Hard" },
    ]
  },
  "DP — Trees & DAGs": {
    problems: [
      { title: "House Robber III", slug: "house-robber-iii", difficulty: "Medium" },
      { title: "Path Sum III", slug: "path-sum-iii", difficulty: "Medium" },
    ]
  },
  "DP — Knapsack": {
    problems: [
      { title: "Partition Equal Subset Sum", slug: "partition-equal-subset-sum", difficulty: "Medium" },
      { title: "Coin Change", slug: "coin-change", difficulty: "Medium" },
      { title: "Coin Change II", slug: "coin-change-ii", difficulty: "Medium" },
      { title: "Target Sum", slug: "target-sum", difficulty: "Medium" },
    ]
  },
  "DP — Stocks": {
    problems: [
      { title: "Best Time to Buy and Sell Stock", slug: "best-time-to-buy-and-sell-stock", difficulty: "Easy" },
      { title: "Best Time to Buy and Sell Stock II", slug: "best-time-to-buy-and-sell-stock-ii", difficulty: "Medium" },
      { title: "Best Time to Buy and Sell Stock with Cooldown", slug: "best-time-to-buy-and-sell-stock-with-cooldown", difficulty: "Medium" },
      { title: "Best Time to Buy and Sell Stock with Fee", slug: "best-time-to-buy-and-sell-stock-with-transaction-fee", difficulty: "Medium" },
      { title: "Best Time to Buy and Sell Stock III", slug: "best-time-to-buy-and-sell-stock-iii", difficulty: "Hard" },
      { title: "Best Time to Buy and Sell Stock IV", slug: "best-time-to-buy-and-sell-stock-iv", difficulty: "Hard" },
    ]
  },
  "Trie — Basic & Word Break": {
    problems: [
      { title: "Implement Trie (Prefix Tree)", slug: "implement-trie-prefix-tree", difficulty: "Medium" },
      { title: "Add and Search Word", slug: "add-and-search-word-data-structure-design", difficulty: "Medium" },
      { title: "Longest Common Prefix", slug: "longest-common-prefix", difficulty: "Medium" },
      { title: "Search Suggestions System", slug: "search-suggestions-system", difficulty: "Medium" },
      { title: "Word Break", slug: "word-break", difficulty: "Medium" },
      { title: "Replace Words", slug: "replace-words", difficulty: "Medium" },
      { title: "Concatenated Words", slug: "concatenated-words", difficulty: "Hard" },
    ]
  },
  "Trie — Bitwise XOR": {
    problems: [
      { title: "Maximum XOR of Two Numbers in Array", slug: "maximum-xor-of-two-numbers-in-an-array", difficulty: "Medium" },
      { title: "Sum of All Subset XOR Totals", slug: "sum-of-all-subset-xor-totals", difficulty: "Easy" },
      { title: "Maximum XOR With an Element From Array", slug: "maximum-xor-with-an-element-from-array", difficulty: "Hard" },
    ]
  },
  "Bit Manipulation — Basics": {
    problems: [
      { title: "Missing Number", slug: "missing-number", difficulty: "Easy" },
      { title: "Number of 1 Bits", slug: "number-of-1-bits", difficulty: "Easy" },
      { title: "Power of Two", slug: "power-of-two", difficulty: "Easy" },
      { title: "Single Number", slug: "single-number", difficulty: "Easy" },
      { title: "Single Number II", slug: "single-number-ii", difficulty: "Medium" },
      { title: "Single Number III", slug: "single-number-iii", difficulty: "Medium" },
    ]
  },
  "Bit Manipulation — Subsets & XOR": {
    problems: [
      { title: "Subsets", slug: "subsets", difficulty: "Medium" },
      { title: "Subsets II", slug: "subsets-ii", difficulty: "Medium" },
      { title: "XOR Queries of a Subarray", slug: "xor-queries-of-a-subarray", difficulty: "Medium" },
      { title: "Maximum XOR of Two Numbers in Array", slug: "maximum-xor-of-two-numbers-in-an-array", difficulty: "Medium" },
      { title: "Maximum XOR With an Element From Array", slug: "maximum-xor-with-an-element-from-array", difficulty: "Hard" },
    ]
  },
};

function populateRoadmap() {
  const solved = state.solvedProblems || [];
  if (!roadmapList) return;
  roadmapList.innerHTML = "";

  const diffColors = { Easy: "#00b8a3", Medium: "#ffa116", Hard: "#ff375f" };

  Object.entries(ROADMAP_PATTERNS).forEach(([patternName, patternData]) => {
    const problems = patternData.problems;
    const solvedCount = problems.filter(p => solved.includes(p.slug)).length;
    const percent = Math.round((solvedCount / problems.length) * 100);

    const group = document.createElement("div");
    group.className = "roadmap-group";

    let problemsHtml = "";
    problems.forEach(p => {
      const isSolved = solved.includes(p.slug);
      const diffColor = diffColors[p.difficulty] || "#aaa";
      const lcUrl = `https://leetcode.com/problems/${p.slug}/`;
      problemsHtml += `
        <div class="roadmap-problem-item ${isSolved ? 'solved' : ''}" data-slug="${p.slug}">
          <div class="roadmap-checkbox" data-slug="${p.slug}">
            ${isSolved ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
          <a class="roadmap-problem-title" href="${lcUrl}" target="_blank" rel="noopener noreferrer">${p.title}</a>
          <span class="roadmap-diff-badge" style="color:${diffColor};border-color:${diffColor}">${p.difficulty}</span>
        </div>
      `;
    });

    group.innerHTML = `
      <div class="roadmap-group-header roadmap-collapsible" data-collapsed="true">
        <div class="roadmap-group-title-row">
          <span class="roadmap-collapse-icon">▶</span>
          <span class="roadmap-group-name">${patternName}</span>
        </div>
        <span class="roadmap-group-progress">${solvedCount}/${problems.length} (${percent}%)</span>
      </div>
      <div class="roadmap-progress-bar">
        <div class="roadmap-progress-fill" style="width: ${percent}%"></div>
      </div>
      <div class="roadmap-problems-list roadmap-collapsed">
        ${problemsHtml}
      </div>
    `;

    roadmapList.appendChild(group);
  });

  // Collapsible toggle
  roadmapList.querySelectorAll(".roadmap-collapsible").forEach(header => {
    header.addEventListener("click", (e) => {
      // Don't collapse when clicking a link inside
      if (e.target.closest("a")) return;
      const list = header.nextElementSibling.nextElementSibling;
      const icon = header.querySelector(".roadmap-collapse-icon");
      const isCollapsed = header.dataset.collapsed === "true";
      if (isCollapsed) {
        list.classList.remove("roadmap-collapsed");
        icon.textContent = "▼";
        header.dataset.collapsed = "false";
      } else {
        list.classList.add("roadmap-collapsed");
        icon.textContent = "▶";
        header.dataset.collapsed = "true";
      }
    });
  });

  // Close roadmap panel when a problem link is clicked
  roadmapList.querySelectorAll(".roadmap-problem-title").forEach(link => {
    link.addEventListener("click", () => {
      if (roadmapPanel) {
        roadmapPanel.classList.add("hidden");
      }
    });
  });
}

// Save Settings to Chrome Storage (Silent)
async function saveSettingsSilent() {
  state.provider = providerSelect.value;
  state.preferredLanguage = languageSelect.value;
  state.tutorStyle = tutorStyleSelect.value;
  if (footerTutorStyleSelect) {
    footerTutorStyleSelect.value = state.tutorStyle;
  }
  state.interviewerPersonality = interviewerPersonalitySelect.value;
  state.autoSyncCode = autoSyncCodeCheckbox.checked;

  state.groqKey = groqKeyInput.value.trim();
  state.groqModel = groqModelSelect.value;
  state.ollamaUrl = ollamaUrlInput.value.trim();
  state.ollamaKey = ollamaKeyInput ? ollamaKeyInput.value.trim() : "";
  if (ollamaModelSelect.value === "custom") {
    state.ollamaModel = ollamaModelInput.value.trim();
  } else {
    state.ollamaModel = ollamaModelSelect.value;
    ollamaModelInput.value = state.ollamaModel;
  }
  state.openaiKey = openaiKeyInput.value.trim();
  state.openaiModel = openaiModelSelect.value;

  return new Promise((resolve) => {
    chrome.storage.local.set({
      preferredLanguage: state.preferredLanguage,
      tutorStyle: state.tutorStyle,
      interviewerPersonality: state.interviewerPersonality,
      autoSyncCode: state.autoSyncCode,
      provider: state.provider,
      groqKey: state.groqKey,
      groqModel: state.groqModel,
      ollamaUrl: state.ollamaUrl,
      ollamaKey: state.ollamaKey,
      ollamaModel: state.ollamaModel,
      openaiKey: state.openaiKey,
      openaiModel: state.openaiModel
    }, resolve);
  });
}

// Save Settings to Chrome Storage (with UI notification)
async function saveSettings() {
  await saveSettingsSilent();
  showSystemNotification("Settings saved successfully!");
  settingsPanel.classList.add("hidden");
  
  // Trigger problem sync after saving language to adapt context
  syncFromActiveTab();
}

function updateProviderUI() {
  const selected = providerSelect.value;
  
  if (groqGroup) groqGroup.classList.add("hidden");
  if (ollamaGroup) ollamaGroup.classList.add("hidden");
  if (openaiGroup) openaiGroup.classList.add("hidden");
  
  if (selected === "groq" && groqGroup) {
    groqGroup.classList.remove("hidden");
  } else if (selected === "ollama" && ollamaGroup) {
    ollamaGroup.classList.remove("hidden");
  } else if (selected === "openai" && openaiGroup) {
    openaiGroup.classList.remove("hidden");
  }
}

// Event Listeners Configuration
function setupEventListeners() {
  // Input logic
  chatInputEl.addEventListener("input", () => {
    sendMsgBtn.disabled = !chatInputEl.value.trim();
    adjustTextareaHeight();
  });

  chatInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendMsgBtn.addEventListener("click", sendMessage);

  // Sync actions
  syncProblemBtn.addEventListener("click", () => syncFromActiveTab(true));
  grabCodeBtn.addEventListener("click", () => grabCode(true));

  // Header language dropdown change listener
  const headerLangSelect = document.getElementById("header-language-select");
  if (headerLangSelect) {
    headerLangSelect.addEventListener("change", (e) => {
      const selectedLang = e.target.value;
      if (state.activeProblem) {
        state.activeProblem.language = selectedLang;
      }
      state.preferredLanguage = selectedLang;
      
      // Sync it to the settings panel language selector
      const languageSelect = document.getElementById("language-select");
      if (languageSelect) {
        languageSelect.value = selectedLang;
      }
      
      // Save settings silently
      saveSettingsSilent();
      
      // Update UI displays
      updateProblemUI(state.activeProblem);
      
      showSystemNotification(`Switched chat language to ${selectedLang}`);
    });
  }

  // Footer tutor style selector change listener
  if (footerTutorStyleSelect) {
    footerTutorStyleSelect.addEventListener("change", (e) => {
      state.tutorStyle = e.target.value;
      if (tutorStyleSelect) {
        tutorStyleSelect.value = state.tutorStyle;
      }
      saveSettingsSilent();
    });
  }

  // Settings Panel transitions
  toggleSettingsBtn.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
    historyPanel.classList.add("hidden"); // Close history if open
    roadmapPanel.classList.add("hidden"); // Close roadmap if open
  });
  closeSettingsBtn.addEventListener("click", () => {
    saveSettingsSilent().then(() => {
      settingsPanel.classList.add("hidden");
    });
  });
  saveSettingsBtn.addEventListener("click", saveSettings);
  clearChatBtn.addEventListener("click", clearChat);
  if (headerClearChatBtn) {
    headerClearChatBtn.addEventListener("click", clearChat);
  }

  // Pattern Roadmap Panel transitions
  if (toggleRoadmapBtn) {
    toggleRoadmapBtn.addEventListener("click", () => {
      populateRoadmap();
      roadmapPanel.classList.toggle("hidden");
      settingsPanel.classList.add("hidden");
      historyPanel.classList.add("hidden");
    });
  }
  if (closeRoadmapBtn) {
    closeRoadmapBtn.addEventListener("click", () => {
      roadmapPanel.classList.add("hidden");
    });
  }

  // Handle roadmap problem item checked/unchecked toggle clicks
  if (roadmapList) {
    roadmapList.addEventListener("click", (e) => {
      const checkbox = e.target.closest(".roadmap-checkbox");
      if (checkbox) {
        const problemSlug = checkbox.getAttribute("data-slug");
        let solved = state.solvedProblems || [];
        if (solved.includes(problemSlug)) {
          solved = solved.filter(s => s !== problemSlug);
        } else {
          solved.push(problemSlug);
        }
        state.solvedProblems = solved;
        chrome.storage.local.set({ solvedProblems: solved }, () => {
          populateRoadmap();
        });
      }
    });
  }




  // Show/Hide custom Ollama model text input based on selection
  if (ollamaModelSelect) {
    ollamaModelSelect.addEventListener("change", (e) => {
      if (e.target.value === "custom") {
        ollamaModelInput.classList.remove("hidden");
        ollamaModelInput.focus();
      } else {
        ollamaModelInput.classList.add("hidden");
        ollamaModelInput.value = e.target.value;
      }
      saveSettingsSilent();
    });
  }

  // Auto-save silently on input/change events
  const settingsInputs = [
    providerSelect, languageSelect, tutorStyleSelect, interviewerPersonalitySelect,
    autoSyncCodeCheckbox, groqKeyInput, groqModelSelect, ollamaUrlInput,
    ollamaKeyInput, ollamaModelSelect, ollamaModelInput, openaiKeyInput, openaiModelSelect
  ];
  settingsInputs.forEach(input => {
    if (input) {
      input.addEventListener("change", saveSettingsSilent);
      if (input.tagName === "INPUT" && input.type !== "checkbox") {
        input.addEventListener("input", saveSettingsSilent);
      }
    }
  });

  // Saved Chats History Transitions
  toggleHistoryBtn.addEventListener("click", () => {
    populateHistoryList();
    historyPanel.classList.toggle("hidden");
    settingsPanel.classList.add("hidden"); // Close settings if open
    roadmapPanel.classList.add("hidden"); // Close roadmap if open
  });
  closeHistoryBtn.addEventListener("click", () => {
    historyPanel.classList.add("hidden");
  });


  // AI Provider change listener
  providerSelect.addEventListener("change", () => {
    updateProviderUI();
  });

  // Test Groq connection
  const testGroqBtn = document.getElementById("test-groq-btn");
  const groqStatusEl = document.getElementById("groq-status");
  testGroqBtn.addEventListener("click", async () => {
    const key = groqKeyInput.value.trim();
    if (!key) {
      groqStatusEl.textContent = "Please enter a key first.";
      groqStatusEl.className = "help-text error-text";
      return;
    }
    testGroqBtn.disabled = true;
    groqStatusEl.textContent = "Testing connection...";
    groqStatusEl.className = "help-text testing-text";
    try {
      const url = "https://api.groq.com/openai/v1/models";
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${key}` }
      });
      if (res.ok) {
        groqStatusEl.textContent = "✅ Connection successful! Valid Groq API Key.";
        groqStatusEl.className = "help-text success-text";
        await loadGroqModelsDynamically();
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || res.statusText;
        groqStatusEl.textContent = `❌ Connection failed: ${msg}`;
        groqStatusEl.className = "help-text error-text";
      }
    } catch (e) {
      groqStatusEl.textContent = `❌ Network error: ${e.message}`;
      groqStatusEl.className = "help-text error-text";
    } finally {
      testGroqBtn.disabled = false;
    }
  });

  // Test Ollama connection
  const testOllamaBtn = document.getElementById("test-ollama-btn");
  const ollamaStatusEl = document.getElementById("ollama-status");
  testOllamaBtn.addEventListener("click", async () => {
    const serverUrl = ollamaUrlInput.value.trim();
    if (!serverUrl) {
      ollamaStatusEl.textContent = "Please enter server URL first.";
      ollamaStatusEl.className = "help-text error-text";
      return;
    }
    const cleanHomeUrl = serverUrl.replace(/\/$/, "").toLowerCase();
    if (cleanHomeUrl === "ollama.com" || cleanHomeUrl === "http://ollama.com" || cleanHomeUrl === "https://ollama.com") {
      ollamaStatusEl.innerHTML = "❌ <strong>Invalid Server URL</strong><br><code>ollama.com</code> is the official homepage. To use the Ollama API, please specify the full API endpoint (e.g., <code>https://ollama.com/api</code>) or use your local endpoint <code>http://localhost:11434</code>.";
      ollamaStatusEl.className = "help-text error-text";
      return;
    }
    testOllamaBtn.disabled = true;
    ollamaStatusEl.textContent = "Testing connection...";
    ollamaStatusEl.className = "help-text testing-text";
    try {
      let url = serverUrl.replace(/\/$/, "");
      const isOpenAICompatible = url.includes("/v1") || url.includes("/v1/") || url.endsWith("/v1");
      
      if (!isOpenAICompatible) {
        if (url.endsWith("/api/chat")) {
          url = url.replace("/api/chat", "/api/tags");
        } else if (url.endsWith("/api")) {
          url = `${url}/tags`;
        } else {
          url = `${url}/api/tags`;
        }
      } else {
        // Cloud OpenAI-compatible endpoint
        if (url.endsWith("/v1/chat/completions")) {
          url = url.replace("/v1/chat/completions", "/v1/models");
        } else if (url.endsWith("/chat/completions")) {
          url = url.replace("/chat/completions", "/models");
        } else if (url.endsWith("/v1")) {
          url = `${url}/models`;
        } else if (url.endsWith("/api")) {
          url = `${url}/v1/models`;
        } else {
          url = `${url}/v1/models`;
        }
      }

      const headers = { "Content-Type": "application/json" };
      const key = ollamaKeyInput ? ollamaKeyInput.value.trim() : "";
      if (key) {
        headers["Authorization"] = `Bearer ${key}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: headers
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server returned HTML instead of JSON. Ensure you entered a valid API endpoint (e.g. your private server IP or a cloud provider API), not a website like ollama.com.");
        }
        ollamaStatusEl.textContent = "✅ Connection successful! Ollama Cloud/Server is responding.";
        ollamaStatusEl.className = "help-text success-text";
      } else {
        ollamaStatusEl.textContent = `❌ Connection failed: Server status ${res.status}`;
        ollamaStatusEl.className = "help-text error-text";
      }
    } catch (e) {
      ollamaStatusEl.innerHTML = `❌ Connection failed. Ensure server URL and API key are correct.<br>Network error: ${e.message}`;
      ollamaStatusEl.className = "help-text error-text";
    } finally {
      testOllamaBtn.disabled = false;
    }
  });

  // Test OpenAI connection
  const testOpenaiBtn = document.getElementById("test-openai-btn");
  const openaiStatusEl = document.getElementById("openai-status");
  testOpenaiBtn.addEventListener("click", async () => {
    const key = openaiKeyInput.value.trim();
    if (!key) {
      openaiStatusEl.textContent = "Please enter a key first.";
      openaiStatusEl.className = "help-text error-text";
      return;
    }
    testOpenaiBtn.disabled = true;
    openaiStatusEl.textContent = "Testing connection...";
    openaiStatusEl.className = "help-text testing-text";
    try {
      const url = "https://api.openai.com/v1/models";
      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${key}` }
      });
      if (res.ok) {
        openaiStatusEl.textContent = "✅ Connection successful! Valid OpenAI API Key.";
        openaiStatusEl.className = "help-text success-text";
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.error?.message || res.statusText;
        openaiStatusEl.textContent = `❌ Connection failed: ${msg}`;
        openaiStatusEl.className = "help-text error-text";
      }
    } catch (e) {
      openaiStatusEl.textContent = `❌ Network error: ${e.message}`;
      openaiStatusEl.className = "help-text error-text";
    } finally {
      testOpenaiBtn.disabled = false;
    }
  });

  // Mode Selection Tabs
  modeTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetMode = tab.getAttribute("data-mode");
      if (state.activeMode === targetMode) return; // Prevent double trigger
      
      modeTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      state.activeMode = targetMode;
      updateThemeForMode(state.activeMode);
      
      showSystemNotification(`Switched to ${state.activeMode === "AUTO" ? "Auto Mode" : state.activeMode + " Mode"}`);
      
      // Auto-trigger corresponding mentor prompt on tab change
      let action = null;
      if (state.activeMode === "TUTOR") action = "explain";
      else if (state.activeMode === "HINT") action = "hint";
      else if (state.activeMode === "REVIEW") action = "review";
      else if (state.activeMode === "PATTERN") action = "pattern";
      else if (state.activeMode === "INTERVIEW") action = "interview";
      
      if (action) {
        triggerQuickAction(action);
      }
    });
  });

  // Quick Action Buttons
  document.querySelectorAll(".quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      triggerQuickAction(action);
    });
  });

  // Code copy delegation
  chatHistoryEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("copy-code-btn")) {
      const base64Code = e.target.getAttribute("data-code-base64");
      const code = atob(base64Code);
      navigator.clipboard.writeText(code).then(() => {
        const originalText = e.target.textContent;
        e.target.textContent = "Copied!";
        e.target.style.color = "var(--color-review)";
        setTimeout(() => {
          e.target.textContent = originalText;
          e.target.style.color = "";
        }, 1500);
      });
    }
  });

  // Listeners from background worker (Tab updates)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TAB_CHANGED" || message.type === "TAB_UPDATED") {
      syncFromActiveTab();
    }
  });

  // Periodic code check (if autoSync is enabled)
  setInterval(() => {
    if (state.autoSyncCode) {
      grabCode(false);
    }
  }, 5000);
  // Language Modal Selection listeners
  langOptBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const selectedLang = btn.getAttribute("data-lang");
      state.preferredLanguage = selectedLang;
      state.hasSelectedLanguage = true;
      languageSelect.value = selectedLang;
      
      // Save settings to storage
      chrome.storage.local.set({ preferredLanguage: selectedLang, hasSelectedLanguage: true }, () => {
        showSystemNotification(`Preferred programming language set to: ${selectedLang}`);
        if (state.activeProblem) {
          updateProblemUI(state.activeProblem);
        }
      });
      
      languageModal.classList.add("hidden");
    });
  });
}

// Adjust heights for input textarea dynamically
function adjustTextareaHeight() {
  chatInputEl.style.height = "auto";
  chatInputEl.style.height = (chatInputEl.scrollHeight - 6) + "px";
}

// Switch CSS Accent theme colors based on active mode
function updateThemeForMode(mode) {
  const root = document.documentElement;
  let color = "var(--color-auto)";
  let rgb = "0, 230, 255"; // cyan default

  switch(mode) {
    case "TUTOR":
      color = "var(--color-tutor)";
      rgb = "168, 85, 247"; // purple
      break;
    case "HINT":
      color = "var(--color-hint)";
      rgb = "245, 158, 11"; // amber
      break;
    case "REVIEW":
      color = "var(--color-review)";
      rgb = "16, 185, 129"; // emerald
      break;
    case "INTERVIEW":
      color = "var(--color-interview)";
      rgb = "244, 63, 94"; // rose
      break;
    case "PATTERN":
      color = "var(--color-pattern)";
      rgb = "59, 130, 246"; // blue
      break;
  }
  
  root.style.setProperty("--mode-accent", color);
  root.style.setProperty("--mode-accent-rgb", rgb);
}

// Helper to get editor code directly from Monaco Editor in main page context (bypasses CSP)
async function getMonacoCodeDirectly(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        try {
          if (window.monaco && window.monaco.editor) {
            const models = window.monaco.editor.getModels();
            if (models && models.length > 0) {
              return models[0].getValue();
            }
          }
        } catch (e) {
          console.error("Monaco extraction error inside page:", e);
        }
        return null;
      }
    });
    if (results && results[0] && results[0].result !== undefined) {
      return results[0].result;
    }
  } catch (err) {
    console.warn("Main world scripting execution skipped or failed:", err);
  }
  return null;
}

// Trigger problem and code scraping from the active tab
async function syncFromActiveTab(manual = false) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url || !tab.url.includes("leetcode.com")) {
    if (!state.activeProblem) {
      updateProblemUI(null);
    }
    return;
  }

  try {
    // Attempt sending message to content script
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROBLEM" });
    } catch (e) {
      // Content script might not be injected yet. Inject it manually.
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
      // Try once more after injection
      response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROBLEM" });
    }

    if (response && !response.error) {
      // Force language to match extension's selected preferred language
      response.language = state.preferredLanguage;

      // Try to get Monaco editor content directly using executeScript (bypasses CSP)
      const directCode = await getMonacoCodeDirectly(tab.id);
      if (directCode) {
        response.code = directCode;
      }
      
      const oldKey = state.activeProblem ? (state.activeProblem.slug || state.activeProblem.title) : null;
      const newKey = response.slug || response.title;

      // Save current chat history for the previous problem before switching
      if (oldKey && oldKey !== newKey) {
        state.sessions[oldKey] = [...state.chatHistory];
      }

      state.activeProblem = response;
      updateProblemUI(response);

      // Load chat history for the new problem
      if (oldKey !== newKey) {
        state.chatHistory = state.sessions[newKey] || [];
        chrome.storage.local.set({ 
          chatHistory: state.chatHistory,
          sessions: state.sessions 
        });
        renderChatHistory();
        // Language modal disabled — user selects language manually in Settings
        // if (state.chatHistory.length === 0) {
        //   languageModal.classList.remove("hidden");
        // }
      }

      if (manual) {
        showSystemNotification(`Synced problem: "${response.title}"`);
      }
    } else {
      if (manual) {
        showSystemNotification("Failed to extract problem details. Are you on a LeetCode problem page?", "warning");
      }
    }
  } catch (err) {
    console.error("Error scraping problem:", err);
    if (manual) {
      showSystemNotification("Scraper error: Make sure tab is fully loaded.", "warning");
    }
  }
}

// Scrape code only
async function grabCode(manual = false) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes("leetcode.com")) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROBLEM" });
    if (response) {
      // Force language to match extension's selected preferred language
      response.language = state.preferredLanguage;

      // Overwrite with direct Monaco model content if available
      const directCode = await getMonacoCodeDirectly(tab.id);
      if (directCode) {
        response.code = directCode;
      }

      const prevCode = state.activeProblem ? state.activeProblem.code : "";
      if (state.activeProblem) {
        state.activeProblem.code = response.code;
        state.activeProblem.language = response.language;
        updateProblemUI(state.activeProblem);
      } else {
        state.activeProblem = response;
        updateProblemUI(response);
        const newKey = response.slug || response.title;
        state.chatHistory = state.sessions[newKey] || [];
        chrome.storage.local.set({ 
          chatHistory: state.chatHistory,
          sessions: state.sessions
        });
        renderChatHistory();
      }
      
      // Update UI badge if code changed
      if (response.code !== prevCode) {
        codeSyncBadge.classList.remove("hidden");
        setTimeout(() => codeSyncBadge.classList.add("hidden"), 3000);
        if (manual) {
          showSystemNotification("Code fetched from LeetCode editor.");
        }
      } else if (manual) {
        showSystemNotification("Code is already up to date.");
      }
    }
  } catch (err) {
    if (manual) {
      showSystemNotification("Failed to fetch code.", "warning");
    }
  }
}

// Update the Top Problem header card
function updateProblemUI(problem) {
  const separator = document.querySelector(".difficulty-separator");
  const headerLangSelect = document.getElementById("header-language-select");

  if (problem) {
    problemInfoEl.classList.remove("empty");
    problemTitleEl.textContent = problem.title;
    problemDifficultyEl.textContent = problem.difficulty;
    problemDifficultyEl.className = "difficulty " + problem.difficulty.toLowerCase();
    
    if (separator) separator.classList.remove("hidden");
    if (headerLangSelect) {
      headerLangSelect.classList.remove("hidden");
      
      // Mapped LeetCode languages to our select values (e.g. Python3 to Python)
      let mapped = problem.language || state.preferredLanguage;
      if (mapped.startsWith("Python")) mapped = "Python";
      
      headerLangSelect.value = mapped;
    }
  } else {
    problemInfoEl.classList.add("empty");
    problemTitleEl.textContent = "No LeetCode problem detected";
    problemDifficultyEl.textContent = "Open a problem on LeetCode";
    problemDifficultyEl.className = "difficulty";
    state.activeProblem = null;
    
    if (separator) separator.classList.add("hidden");
    if (headerLangSelect) headerLangSelect.classList.add("hidden");
  }
}

// Pre-packaged quick prompt triggers
function triggerQuickAction(action) {
  const provider = state.provider || "groq";
  let hasKey = true;
  if (provider === "groq" && !state.groqKey) hasKey = false;
  if (provider === "openai" && !state.openaiKey) hasKey = false;

  if (!hasKey) {
    showSystemNotification(`Please configure your ${provider.toUpperCase()} settings first!`, "warning");
    settingsPanel.classList.remove("hidden");
    return;
  }

  // Pre-configured requests
  let prompt = "";
  let targetMode = "AUTO";

  switch (action) {
    case "explain":
      prompt = "Can you explain this problem and its core logic from the ground up? Help me understand the intuition.";
      targetMode = "TUTOR";
      break;
    case "hint":
      prompt = "I'm stuck. Can you give me progressive hints, insights, and rules for this problem? Do not give me the code.";
      targetMode = "HINT";
      break;
    case "review":
      grabCode(false); // Grab code immediately before reviewing
      prompt = "Could you review my current solution? Please analyze its correctness, time/space complexity, edge cases, and areas of improvement.";
      targetMode = "REVIEW";
      break;
    case "pattern":
      prompt = "What algorithmic pattern does this problem fit into? Tell me how to identify it and explain other similar problems.";
      targetMode = "PATTERN";
      break;
    case "interview":
      prompt = "I would like to do a realistic mock interview for this problem. Please act as a technical interviewer and start Phase 1 (Introduction & Clarifying Questions).";
      targetMode = "INTERVIEW";
      break;
  }

  // Update active mode tab UI directly to prevent click handler recursion loops
  const matchingTab = Array.from(modeTabs).find(tab => tab.getAttribute("data-mode") === targetMode);
  if (matchingTab) {
    modeTabs.forEach(t => t.classList.remove("active"));
    matchingTab.classList.add("active");
    state.activeMode = targetMode;
    updateThemeForMode(targetMode);
  }

  chatInputEl.value = prompt;
  sendMsgBtn.disabled = false;
  sendMessage();
}

// Clear Chat Action
function clearChat() {
  if (confirm("Are you sure you want to clear your chat history?")) {
    state.chatHistory = [];
    if (state.activeProblem && (state.activeProblem.slug || state.activeProblem.title)) {
      const key = state.activeProblem.slug || state.activeProblem.title;
      state.sessions[key] = [];
    }
    chrome.storage.local.set({ 
      chatHistory: [],
      sessions: state.sessions
    }, () => {
      renderChatHistory();
      showSystemNotification("Chat history cleared.");
      settingsPanel.classList.add("hidden");
    });
  }
}

// System Notification Bar Helper
function showSystemNotification(text, type = "info") {
  const note = document.createElement("div");
  note.className = `message system note note-${type}`;
  note.innerHTML = `
    <div class="message-content">
      <p>💡 <em>${text}</em></p>
    </div>
  `;
  chatHistoryEl.appendChild(note);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

// Render local chat history array to DOM
function renderChatHistory() {
  // Clear non-welcome elements
  chatHistoryEl.innerHTML = "";
  
  if (state.chatHistory.length === 0) {
    // Add back system welcome card
    chatHistoryEl.innerHTML = `
      <div class="message system">
        <div class="message-content">
          <p>💡 <strong>Welcome to AlgoSolveo!</strong></p>
          <p>I am your personal Data Structures & Algorithms mentor. Let's master problem solving together, not just copy-paste solutions!</p>
          <p class="instruction">To get started:</p>
          <ol>
            <li>Open a problem on <strong>LeetCode</strong>.</li>
            <li>Configure your <strong>AI Provider</strong> (e.g. Groq) in settings (gear icon top right).</li>
            <li>Select a mode above or click one of the quick action prompts below!</li>
          </ol>
        </div>
      </div>
    `;
    return;
  }

  state.chatHistory.forEach(msg => {
    appendMessageToDOM(msg.role, msg.text, msg.mode);
  });
  
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

// Append a single message element to DOM
function appendMessageToDOM(role, text, mode) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${role === "user" ? "user" : "ai " + (mode || "").toLowerCase()}`;
  
  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  
  if (role === "user") {
    contentDiv.textContent = text;
  } else {
    contentDiv.innerHTML = Markdown.parse(text);
  }
  
  msgDiv.appendChild(contentDiv);
  chatHistoryEl.appendChild(msgDiv);
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
}

// Main Send Message Handler
async function sendMessage() {
  const text = chatInputEl.value.trim();
  if (!text) return;

  // Verify that the user is currently on a LeetCode page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isLeetCode = tab && tab.url && tab.url.includes("leetcode.com");
  
  if (!isLeetCode) {
    // Clear input area
    chatInputEl.value = "";
    sendMsgBtn.disabled = true;
    adjustTextareaHeight();

    // Add user message to state & DOM
    const userMsg = { role: "user", text: text, mode: state.activeMode };
    state.chatHistory.push(userMsg);
    appendMessageToDOM("user", text);

    // Show warning response from AlgoSolveo
    const systemResponse = "⚠️ **Please return to the LeetCode problem tab to ask questions or get explanations.**\n\nAlgoSolveo operates relative to the active LeetCode page. Please switch back to your LeetCode tab and try again!";
    const aiMsg = { role: "model", text: systemResponse, mode: state.activeMode };
    state.chatHistory.push(aiMsg);
    
    // Save history
    chrome.storage.local.set({ chatHistory: state.chatHistory });
    
    setTimeout(() => {
      appendMessageToDOM("model", systemResponse, state.activeMode);
    }, 300);
    return;
  }

  // Validate active provider configuration
  let configError = false;
  if (state.provider === "groq" && !state.groqKey) {
    showSystemNotification("Please configure your Groq API Key in Settings first!", "warning");
    configError = true;
  } else if (state.provider === "openai" && !state.openaiKey) {
    showSystemNotification("Please configure your OpenAI API Key in Settings first!", "warning");
    configError = true;
  }
  if (configError) {
    settingsPanel.classList.remove("hidden");
    return;
  }

  // Verify that the user is on a LeetCode problem page
  if (!state.activeProblem) {
    showSystemNotification("Please navigate to a LeetCode problem page first!", "warning");
    
    // Clear input area
    chatInputEl.value = "";
    sendMsgBtn.disabled = true;
    adjustTextareaHeight();

    // Add user message to state & DOM
    const userMsg = { role: "user", text: text, mode: state.activeMode };
    state.chatHistory.push(userMsg);
    appendMessageToDOM("user", text);

    // Show warning response from AlgoSolveo
    const systemResponse = "⚠️ **Please open a problem page on LeetCode to start practicing.**\n\nAlgoSolveo requires the active LeetCode problem context (description, editor code, etc.) to guide you. Open a problem like [Two Sum](https://leetcode.com/problems/two-sum/) to begin!";
    const aiMsg = { role: "model", text: systemResponse, mode: state.activeMode };
    state.chatHistory.push(aiMsg);
    
    // Save history
    chrome.storage.local.set({ chatHistory: state.chatHistory });
    
    setTimeout(() => {
      appendMessageToDOM("model", systemResponse, state.activeMode);
    }, 300);
    return;
  }

  // Clear input area
  chatInputEl.value = "";
  sendMsgBtn.disabled = true;
  adjustTextareaHeight();

  // Scrape LeetCode code on send if autoSync is disabled
  if (!state.autoSyncCode) {
    await grabCode(false);
  }

  // Push user msg to state
  const userMsg = { role: "user", text: text, mode: state.activeMode };
  state.chatHistory.push(userMsg);
  appendMessageToDOM("user", text);
  
  // Save user message in sessions immediately
  if (state.activeProblem && (state.activeProblem.slug || state.activeProblem.title)) {
    const key = state.activeProblem.slug || state.activeProblem.title;
    state.sessions[key] = [...state.chatHistory];
    chrome.storage.local.set({ chatHistory: state.chatHistory, sessions: state.sessions });
  } else {
    chrome.storage.local.set({ chatHistory: state.chatHistory });
  }

  // Show typing loader
  typingIndicator.classList.remove("hidden");
  chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;

  try {
    // Generate AI Content via Unified Provider Connector
    const responseText = await callLLM();
    
    // Save AI msg to state
    const aiMsg = { role: "model", text: responseText, mode: state.activeMode };
    state.chatHistory.push(aiMsg);
    
    // Save history to both global history and problem session
    if (state.activeProblem && (state.activeProblem.slug || state.activeProblem.title)) {
      const key = state.activeProblem.slug || state.activeProblem.title;
      state.sessions[key] = [...state.chatHistory];
      chrome.storage.local.set({ chatHistory: state.chatHistory, sessions: state.sessions });
    } else {
      chrome.storage.local.set({ chatHistory: state.chatHistory });
    }
    
    // Hide typing loader & Append AI msg
    typingIndicator.classList.add("hidden");
    appendMessageToDOM("model", responseText, state.activeMode);
    
  } catch (error) {
    console.error("AI Provider Error:", error);
    typingIndicator.classList.add("hidden");
    showSystemNotification(`Error matching pattern or connecting: ${error.message}`, "warning");
  }
}

// Construct LLM Prompt and make the API request (Unified Provider Connector)
async function callLLM() {
  const provider = state.provider || "groq";
  const systemPromptText = buildSystemPrompt();

  // OpenAI-compatible Providers (Groq, Ollama, OpenAI)
  let url = "";
  let headers = { "Content-Type": "application/json" };
  let model = "";

  if (provider === "groq") {
    url = "https://api.groq.com/openai/v1/chat/completions";
    headers["Authorization"] = `Bearer ${state.groqKey}`;
    model = state.groqModel || "llama-3.3-70b-versatile";
  } else if (provider === "ollama") {
    let baseUrl = state.ollamaUrl || "http://localhost:11434";
    const cleanUrl = baseUrl.replace(/\/$/, "");
    const isOpenAICompatible = cleanUrl.includes("/v1") || cleanUrl.includes("/v1/") || cleanUrl.endsWith("/v1");
    
    if (cleanUrl.endsWith("/api/chat") || cleanUrl.endsWith("/v1/chat/completions")) {
      url = cleanUrl;
    } else if (isOpenAICompatible) {
      if (cleanUrl.endsWith("/v1")) {
        url = `${cleanUrl}/chat/completions`;
      } else {
        url = `${cleanUrl}/v1/chat/completions`;
      }
    } else {
      if (cleanUrl.endsWith("/api")) {
        url = `${cleanUrl}/chat`;
      } else {
        url = `${cleanUrl}/api/chat`;
      }
    }
    if (state.ollamaKey) {
      headers["Authorization"] = `Bearer ${state.ollamaKey}`;
    }
    model = state.ollamaModel || "llama3";
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${state.openaiKey}`;
    model = state.openaiModel || "gpt-4o-mini";
  }

  // Format chat messages
  const messages = [];
  messages.push({
    role: "system",
    content: systemPromptText
  });

  state.chatHistory.forEach(msg => {
    // Map role: OpenAI uses 'assistant' instead of 'model'
    const role = msg.role === "user" ? "user" : "assistant";
    messages.push({
      role: role,
      content: msg.text
    });
  });

  const requestBody = {
    model: model,
    messages: messages,
    temperature: 0.7,
    max_tokens: 4096, // Increase output token budget to prevent truncation on large answers
    stream: false
  };

  if (provider === "groq") {
    const defaultModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant"
    ];
    const availableModels = state.activeGroqModels && state.activeGroqModels.length > 0 
      ? state.activeGroqModels 
      : defaultModels;

    let modelsToTry = [model];
    availableModels.forEach(m => {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    });

    let lastError = null;
    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      requestBody.model = currentModel;
      
      const modeLabel = document.querySelector("#typing-indicator .mode-label");
      if (modeLabel && i > 0) {
        modeLabel.textContent = `Retrying with ${currentModel}...`;
      }

      let retries = 2; // Try twice per model
      while (retries > 0) {
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody)
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || data.message?.content;
            if (!text) throw new Error(`No response from ${provider} using ${currentModel}.`);
            
            // Success! Save this model back to state so they use it next time if it worked
            if (currentModel !== model) {
              state.groqModel = currentModel;
              const groqModelSelect = document.getElementById("groq-model-select");
              if (groqModelSelect) groqModelSelect.value = currentModel;
              chrome.storage.local.set({ groqModel: currentModel });
              showSystemNotification(`Fell back to ${currentModel} due to rate limits or decommissioned models.`, "info");
            }
            return text;
          }

          const errText = await response.text().catch(() => "");
          let errMsg = "";
          try {
            const errData = JSON.parse(errText);
            errMsg = errData.error?.message || errData.message || "";
          } catch (e) {}
          if (!errMsg) {
            errMsg = errText || `HTTP ${response.status} ${response.statusText || ""}`.trim();
          }

          const isRateLimit = response.status === 429 || errMsg.toLowerCase().includes("rate limit") || errMsg.toLowerCase().includes("tpm") || errMsg.toLowerCase().includes("tpd");
          const isDecommissioned = errMsg.toLowerCase().includes("decommissioned") || errMsg.toLowerCase().includes("not supported") || errMsg.toLowerCase().includes("not found");

          if (isDecommissioned && i < modelsToTry.length - 1) {
            // Instantly switch to the next model
            if (modeLabel) {
              modeLabel.textContent = `${currentModel} decommissioned. Switching...`;
            }
            break;
          }

          if (isRateLimit) {
            // Check wait time
            let waitSeconds = 0;
            const match = errMsg.match(/try again in ([\d\.]+)s/i);
            if (match) {
              waitSeconds = parseFloat(match[1]);
            }
            const matchMin = errMsg.match(/try again in ([\d\.]+)m/i);
            if (matchMin) {
              waitSeconds = parseFloat(matchMin[1]) * 60;
            }
            const matchHour = errMsg.match(/try again in ([\d\.]+)h/i);
            if (matchHour) {
              waitSeconds = parseFloat(matchHour[1]) * 3600;
            }

            // If the wait time is long (> 5 seconds) or we've exhausted retries, switch model instantly
            if (waitSeconds > 5 || retries === 1) {
              if (i < modelsToTry.length - 1) {
                const nextModel = modelsToTry[i + 1];
                if (modeLabel) {
                  modeLabel.textContent = `Rate limit on ${currentModel}. Switching to ${nextModel}...`;
                }
                showSystemNotification(`Rate limit hit on ${currentModel}. Switching model...`, "info");
                break;
              } else {
                throw new Error(errMsg);
              }
            } else {
              // Wait and retry the same model
              const waitMs = Math.ceil(waitSeconds * 1000) + 500;
              if (modeLabel) {
                modeLabel.textContent = `Rate limit on ${currentModel}. Retrying in ${(waitMs / 1000).toFixed(1)}s...`;
              }
              await new Promise(resolve => setTimeout(resolve, waitMs));
              retries--;
              if (modeLabel) {
                modeLabel.textContent = "AlgoSolveo is thinking...";
              }
            }
          } else {
            throw new Error(errMsg);
          }
        } catch (e) {
          lastError = e;
          if (i === modelsToTry.length - 1) {
            throw e;
          }
          break; // Break and try next model
        }
      }
    }
    if (lastError) throw lastError;
  } else {
    // For Ollama/OpenAI, keep original standard request block with no fallbacks
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      let errMsg = "";
      try {
        const errData = JSON.parse(errText);
        errMsg = errData.error?.message || errData.message || "";
      } catch (e) {}
      if (!errMsg) {
        errMsg = errText || `HTTP ${response.status} ${response.statusText || ""}`.trim();
      }
      throw new Error(errMsg);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || data.message?.content;
    if (!text) throw new Error(`No response from ${provider}.`);
    return text;
  }
}

// Build comprehensive prompt injection for the LLM
function buildSystemPrompt() {
  const p = state.activeProblem;
  const activeLang = p ? (p.language || state.preferredLanguage) : state.preferredLanguage;
  
  // Parse explicit mentions in the chat history to override or supplement
  let mentionContext = "";
  if (state.chatHistory.length > 0) {
    const lastUserMsg = [...state.chatHistory].reverse().find(msg => msg.role === "user");
    if (lastUserMsg) {
      const match = lastUserMsg.text.match(/\b(lc|leetcode)\s*[-_]?\s*(\d+)\b/i);
      if (match) {
        mentionContext = `\n\n=== EXPLICIT PROBLEM OVERRIDE ===\nThe user explicitly mentioned LeetCode problem #${match[2]} in their request. Even if the current active problem description above is missing or different, you MUST focus entirely on LeetCode Problem #${match[2]} (e.g., LC 1 is "Two Sum", LC 25 is "Reverse Nodes in k-Group", etc.) and answer their questions or guide them in Hint/Tutor/Review/Interview/Pattern modes for this specific problem.`;
      }
    }
  }

  const problemContext = p ? `
=== CURRENT LEETCODE PROBLEM ===
Title: ${p.title}
Difficulty: ${p.difficulty}
URL: ${p.url}

--- PROBLEM DESCRIPTION ---
${p.description}

--- CANDIDATE'S CODE EDITOR CONTENT (${activeLang}) ---
\`\`\`${activeLang.toLowerCase()}
${p.code || "// No code written yet."}
\`\`\`
${mentionContext}
` : (mentionContext ? `=== NO PAGE DETECTED (EXPLICIT MENTION FOUND) ===${mentionContext}` : "=== NO PROBLEM DETECTED ===\nThe user is not on a specific LeetCode problem page yet. Remind them to open a problem if relevant.");

  // Curated, dynamic mode instructions to optimize token usage and help focus
  const modeInstructions = {
    TUTOR: (() => {
      const style = state.tutorStyle || "Beginner-Friendly";

      // ── SHARED CODE CONSTRAINTS (all styles) ──────────────────────────────
      const codeRules = `
⚠️ ABSOLUTE MANDATORY RULES — NEVER SKIP ANY OF THESE:
1. BRUTE FORCE IS MANDATORY: You MUST always include a full working Brute Force code block in ${activeLang}. NEVER skip it, never say "trivial", never summarize — write the actual code every time.
2. OPTIMIZED IS MANDATORY: You MUST always include a full working Optimized code block in ${activeLang}.
3. Write all code in ${activeLang}. Translate any editor code to ${activeLang}.
4. BRUTE FORCE code: Keep it extremely simple and focused only on the core loops. DO NOT write complex manual nested loops or manual linear searches to check for duplicates inside brute force. If uniqueness is required, just use standard library helper sets/lists (like HashSet or ArrayList in Java) to keep the brute force code very short and clean (ideally under 15 lines).
5. OPTIMIZED code: Standard Java is allowed and expected — Arrays.sort(), Arrays.asList(), ArrayList, HashMap, etc. are all fine. Write clean, standard interview-quality code.
6. Code structure: flat and readable inside a single Solution class method. No separate private helper methods unless genuinely needed (e.g. tree DFS).
7. Comments: brief, only on key logical steps. NOT on every line.
8. Use plain O(n) notation in text. No LaTeX double-backslash outside code blocks.`;

      if (style === "Beginner-Friendly") {
        return `--- 📚 TUTOR MODE (BEGINNER-FRIENDLY) ---
${codeRules}

STYLE RULES FOR THIS RESPONSE:
- Warm, encouraging tone. Assume zero prior knowledge.
- Build intuition STEP BY STEP — do NOT dump the full algorithm at once.
- Connect this problem to a simpler related problem the student likely already knows (e.g. 3Sum builds on 2Sum, 4Sum builds on 3Sum).
- Show the sorted array explicitly before the trace.
- For the trace, show EACH value of i as its own labeled block (not just a flat table).
- Include a "Problem Progression" section showing the pattern family.
- Edge cases must include the ACTUAL expected output, not just a description.

📚 TUTOR MODE — LC #[Problem Number] [Problem Title]

🎯 Problem in Plain English
[2–3 sentence plain-English explanation. Show 2 examples with actual Input → Output.]

Why is it tricky?
[1 sentence about the key constraint — e.g. "no duplicate triplets", "in-place", "order preserved".]

🧱 Step 1 — Brute Force (Too Slow)
[Explain the naive approach in 1–2 sentences.]
Brute Force Code (${activeLang}) — ⚠️ MANDATORY:
\`\`\`${activeLang.toLowerCase()}
// WRITE COMPLETE BRUTE FORCE CODE — Keep it simple (e.g. nested loops + Set/List to handle duplicates easily)
\`\`\`
Complexity: Time O(...) | Space O(...)

🧱 Step 2 — Build from a Simpler Problem
[Connect this problem to a simpler LC problem the student likely knows.
e.g. "3Sum = fix ONE element + run 2Sum on the rest!"]
[Show the key insight as a short 2–3 line pseudocode or formula.]

🧱 Step 3 — Key Insight for the Optimized Solution
[Explain the core trick in 1–2 sentences with a real-world analogy if possible.]
[Show the algorithm as numbered steps or short pseudocode — NOT full code yet.]

🧱 Step 4 — Duplicate Handling (if applicable)
[If the problem has duplicate-skipping logic, explain it here with a concrete example.
Show WHY duplicates cause problems and HOW sorting helps.]

🧱 Step 5 — Visual Trace
[Show the SORTED array first if sorting is used.]
[Show each outer loop value (i value) as its own labeled block:]
  i=0 (val=...):
    left=..., right=...
    sum=...  → action
    ...
  i=1 (val=...):
    ...
[End with: ✅ Final Answer = [...]]

🧱 Step 6 — Optimized Code (${activeLang}) — ⚠️ MANDATORY, standard Java allowed:
\`\`\`${activeLang.toLowerCase()}
// WRITE COMPLETE OPTIMIZED CODE — clean standard Java, Arrays.sort/asList/ArrayList are fine
\`\`\`

🧱 Step 7 — Complexity
| | Time | Space |
|---|---|---|
| Brute Force | O(...) | O(...) |
| Optimized | O(...) | O(...) |
[Explain briefly WHY each complexity is what it is.]

🧚 Problem Progression
[Show the pattern family — e.g.:]
2Sum → O(n)   [approach used]
3Sum → O(n²)  [approach used] ✅ this problem
4Sum → O(n³)  [approach used]

🧪 Edge Cases
[List 3–4 edge cases with ACTUAL input → expected output:]
e.g. [0,0,0]  → [[0,0,0]]
     [1,2,3]  → []

🎓 Similar Problems to Try Next
- LC #[num] — [title] ([why it's similar])
- LC #[num] — [title]

[End with a small trace challenge for the student to try themselves.]`;
      }

      if (style === "Socratic (Guided questions)") {
        return `--- 📚 TUTOR MODE (SOCRATIC) ---
${codeRules}

THIS IS A SOCRATIC STYLE. Do NOT immediately explain everything.
Instead, lead with QUESTIONS that make the student THINK first, then reveal the answer.
Structure: Question → short pause (use "Think about it...") → Reveal/explain.
After each major concept, pose a challenge question before moving on.
Only give full code AFTER the student has been guided through the logic via questions.

📚 TUTOR MODE — LC #[Problem Number] [Problem Title]

❓ First, Let's Think About the Problem
[Pose 2–3 questions that focus the student's attention:]
- "Before looking at any solution — what does 'in-place' mean? Why can't we just create a new array?"
- "If you had to do this with your hands using a deck of cards, what would you do?"
- "What information do you need to track as you scan through the array once?"

Think about it...

💡 Intuition — Built Through Questions
Q: "Where do all the non-zero elements need to end up?"
→ They need to be packed to the front, in their original order.

Q: "So what if we had a pointer that always pointed to the NEXT empty slot for a non-zero number?"
→ [Explain the 'write pointer' idea as the answer to this question]

Q: "What happens to the zeros? Do we ever explicitly place them?"
→ [Guide student to realize zeros automatically fill the tail]

🧱 Brute Force — Can You See the Problem?
Q: "What's the simplest thing you could do? (even if slow)"
→ [Explain brute force as the answer]
- **Code (${activeLang})** — ⚠️ MANDATORY: Write the COMPLETE brute force code now (e.g. nested loops + Set/List to handle duplicates easily):
\`\`\`${activeLang.toLowerCase()}
// WRITE COMPLETE BRUTE FORCE CODE HERE — Keep it simple (e.g. nested loops + Set/List to handle duplicates easily)
\`\`\`
Q: "Can you see why this might be slow for a large array?"
→ [Lead to O(n²) realization]

🧱 Optimized — Guided Discovery
Q: "What if you only needed one pass? What would you need to track?"
→ [Introduce write pointer]

Q: "When you see a non-zero at position j, and write pointer is at position w — what should you do?"
→ [Lead to swap answer]
- **Code (${activeLang})**:
\`\`\`${activeLang.toLowerCase()}
// optimized — full working code
\`\`\`
Step-by-step (trace [0,1,0,3,12] together):
[Walk through using Q-and-A format: "What is i now? What is write? Should we swap?"]

🧠 Complexity Check
Q: "How many times do we visit each element?"
→ Time: O(n)
Q: "Do we use any extra memory beyond a few variables?"
→ Space: O(1)

🔑 Key Takeaway
[Summarize the pattern in 2–3 bullet points as conclusions the student discovered]

🎓 Challenge: Can you apply this same write-pointer idea to these problems?
- [2–3 similar LeetCode problems with numbers]

Your turn: Trace [0, 0, 1] through the optimized solution. What is the array after each step?`;
      }

      // style === "Direct (Explanatory)"
      return `--- 📚 TUTOR MODE (DIRECT) ---
${codeRules}

THIS IS A DIRECT STYLE. Be concise and precise. Skip analogies and hand-holding.
- State the core insight in 1–2 sentences.
- Give the algorithm in pseudocode first, then clean code.
- One trace, shown as a compact table (not prose).
- No filler. No "great question!" or warmup. Get straight to it.

📚 TUTOR MODE — LC #[Problem Number] [Problem Title]

🎯 Core Problem
[1 sentence: what must be done, what constraint matters most (e.g. in-place, order preserved).]

💡 Key Insight
[1–2 sentences: the single algorithmic idea that makes this solvable in O(n).]

Algorithm (pseudocode):
\`\`\`
write = 0
for i = 0 to n-1:
    if nums[i] != 0:
        swap(nums[write], nums[i])
        write++
\`\`\`

🧱 Brute Force
- **Idea**: [1 sentence]
- **Code (${activeLang})** — ⚠️ MANDATORY: Write the COMPLETE brute force code (e.g. nested loops + Set/List to handle duplicates easily):
\`\`\`${activeLang.toLowerCase()}
// WRITE COMPLETE BRUTE FORCE CODE HERE — Keep it simple (e.g. nested loops + Set/List to handle duplicates easily)
\`\`\`
- **Complexity**: Time O(...) | Space O(...)

🧱 Optimized
- **Idea**: [1 sentence — the write-pointer concept stated plainly]
- **Code (${activeLang})**:
\`\`\`${activeLang.toLowerCase()}
// optimized — full working code
\`\`\`
- **Trace** (compact table for [0,1,0,3,12]):
| i | nums[i] | Action | Array State | write |
|---|---|---|---|---|
[fill in each row]
- **Complexity**: Time O(...) | Space O(...)

🧪 Edge Cases
- [3 edge cases, one line each]

🆚 Summary
| | Brute | Optimized |
|---|---|---|
| Time | O(n²) | O(n) |
| Space | O(1) | O(1) |
| Passes | 2 | 1 |

🎓 Related: [2–3 LeetCode problems with numbers]`;
    })(),

    HINT: `--- 💡 HINT MODE ---
Provide a comprehensive, multi-stage hint dashboard to guide the user without giving them the direct solution or complete code.
Every response in Hint Mode MUST follow this structured format:
1. **💡 Progressive Hints**: Provide progressive clues structured by level:
   - **Level 1 (Observation)**: A gentle clue about constraints, inputs, or basic properties.
   - **Level 2 (Approach Direction)**: Guide them towards the logic (e.g., tracking group boundaries).
   - **Level 3 (Core Technique)**: Identify the core technique (e.g., Two Pointers/Recursion) and explain why it fits.
   - **Level 4 (Pseudocode Skeleton)**: A high-level skeleton (no concrete syntax) showing the structure of the loops and pointers.
2. **🧠 Key Insights**: List 2-3 logical or mathematical insights about the problem structure.
3. **📏 Rules**: List critical coding boundaries and constraints, formatted exactly as: "Rule 1: [rule description]", "Rule 2: [rule description]", etc.
4. **🪜 Steps**: Numbered, simplified steps describing how to implement the code logic, formatted exactly as: "Step 1: [action]", "Step 2: [action]", etc.
- **CRITICAL**: Never output code walkthrough confirmations (like "Would you like me to walk through the code implementation now?") in Hint Mode. End the message by asking: "Do these progressive hints, steps, and rules help you get started?"`,

    REVIEW: `--- 🔍 REVIEW MODE ---
Perform a strict code review of the candidate's editor content. Focus on:
- Correctness & Edge Cases: Empty inputs, single element, duplicates, negative numbers, overflow.
- Complexity: Detail time complexity (best/average/worst) and auxiliary space complexity. Compare it directly to the optimal theoretical limits.
- Code Quality: Readability, redundant logic, standard patterns.
- Suggested Optimizations: Show a path from their brute force code to optimal. Write optimized code with clean comments.`,

    INTERVIEW: `--- 🎤 INTERVIEW MODE ---
Simulate a mock technical coding interview. 
- You roleplay as a senior engineer interviewer. Adopt the ${state.interviewerPersonality} interviewer personality.
- Keep the candidate under realistic interview pressure.
- Run the interview in phases: 
  1. Introduction
  2. Problem Presentation & Clarifying Questions (evaluate if candidate asks about constraints/duplicates before coding)
  3. Solution Discussion (candidate must explain approach and complexity before coding)
  4. Implementation (candidate codes while explaining)
  5. Testing (candidate walks through test cases, handles bugs)
  6. Follow-up Questions (trade-offs, constraints changes)
  7. Closing
- If candidate gets stuck, give brief, calibrated verbal hints (Level 1 or 2).
- At the end of the interview, output a full "Interview Feedback Report" using the rubric: Problem Solving (35%), Coding (35%), Communication (20%), Testing (10%) and an overall hiring decision (Strong Hire, Hire, Maybe, No Hire).`,

    PATTERN: `--- 🗺️ PATTERN MAPPER MODE ---
Master pattern recognition dynamically:
- Analyze characteristics: input type (sorted/cyclic/etc.), output goals (min/max, count ways, permutations), and time constraints.
- Scan for signal keywords: e.g. "contiguous subarray" -> sliding window, "kth largest" -> heap.
- Explain the identified pattern, why it works, and provide a generic clean template.
- List 3 similar LeetCode problems (number & title) that use the same pattern.`
  };

  let activeModeInstructions = "";
  if (state.activeMode === "AUTO") {
    activeModeInstructions = Object.values(modeInstructions).join("\n\n");
  } else {
    activeModeInstructions = modeInstructions[state.activeMode] || "";
  }

  return `
You are AlgoSolveo 🥋, a master DSA (Data Structures & Algorithms) mentor specialized in helping developers master LeetCode and technical interviews. Your teaching philosophy emphasizes Socratic learning, building pattern-recognition skills, and structured communication.

=== USER PREFERENCES ===
- Preferred Programming Language: ${activeLang} (CRITICAL: You MUST write all code explanations, code blocks, and solutions in ${activeLang}. Even if the candidate's editor content below contains code in a different language, translate it and write all output code blocks in ${activeLang}!)
- Concept Tutor Style: ${state.tutorStyle} (style-specific instructions are embedded in the TUTOR MODE template above)
- Interviewer Persona: ${state.interviewerPersonality} (friendly/neutral/challenging style)

=== ACTIVE MODE ===
You must operate in: **${state.activeMode} MODE**
${state.activeMode === "AUTO" ? `
Automatically select the best mode based on the user's message:
- **TUTOR MODE**: explaining concepts, definitions, basic steps
- **HINT MODE**: progressive hints, no direct solution
- **REVIEW MODE**: code review, complexity, edge cases, improvements
- **INTERVIEW MODE**: mock interview roleplay, feedback
- **PATTERN MAPPER MODE**: pattern matching, signals, similar problems
` : `Always follow the specific instructions of ${state.activeMode} Mode.`}

=== MODE-SPECIFIC INSTRUCTIONS ===
${activeModeInstructions}

${problemContext}

=== ETHICS & WRITING STYLE ===
- Keep responses concise and scannable. Avoid giant blocks of text. Use bullet points and headers.
- Emphasize logical thinking. Do not spoonfeed solutions.
- Use LaTeX formatting for mathematical complexity notation, e.g. \\(O(n)\\) or \\(O(n \\log n)\\).
- For coding segments, format using fenced code blocks with language annotations.
`;
}

// Populate Saved Chats history panel list
function populateHistoryList() {
  historyList.innerHTML = "";
  const keys = Object.keys(state.sessions).filter(key => state.sessions[key] && state.sessions[key].length > 0);
  
  if (keys.length === 0) {
    historyList.innerHTML = `<div class="history-empty">No saved chats yet. Start a conversation on a LeetCode problem!</div>`;
    return;
  }
  
  keys.forEach(title => {
    const isActive = state.activeProblem && (state.activeProblem.slug === title || state.activeProblem.title === title);
    const msgCount = state.sessions[title].length;
    
    const item = document.createElement("div");
    item.className = `history-item${isActive ? " active" : ""}`;
    
    const infoDiv = document.createElement("div");
    infoDiv.className = "history-item-info";
    infoDiv.style.flexGrow = "1";
    infoDiv.style.minWidth = "0";
    
    const titleDiv = document.createElement("div");
    titleDiv.className = "history-item-title";
    titleDiv.textContent = title;
    
    const metaDiv = document.createElement("div");
    metaDiv.className = "history-item-meta";
    metaDiv.textContent = `${msgCount} message${msgCount === 1 ? "" : "s"}`;
    
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(metaDiv);
    
    // Delete session button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-history-btn";
    deleteBtn.title = "Delete chat log";
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent loading chat
      if (confirm(`Are you sure you want to delete the chat history for "${title}"?`)) {
        delete state.sessions[title];
        if (state.activeProblem && (state.activeProblem.slug === title || state.activeProblem.title === title)) {
          state.chatHistory = [];
          renderChatHistory();
        }
        chrome.storage.local.set({ sessions: state.sessions, chatHistory: state.chatHistory }, () => {
          populateHistoryList();
        });
      }
    });
    
    item.appendChild(infoDiv);
    item.appendChild(deleteBtn);
    
    item.addEventListener("click", () => {
      // Save current session if active
      if (state.activeProblem && (state.activeProblem.slug || state.activeProblem.title)) {
        const key = state.activeProblem.slug || state.activeProblem.title;
        state.sessions[key] = [...state.chatHistory];
      }
      
      // Load selected session
      state.chatHistory = state.sessions[title] || [];
      
      // Load or build a mock problem representation so header updates
      updateProblemUI({
        title: title,
        difficulty: "Saved Chat",
        language: state.preferredLanguage
      });
      
      chrome.storage.local.set({ chatHistory: state.chatHistory, sessions: state.sessions });
      renderChatHistory();
      historyPanel.classList.add("hidden");
      showSystemNotification(`Loaded chat: "${title}"`);
    });
    
    historyList.appendChild(item);
  });
}


