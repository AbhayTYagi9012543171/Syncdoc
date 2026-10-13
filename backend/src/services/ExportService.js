const { logger } = require('../config/logger');
const { APIError } = require('../middleware/errorHandler');
const Document = require('../models/Document');

/**
 * Export Service
 * Handles document export in various formats
 */
class ExportService {
  /**
   * Export document in specified format
   */
  static async exportDocument(documentId, userId, format = 'md', options = {}) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      const exporters = {
        md: this.exportMarkdown,
        html: this.exportHtml,
        json: this.exportJson,
        txt: this.exportText,
        pdf: this.exportPdf,
        docx: this.exportDocx,
        csv: this.exportCsv,
        xml: this.exportXml,
        yaml: this.exportYaml,
        rtf: this.exportRtf,
        latex: this.exportLatex,
      };

      const exporter = exporters[format];
      if (!exporter) {
        throw new APIError(`Unsupported export format: ${format}`, 400, 'UNSUPPORTED_FORMAT');
      }

      const result = await exporter.call(this, document, options);
      
      logger.info(`Document exported: ${document.title} as ${format} by user ${userId}`);
      
      return {
        ...result,
        filename: `${document.slug || document.title || 'document'}.${this.getExtension(format)}`,
        format,
      };
    } catch (error) {
      logger.error('ExportService.exportDocument error:', error);
      throw error;
    }
  }

  /**
   * Export to Markdown
   */
  static async exportMarkdown(document, options = {}) {
    const { includeMetadata = true, includeVersion = true } = options;
    
    let content = '';
    
    // Add metadata
    if (includeMetadata) {
      content += `# ${document.title}\n\n`;
      content += `**Created:** ${document.createdAt.toLocaleDateString()}\n`;
      content += `**Last Updated:** ${document.updatedAt.toLocaleDateString()}\n`;
      content += `**Status:** ${document.status}\n`;
      if (includeVersion) {
        content += `**Version:** ${document.currentVersion}\n`;
      }
      content += `**Word Count:** ${document.stats?.wordCount || 0}\n\n`;
      content += '---\n\n';
    }

    // Convert AST to Markdown
    const astContent = this.astToMarkdown(document.ast);
    content += astContent;

    return {
      content,
      mimeType: 'text/markdown',
      extension: 'md',
    };
  }

  /**
   * Export to HTML
   */
  static async exportHtml(document, options = {}) {
    const { includeMetadata = true, includeVersion = true, style = 'default' } = options;
    
    // HTML styles
    const styles = {
      default: `
        body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #1a1a2e; }
        h1 { font-size: 2.5em; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
        h2 { font-size: 2em; margin-top: 1.5em; color: #0ea5e9; }
        h3 { font-size: 1.5em; margin-top: 1.2em; }
        code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
        pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
        blockquote { border-left: 4px solid #0ea5e9; padding-left: 20px; margin: 20px 0; color: #555; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f4f4f5; }
        .metadata { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.9em; }
      `,
      minimal: `
        body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
        pre { background: #f4f4f5; padding: 16px; border-radius: 4px; overflow-x: auto; }
        code { background: #f4f4f5; padding: 2px 4px; border-radius: 4px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background: #f4f4f5; }
      `,
      dark: `
        body { font-family: 'Inter', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; background: #1a1a2e; color: #e2e8f0; }
        h1 { font-size: 2.5em; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
        h2 { font-size: 2em; margin-top: 1.5em; color: #0ea5e9; }
        h3 { font-size: 1.5em; margin-top: 1.2em; }
        code { background: #2d2d44; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
        pre { background: #2d2d44; padding: 16px; border-radius: 8px; overflow-x: auto; }
        blockquote { border-left: 4px solid #0ea5e9; padding-left: 20px; margin: 20px 0; color: #94a3b8; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #2d2d44; padding: 8px 12px; text-align: left; }
        th { background: #2d2d44; }
        .metadata { background: #2d2d44; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #2d2d44; color: #64748b; font-size: 0.9em; }
      `,
    };

    const selectedStyle = styles[style] || styles.default;

    let content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    <style>${selectedStyle}</style>
</head>
<body>`;

    // Add metadata
    if (includeMetadata) {
      content += `
        <div class="metadata">
            <h1>${document.title}</h1>
            <p><strong>Created:</strong> ${document.createdAt.toLocaleDateString()}</p>
            <p><strong>Last Updated:</strong> ${document.updatedAt.toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${document.status}</p>
            ${includeVersion ? `<p><strong>Version:</strong> ${document.currentVersion}</p>` : ''}
            <p><strong>Word Count:</strong> ${document.stats?.wordCount || 0}</p>
        </div>`;
    }

    // Convert AST to HTML
    const astContent = this.astToHtml(document.ast);
    content += astContent;

    // Footer
    content += `
        <div class="footer">
            <p>Exported from SyncDoc on ${new Date().toLocaleString()}</p>
            <p>Document ID: ${document._id}</p>
        </div>
    </body>
</html>`;

    return {
      content,
      mimeType: 'text/html',
      extension: 'html',
    };
  }

  /**
   * Export to JSON
   */
  static async exportJson(document, options = {}) {
    const { includeMetadata = true, pretty = true, includeVersions = true } = options;
    
    const data = {
      id: document._id,
      title: document.title,
      description: document.description,
      status: document.status,
      owner: document.owner,
      collaborators: document.collaborators,
      ast: document.ast,
      currentVersion: document.currentVersion,
      stats: document.stats,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    if (includeMetadata) {
      data.metadata = {
        wordCount: document.stats?.wordCount || 0,
        charCount: document.stats?.charCount || 0,
        nodeCount: document.stats?.nodeCount || 0,
        totalEdits: document.stats?.totalEdits || 0,
        collaboratorCount: document.collaborators?.length || 0,
      };
    }

    if (includeVersions) {
      data.versions = document.versions;
    }

    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);

    return {
      content,
      mimeType: 'application/json',
      extension: 'json',
    };
  }

  /**
   * Export to Plain Text
   */
  static async exportText(document, options = {}) {
    const { includeMetadata = true } = options;
    
    let content = '';
    
    if (includeMetadata) {
      content += `${document.title}\n`;
      content += `${'='.repeat(document.title.length)}\n\n`;
      content += `Created: ${document.createdAt.toLocaleDateString()}\n`;
      content += `Last Updated: ${document.updatedAt.toLocaleDateString()}\n`;
      content += `Status: ${document.status}\n`;
      content += `Word Count: ${document.stats?.wordCount || 0}\n\n`;
      content += `${'-'.repeat(50)}\n\n`;
    }

    const astContent = this.astToText(document.ast);
    content += astContent;

    return {
      content,
      mimeType: 'text/plain',
      extension: 'txt',
    };
  }

  /**
   * Export to PDF (placeholder - requires PDF generation library)
   */
  static async exportPdf(document, options = {}) {
    // In production, use a library like pdfkit, puppeteer, or pdf-lib
    // For now, return HTML that can be converted to PDF
    const htmlResult = await this.exportHtml(document, options);
    
    return {
      content: htmlResult.content,
      mimeType: 'application/pdf',
      extension: 'pdf',
      note: 'PDF export requires additional setup',
    };
  }

  /**
   * Export to DOCX (placeholder - requires DOCX generation library)
   */
  static async exportDocx(document, options = {}) {
    // In production, use a library like docx or mammoth
    const mdResult = await this.exportMarkdown(document, options);
    
    return {
      content: mdResult.content,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: 'docx',
      note: 'DOCX export requires additional setup',
    };
  }

  /**
   * Export to CSV (structured data export)
   */
  static async exportCsv(document, options = {}) {
    const { includeHeaders = true } = options;
    
    const rows = [];
    
    // Headers
    if (includeHeaders) {
      rows.push(['Node ID', 'Type', 'Content', 'Children Count', 'Version', 'Created At']);
    }

    // Extract nodes
    const extractNodes = (nodes, parentPath = '') => {
      if (!nodes || !Array.isArray(nodes)) return;
      
      for (const node of nodes) {
        rows.push([
          node.id || '',
          node.type || '',
          (node.content || '').replace(/,/g, ';'),
          node.children?.length || 0,
          node.version || 0,
          node.createdAt ? new Date(node.createdAt).toLocaleDateString() : '',
        ]);
        
        if (node.children && node.children.length) {
          extractNodes(node.children, `${parentPath}/${node.id}`);
        }
      }
    };

    extractNodes(document.ast);

    const content = rows.map(row => row.join(',')).join('\n');

    return {
      content,
      mimeType: 'text/csv',
      extension: 'csv',
    };
  }

  /**
   * Export to XML
   */
  static async exportXml(document, options = {}) {
    const { includeMetadata = true } = options;
    
    let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
    content += '<document>\n';
    
    // Metadata
    if (includeMetadata) {
      content += `  <metadata>\n`;
      content += `    <title>${this.escapeXml(document.title)}</title>\n`;
      content += `    <description>${this.escapeXml(document.description || '')}</description>\n`;
      content += `    <status>${document.status}</status>\n`;
      content += `    <createdAt>${document.createdAt.toISOString()}</createdAt>\n`;
      content += `    <updatedAt>${document.updatedAt.toISOString()}</updatedAt>\n`;
      content += `    <wordCount>${document.stats?.wordCount || 0}</wordCount>\n`;
      content += `  </metadata>\n`;
    }

    // AST Content
    content += this.astToXml(document.ast, 1);

    content += '</document>';

    return {
      content,
      mimeType: 'application/xml',
      extension: 'xml',
    };
  }

  /**
   * Export to YAML
   */
  static async exportYaml(document, options = {}) {
    const { includeMetadata = true } = options;
    
    let content = '';
    
    // Metadata
    if (includeMetadata) {
      content += `title: ${document.title}\n`;
      content += `description: ${document.description || ''}\n`;
      content += `status: ${document.status}\n`;
      content += `createdAt: ${document.createdAt.toISOString()}\n`;
      content += `updatedAt: ${document.updatedAt.toISOString()}\n`;
      content += `version: ${document.currentVersion}\n`;
      content += `wordCount: ${document.stats?.wordCount || 0}\n\n`;
    }

    // AST Content
    content += 'ast:\n';
    content += this.astToYaml(document.ast, 1);

    return {
      content,
      mimeType: 'text/yaml',
      extension: 'yaml',
    };
  }

  /**
   * Export to RTF (Rich Text Format)
   */
  static async exportRtf(document, options = {}) {
    // Simple RTF generation
    const text = await this.exportText(document, options);
    
    let content = '{\\rtf1\\ansi\\deff0\n';
    content += '{\\fonttbl{\\f0\\fnil\\fcharset0 Arial;}}\n';
    content += '\\viewkind4\\uc1\\pard\\lang1033\\f0\\fs24\n';
    content += text.content.replace(/\n/g, '\\par ');
    content += '\\par }';

    return {
      content,
      mimeType: 'text/rtf',
      extension: 'rtf',
    };
  }

  /**
   * Export to LaTeX
   */
  static async exportLatex(document, options = {}) {
    const { includeMetadata = true } = options;
    
    let content = '\\documentclass{article}\n';
    content += '\\usepackage{hyperref}\n';
    content += '\\usepackage{listings}\n';
    content += '\\usepackage{color}\n';
    content += '\\begin{document}\n\n';

    if (includeMetadata) {
      content += `\\title{${document.title}}\n`;
      content += `\\author{${document.owner?.username || 'Unknown'}}\n`;
      content += `\\date{${document.createdAt.toLocaleDateString()}}\n`;
      content += '\\maketitle\n\n';
    }

    // Convert AST to LaTeX
    const astContent = this.astToLatex(document.ast);
    content += astContent;

    content += '\\end{document}';

    return {
      content,
      mimeType: 'text/x-latex',
      extension: 'tex',
    };
  }

  // ==================== AST CONVERTERS ====================

  /**
   * Convert AST to Markdown
   */
  static astToMarkdown(nodes, depth = 0) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    let content = '';
    for (const node of nodes) {
      switch (node.type) {
        case 'heading':
          const level = node.attributes?.level || 1;
          content += '#'.repeat(level) + ' ' + (node.content || '') + '\n\n';
          break;
        case 'paragraph':
          content += (node.content || '') + '\n\n';
          break;
        case 'code-block':
          const lang = node.attributes?.language || '';
          content += '```' + lang + '\n' + (node.content || '') + '\n```\n\n';
          break;
        case 'list':
          content += '- ' + (node.content || '') + '\n';
          break;
        case 'list-item':
          content += '  - ' + (node.content || '') + '\n';
          break;
        case 'blockquote':
          content += '> ' + (node.content || '') + '\n';
          break;
        case 'table':
          content += this.tableToMarkdown(node);
          break;
        case 'image':
          const src = node.attributes?.src || '';
          const alt = node.attributes?.alt || '';
          content += `![${alt}](${src})\n\n`;
          break;
        case 'link':
          const href = node.attributes?.href || '';
          content += `[${node.content || ''}](${href})`;
          break;
        default:
          content += (node.content || '') + '\n';
      }
      
      if (node.children && node.children.length) {
        const childContent = this.astToMarkdown(node.children, depth + 1);
        if (node.type !== 'list') {
          content += childContent;
        }
      }
    }
    return content;
  }

  /**
   * Convert AST to HTML
   */
  static astToHtml(nodes) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    let content = '';
    for (const node of nodes) {
      switch (node.type) {
        case 'heading':
          const level = node.attributes?.level || 1;
          content += `<h${level}>${node.content || ''}</h${level}>`;
          break;
        case 'paragraph':
          content += `<p>${node.content || ''}</p>`;
          break;
        case 'code-block':
          const lang = node.attributes?.language || '';
          content += `<pre><code class="language-${lang}">${this.escapeHtml(node.content || '')}</code></pre>`;
          break;
        case 'list':
          content += `<ul><li>${node.content || ''}</li>`;
          if (node.children && node.children.length) {
            content += this.astToHtml(node.children);
          }
          content += '</ul>';
          break;
        case 'list-item':
          content += `<li>${node.content || ''}</li>`;
          break;
        case 'blockquote':
          content += `<blockquote>${node.content || ''}</blockquote>`;
          break;
        case 'table':
          content += this.tableToHtml(node);
          break;
        case 'image':
          const src = node.attributes?.src || '';
          const alt = node.attributes?.alt || '';
          content += `<img src="${src}" alt="${alt}" />`;
          break;
        case 'link':
          const href = node.attributes?.href || '';
          content += `<a href="${href}">${node.content || ''}</a>`;
          break;
        default:
          content += node.content || '';
      }
    }
    return content;
  }

  /**
   * Convert AST to Plain Text
   */
  static astToText(nodes) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    let content = '';
    for (const node of nodes) {
      content += node.content || '';
      if (node.children && node.children.length) {
        content += '\n' + this.astToText(node.children);
      }
      content += '\n';
    }
    return content;
  }

  /**
   * Convert AST to XML
   */
  static astToXml(nodes, depth = 0) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    const indent = '  '.repeat(depth);
    let content = '';
    for (const node of nodes) {
      content += `${indent}<node id="${node.id}" type="${node.type}" version="${node.version || 0}">\n`;
      if (node.content) {
        content += `${indent}  <content>${this.escapeXml(node.content)}</content>\n`;
      }
      if (node.attributes && Object.keys(node.attributes).length > 0) {
        content += `${indent}  <attributes>\n`;
        for (const [key, value] of Object.entries(node.attributes)) {
          content += `${indent}    <${key}>${this.escapeXml(value)}</${key}>\n`;
        }
        content += `${indent}  </attributes>\n`;
      }
      if (node.children && node.children.length) {
        content += this.astToXml(node.children, depth + 1);
      }
      content += `${indent}</node>\n`;
    }
    return content;
  }

  /**
   * Convert AST to YAML
   */
  static astToYaml(nodes, depth = 0) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    const indent = '  '.repeat(depth);
    let content = '';
    for (const node of nodes) {
      content += `${indent}- id: ${node.id}\n`;
      content += `${indent}  type: ${node.type}\n`;
      if (node.content) {
        content += `${indent}  content: ${node.content}\n`;
      }
      if (node.attributes && Object.keys(node.attributes).length > 0) {
        content += `${indent}  attributes:\n`;
        for (const [key, value] of Object.entries(node.attributes)) {
          content += `${indent}    ${key}: ${value}\n`;
        }
      }
      if (node.children && node.children.length) {
        content += `${indent}  children:\n`;
        content += this.astToYaml(node.children, depth + 1);
      }
    }
    return content;
  }

  /**
   * Convert AST to LaTeX
   */
  static astToLatex(nodes) {
    if (!nodes || !Array.isArray(nodes)) return '';
    
    let content = '';
    for (const node of nodes) {
      switch (node.type) {
        case 'heading':
          const level = node.attributes?.level || 1;
          const sectionCmds = ['', '\\section', '\\subsection', '\\subsubsection', '\\paragraph', '\\subparagraph'];
          const cmd = sectionCmds[level] || '\\section';
          content += `${cmd}{${node.content || ''}}\n\n`;
          break;
        case 'paragraph':
          content += `${node.content || ''}\n\n`;
          break;
        case 'code-block':
          content += '\\begin{verbatim}\n';
          content += `${node.content || ''}\n`;
          content += '\\end{verbatim}\n\n';
          break;
        case 'list':
          content += '\\begin{itemize}\n';
          content += `\\item ${node.content || ''}\n`;
          if (node.children && node.children.length) {
            content += this.astToLatex(node.children);
          }
          content += '\\end{itemize}\n\n';
          break;
        case 'list-item':
          content += `\\item ${node.content || ''}\n`;
          break;
        case 'blockquote':
          content += `\\begin{quote}\n${node.content || ''}\\end{quote}\n\n`;
          break;
        default:
          content += node.content || '';
      }
    }
    return content;
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Convert table to Markdown
   */
  static tableToMarkdown(table) {
    if (!table || !table.children) return '';
    
    let content = '|';
    const headers = table.children.filter(c => c.type === 'table-row');
    if (headers.length > 0) {
      const cells = headers[0].children || [];
      for (const cell of cells) {
        content += ` ${cell.content || ''} |`;
      }
      content += '\n|';
      for (let i = 0; i < cells.length; i++) {
        content += ' --- |';
      }
      content += '\n';
    }
    return content;
  }

  /**
   * Convert table to HTML
   */
  static tableToHtml(table) {
    if (!table || !table.children) return '';
    
    let content = '<table>\n';
    for (const row of table.children) {
      if (row.type === 'table-row') {
        content += '  <tr>\n';
        for (const cell of row.children || []) {
          if (cell.type === 'table-cell') {
            const tag = cell.attributes?.header ? 'th' : 'td';
            content += `    <${tag}>${cell.content || ''}</${tag}>\n`;
          }
        }
        content += '  </tr>\n';
      }
    }
    content += '</table>';
    return content;
  }

  /**
   * Get file extension for format
   */
  static getExtension(format) {
    const extensions = {
      md: 'md',
      html: 'html',
      json: 'json',
      txt: 'txt',
      pdf: 'pdf',
      docx: 'docx',
      csv: 'csv',
      xml: 'xml',
      yaml: 'yaml',
      rtf: 'rtf',
      latex: 'tex',
    };
    return extensions[format] || 'txt';
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  /**
   * Escape XML special characters
   */
  static escapeXml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  /**
   * Get available export formats
   */
  static getAvailableFormats() {
    return [
      { id: 'md', name: 'Markdown', description: 'Markdown document' },
      { id: 'html', name: 'HTML', description: 'HTML document' },
      { id: 'json', name: 'JSON', description: 'JSON data' },
      { id: 'txt', name: 'Plain Text', description: 'Plain text document' },
      { id: 'pdf', name: 'PDF', description: 'PDF document' },
      { id: 'docx', name: 'DOCX', description: 'Word document' },
      { id: 'csv', name: 'CSV', description: 'CSV data' },
      { id: 'xml', name: 'XML', description: 'XML document' },
      { id: 'yaml', name: 'YAML', description: 'YAML data' },
      { id: 'rtf', name: 'RTF', description: 'Rich Text Format' },
      { id: 'latex', name: 'LaTeX', description: 'LaTeX document' },
    ];
  }
}

module.exports = ExportService;