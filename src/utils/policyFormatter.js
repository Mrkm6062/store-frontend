/**
 * Formats policy content into clean, semantic HTML.
 * Supports both raw HTML markup and Markdown/plain text formatting.
 */
export function formatPolicyHtml(content) {
  if (!content || typeof content !== 'string') return '';
  const trimmed = content.trim();

  // Basic tag sanitizer function to prevent XSS
  const sanitizeHtml = (html) => {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
      .replace(/javascript:/gi, '');
  };

  // Check if string contains standard HTML formatting tags
  const hasHtml = /<(h[1-6]|p|div|ul|ol|li|strong|b|em|i|u|br|blockquote|hr|table)\b[^>]*>/i.test(trimmed);

  if (hasHtml) {
    return sanitizeHtml(trimmed);
  }

  // Parse Markdown / Plain text
  const lines = trimmed.split(/\r?\n/);
  const output = [];
  let currentListType = null; // 'ul' | 'ol'

  const closeListIfNeeded = () => {
    if (currentListType === 'ul') {
      output.push('</ul>');
      currentListType = null;
    } else if (currentListType === 'ol') {
      output.push('</ol>');
      currentListType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line) {
      closeListIfNeeded();
      continue;
    }

    // Replace Markdown Bold & Italic
    line = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em>$2</em>$3')
      .replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');

    // Headings
    if (/^###\s+(.*)/.test(line)) {
      closeListIfNeeded();
      output.push(`<h3>${line.replace(/^###\s+/, '')}</h3>`);
    } else if (/^##\s+(.*)/.test(line)) {
      closeListIfNeeded();
      output.push(`<h2>${line.replace(/^##\s+/, '')}</h2>`);
    } else if (/^#\s+(.*)/.test(line)) {
      closeListIfNeeded();
      output.push(`<h1>${line.replace(/^#\s+/, '')}</h1>`);
    }
    // Blockquote
    else if (/^>\s+(.*)/.test(line)) {
      closeListIfNeeded();
      output.push(`<blockquote>${line.replace(/^>\s+/, '')}</blockquote>`);
    }
    // Bullet list (*, -, •)
    else if (/^(\*|-|•)\s+(.*)/.test(line)) {
      if (currentListType !== 'ul') {
        closeListIfNeeded();
        output.push('<ul>');
        currentListType = 'ul';
      }
      output.push(`<li>${line.replace(/^(\*|-|•)\s+/, '')}</li>`);
    }
    // Numbered list (1., 2., etc.)
    else if (/^\d+\.\s+(.*)/.test(line)) {
      if (currentListType !== 'ol') {
        closeListIfNeeded();
        output.push('<ol>');
        currentListType = 'ol';
      }
      output.push(`<li>${line.replace(/^\d+\.\s+/, '')}</li>`);
    }
    // Normal paragraph line
    else {
      closeListIfNeeded();
      output.push(`<p>${line}</p>`);
    }
  }

  closeListIfNeeded();

  return sanitizeHtml(output.join('\n'));
}
