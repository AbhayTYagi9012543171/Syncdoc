const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * General helper functions for the application
 */
class Helpers {
  /**
   * Generate a random string
   */
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a unique ID
   */
  static generateUniqueId() {
    return uuidv4();
  }

  /**
   * Generate a short ID (for display purposes)
   */
  static generateShortId(length = 8) {
    return crypto.randomBytes(length).toString('hex').substring(0, length);
  }

  /**
   * Hash a string using SHA256
   */
  static hashString(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Hash a string using MD5
   */
  static hashMd5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  /**
   * Check if a string is a valid email
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if a string is a valid URL
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a string is a valid MongoDB ObjectId
   */
  static isValidObjectId(id) {
    const mongoose = require('mongoose');
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Check if a value is empty (null, undefined, empty string, empty array, empty object)
   */
  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Check if a value is not empty
   */
  static isNotEmpty(value) {
    return !this.isEmpty(value);
  }

  /**
   * Deep clone an object
   */
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Deep merge two objects
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * Check if a value is an object
   */
  static isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Check if a value is a function
   */
  static isFunction(value) {
    return typeof value === 'function';
  }

  /**
   * Check if a value is a number
   */
  static isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  /**
   * Check if a value is an integer
   */
  static isInteger(value) {
    return Number.isInteger(value);
  }

  /**
   * Check if a value is a boolean
   */
  static isBoolean(value) {
    return typeof value === 'boolean';
  }

  /**
   * Check if a value is a string
   */
  static isString(value) {
    return typeof value === 'string';
  }

  /**
   * Check if a value is an array
   */
  static isArray(value) {
    return Array.isArray(value);
  }

  /**
   * Convert a string to camelCase
   */
  static toCamelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }

  /**
   * Convert a string to snake_case
   */
  static toSnakeCase(str) {
    return str
      .replace(/\s+/g, '_')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }

  /**
   * Convert a string to kebab-case
   */
  static toKebabCase(str) {
    return str
      .replace(/\s+/g, '-')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Convert a string to Title Case
   */
  static toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Truncate a string to a specified length
   */
  static truncateString(str, maxLength, suffix = '...') {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + suffix;
  }

  /**
   * Get the current timestamp in ISO format
   */
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get the current Unix timestamp
   */
  static getUnixTimestamp() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Format a date to a readable string
   */
  static formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  /**
   * Get the difference between two dates in milliseconds
   */
  static getDateDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(d2.getTime() - d1.getTime());
  }

  /**
   * Get the difference between two dates in human-readable format
   */
  static getDateDiffHuman(date1, date2) {
    const diffMs = this.getDateDiff(date1, date2);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''}`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''}`;
  }

  /**
   * Generate a random number between min and max
   */
  static randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random color in hex format
   */
  static randomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  /**
   * Generate a random item from an array
   */
  static randomItem(array) {
    if (!array || array.length === 0) return null;
    return array[this.randomNumber(0, array.length - 1)];
  }

  /**
   * Shuffle an array (Fisher-Yates algorithm)
   */
  static shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.randomNumber(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Group an array by a key
   */
  static groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = item[key];
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    }, {});
  }

  /**
   * Sort an array by a key
   */
  static sortBy(array, key, order = 'asc') {
    const arr = [...array];
    return arr.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Remove duplicates from an array
   */
  static uniqueArray(array) {
    return [...new Set(array)];
  }

  /**
   * Flatten a nested array
   */
  static flattenArray(array, depth = Infinity) {
    return array.flat(depth);
  }

  /**
   * Get the intersection of two arrays
   */
  static arrayIntersection(array1, array2) {
    return array1.filter(value => array2.includes(value));
  }

  /**
   * Get the difference of two arrays
   */
  static arrayDifference(array1, array2) {
    return array1.filter(value => !array2.includes(value));
  }

  /**
   * Parse JSON safely
   */
  static safeJsonParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  /**
   * Stringify JSON safely
   */
  static safeJsonStringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return null;
    }
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
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Unescape HTML special characters
   */
  static unescapeHtml(text) {
    if (!text) return '';
    const map = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#039;': "'",
    };
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
  }

  /**
   * Get the current environment
   */
  static getEnvironment() {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Check if running in production
   */
  static isProduction() {
    return this.getEnvironment() === 'production';
  }

  /**
   * Check if running in development
   */
  static isDevelopment() {
    return this.getEnvironment() === 'development';
  }

  /**
   * Check if running in test
   */
  static isTest() {
    return this.getEnvironment() === 'test';
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry(fn, maxAttempts = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxAttempts - 1) {
          await this.sleep(delay * Math.pow(2, i));
        }
      }
    }
    throw lastError;
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime(fn) {
    const start = Date.now();
    const result = await fn();
    const end = Date.now();
    return {
      result,
      time: end - start,
    };
  }

  /**
   * Build a query string from an object
   */
  static buildQueryString(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        query.append(key, value);
      }
    }
    return query.toString();
  }

  /**
   * Parse a query string to an object
   */
  static parseQueryString(queryString) {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Create a slug from a string
   */
  static createSlug(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename) {
    if (!filename) return '';
    return filename.split('.').pop() || '';
  }

  /**
   * Get filename without extension
   */
  static getFileNameWithoutExtension(filename) {
    if (!filename) return '';
    return filename.split('.').slice(0, -1).join('.') || filename;
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeType(extension) {
    const mimeTypes = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'xml': 'application/xml',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Check if a file type is allowed
   */
  static isFileTypeAllowed(filename, allowedExtensions) {
    const ext = this.getFileExtension(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Get a default avatar color based on string
   */
  static getAvatarColor(str) {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
      '#BB8FCE', '#85C1E9', '#82E0AA', '#F8C471',
      '#F1948A', '#85C1E9', '#82E0AA', '#F8C471',
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Get initials from a name
   */
  static getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Mask sensitive data (like email, phone)
   */
  static maskData(data, visibleChars = 3) {
    if (!data) return '';
    const length = data.length;
    if (length <= visibleChars * 2) {
      return '*'.repeat(length);
    }
    return data.substring(0, visibleChars) + 
           '*'.repeat(length - visibleChars * 2) + 
           data.substring(length - visibleChars);
  }

  /**
   * Get user agent info
   */
  static getUserAgentInfo(userAgent) {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
    
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    // Detect device
    if (userAgent.includes('Mobile')) device = 'Mobile';
    else if (userAgent.includes('Tablet')) device = 'Tablet';
    else device = 'Desktop';
    
    return { browser, os, device };
  }
}

module.exports = Helpers;