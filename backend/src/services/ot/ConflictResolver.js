const { logger } = require('../../config/logger');
const { APIError } = require('../../middleware/errorHandler');

/**
 * Conflict Resolution Service for OT/CRDT
 * Handles detection and resolution of conflicts in collaborative editing
 */
class ConflictResolver {
  constructor() {
    this.conflictStrategies = {
      insert: this.resolveInsertConflict.bind(this),
      delete: this.resolveDeleteConflict.bind(this),
      update: this.resolveUpdateConflict.bind(this),
      move: this.resolveMoveConflict.bind(this),
      format: this.resolveFormatConflict.bind(this),
    };
    
    this.conflictTypes = {
      CONCURRENT: 'concurrent',
      DEPENDENT: 'dependent',
      CYCLIC: 'cyclic',
      DIVERGENT: 'divergent',
    };
  }

  /**
   * Resolve conflicts in a set of operations
   */
  resolveConflicts(operations, documentState) {
    try {
      const conflicts = this.detectConflicts(operations);
      const resolvedOps = [];
      
      for (const conflict of conflicts) {
        const resolved = this.resolveConflict(conflict, documentState);
        resolvedOps.push(...resolved);
      }

      // Apply conflict resolution strategies
      const finalOps = this.applyResolutionStrategies(resolvedOps, documentState);
      
      logger.debug(`Resolved ${conflicts.length} conflicts in ${operations.length} operations`);
      
      return finalOps;
    } catch (error) {
      logger.error('ConflictResolver.resolveConflicts error:', error);
      throw error;
    }
  }

  /**
   * Detect conflicts in operations
   */
  detectConflicts(operations) {
    const conflicts = [];
    const opMap = new Map();

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const key = this.getOperationKey(op);
      
      if (opMap.has(key)) {
        // Check if operations are truly conflicting
        const existingOp = opMap.get(key);
        if (this.areOperationsConflicting(existingOp, op)) {
          conflicts.push({
            type: this.conflictTypes.CONCURRENT,
            operations: [existingOp, op],
            indices: [opMap.get(key + '_index'), i],
          });
        }
      } else {
        opMap.set(key, op);
        opMap.set(key + '_index', i);
      }
    }

    // Detect dependent conflicts
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        if (this.areOperationsDependent(operations[i], operations[j])) {
          conflicts.push({
            type: this.conflictTypes.DEPENDENT,
            operations: [operations[i], operations[j]],
            indices: [i, j],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve a single conflict
   */
  resolveConflict(conflict, documentState) {
    const strategy = this.conflictStrategies[conflict.operations[0]?.type] || this.defaultStrategy;
    return strategy(conflict, documentState);
  }

  /**
   * Resolve insert conflict
   */
  resolveInsertConflict(conflict, documentState) {
    const [op1, op2] = conflict.operations;
    
    // If inserts are in different locations, keep both
    if (this.areOperationsInDifferentLocations(op1, op2)) {
      return [op1, op2];
    }

    // If same position, apply both with offset
    if (this.areOperationsAtSamePosition(op1, op2)) {
      // Check if inserting same content
      if (op1.content === op2.content) {
        return [op1]; // Deduplicate
      }
      
      // Different content, apply both
      const adjustedOp2 = {
        ...op2,
        position: op2.position + 1,
      };
      return [op1, adjustedOp2];
    }

    // Default: apply both
    return [op1, op2];
  }

  /**
   * Resolve delete conflict
   */
  resolveDeleteConflict(conflict, documentState) {
    const [op1, op2] = conflict.operations;
    
    // If deleting same node, keep only one delete
    if (op1.nodeId === op2.nodeId) {
      return [op1];
    }

    // If one operation deletes a node that the other depends on
    if (this.areOperationsDependent(op1, op2)) {
      // Keep the delete that removes the dependent node
      if (this.isNodeDependent(op1, op2, documentState)) {
        return [op2];
      }
      if (this.isNodeDependent(op2, op1, documentState)) {
        return [op1];
      }
    }

    // Different nodes, keep both
    return [op1, op2];
  }

  /**
   * Resolve update conflict
   */
  resolveUpdateConflict(conflict, documentState) {
    const [op1, op2] = conflict.operations;
    
    // If updating same node, merge changes
    if (op1.nodeId === op2.nodeId) {
      // Merge content
      const mergedContent = this.mergeContent(
        this.getNodeContent(op1.nodeId, documentState),
        op1.content,
        op2.content
      );
      
      // Merge attributes
      const mergedAttributes = {
        ...op1.attributes,
        ...op2.attributes,
      };
      
      return [{
        ...op1,
        content: mergedContent,
        attributes: mergedAttributes,
        merged: true,
      }];
    }

    // Different nodes, keep both
    return [op1, op2];
  }

  /**
   * Resolve move conflict
   */
  resolveMoveConflict(conflict, documentState) {
    const [op1, op2] = conflict.operations;
    
    // If moving to same location, keep first move
    if (op1.targetPath === op2.targetPath) {
      return [op1];
    }

    // If moving same node to different locations, merge
    if (op1.nodeId === op2.nodeId) {
      // Keep the most recent move based on timestamp
      const timestamp1 = op1.timestamp || 0;
      const timestamp2 = op2.timestamp || 0;
      
      if (timestamp1 > timestamp2) {
        return [op1];
      }
      return [op2];
    }

    // Different locations, keep both
    return [op1, op2];
  }

  /**
   * Resolve format conflict
   */
  resolveFormatConflict(conflict, documentState) {
    const [op1, op2] = conflict.operations;
    
    // If formatting same node, merge formats
    if (op1.nodeId === op2.nodeId) {
      const mergedFormats = {
        ...op1.format,
        ...op2.format,
      };
      
      return [{
        ...op1,
        format: mergedFormats,
        merged: true,
      }];
    }

    // Different nodes, keep both
    return [op1, op2];
  }

  /**
   * Default conflict resolution strategy
   */
  defaultStrategy(conflict, documentState) {
    logger.warn('Using default conflict resolution strategy', conflict);
    return conflict.operations;
  }

  /**
   * Apply resolution strategies
   */
  applyResolutionStrategies(operations, documentState) {
    // Apply strategies based on operation types
    const strategies = {
      insert: this.applyInsertStrategy.bind(this),
      delete: this.applyDeleteStrategy.bind(this),
      update: this.applyUpdateStrategy.bind(this),
      move: this.applyMoveStrategy.bind(this),
      format: this.applyFormatStrategy.bind(this),
    };

    return operations.map(op => {
      const strategy = strategies[op.type];
      if (strategy) {
        return strategy(op, documentState);
      }
      return op;
    });
  }

  /**
   * Apply insert strategy
   */
  applyInsertStrategy(op, documentState) {
    // Ensure position is valid
    if (op.position < 0) {
      op.position = 0;
    }
    
    // Check if node already exists
    if (op.nodeId && this.nodeExists(op.nodeId, documentState)) {
      // Generate new ID
      op.nodeId = this.generateNodeId();
    }
    
    return op;
  }

  /**
   * Apply delete strategy
   */
  applyDeleteStrategy(op, documentState) {
    // Check if node exists
    if (op.nodeId && !this.nodeExists(op.nodeId, documentState)) {
      // Node already deleted, skip operation
      return null;
    }
    
    return op;
  }

  /**
   * Apply update strategy
   */
  applyUpdateStrategy(op, documentState) {
    // Check if node exists
    if (op.nodeId && !this.nodeExists(op.nodeId, documentState)) {
      // Node doesn't exist, skip operation
      return null;
    }
    
    return op;
  }

  /**
   * Apply move strategy
   */
  applyMoveStrategy(op, documentState) {
    // Check if source exists
    if (op.sourcePath && !this.pathExists(op.sourcePath, documentState)) {
      // Source doesn't exist, skip operation
      return null;
    }
    
    return op;
  }

  /**
   * Apply format strategy
   */
  applyFormatStrategy(op, documentState) {
    // Check if node exists
    if (op.nodeId && !this.nodeExists(op.nodeId, documentState)) {
      // Node doesn't exist, skip operation
      return null;
    }
    
    return op;
  }

  /**
   * Check if operations are conflicting
   */
  areOperationsConflicting(op1, op2) {
    if (op1.type !== op2.type) {
      return false;
    }

    switch (op1.type) {
      case 'insert':
        return op1.position === op2.position && 
               op1.path === op2.path;
      case 'delete':
        return op1.nodeId === op2.nodeId;
      case 'update':
        return op1.nodeId === op2.nodeId;
      case 'move':
        return op1.sourcePath === op2.sourcePath ||
               op1.targetPath === op2.targetPath;
      case 'format':
        return op1.nodeId === op2.nodeId;
      default:
        return false;
    }
  }

  /**
   * Check if operations are dependent
   */
  areOperationsDependent(op1, op2) {
    if (op1.type === 'delete' && op2.type === 'insert') {
      return op1.nodeId === op2.nodeId;
    }
    if (op1.type === 'move' && op2.type === 'delete') {
      return op1.sourcePath === op2.path;
    }
    if (op1.type === 'update' && op2.type === 'delete') {
      return op1.nodeId === op2.nodeId;
    }
    return false;
  }

  /**
   * Check if operations are in different locations
   */
  areOperationsInDifferentLocations(op1, op2) {
    if (op1.type !== op2.type) return true;
    
    switch (op1.type) {
      case 'insert':
        return op1.position !== op2.position || 
               op1.path !== op2.path;
      case 'update':
        return op1.nodeId !== op2.nodeId;
      default:
        return true;
    }
  }

  /**
   * Check if operations are at same position
   */
  areOperationsAtSamePosition(op1, op2) {
    if (op1.type !== op2.type) return false;
    
    switch (op1.type) {
      case 'insert':
        return op1.position === op2.position && 
               op1.path === op2.path;
      default:
        return false;
    }
  }

  /**
   * Check if node is dependent on another operation
   */
  isNodeDependent(op1, op2, documentState) {
    // Check if op1 depends on op2
    if (op1.type === 'delete' && op2.type === 'insert') {
      return op1.nodeId === op2.nodeId;
    }
    if (op1.type === 'update' && op2.type === 'delete') {
      return op1.nodeId === op2.nodeId;
    }
    return false;
  }

  /**
   * Merge content from multiple operations
   */
  mergeContent(originalContent, content1, content2) {
    if (!content1 && !content2) return originalContent || '';
    if (!content1) return content2 || originalContent || '';
    if (!content2) return content1 || originalContent || '';
    
    // If contents are the same, return one
    if (content1 === content2) return content1;
    
    // Use longest content
    if (content1.length >= content2.length) {
      return content1;
    }
    return content2;
  }

  /**
   * Get node content from document state
   */
  getNodeContent(nodeId, documentState) {
    if (!documentState || !documentState.ast) return '';
    
    const findNode = (nodes) => {
      if (!nodes) return null;
      for (const node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    const node = findNode(documentState.ast);
    return node ? node.content || '' : '';
  }

  /**
   * Check if node exists in document state
   */
  nodeExists(nodeId, documentState) {
    if (!documentState || !documentState.ast) return false;
    
    const findNode = (nodes) => {
      if (!nodes) return false;
      for (const node of nodes) {
        if (node.id === nodeId) return true;
        if (node.children && findNode(node.children)) {
          return true;
        }
      }
      return false;
    };
    
    return findNode(documentState.ast);
  }

  /**
   * Check if path exists in document state
   */
  pathExists(path, documentState) {
    if (!path || !documentState || !documentState.ast) return false;
    
    let current = documentState.ast;
    for (const segment of path) {
      if (segment === 'children') continue;
      if (!Array.isArray(current) || segment >= current.length) {
        return false;
      }
      current = current[segment].children || [];
    }
    
    return true;
  }

  /**
   * Generate unique node ID
   */
  generateNodeId() {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get operation key for deduplication
   */
  getOperationKey(op) {
    switch (op.type) {
      case 'insert':
        return `${op.type}-${op.position}-${op.path}`;
      case 'delete':
        return `${op.type}-${op.nodeId}`;
      case 'update':
        return `${op.type}-${op.nodeId}`;
      case 'move':
        return `${op.type}-${op.sourcePath}-${op.targetPath}`;
      case 'format':
        return `${op.type}-${op.nodeId}`;
      default:
        return `${op.type}-${JSON.stringify(op)}`;
    }
  }

  /**
   * Detect cyclic conflicts
   */
  detectCyclicConflicts(operations) {
    const cycles = [];
    const visited = new Set();
    const path = [];

    const dfs = (op, index) => {
      if (path.includes(index)) {
        cycles.push({
          type: this.conflictTypes.CYCLIC,
          operations: path.slice(path.indexOf(index)).map(i => operations[i]),
          indices: path.slice(path.indexOf(index)),
        });
        return;
      }

      visited.add(index);
      path.push(index);

      // Check dependencies
      for (let i = 0; i < operations.length; i++) {
        if (i === index) continue;
        if (this.areOperationsDependent(operations[index], operations[i])) {
          dfs(operations[i], i);
        }
      }

      path.pop();
    };

    for (let i = 0; i < operations.length; i++) {
      if (!visited.has(i)) {
        dfs(operations[i], i);
      }
    }

    return cycles;
  }

  /**
   * Detect divergent conflicts
   */
  detectDivergentConflicts(operations, documentState) {
    const divergences = [];
    
    for (let i = 0; i < operations.length; i++) {
      for (let j = i + 1; j < operations.length; j++) {
        if (this.areOperationsDivergent(operations[i], operations[j], documentState)) {
          divergences.push({
            type: this.conflictTypes.DIVERGENT,
            operations: [operations[i], operations[j]],
            indices: [i, j],
          });
        }
      }
    }
    
    return divergences;
  }

  /**
   * Check if operations are divergent
   */
  areOperationsDivergent(op1, op2, documentState) {
    if (op1.type !== op2.type) return false;
    
    // Check if operations lead to different document states
    const state1 = this.simulateOperation(op1, documentState);
    const state2 = this.simulateOperation(op2, documentState);
    
    return JSON.stringify(state1) !== JSON.stringify(state2);
  }

  /**
   * Simulate operation on document state
   */
  simulateOperation(op, documentState) {
    const state = JSON.parse(JSON.stringify(documentState));
    
    // Apply operation to state
    // This is a simplified simulation
    switch (op.type) {
      case 'insert':
        // Simulate insert
        break;
      case 'delete':
        // Simulate delete
        break;
      case 'update':
        // Simulate update
        break;
      case 'move':
        // Simulate move
        break;
      case 'format':
        // Simulate format
        break;
    }
    
    return state;
  }

  /**
   * Get conflict resolution statistics
   */
  getConflictStats(operations, conflicts) {
    return {
      totalOperations: operations.length,
      totalConflicts: conflicts.length,
      conflictTypes: {
        concurrent: conflicts.filter(c => c.type === this.conflictTypes.CONCURRENT).length,
        dependent: conflicts.filter(c => c.type === this.conflictTypes.DEPENDENT).length,
        cyclic: conflicts.filter(c => c.type === this.conflictTypes.CYCLIC).length,
        divergent: conflicts.filter(c => c.type === this.conflictTypes.DIVERGENT).length,
      },
      resolutionRate: conflicts.length > 0 ? 
        (operations.length - conflicts.length) / operations.length : 1,
    };
  }
}

module.exports = ConflictResolver;