const { logger } = require('../config/logger');
const User = require('../models/User');
const Document = require('../models/Document');

/**
 * Collaboration Service
 * Handles real-time collaboration logic including presence, cursors, and notifications
 */
class CollaborationService {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Set of userIds
    this.userPresence = new Map(); // userId -> { socketId, documentId, lastActive, data }
    this.cursorPositions = new Map(); // userId -> { documentId, position, selection }
    this.typingStatus = new Map(); // userId -> { documentId, isTyping, timestamp }
    this.notifications = new Map(); // userId -> [notification]
    this.roomHistory = new Map(); // roomId -> [messages]
  }

  /**
   * Handle user joining a document room
   */
  async handleJoinDocument(socket, documentId, userId) {
    try {
      const roomId = `doc:${documentId}`;
      
      // Join socket room
      socket.join(roomId);
      socket.documentId = documentId;
      
      // Track presence
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(userId);
      
      this.userPresence.set(userId, {
        socketId: socket.id,
        documentId: documentId,
        lastActive: Date.now(),
        data: {},
      });

      // Get user info
      const user = await User.findById(userId).select('username displayName avatar');
      
      // Notify others in room
      this.io.to(roomId).emit('user-joined', {
        userId: userId,
        userData: {
          id: userId,
          username: user?.username,
          displayName: user?.displayName || user?.username,
          avatar: user?.avatar,
        },
        users: await this.getActiveUsers(documentId),
        timestamp: Date.now(),
      });

      logger.info(`User ${userId} joined document ${documentId}`);
      
      return { roomId, success: true };
    } catch (error) {
      logger.error('CollaborationService.handleJoinDocument error:', error);
      throw error;
    }
  }

  /**
   * Handle user leaving a document room
   */
  async handleLeaveDocument(socket, userId) {
    try {
      const roomId = Array.from(socket.rooms).find(r => r.startsWith('doc:'));
      if (!roomId) {
        return { success: false, message: 'Not in any document room' };
      }

      const documentId = roomId.replace('doc:', '');
      
      // Remove from presence
      this.rooms.get(roomId)?.delete(userId);
      this.userPresence.delete(userId);
      this.cursorPositions.delete(userId);
      this.typingStatus.delete(userId);
      
      // Leave socket room
      socket.leave(roomId);
      socket.documentId = null;

      // Notify others in room
      this.io.to(roomId).emit('user-left', {
        userId: userId,
        users: await this.getActiveUsers(documentId),
        timestamp: Date.now(),
      });

      logger.info(`User ${userId} left document ${documentId}`);
      
      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.handleLeaveDocument error:', error);
      throw error;
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(userId, documentId, cursorData) {
    try {
      const roomId = `doc:${documentId}`;
      
      // Store cursor position
      this.cursorPositions.set(userId, {
        documentId,
        ...cursorData,
        timestamp: Date.now(),
      });

      // Get user info
      const user = await User.findById(userId).select('username displayName avatar');

      // Broadcast to room
      this.io.to(roomId).emit('cursor-update', {
        userId: userId,
        cursor: cursorData,
        userData: {
          id: userId,
          username: user?.username,
          displayName: user?.displayName || user?.username,
          avatar: user?.avatar,
        },
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.updateCursor error:', error);
      throw error;
    }
  }

  /**
   * Update typing status
   */
  async updateTyping(userId, documentId, isTyping) {
    try {
      const roomId = `doc:${documentId}`;
      
      // Store typing status
      this.typingStatus.set(userId, {
        documentId,
        isTyping,
        timestamp: Date.now(),
      });

      // Get user info
      const user = await User.findById(userId).select('username displayName avatar');

      // Broadcast to room
      this.io.to(roomId).emit('typing-update', {
        userId: userId,
        isTyping: isTyping,
        userData: {
          id: userId,
          username: user?.username,
          displayName: user?.displayName || user?.username,
          avatar: user?.avatar,
        },
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.updateTyping error:', error);
      throw error;
    }
  }

  /**
   * Broadcast document change
   */
  broadcastDocumentChange(documentId, operation, userId) {
    try {
      const roomId = `doc:${documentId}`;
      
      this.io.to(roomId).emit('document-update', {
        operation: operation,
        userId: userId,
        timestamp: Date.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.broadcastDocumentChange error:', error);
      throw error;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(userId, notification) {
    try {
      if (!this.notifications.has(userId)) {
        this.notifications.set(userId, []);
      }
      
      this.notifications.get(userId).push({
        ...notification,
        timestamp: Date.now(),
        read: false,
      });

      // Send via socket if user is online
      const presence = this.userPresence.get(userId);
      if (presence) {
        this.io.to(presence.socketId).emit('notification', {
          ...notification,
          timestamp: Date.now(),
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.sendNotification error:', error);
      throw error;
    }
  }

  /**
   * Get notifications for user
   */
  getNotifications(userId, options = {}) {
    try {
      const notifications = this.notifications.get(userId) || [];
      
      const { limit = 50, unreadOnly = false } = options;
      
      let filtered = notifications;
      if (unreadOnly) {
        filtered = filtered.filter(n => !n.read);
      }
      
      return filtered.slice(-limit);
    } catch (error) {
      logger.error('CollaborationService.getNotifications error:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(userId, notificationId) {
    try {
      const notifications = this.notifications.get(userId) || [];
      const index = notifications.findIndex(n => n.id === notificationId);
      
      if (index !== -1) {
        notifications[index].read = true;
        return { success: true };
      }
      
      return { success: false, message: 'Notification not found' };
    } catch (error) {
      logger.error('CollaborationService.markNotificationAsRead error:', error);
      throw error;
    }
  }

  /**
   * Get active users in document
   */
  async getActiveUsers(documentId) {
    try {
      const roomId = `doc:${documentId}`;
      const userIds = this.rooms.get(roomId) || new Set();
      const users = [];
      
      for (const userId of userIds) {
        const presence = this.userPresence.get(userId);
        const cursor = this.cursorPositions.get(userId);
        const typing = this.typingStatus.get(userId);
        
        if (presence && Date.now() - presence.lastActive < 60000) { // 1 minute timeout
          const user = await User.findById(userId).select('username displayName avatar');
          users.push({
            id: userId,
            username: user?.username,
            displayName: user?.displayName || user?.username,
            avatar: user?.avatar,
            socketId: presence.socketId,
            lastActive: presence.lastActive,
            cursor: cursor || null,
            isTyping: typing?.isTyping || false,
          });
        }
      }
      
      return users;
    } catch (error) {
      logger.error('CollaborationService.getActiveUsers error:', error);
      return [];
    }
  }

  /**
   * Get all collaborators for a document
   */
  async getCollaborators(documentId) {
    try {
      const document = await Document.findById(documentId)
        .populate('collaborators.user', 'username displayName avatar');
      
      if (!document) {
        return [];
      }

      const collaborators = document.collaborators.map(c => ({
        id: c.user._id,
        username: c.user.username,
        displayName: c.user.displayName || c.user.username,
        avatar: c.user.avatar,
        role: c.role,
        permissions: c.permissions,
        joinedAt: c.joinedAt,
        isOnline: this.userPresence.has(c.user._id.toString()),
      }));

      // Add owner
      const owner = await User.findById(document.owner).select('username displayName avatar');
      if (owner) {
        collaborators.unshift({
          id: owner._id,
          username: owner.username,
          displayName: owner.displayName || owner.username,
          avatar: owner.avatar,
          role: 'owner',
          isOnline: this.userPresence.has(owner._id.toString()),
        });
      }

      return collaborators;
    } catch (error) {
      logger.error('CollaborationService.getCollaborators error:', error);
      return [];
    }
  }

  /**
   * Update user presence
   */
  updatePresence(userId, data) {
    try {
      const presence = this.userPresence.get(userId);
      if (presence) {
        presence.data = { ...presence.data, ...data };
        presence.lastActive = Date.now();
        this.userPresence.set(userId, presence);
      }
      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.updatePresence error:', error);
      return { success: false };
    }
  }

  /**
   * Get user presence
   */
  getUserPresence(userId) {
    try {
      return this.userPresence.get(userId) || null;
    } catch (error) {
      logger.error('CollaborationService.getUserPresence error:', error);
      return null;
    }
  }

  /**
   * Get all online users
   */
  getOnlineUsers() {
    try {
      const users = [];
      for (const [userId, presence] of this.userPresence) {
        if (Date.now() - presence.lastActive < 60000) {
          users.push({
            userId,
            ...presence,
          });
        }
      }
      return users;
    } catch (error) {
      logger.error('CollaborationService.getOnlineUsers error:', error);
      return [];
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    try {
      const presence = this.userPresence.get(userId);
      if (!presence) return false;
      return Date.now() - presence.lastActive < 60000;
    } catch (error) {
      logger.error('CollaborationService.isUserOnline error:', error);
      return false;
    }
  }

  /**
   * Clean up inactive sessions
   */
  cleanupInactiveSessions() {
    try {
      const now = Date.now();
      const timeout = 60000; // 1 minute
      
      for (const [userId, presence] of this.userPresence) {
        if (now - presence.lastActive > timeout) {
          this.userPresence.delete(userId);
          this.cursorPositions.delete(userId);
          this.typingStatus.delete(userId);
          
          // Remove from rooms
          for (const [roomId, users] of this.rooms) {
            users.delete(userId);
            if (users.size === 0) {
              this.rooms.delete(roomId);
            }
          }
        }
      }
    } catch (error) {
      logger.error('CollaborationService.cleanupInactiveSessions error:', error);
    }
  }

  /**
   * Get room statistics
   */
  getRoomStats(documentId) {
    try {
      const roomId = `doc:${documentId}`;
      const users = this.rooms.get(roomId) || new Set();
      
      return {
        totalUsers: users.size,
        activeUsers: Array.from(users).filter(id => this.isUserOnline(id)).length,
        typingUsers: Array.from(users).filter(id => {
          const typing = this.typingStatus.get(id);
          return typing && typing.isTyping;
        }).length,
      };
    } catch (error) {
      logger.error('CollaborationService.getRoomStats error:', error);
      return { totalUsers: 0, activeUsers: 0, typingUsers: 0 };
    }
  }

  /**
   * Get all active document rooms
   */
  getActiveRooms() {
    try {
      const rooms = [];
      for (const [roomId, users] of this.rooms) {
        if (users.size > 0) {
          const documentId = roomId.replace('doc:', '');
          rooms.push({
            documentId,
            userCount: users.size,
            users: Array.from(users),
          });
        }
      }
      return rooms;
    } catch (error) {
      logger.error('CollaborationService.getActiveRooms error:', error);
      return [];
    }
  }

  /**
   * Handle socket disconnection
   */
  async handleDisconnect(socket) {
    try {
      const userId = socket.userId;
      if (!userId) return;

      // Find all rooms user was in
      const rooms = Array.from(socket.rooms).filter(r => r.startsWith('doc:'));
      
      for (const roomId of rooms) {
        const documentId = roomId.replace('doc:', '');
        this.rooms.get(roomId)?.delete(userId);
        
        // Notify others
        this.io.to(roomId).emit('user-left', {
          userId: userId,
          users: await this.getActiveUsers(documentId),
          timestamp: Date.now(),
        });
      }

      // Clean up presence
      this.userPresence.delete(userId);
      this.cursorPositions.delete(userId);
      this.typingStatus.delete(userId);

      logger.info(`User ${userId} disconnected`);
    } catch (error) {
      logger.error('CollaborationService.handleDisconnect error:', error);
    }
  }

  /**
   * Handle socket reconnection
   */
  async handleReconnect(socket, userId) {
    try {
      // Restore presence
      this.userPresence.set(userId, {
        socketId: socket.id,
        documentId: socket.documentId,
        lastActive: Date.now(),
        data: {},
      });

      // Rejoin rooms
      if (socket.documentId) {
        const roomId = `doc:${socket.documentId}`;
        socket.join(roomId);
        
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId).add(userId);

        // Notify others
        const user = await User.findById(userId).select('username displayName avatar');
        this.io.to(roomId).emit('user-joined', {
          userId: userId,
          userData: {
            id: userId,
            username: user?.username,
            displayName: user?.displayName || user?.username,
            avatar: user?.avatar,
          },
          users: await this.getActiveUsers(socket.documentId),
          timestamp: Date.now(),
        });
      }

      logger.info(`User ${userId} reconnected`);
    } catch (error) {
      logger.error('CollaborationService.handleReconnect error:', error);
    }
  }

  /**
   * Send a message to a user
   */
  sendToUser(userId, event, data) {
    try {
      const presence = this.userPresence.get(userId);
      if (presence) {
        this.io.to(presence.socketId).emit(event, data);
        return { success: true };
      }
      return { success: false, message: 'User not online' };
    } catch (error) {
      logger.error('CollaborationService.sendToUser error:', error);
      return { success: false };
    }
  }

  /**
   * Send a message to a room
   */
  sendToRoom(roomId, event, data) {
    try {
      this.io.to(roomId).emit(event, data);
      return { success: true };
    } catch (error) {
      logger.error('CollaborationService.sendToRoom error:', error);
      return { success: false };
    }
  }
}

module.exports = CollaborationService;