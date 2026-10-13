// src/services/ot/ASTValidator.js
class ASTValidator {
  constructor() {
    this.validNodeTypes = [
      'document',
      'heading',
      'paragraph',
      'code-block',
      'list',
      'list-item',
      'table',
      'table-row',
      'table-cell',
      'image',
      'blockquote',
      'divider',
      'text',
      'bold',
      'italic',
      'underline',
      'code',
      'link',
      'mention',
    ];
    
    this.validAttributes = {
      heading: ['level'],
      'code-block': ['language', 'showLineNumbers'],
      image: ['src', 'alt', 'title', 'width', 'height'],
      link: ['href', 'target', 'rel'],
      table: ['border', 'cellPadding', 'cellSpacing'],
      list: ['ordered', 'start'],
    };
  }

  validate(ast) {
    if (!Array.isArray(ast)) {
      this.error = 'AST must be an array';
      return false;
    }

    for (const node of ast) {
      if (!this.validateNode(node)) {
        return false;
      }
    }

    return true;
  }

  validateNode(node) {
    if (!node.id) {
      this.error = 'Node missing id';
      return false;
    }

    if (!node.type || !this.validNodeTypes.includes(node.type)) {
      this.error = `Invalid node type: ${node.type}`;
      return false;
    }

    if (node.content !== undefined && typeof node.content !== 'string') {
      this.error = 'Node content must be a string';
      return false;
    }

    if (node.children !== undefined) {
      if (!Array.isArray(node.children)) {
        this.error = 'Node children must be an array';
        return false;
      }
      
      for (const child of node.children) {
        if (!this.validateNode(child)) {
          return false;
        }
      }
    }

    if (node.attributes) {
      if (typeof node.attributes !== 'object') {
        this.error = 'Node attributes must be an object';
        return false;
      }
      
      const validAttrs = this.validAttributes[node.type] || [];
      for (const key of Object.keys(node.attributes)) {
        if (!validAttrs.includes(key) && !key.startsWith('data-')) {
          this.error = `Invalid attribute "${key}" for node type "${node.type}"`;
          return false;
        }
      }
    }

    return true;
  }

  getError() {
    return this.error;
  }

  // Additional validation methods
  validateSchemaVersion(node, version) {
    // Check if node is compatible with schema version
    return node.schemaVersion === version;
  }

  validateSize(ast, maxSize = 50 * 1024 * 1024) { // 50MB
    const size = Buffer.byteLength(JSON.stringify(ast));
    return size <= maxSize;
  }

  validateDepth(node, maxDepth = 20) {
    if (maxDepth <= 0) return false;
    
    if (!node.children || node.children.length === 0) {
      return true;
    }
    
    return node.children.every(child => 
      this.validateDepth(child, maxDepth - 1)
    );
  }
}

module.exports = { ASTValidator };