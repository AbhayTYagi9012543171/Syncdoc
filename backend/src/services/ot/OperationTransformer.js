// src/services/ot/OperationTransformer.js
const { v4: uuidv4 } = require('uuid');
const { ASTValidator } = require('./ASTValidator');

class OperationTransformer {
  constructor(document) {
    this.document = document;
    this.ast = JSON.parse(JSON.stringify(document.ast));
    this.operations = [];
    this.version = document.currentVersion || 0;
    this.validator = new ASTValidator();
  }

  transform(operation, clientVersion) {
    const transformed = [];
    const ops = Array.isArray(operation) ? operation : [operation];

    // Catch up if client version is behind
    if (clientVersion < this.version) {
      this.catchUp(clientVersion);
    }

    for (const op of ops) {
      const transformedOp = this.transformOperation(op);
      transformed.push(transformedOp);
    }

    return transformed.length === 1 ? transformed[0] : transformed;
  }

  transformOperation(op) {
    switch (op.type) {
      case 'insert':
        return this.transformInsert(op);
      case 'delete':
        return this.transformDelete(op);
      case 'update':
        return this.transformUpdate(op);
      case 'move':
        return this.transformMove(op);
      case 'format':
        return this.transformFormat(op);
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  transformInsert(op) {
    const path = op.path || [];
    let position = op.position || 0;

    // Adjust position based on concurrent operations
    for (const pendingOp of this.operations) {
      if (pendingOp.type === 'insert') {
        const pendingPath = pendingOp.path || [];
        if (this.isAncestor(path, pendingPath)) {
          if (pendingOp.position <= position) {
            position += 1;
          }
        }
      } else if (pendingOp.type === 'delete') {
        if (this.isAncestor(path, pendingOp.path)) {
          if (pendingOp.position < position) {
            position = Math.max(0, position - 1);
          }
        }
      }
    }

    return {
      ...op,
      position,
      timestamp: Date.now(),
      id: op.id || uuidv4(),
    };
  }

  transformDelete(op) {
    const path = op.path || [];
    let position = op.position || 0;

    // Adjust for concurrent operations
    for (const pendingOp of this.operations) {
      if (pendingOp.type === 'insert') {
        if (this.isAncestor(path, pendingOp.path)) {
          if (pendingOp.position < position) {
            position += 1;
          }
        }
      } else if (pendingOp.type === 'delete') {
        if (this.isAncestor(path, pendingOp.path)) {
          if (pendingOp.position < position) {
            position = Math.max(0, position - 1);
          }
        }
      }
    }

    return {
      ...op,
      position,
      timestamp: Date.now(),
    };
  }

  transformUpdate(op) {
    const path = op.path || [];

    // Merge concurrent updates
    for (const pendingOp of this.operations) {
      if (pendingOp.type === 'update' && this.isSamePath(path, pendingOp.path)) {
        if (pendingOp.content !== undefined) {
          op.content = this.mergeContent(op.content, pendingOp.content);
        }
        if (pendingOp.attributes) {
          op.attributes = { ...op.attributes, ...pendingOp.attributes };
        }
      }
    }

    return {
      ...op,
      timestamp: Date.now(),
    };
  }

  transformMove(op) {
    const sourcePath = op.sourcePath || [];
    const targetPath = op.targetPath || [];

    let adjustedSourcePath = [...sourcePath];
    let adjustedTargetPath = [...targetPath];

    for (const pendingOp of this.operations) {
      if (pendingOp.type === 'insert' || pendingOp.type === 'delete') {
        adjustedSourcePath = this.adjustPath(adjustedSourcePath, pendingOp);
        adjustedTargetPath = this.adjustPath(adjustedTargetPath, pendingOp);
      }
    }

    return {
      ...op,
      sourcePath: adjustedSourcePath,
      targetPath: adjustedTargetPath,
      timestamp: Date.now(),
    };
  }

  transformFormat(op) {
    return {
      ...op,
      timestamp: Date.now(),
      id: op.id || uuidv4(),
    };
  }

  applyOperations(ops) {
    const appliedOps = [];
    const opsArray = Array.isArray(ops) ? ops : [ops];

    for (const op of opsArray) {
      this.applyOperation(op);
      appliedOps.push(op);
      this.operations.push(op);
      this.version += 1;
    }

    if (!this.validator.validate(this.ast)) {
      throw new Error('Invalid AST structure after applying operations');
    }

    this.document.ast = this.ast;
    this.document.currentVersion = this.version;
    this.document.operations.push(...appliedOps.map(op => ({
      operation: op,
      userId: op.userId,
      timestamp: op.timestamp || new Date(),
      version: this.version - appliedOps.length + appliedOps.indexOf(op),
      type: op.type,
    })));

    return this.ast;
  }

  applyOperation(op) {
    switch (op.type) {
      case 'insert':
        this.applyInsert(op);
        break;
      case 'delete':
        this.applyDelete(op);
        break;
      case 'update':
        this.applyUpdate(op);
        break;
      case 'move':
        this.applyMove(op);
        break;
      case 'format':
        this.applyFormat(op);
        break;
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }

  applyInsert(op) {
    const path = op.path || [];
    const position = op.position || 0;
    const parentPath = path.slice(0, -1);
    const parent = this.getNodeAtPath(parentPath);

    if (!parent) {
      throw new Error(`Parent not found at path: ${parentPath}`);
    }

    const newNode = {
      id: op.nodeId || uuidv4(),
      type: op.nodeType || 'paragraph',
      content: op.content || '',
      children: [],
      attributes: op.attributes || {},
      version: 0,
      createdBy: op.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const targetArray = Array.isArray(parent) ? parent : parent.children;
    const insertPosition = Math.min(position, targetArray.length);
    targetArray.splice(insertPosition, 0, newNode);
  }

  applyDelete(op) {
    const path = op.path || [];
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const parent = this.getNodeAtPath(parentPath);

    if (!parent) {
      throw new Error(`Parent not found at path: ${parentPath}`);
    }

    const targetArray = Array.isArray(parent) ? parent : parent.children;
    if (index >= targetArray.length) {
      throw new Error(`Index ${index} out of bounds`);
    }

    op.deletedNode = targetArray[index];
    targetArray.splice(index, 1);
  }

  applyUpdate(op) {
    const path = op.path || [];
    const node = this.getNodeAtPath(path);

    if (!node) {
      throw new Error(`Node not found at path: ${path}`);
    }

    if (op.content !== undefined) {
      node.content = op.content;
    }

    if (op.attributes) {
      node.attributes = { ...node.attributes, ...op.attributes };
    }

    node.version = (node.version || 0) + 1;
    node.updatedAt = new Date();
    node.updatedBy = op.userId;
  }

  applyMove(op) {
    const sourcePath = op.sourcePath || [];
    const targetPath = op.targetPath || [];

    const sourceNode = this.getNodeAtPath(sourcePath);
    if (!sourceNode) {
      throw new Error(`Source node not found at path: ${sourcePath}`);
    }

    const sourceParentPath = sourcePath.slice(0, -1);
    const sourceIndex = sourcePath[sourcePath.length - 1];
    const sourceParent = this.getNodeAtPath(sourceParentPath);
    const sourceArray = Array.isArray(sourceParent) ? sourceParent : sourceParent.children;
    const [movedNode] = sourceArray.splice(sourceIndex, 1);

    const targetParentPath = targetPath.slice(0, -1);
    const targetIndex = targetPath[targetPath.length - 1] || 0;
    const targetParent = this.getNodeAtPath(targetParentPath);
    const targetArray = Array.isArray(targetParent) ? targetParent : targetParent.children;
    targetArray.splice(targetIndex, 0, movedNode);
  }

  applyFormat(op) {
    const path = op.path || [];
    const node = this.getNodeAtPath(path);

    if (!node) {
      throw new Error(`Node not found at path: ${path}`);
    }

    if (op.format === 'bold') {
      node.content = `<strong>${node.content}</strong>`;
    } else if (op.format === 'italic') {
      node.content = `<em>${node.content}</em>`;
    } else if (op.format === 'code') {
      node.content = `<code>${node.content}</code>`;
    } else if (op.format === 'underline') {
      node.content = `<u>${node.content}</u>`;
    } else if (op.format === 'strikethrough') {
      node.content = `<del>${node.content}</del>`;
    }
  }

  getNodeAtPath(path) {
    if (!path || path.length === 0) return this.ast;

    let current = this.ast;
    let currentNode = this.ast;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      
      if (segment === 'children') {
        continue;
      }

      if (Array.isArray(current)) {
        if (segment >= current.length) {
          return null;
        }
        currentNode = current[segment];
        current = currentNode.children || [];
      } else {
        return null;
      }
    }

    return currentNode;
  }

  isAncestor(path1, path2) {
    if (path1.length >= path2.length) return false;
    return path1.every((segment, index) => segment === path2[index]);
  }

  isDescendant(path1, path2) {
    if (path1.length <= path2.length) return false;
    return path2.every((segment, index) => segment === path1[index]);
  }

  isSamePath(path1, path2) {
    if (path1.length !== path2.length) return false;
    return path1.every((segment, index) => segment === path2[index]);
  }

  adjustPath(path, op) {
    if (op.type === 'insert' && this.isAncestor(path, op.path)) {
      if (op.position <= path[path.length - 1]) {
        path[path.length - 1] += 1;
      }
    }
    if (op.type === 'delete' && this.isAncestor(path, op.path)) {
      if (op.position < path[path.length - 1]) {
        path[path.length - 1] -= 1;
      }
    }
    return path;
  }

  mergeContent(content1, content2) {
    // Simple merge - in production, use diff-based merge
    return content2 || content1;
  }

  catchUp(clientVersion) {
    const opsToCatch = this.document.operations.slice(clientVersion);
    for (const op of opsToCatch) {
      this.applyOperation(op.operation);
    }
  }
}

module.exports = { OperationTransformer };