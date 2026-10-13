// src/models/sub-schemas/ASTNodeSchema.js
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ASTNodeSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
    required: true,
  },
  type: {
    type: String,
    enum: [
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
    ],
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  children: [this],
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  version: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook
ASTNodeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.version += 1;
  next();
});

// Instance methods
ASTNodeSchema.methods.getText = function() {
  let text = this.content || '';
  
  if (this.children && this.children.length) {
    for (const child of this.children) {
      text += ' ' + child.getText();
    }
  }
  
  return text;
};

ASTNodeSchema.methods.getDepth = function() {
  let depth = 0;
  let current = this;
  
  while (current.parent) {
    depth += 1;
    current = current.parent;
  }
  
  return depth;
};

ASTNodeSchema.methods.findChild = function(childId) {
  return this.children.find(child => child.id === childId);
};

ASTNodeSchema.methods.addChild = function(childData) {
  const child = new ASTNodeSchema(childData);
  child.parent = this._id;
  this.children.push(child);
  return child;
};

ASTNodeSchema.methods.removeChild = function(childId) {
  this.children = this.children.filter(child => child.id !== childId);
};

ASTNodeSchema.methods.updateAttributes = function(attributes) {
  this.attributes = new Map([...this.attributes, ...Object.entries(attributes)]);
  this.updatedAt = new Date();
};

// Static methods
ASTNodeSchema.statics.createFrom = function(data) {
  const node = new this(data);
  if (data.children) {
    node.children = data.children.map(child => this.createFrom(child));
  }
  return node;
};

ASTNodeSchema.statics.isValid = function(node) {
  if (!node.id || !node.type) return false;
  
  if (node.children && !Array.isArray(node.children)) return false;
  
  if (node.children && node.children.length) {
    for (const child of node.children) {
      if (!this.isValid(child)) return false;
    }
  }
  
  return true;
};

module.exports = { ASTNodeSchema };