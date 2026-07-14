const Markdown = {
  highlightCode(escapedCodeText) {
    if (!escapedCodeText) return "";

    // 1. Strings
    const strings = [];
    let temp = escapedCodeText.replace(/(["'`])([\s\S]*?)\1/g, (match, quote, val) => {
      const placeholder = `__STR_PLACEHOLDER_${strings.length}__`;
      strings.push(`<span class="code-str">${quote}${val}${quote}</span>`);
      return placeholder;
    });

    // 2. Comments
    const comments = [];
    temp = temp.replace(/(\/\/.*)|(\/\*[\s\S]*?\*\/)/g, (match) => {
      const placeholder = `__COMMENT_PLACEHOLDER_${comments.length}__`;
      comments.push(`<span class="code-comment">${match}</span>`);
      return placeholder;
    });

    // 3. Keywords
    const keywords = /\b(class|interface|extends|implements|public|private|protected|static|final|native|synchronized|transient|volatile|strictfp|void|int|double|float|boolean|char|long|short|byte|return|if|else|for|while|do|switch|case|default|break|continue|new|this|super|import|package|const|let|var|function|def|elif|from|as|in|and|or|not|try|except|finally|catch|throw|throws)\b/g;
    temp = temp.replace(keywords, '<span class="code-keyword">$1</span>');

    // 3.5 Booleans & Null
    const booleans = /\b(true|false|null)\b/g;
    temp = temp.replace(booleans, '<span class="code-boolean">$1</span>');

    // 3.8 Functions/Methods
    temp = temp.replace(/\b(\w+)(?=\s*\()/g, '<span class="code-function">$1</span>');

    // 4. Numbers
    temp = temp.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="code-number">$1</span>');

    // 5. Types (Capitalized words like ListNode, Solution, String)
    temp = temp.replace(/\b([A-Z]\w*)\b/g, '<span class="code-type">$1</span>');

    // 6. Restore comments
    comments.forEach((val, idx) => {
      temp = temp.replace(`__COMMENT_PLACEHOLDER_${idx}__`, val);
    });

    // 7. Restore strings
    strings.forEach((val, idx) => {
      temp = temp.replace(`__STR_PLACEHOLDER_${idx}__`, val);
    });

    return temp;
  },
  cleanMathText(text) {
    if (!text) return "";
    // Decode common escaped HTML entities back to characters first (like &amp; to &) for cleaner processing
    let clean = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\\boldsymbol\{([\s\S]*?)\}/g, '$1')
      .replace(/\\text\{([\s\S]*?)\}/g, '$1')
      .replace(/\\log/g, 'log')
      .replace(/\\sqrt/g, 'sqrt')
      .replace(/\\approx/g, '≈')
      .replace(/\\le/g, '≤')
      .replace(/\\ge/g, '≥')
      .replace(/\\cdot/g, '·')
      .replace(/\\times/g, '×')
      .replace(/\\/g, '') // remove remaining backslashes
      .replace(/[\{\}]/g, ''); // remove remaining braces
    return clean;
  },
  parse(text) {
    if (!text) return "";
    
    // Escape HTML first to prevent XSS, but preserve formatting tags we generate
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // Convert LaTeX math delimiters to simple code elements
    html = html.replace(/\\\\\((.*?)\\\\\)/g, (match, p1) => `<code>${this.cleanMathText(p1)}</code>`);
    html = html.replace(/\\\((.*?)\\\)/g, (match, p1) => `<code>${this.cleanMathText(p1)}</code>`);
    html = html.replace(/\\\[([\s\S]*?)\\\]/g, (match, p1) => `<div class="math-display"><code>${this.cleanMathText(p1)}</code></div>`);
      
    // Handle code blocks (fenced code blocks) before other replacements
    const codeBlocks = [];
    html = html.replace(/```\s*([\w-]*)\s*\r?\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = 'codeblock' + Math.random().toString(36).substring(2, 9);
      // Decode escaped HTML for the copied code so it copies correctly
      const rawCode = code
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      codeBlocks.push({
        id,
        lang: lang || 'code',
        code: code.trim(),
        rawCode: rawCode.trim()
      });
      return `%%CODEBLOCKPLACEHOLDER${id}%%`;
    });
    
    // Handle alerts: &gt; [!NOTE] or similar
    html = html.replace(/&gt;\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\n?([\s\S]*?)(?=\n\n|\n&gt;|\n\s*\n|$)/gi, (match, type, content) => {
      const cleanContent = content.replace(/^\s*&gt;\s?/gm, '').trim();
      return `<div class="alert-box alert-${type.toLowerCase()}">
        <div class="alert-title"><span class="alert-icon"></span>${type.toUpperCase()}</div>
        <div class="alert-content">${cleanContent}</div>
      </div>\n`;
    });

    // Handle standard blockquotes: &gt; content
    html = html.replace(/^&gt;\s?(.*)/gm, '<blockquote>$1</blockquote>');

    // Handle headers
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Handle bold and italic
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
    html = html.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_([\s\S]*?)_/g, '<em>$1</em>');
    
    // Handle inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    
    // Handle lists, tables, and paragraphs line by line
    const lines = html.split('\n');
    let inList = false;
    let inOList = false;
    let inTable = false;
    let tableHeaders = [];
    let tableRows = [];
    let newHtml = "";
    
    function generateTableHtml(headers, rows) {
      let tHtml = '<div class="table-container"><table>\n';
      if (headers && headers.length > 0) {
        tHtml += '  <thead>\n    <tr>\n';
        headers.forEach(h => {
          tHtml += `      <th>${h}</th>\n`;
        });
        tHtml += '    </tr>\n  </thead>\n';
      }
      if (rows && rows.length > 0) {
        tHtml += '  <tbody>\n';
        rows.forEach(row => {
          tHtml += '    <tr>\n';
          row.forEach(cell => {
            tHtml += `      <td>${cell}</td>\n`;
          });
          tHtml += '    </tr>\n';
        });
        tHtml += '  </tbody>\n';
      }
      tHtml += '</table></div>\n';
      return tHtml;
    }
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Match table rows
      const isTableRow = line.startsWith('|') && line.endsWith('|');
      
      if (inTable) {
        if (isTableRow) {
          // Check if this is the separator row, skip if so
          if (line.includes('---')) {
            continue;
          }
          const cells = line.split('|').slice(1, -1).map(c => c.trim());
          tableRows.push(cells);
          continue;
        } else {
          // Close table
          newHtml += generateTableHtml(tableHeaders, tableRows);
          inTable = false;
          tableHeaders = [];
          tableRows = [];
          // fall through to process the current line
        }
      } else if (isTableRow) {
        // Look ahead to check if the next line is a separator line to start a table
        const nextLine = (i + 1 < lines.length) ? lines[i+1].trim() : "";
        if (nextLine.startsWith('|') && nextLine.includes('---')) {
          inTable = true;
          tableHeaders = line.split('|').slice(1, -1).map(c => c.trim());
          i++; // skip separator line
          continue;
        }
      }
      
      // Match list items
      const ulMatch = line.match(/^([-\*])\s+(.*)/);
      const olMatch = line.match(/^(\d+)\.\s+(.*)/);
      
      if (ulMatch) {
        if (!inList) {
          if (inOList) { newHtml += '</ol>\n'; inOList = false; }
          newHtml += '<ul>\n';
          inList = true;
        }
        newHtml += `  <li>${ulMatch[2]}</li>\n`;
      } else if (olMatch) {
        if (!inOList) {
          if (inList) { newHtml += '</ul>\n'; inList = false; }
          newHtml += '<ol>\n';
          inOList = true;
        }
        newHtml += `  <li>${olMatch[2]}</li>\n`;
      } else {
        if (inList) { newHtml += '</ul>\n'; inList = false; }
        if (inOList) { newHtml += '</ol>\n'; inOList = false; }
        
        // Paragraph / Empty lines / Other structures
        if (line === "") {
          newHtml += "\n";
        } else if (line.startsWith("<h") || 
                   line.startsWith("<div") || 
                   line.startsWith("<blockquote") || 
                   line.startsWith("</blockquote") || 
                   line.startsWith("%%CODEBLOCKPLACEHOLDER")) {
          newHtml += line + "\n";
        } else {
          newHtml += `<p>${line}</p>\n`;
        }
      }
    }
    
    if (inTable) {
      newHtml += generateTableHtml(tableHeaders, tableRows);
    }
    if (inList) newHtml += '</ul>\n';
    if (inOList) newHtml += '</ol>\n';
    
    html = newHtml;

    // Restore code blocks with clean formatting and a copy action
    codeBlocks.forEach(block => {
      // Escape backticks for JS safety
      const escapedCode = btoa(unescape(encodeURIComponent(block.rawCode)));
      const highlighted = this.highlightCode(block.code);
      const blockHtml = `
        <div class="code-wrapper lang-${block.lang}">
          <div class="code-header">
            <span class="code-lang">${block.lang}</span>
            <button class="copy-code-btn" data-code-base64="${escapedCode}">Copy</button>
          </div>
          <pre><code id="${block.id}">${highlighted}</code></pre>
        </div>
      `;
      html = html.replace(`%%CODEBLOCKPLACEHOLDER${block.id}%%`, blockHtml);
    });
    
    return html;
  }
};
