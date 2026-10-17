// ============================================================
// SYNCDOC BACKEND - MAIN SERVER
// Express + Socket.IO + Yjs + Static Uploads
// ============================================================

'use strict';

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const { Server } = require('socket.io');
const { setupWSConnection } = require('y-websocket/bin/utils');

dotenv.config();

const routes = require('./routes');

const {
    errorHandler,
    notFoundHandler,
} = require('./middleware/errorHandler');

const loggerModule = require('./config/logger');
const logger = loggerModule?.logger || console;

const {
    connectRedis,
    disconnectRedis,
    isRedisConnected,
} = require('./config/redis');

const { connectDB } = require('./config/database');
const { setupSocketHandlers } = require('./socket');
const requestContext = require('./middleware/requestContext');

const app = express();
const server = http.createServer(app);

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = Number(process.env.PORT) || 5000;

app.disable('x-powered-by');

// ============================================================
// TRUST PROXY
// Set TRUST_PROXY=1 for a single trusted reverse proxy such as
// Render. Configure this according to your actual proxy setup.
// ============================================================

const trustProxySetting = String(
    process.env.TRUST_PROXY ??
    (NODE_ENV === 'production' ? '1' : '0')
).trim().toLowerCase();

if (trustProxySetting === 'true') {
    app.set('trust proxy', 1);
} else if (
    trustProxySetting === 'false' ||
    trustProxySetting === '0'
) {
    app.set('trust proxy', false);
} else if (/^\d+$/.test(trustProxySetting)) {
    app.set('trust proxy', Number(trustProxySetting));
} else {
    app.set('trust proxy', trustProxySetting);
}

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const configuredCorsOrigins = String(
    process.env.CORS_ORIGIN || ''
)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;

    const normalizedOrigin = origin.trim().replace(/\/$/, '');

    return (
        configuredCorsOrigins.includes(normalizedOrigin) ||
        allowedOrigins.includes(normalizedOrigin)
    );
};

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
            return callback(null, true);
        }

        logger.warn(`CORS blocked origin: ${origin || 'unknown'}`);

        return callback(
            new Error(`CORS policy blocked origin: ${origin || 'unknown'}`)
        );
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'Accept',
        'Origin',
    ],

    exposedHeaders: [
        'Content-Length',
        'Content-Type',
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'Retry-After',
    ],

    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================================
// SECURITY, COMPRESSION AND BODY PARSING
// ============================================================

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,

        // Allows frontend pages on a different origin to display
        // public profile-avatar images served by this API.
        crossOriginResourcePolicy: {
            policy: 'cross-origin',
        },
    })
);

app.use(compression());

app.use(express.json({ limit: '10mb' }));

app.use(
    express.urlencoded({
        extended: true,
        limit: '10mb',
    })
);

// ============================================================
// YJS WEBSOCKET SERVER
// ============================================================

const yjsWss = new WebSocket.Server({
    noServer: true,
});

const verifyYjsToken = (token) => {
    if (!token) {
        throw new Error('Yjs authentication token is missing');
    }

    const jwtSecret =
        process.env.JWT_SECRET ||
        process.env.JWT_ACCESS_SECRET;

    if (!jwtSecret) {
        throw new Error(
            'JWT_SECRET or JWT_ACCESS_SECRET is not configured'
        );
    }

    return jwt.verify(token, jwtSecret);
};

const extractYjsDocumentId = (pathname) => {
    if (!pathname || !pathname.startsWith('/yjs/')) {
        return null;
    }

    return pathname
        .slice('/yjs/'.length)
        .replace(/\/+$/, '') || null;
};

// ============================================================
// YJS WEBSOCKET AUTHENTICATION AND DOCUMENT PERMISSIONS
// ============================================================

server.on('upgrade', async (request, socket, head) => {
    try {
        const host = request.headers.host || `localhost:${PORT}`;

        const requestUrl = new URL(
            request.url || '/',
            `http://${host}`
        );

        const pathname = requestUrl.pathname;

        // Socket.IO manages its own WebSocket endpoint.
        if (!pathname.startsWith('/yjs/')) {
            return;
        }

        const token = requestUrl.searchParams.get('token');

        let decodedToken;

        try {
            decodedToken = verifyYjsToken(token);
        } catch (error) {
            logger.warn(
                `Yjs authentication failed: ${error.message}`
            );

            socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                'Connection: close\r\n' +
                'Content-Type: text/plain\r\n\r\n' +
                'Unauthorized'
            );

            socket.destroy();
            return;
        }

        const documentId = extractYjsDocumentId(pathname);

        if (!documentId) {
            socket.write(
                'HTTP/1.1 400 Bad Request\r\n' +
                'Connection: close\r\n\r\n' +
                'Document ID is required'
            );

            socket.destroy();
            return;
        }

        const userId =
            decodedToken.id ||
            decodedToken.userId ||
            decodedToken._id ||
            decodedToken.sub;

        if (
            !userId ||
            !mongoose.Types.ObjectId.isValid(String(userId)) ||
            !mongoose.Types.ObjectId.isValid(String(documentId))
        ) {
            socket.write(
                'HTTP/1.1 400 Bad Request\r\n' +
                'Connection: close\r\n\r\n' +
                'Invalid user or document identifier'
            );

            socket.destroy();
            return;
        }

        const User = require('./models/User');
        const Document = require('./models/Document');

        const [activeUser, targetDocument] = await Promise.all([
            User.findById(userId).select('_id deletedAt role'),
            Document.findById(documentId).select(
                '_id owner collaborators deletedAt'
            ),
        ]);

        if (!activeUser || activeUser.deletedAt) {
            socket.write(
                'HTTP/1.1 401 Unauthorized\r\n' +
                'Connection: close\r\n\r\n' +
                'Account is not active'
            );

            socket.destroy();
            return;
        }

        if (!targetDocument || targetDocument.deletedAt) {
            socket.write(
                'HTTP/1.1 404 Not Found\r\n' +
                'Connection: close\r\n\r\n' +
                'Document not found'
            );

            socket.destroy();
            return;
        }

        const ownsDocument =
            String(targetDocument.owner) === String(activeUser._id);

        const collaborator = Array.isArray(targetDocument.collaborators)
            ? targetDocument.collaborators.find(
                (item) => String(item.user) === String(activeUser._id)
            )
            : null;

        if (
            !ownsDocument &&
            !collaborator &&
            activeUser.role !== 'admin'
        ) {
            socket.write(
                'HTTP/1.1 403 Forbidden\r\n' +
                'Connection: close\r\n\r\n' +
                'Document access denied'
            );

            socket.destroy();
            return;
        }

        const canEdit =
            ownsDocument ||
            activeUser.role === 'admin' ||
            Boolean(
                collaborator &&
                (
                    ['editor', 'admin'].includes(collaborator.role) ||
                    (
                        Array.isArray(collaborator.permissions) &&
                        collaborator.permissions.includes('write')
                    )
                )
            );

        if (!canEdit) {
            socket.write(
                'HTTP/1.1 403 Forbidden\r\n' +
                'Connection: close\r\n\r\n' +
                'Live editing permission required'
            );

            socket.destroy();
            return;
        }

        request.yjsAuth = {
            userId: String(userId),
            email: decodedToken.email || null,
            role: decodedToken.role || 'user',
            documentId,
            token,
        };

        yjsWss.handleUpgrade(request, socket, head, (ws) => {
            yjsWss.emit('connection', ws, request);
        });
    } catch (error) {
        logger.error('Yjs WebSocket upgrade error:', error);

        try {
            socket.destroy();
        } catch (socketError) {
            logger.error('Yjs socket destroy error:', socketError);
        }
    }
});

yjsWss.on('connection', (ws, request) => {
    try {
        const auth = request.yjsAuth;

        if (!auth) {
            ws.close(1008, 'Authentication required');
            return;
        }

        logger.info(
            `Yjs connected: document=${auth.documentId}, user=${auth.userId}`
        );

        ws.yjsAuth = auth;

        setupWSConnection(ws, request, { gc: true });

        ws.on('close', () => {
            logger.info(
                `Yjs disconnected: ${auth.documentId} / ${auth.userId}`
            );
        });

        ws.on('error', (error) => {
            logger.error(
                `Yjs WebSocket error for document ${auth.documentId}:`,
                error
            );
        });
    } catch (error) {
        logger.error('Yjs connection initialization error:', error);

        try {
            ws.close(1011, 'Yjs server error');
        } catch (closeError) {
            logger.error('Yjs close error:', closeError);
        }
    }
});

// ============================================================
// HEALTH ENDPOINTS
// ============================================================

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        service: 'syncdoc-api',
        timestamp: new Date().toISOString(),
        mongoDB: mongoose.connection.readyState === 1
            ? 'connected'
            : 'disconnected',
        redis: isRedisConnected()
            ? 'connected'
            : 'optional/unavailable',
        websocket: {
            socketIO: 'enabled',
            yjs: 'enabled',
        },
        environment: NODE_ENV,
        port: PORT,
    });
});

app.get('/api/system/status', (req, res) => {
    const memory = process.memoryUsage();

    res.status(200).json({
        success: true,
        status: 'operational',
        service: 'SyncDoc API',
        version: process.env.APP_VERSION || '6.2.0',
        environment: NODE_ENV,
        uptime: Math.round(process.uptime()),
        node: process.version,
        database: {
            provider: 'MongoDB',
            status: mongoose.connection.readyState === 1
                ? 'connected'
                : 'disconnected',
        },
        redis: {
            status: isRedisConnected()
                ? 'connected'
                : 'optional/unavailable',
        },
        realtime: {
            socketIO: true,
            yjs: true,
        },
        memory: {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
        },
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// GLOBAL RATE LIMIT CONFIGURATION
// ============================================================

const parseGlobalRateLimit = (value, fallback, variableName) => {
    const raw = value == null ? '' : String(value).trim();

    if (!raw) return fallback;

    const parsed = Number(raw);

    if (!Number.isSafeInteger(parsed) || parsed < 100) {
        logger.warn(
            `[Rate Limit] Invalid ${variableName}="${raw}". ` +
            `Using fallback ${fallback}.`
        );

        return fallback;
    }

    return parsed;
};

// ============================================================
// START APPLICATION
// ============================================================

const start = async () => {
    let io;
    let collaborationService;
    let isShuttingDown = false;

    try {
        // --------------------------------------------------------
        // DATABASE
        // --------------------------------------------------------

        await connectDB();
        logger.info('MongoDB connected successfully');

        // --------------------------------------------------------
        // REDIS IS OPTIONAL
        // --------------------------------------------------------

        try {
            await connectRedis();

            if (isRedisConnected()) {
                logger.info('Redis connected successfully');
            } else {
                logger.warn(
                    'Redis unavailable. Continuing without Redis.'
                );
            }
        } catch (redisError) {
            logger.warn(
                `Redis unavailable. Continuing without Redis: ${redisError.message}`
            );
        }

        // --------------------------------------------------------
        // REQUEST CONTEXT
        // --------------------------------------------------------

        app.use(requestContext);

        // --------------------------------------------------------
        // GLOBAL RATE LIMITER
        // --------------------------------------------------------

        const developmentLimit = parseGlobalRateLimit(
            process.env.DEV_GLOBAL_RATE_LIMIT,
            50000,
            'DEV_GLOBAL_RATE_LIMIT'
        );

        const productionLimit = parseGlobalRateLimit(
            process.env.GLOBAL_RATE_LIMIT,
            1200,
            'GLOBAL_RATE_LIMIT'
        );

        const globalRateLimit = NODE_ENV === 'development'
            ? developmentLimit
            : productionLimit;

        const excludedHealthPaths = new Set([
            '/health',
            '/system/status',
            '/api/health',
            '/api/system/status',
        ]);

        const globalRateLimiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: globalRateLimit,
            standardHeaders: true,
            legacyHeaders: false,

            skip(req) {
                if (req.method === 'OPTIONS') return true;

                return excludedHealthPaths.has(req.path);
            },

            handler(req, res) {
                logger.warn(
                    `[RATE_LIMITED] ${req.method} ${req.originalUrl} IP: ${req.ip}`
                );

                const retryAfterSeconds = 15 * 60;

                res.setHeader(
                    'Retry-After',
                    String(retryAfterSeconds)
                );

                return res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMITED',
                        message: 'Too many requests. Please try again later.',
                        retryAfter: retryAfterSeconds,
                    },
                });
            },
        });

        app.use(globalRateLimiter);

        logger.info(
            `Global API rate limit: ${globalRateLimit} requests / 15 minutes (${NODE_ENV})`
        );

        // --------------------------------------------------------
        // REQUEST LOGGER
        // --------------------------------------------------------

        app.use((req, res, next) => {
            logger.info(`[${req.method}] ${req.originalUrl}`);
            next();
        });

        // --------------------------------------------------------
        // STATIC UPLOADS
        //
        // Default:
        // backend/uploads/
        //
        // Avatar URL:
        // /api/uploads/profile-avatars/<filename>
        //
        // UPLOADS_DIRECTORY can override the storage root.
        // It must match the directory used by the upload middleware.
        // --------------------------------------------------------

        const uploadsDirectory = path.resolve(
            process.env.UPLOADS_DIRECTORY ||
            path.join(__dirname, '../uploads')
        );

        const avatarDirectory = path.join(
            uploadsDirectory,
            'profile-avatars'
        );

        // Ensure the expected directories exist on startup.
        // This does not restore files that are missing from disk.
        fs.mkdirSync(avatarDirectory, { recursive: true });

        logger.info(`[Uploads] Storage root: ${uploadsDirectory}`);
        logger.info(`[Uploads] Avatar directory: ${avatarDirectory}`);

        app.use(
            '/api/uploads',
            express.static(uploadsDirectory, {
                index: false,
                dotfiles: 'deny',
                fallthrough: true,
                maxAge: '1d',
                immutable: false,

                setHeaders(res) {
                    res.setHeader(
                        'X-Content-Type-Options',
                        'nosniff'
                    );

                    // Public images may be displayed by the frontend
                    // even when it is hosted on a different origin.
                    res.setHeader(
                        'Cross-Origin-Resource-Policy',
                        'cross-origin'
                    );

                    res.setHeader(
                        'Access-Control-Allow-Origin',
                        '*'
                    );

                    res.setHeader(
                        'Cache-Control',
                        'public, max-age=86400'
                    );
                },
            })
        );

        // --------------------------------------------------------
        // API ROUTES
        // --------------------------------------------------------

        app.use('/api', routes);

        logger.info(
            'API routes mounted at /api; profile endpoints: ' +
            'GET/PATCH /api/profile, POST/DELETE /api/profile/avatar'
        );

        // --------------------------------------------------------
        // ROOT
        // --------------------------------------------------------

        app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'SyncDoc API is running',
                version: process.env.APP_VERSION || '6.2.0',
                environment: NODE_ENV,
                timestamp: new Date().toISOString(),
            });
        });

        // --------------------------------------------------------
        // 404 AND ERROR HANDLERS — MUST BE LAST
        // --------------------------------------------------------

        app.use(notFoundHandler);
        app.use(errorHandler);

        // --------------------------------------------------------
        // SOCKET.IO
        // --------------------------------------------------------

        io = new Server(server, {
            cors: {
                origin(origin, callback) {
                    if (isAllowedOrigin(origin)) {
                        return callback(null, true);
                    }

                    logger.warn(
                        `Socket.IO CORS blocked origin: ${origin || 'unknown'}`
                    );

                    return callback(
                        new Error('Socket.IO CORS blocked')
                    );
                },

                methods: ['GET', 'POST'],
                credentials: true,
            },

            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000,

            perMessageDeflate: {
                threshold: 1024,
            },
        });

        collaborationService = setupSocketHandlers(io);

        app.set('io', io);
        app.set('yjsWss', yjsWss);
        app.set('collaborationService', collaborationService);

        // --------------------------------------------------------
        // SERVER START
        // --------------------------------------------------------

        server.listen(PORT, () => {
            logger.info('============================================================');
            logger.info('SyncDoc Backend Started');
            logger.info(`Server: http://localhost:${PORT}`);
            logger.info(`Health: http://localhost:${PORT}/api/health`);
            logger.info(`System Status: http://localhost:${PORT}/api/system/status`);
            logger.info(`Environment: ${NODE_ENV}`);
            logger.info(`Global rate limit: ${globalRateLimit} / 15 minutes`);
            logger.info(
                `MongoDB: ${
                    mongoose.connection.readyState === 1
                        ? 'connected'
                        : 'disconnected'
                }`
            );
            logger.info(
                `Redis: ${
                    isRedisConnected()
                        ? 'connected'
                        : 'optional/unavailable'
                }`
            );
            logger.info(`Uploads: ${uploadsDirectory}`);
            logger.info('Socket.IO: enabled');
            logger.info('Yjs WebSocket: enabled');
            logger.info('============================================================');
        });

        // --------------------------------------------------------
        // GRACEFUL SHUTDOWN
        // --------------------------------------------------------

        const shutdown = async (signal) => {
            if (isShuttingDown) return;

            isShuttingDown = true;
            logger.info(`${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                try {
                    if (io) {
                        await new Promise((resolve) => {
                            io.close(() => resolve());
                        });
                    }

                    for (const client of yjsWss.clients) {
                        try {
                            client.close(1001, 'Server shutting down');
                        } catch (error) {
                            logger.error('Yjs client close error:', error);
                        }
                    }

                    await new Promise((resolve) => {
                        yjsWss.close((error) => {
                            if (error) {
                                logger.error(
                                    'Yjs WebSocket shutdown error:',
                                    error
                                );
                            }

                            resolve();
                        });
                    });

                    try {
                        await disconnectRedis();
                    } catch (error) {
                        logger.error('Redis shutdown error:', error);
                    }

                    await mongoose.disconnect();

                    logger.info('SyncDoc shutdown completed successfully');
                    process.exit(0);
                } catch (error) {
                    logger.error('Shutdown cleanup error:', error);
                    process.exit(1);
                }
            });
        };

        process.once('SIGTERM', () => shutdown('SIGTERM'));
        process.once('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        logger.error('Failed to start SyncDoc backend', error);
        process.exit(1);
    }
};

// ============================================================
// PROCESS ERROR HANDLERS
// ============================================================

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// ============================================================
// START SERVER
// ============================================================

start();

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    app,
    server,
};