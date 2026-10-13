const { logger } = require('./config/logger');
const CollaborationService = require('./services/CollaborationService');

/**
 * Setup Socket.IO handlers
 *
 * Socket.IO is used for:
 * - Presence
 * - Cursor updates
 * - Typing indicators
 * - User joined/left events
 * - Legacy document-change events
 *
 * Yjs itself is handled separately in index.js through:
 * /yjs/:documentId
 */
const setupSocketHandlers = (io) => {
  const collaborationService = new CollaborationService(io);

  // ============================================================
  // CONNECTION
  // ============================================================

  io.on('connection', (socket) => {
    logger.info(
      `🔌 Socket connected: ${socket.id}`
    );

    // ==========================================================
    // AUTHENTICATE SOCKET
    // ==========================================================

    socket.on(
      'authenticate',
      async (data = {}) => {
        try {
          const {
            userId,
            token,
          } = data;

          if (!userId) {
            socket.emit(
              'auth-error',
              {
                success: false,
                message: 'User ID is required',
              }
            );

            return;
          }

          if (!token) {
            socket.emit(
              'auth-error',
              {
                success: false,
                message: 'Authentication token is required',
              }
            );

            return;
          }

          // ----------------------------------------------------
          // Store authenticated user information
          // ----------------------------------------------------

          socket.userId = userId;
          socket.token = token;
          socket.authenticated = true;

          // ----------------------------------------------------
          // Emit authentication success
          // ----------------------------------------------------

          socket.emit(
            'authenticated',
            {
              success: true,
              userId,
            }
          );

          logger.info(
            `🔐 User ${userId} authenticated on socket ${socket.id}`
          );
        } catch (error) {
          logger.error(
            '❌ Socket authentication error:',
            error
          );

          socket.emit(
            'auth-error',
            {
              success: false,
              message:
                error?.message ||
                'Socket authentication failed',
            }
          );
        }
      }
    );

    // ==========================================================
    // JOIN DOCUMENT
    // ==========================================================

    socket.on(
      'join-document',
      async (data = {}) => {
        try {
          const {
            documentId,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Not authenticated',
              }
            );

            return;
          }

          if (!documentId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Document ID is required',
              }
            );

            return;
          }

          const roomName =
            `doc:${documentId}`;

          // ----------------------------------------------------
          // Join Socket.IO document room
          // ----------------------------------------------------

          await socket.join(
            roomName
          );

          // ----------------------------------------------------
          // Notify collaboration service
          // ----------------------------------------------------

          await collaborationService.handleJoinDocument(
            socket,
            documentId,
            socket.userId
          );

          logger.info(
            `📄 User ${socket.userId} joined ${roomName}`
          );

          socket.emit(
            'document-joined',
            {
              success: true,
              documentId,
              room: roomName,
            }
          );
        } catch (error) {
          logger.error(
            '❌ Join document error:',
            error
          );

          socket.emit(
            'error',
            {
              success: false,
              message:
                error?.message ||
                'Failed to join document',
            }
          );
        }
      }
    );

    // ==========================================================
    // LEAVE DOCUMENT
    // ==========================================================

    socket.on(
      'leave-document',
      async (data = {}) => {
        try {
          const {
            documentId,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Not authenticated',
              }
            );

            return;
          }

          if (!documentId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Document ID is required',
              }
            );

            return;
          }

          const roomName =
            `doc:${documentId}`;

          // ----------------------------------------------------
          // Notify collaboration service before leaving
          // ----------------------------------------------------

          await collaborationService.handleLeaveDocument(
            socket,
            socket.userId
          );

          // ----------------------------------------------------
          // Leave Socket.IO room
          // ----------------------------------------------------

          await socket.leave(
            roomName
          );

          logger.info(
            `📄 User ${socket.userId} left ${roomName}`
          );

          socket.emit(
            'document-left',
            {
              success: true,
              documentId,
              room: roomName,
            }
          );
        } catch (error) {
          logger.error(
            '❌ Leave document error:',
            error
          );

          socket.emit(
            'error',
            {
              success: false,
              message:
                error?.message ||
                'Failed to leave document',
            }
          );
        }
      }
    );

    // ==========================================================
    // DOCUMENT CHANGE
    // ==========================================================
    //
    // NOTE:
    // Yjs is the primary source of truth for collaborative
    // document content.
    //
    // This event is retained for compatibility with the existing
    // SyncDoc frontend/legacy collaboration functionality.
    // ==========================================================

    socket.on(
      'document-change',
      async (data = {}) => {
        try {
          const {
            documentId,
            operation,
            version,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Not authenticated',
              }
            );

            return;
          }

          if (!documentId) {
            socket.emit(
              'error',
              {
                success: false,
                message: 'Document ID is required',
              }
            );

            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'document-update',
              {
                documentId,
                operation,
                version,
                userId:
                  socket.userId,
                timestamp:
                  Date.now(),
              }
            );

          logger.info(
            `📝 Document change in ${documentId} by ${socket.userId}`
          );
        } catch (error) {
          logger.error(
            '❌ Document change error:',
            error
          );

          socket.emit(
            'error',
            {
              success: false,
              message:
                error?.message ||
                'Document change failed',
            }
          );
        }
      }
    );

    // ==========================================================
    // CURSOR UPDATE
    // ==========================================================

    socket.on(
      'cursor-update',
      async (data = {}) => {
        try {
          const {
            documentId,
            cursor,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            return;
          }

          if (!documentId) {
            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'cursor-update',
              {
                documentId,
                userId:
                  socket.userId,
                cursor,
                timestamp:
                  Date.now(),
              }
            );
        } catch (error) {
          logger.error(
            '❌ Cursor update error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // TYPING UPDATE
    // ==========================================================

    socket.on(
      'typing-update',
      async (data = {}) => {
        try {
          const {
            documentId,
            isTyping,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            return;
          }

          if (!documentId) {
            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'typing-update',
              {
                documentId,
                userId:
                  socket.userId,
                isTyping:
                  Boolean(isTyping),
                timestamp:
                  Date.now(),
              }
            );
        } catch (error) {
          logger.error(
            '❌ Typing update error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // PRESENCE UPDATE
    // ==========================================================

    socket.on(
      'presence-update',
      async (data = {}) => {
        try {
          const {
            documentId,
            data: presenceData,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            return;
          }

          if (!documentId) {
            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'presence-update',
              {
                documentId,
                userId:
                  socket.userId,
                data:
                  presenceData || {},
                timestamp:
                  Date.now(),
              }
            );
        } catch (error) {
          logger.error(
            '❌ Presence update error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // USER JOINED
    // ==========================================================

    socket.on(
      'user-joined',
      async (data = {}) => {
        try {
          const {
            documentId,
            userData,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            return;
          }

          if (!documentId) {
            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'user-joined',
              {
                documentId,
                userId:
                  socket.userId,
                userData:
                  userData || {},
                timestamp:
                  Date.now(),
              }
            );

          logger.info(
            `👤 User ${socket.userId} joined document ${documentId}`
          );
        } catch (error) {
          logger.error(
            '❌ User joined error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // USER LEFT
    // ==========================================================

    socket.on(
      'user-left',
      async (data = {}) => {
        try {
          const {
            documentId,
          } = data;

          if (!socket.authenticated || !socket.userId) {
            return;
          }

          if (!documentId) {
            return;
          }

          const roomName =
            `doc:${documentId}`;

          socket
            .to(roomName)
            .emit(
              'user-left',
              {
                documentId,
                userId:
                  socket.userId,
                timestamp:
                  Date.now(),
              }
            );

          logger.info(
            `👤 User ${socket.userId} left document ${documentId}`
          );
        } catch (error) {
          logger.error(
            '❌ User left error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // PING / HEALTH CHECK
    // ==========================================================

    socket.on(
      'ping',
      () => {
        socket.emit(
          'pong',
          {
            success: true,
            timestamp:
              Date.now(),
          }
        );
      }
    );

    // ==========================================================
    // DISCONNECT
    // ==========================================================

    socket.on(
      'disconnect',
      async (reason) => {
        try {
          if (socket.userId) {
            await collaborationService.handleDisconnect(
              socket
            );
          }

          logger.info(
            `🔌 Socket disconnected: ${socket.id} | User: ${socket.userId || 'unknown'
            } | Reason: ${reason}`
          );
        } catch (error) {
          logger.error(
            '❌ Socket disconnect handling error:',
            error
          );
        }
      }
    );

    // ==========================================================
    // SOCKET ERROR
    // ==========================================================

    socket.on(
      'error',
      (error) => {
        logger.error(
          `❌ Socket error for ${socket.id}:`,
          error
        );
      }
    );
  });

  // ============================================================
  // RETURN COLLABORATION SERVICE
  // ============================================================

  return collaborationService;
};

module.exports = {
  setupSocketHandlers,
};