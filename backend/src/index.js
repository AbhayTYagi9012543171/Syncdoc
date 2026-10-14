// ============================================================
// SYNCDOC BACKEND - MAIN SERVER
// Production-ready Express + Socket.IO + Yjs server
// ============================================================

'use strict';

// ============================================================
// CORE MODULES
// ============================================================

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

const { Server } = require('socket.io');

const {
    setupWSConnection,
} = require('y-websocket/bin/utils');

// ============================================================
// LOAD ENVIRONMENT
// ============================================================

dotenv.config();

// ============================================================
// APPLICATION MODULES
// ============================================================

const routes = require('./routes');

const {
    errorHandler,
    notFoundHandler,
} = require('./middleware/errorHandler');

const loggerModule = require('./config/logger');

const logger =
    loggerModule?.logger || console;

const {
    connectRedis,
    disconnectRedis,
    isRedisConnected,
} = require('./config/redis');

const {
    connectDB,
} = require('./config/database');

const {
    setupSocketHandlers,
} = require('./socket');

const requestContext =
    require('./middleware/requestContext');

// ============================================================
// EXPRESS APPLICATION
// ============================================================

const app = express();

const server =
    http.createServer(app);

// ============================================================
// ENVIRONMENT
// ============================================================

const NODE_ENV =
    process.env.NODE_ENV ||
    'development';

const PORT =
    Number(process.env.PORT) ||
    5000;

app.disable(
    'x-powered-by'
);

// ------------------------------------------------------------
// Trust proxy
// ------------------------------------------------------------

const trustProxy =
    process.env.TRUST_PROXY === 'true';

app.set(
    'trust proxy',
    trustProxy ? 1 : false
);

// ============================================================
// CORS
// ============================================================

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

const configuredCorsOrigin =
    process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN
            .trim()
            .replace(/\/$/, '')
        : '';

const isAllowedOrigin = (
    origin
) => {
    // Server-to-server, curl, Postman etc.
    if (!origin) {
        return true;
    }

    const normalizedOrigin =
        origin
            .trim()
            .replace(/\/$/, '');

    // Environment configured origin
    if (
        configuredCorsOrigin &&
        normalizedOrigin ===
        configuredCorsOrigin
    ) {
        return true;
    }

    // Local development
    if (
        allowedOrigins.includes(
            normalizedOrigin
        )
    ) {
        return true;
    }

    return false;
};

const corsOptions = {
    origin: (
        origin,
        callback
    ) => {
        if (
            isAllowedOrigin(origin)
        ) {
            return callback(
                null,
                true
            );
        }

        logger.warn(
            `CORS blocked origin: ${origin || 'unknown'
            }`
        );

        return callback(
            new Error(
                `CORS policy blocked origin: ${origin || 'unknown'
                }`
            )
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

// ============================================================
// EARLY CORS / PREFLIGHT
// ============================================================

app.use(
    cors(corsOptions)
);

app.options(
    '*',
    cors(corsOptions)
);

// ============================================================
// YJS WEBSOCKET SERVER
// ============================================================

const yjsWss =
    new WebSocket.Server({
        noServer: true,
    });

// ============================================================
// YJS JWT VERIFICATION
// ============================================================

const verifyYjsToken = (
    token
) => {
    if (!token) {
        throw new Error(
            'Yjs authentication token is missing'
        );
    }

    const jwtSecret =
        process.env.JWT_SECRET ||
        process.env.JWT_ACCESS_SECRET;

    if (!jwtSecret) {
        throw new Error(
            'JWT_SECRET or JWT_ACCESS_SECRET is not configured'
        );
    }

    return jwt.verify(
        token,
        jwtSecret
    );
};

// ============================================================
// YJS DOCUMENT ID EXTRACTION
// ============================================================

const extractYjsDocumentId = (
    pathname
) => {
    if (!pathname) {
        return null;
    }

    const prefix =
        '/yjs/';

    if (
        !pathname.startsWith(
            prefix
        )
    ) {
        return null;
    }

    const documentId =
        pathname
            .slice(prefix.length)
            .replace(/\/+$/, '');

    return (
        documentId || null
    );
};

// ============================================================
// YJS WEBSOCKET UPGRADE
// ============================================================

server.on(
    'upgrade',
    (
        request,
        socket,
        head
    ) => {
        try {
            const host =
                request.headers.host ||
                `localhost:${PORT}`;

            const requestUrl =
                new URL(
                    request.url || '/',
                    `http://${host}`
                );

            const pathname =
                requestUrl.pathname;

            // --------------------------------------------------------
            // Only handle Yjs.
            // Socket.IO handles /socket.io/
            // --------------------------------------------------------

            if (
                !pathname.startsWith(
                    '/yjs/'
                )
            ) {
                return;
            }

            // --------------------------------------------------------
            // Extract JWT
            // --------------------------------------------------------

            const token =
                requestUrl.searchParams.get(
                    'token'
                );

            // --------------------------------------------------------
            // Authenticate JWT
            // --------------------------------------------------------

            let decodedToken;

            try {
                decodedToken =
                    verifyYjsToken(
                        token
                    );
            } catch (error) {
                logger.error(
                    `Yjs authentication failed: ${error?.message ||
                    error
                    }`
                );

                socket.write(
                    'HTTP/1.1 401 Unauthorized\r\n' +
                    'Connection: close\r\n' +
                    'Content-Type: text/plain\r\n' +
                    '\r\n' +
                    'Unauthorized'
                );

                socket.destroy();

                return;
            }

            // --------------------------------------------------------
            // Document ID
            // --------------------------------------------------------

            const documentId =
                extractYjsDocumentId(
                    pathname
                );

            if (!documentId) {
                logger.error(
                    'Yjs connection rejected: document ID missing'
                );

                socket.write(
                    'HTTP/1.1 400 Bad Request\r\n' +
                    'Connection: close\r\n' +
                    'Content-Type: text/plain\r\n' +
                    '\r\n' +
                    'Document ID is required'
                );

                socket.destroy();

                return;
            }

            // --------------------------------------------------------
            // Authenticated user
            // --------------------------------------------------------

            const userId =
                decodedToken.id ||
                decodedToken.userId ||
                decodedToken._id ||
                decodedToken.sub ||
                null;

            const email =
                decodedToken.email ||
                null;

            const role =
                decodedToken.role ||
                'user';

            if (!userId) {
                logger.error(
                    'Yjs authentication failed: user ID missing from JWT'
                );

                socket.write(
                    'HTTP/1.1 401 Unauthorized\r\n' +
                    'Connection: close\r\n' +
                    'Content-Type: text/plain\r\n' +
                    '\r\n' +
                    'Invalid authentication token'
                );

                socket.destroy();

                return;
            }

            // --------------------------------------------------------
            // Attach authentication
            // --------------------------------------------------------

            request.yjsAuth = {
                userId:
                    String(userId),
                email,
                role,
                documentId,
                token,
            };

            // --------------------------------------------------------
            // Accept WebSocket
            // --------------------------------------------------------

            yjsWss.handleUpgrade(
                request,
                socket,
                head,
                (ws) => {
                    yjsWss.emit(
                        'connection',
                        ws,
                        request
                    );
                }
            );
        } catch (error) {
            logger.error(
                'Yjs WebSocket upgrade error:',
                error
            );

            try {
                socket.destroy();
            } catch (socketError) {
                logger.error(
                    'Yjs socket destroy error:',
                    socketError
                );
            }
        }
    }
);

// ============================================================
// YJS CONNECTION HANDLER
// ============================================================

yjsWss.on(
    'connection',
    (
        ws,
        request
    ) => {
        try {
            const auth =
                request.yjsAuth;

            // --------------------------------------------------------
            // Authentication safety check
            // --------------------------------------------------------

            if (!auth) {
                logger.error(
                    'Yjs connection rejected: authentication missing'
                );

                ws.close(
                    1008,
                    'Authentication required'
                );

                return;
            }

            // --------------------------------------------------------
            // Connection logging
            // --------------------------------------------------------

            logger.info(
                '============================================================'
            );

            logger.info(
                'Yjs WebSocket connected'
            );

            logger.info(
                `Document: ${auth.documentId}`
            );

            logger.info(
                `User: ${auth.userId}`
            );

            logger.info(
                `Email: ${auth.email || 'unknown'}`
            );

            logger.info(
                `Role: ${auth.role || 'user'}`
            );

            logger.info(
                '============================================================'
            );

            // --------------------------------------------------------
            // Attach authentication
            // --------------------------------------------------------

            ws.yjsAuth =
                auth;

            // --------------------------------------------------------
            // Initialize Yjs
            // --------------------------------------------------------

            setupWSConnection(
                ws,
                request,
                {
                    gc: true,
                }
            );

            // --------------------------------------------------------
            // Close
            // --------------------------------------------------------

            ws.on(
                'close',
                () => {
                    logger.info(
                        `Yjs disconnected: ${auth.documentId} / ${auth.userId}`
                    );
                }
            );

            // --------------------------------------------------------
            // Error
            // --------------------------------------------------------

            ws.on(
                'error',
                (error) => {
                    logger.error(
                        `Yjs WebSocket error for document ${auth.documentId}:`,
                        error
                    );
                }
            );
        } catch (error) {
            logger.error(
                'Yjs connection initialization error:',
                error
            );

            try {
                ws.close(
                    1011,
                    'Yjs server error'
                );
            } catch (closeError) {
                logger.error(
                    'Yjs close error:',
                    closeError
                );
            }
        }
    }
);

// ============================================================
// HEALTH ENDPOINT
// ============================================================

app.get(
    '/api/health',
    (req, res) => {
        res.status(200).json({
            success: true,

            status:
                'healthy',

            service:
                'syncdoc-api',

            timestamp:
                new Date().toISOString(),

            mongoDB:
                mongoose.connection
                    .readyState === 1
                    ? 'connected'
                    : 'disconnected',

            redis:
                isRedisConnected()
                    ? 'connected'
                    : 'optional/unavailable',

            websocket: {
                socketIO:
                    'enabled',
                yjs:
                    'enabled',
            },

            environment:
                NODE_ENV,

            port:
                PORT,
        });
    }
);

// ============================================================
// SYSTEM STATUS
// ============================================================

app.get(
    '/api/system/status',
    (req, res) => {
        const memory =
            process.memoryUsage();

        res.status(200).json({
            success:
                true,

            status:
                'operational',

            service:
                'SyncDoc API',

            version:
                process.env.APP_VERSION ||
                '5.1.0',

            environment:
                NODE_ENV,

            uptime:
                Math.round(
                    process.uptime()
                ),

            node:
                process.version,

            database: {
                provider:
                    'MongoDB',

                status:
                    mongoose.connection
                        .readyState === 1
                        ? 'connected'
                        : 'disconnected',
            },

            redis: {
                status:
                    isRedisConnected()
                        ? 'connected'
                        : 'optional/unavailable',
            },

            realtime: {
                socketIO:
                    true,

                yjs:
                    true,
            },

            memory: {
                rss:
                    memory.rss,

                heapUsed:
                    memory.heapUsed,

                heapTotal:
                    memory.heapTotal,
            },

            timestamp:
                new Date().toISOString(),
        });
    }
);

// ============================================================
// START APPLICATION
// ============================================================

const start =
    async () => {
        try {
            // ======================================================
            // DATABASE
            // ======================================================

            await connectDB();

            logger.info(
                'MongoDB connected successfully'
            );

            // ======================================================
            // REDIS
            // ======================================================

            try {
                await connectRedis();

                if (
                    isRedisConnected()
                ) {
                    logger.info(
                        'Redis connected successfully'
                    );
                } else {
                    logger.warn(
                        'Redis unavailable. Continuing without Redis.'
                    );
                }
            } catch (
            redisError
            ) {
                logger.warn(
                    `Redis unavailable. Continuing without Redis: ${redisError?.message ||
                    redisError
                    }`
                );
            }

            // ======================================================
            // REQUEST CONTEXT
            // ======================================================

            app.use(
                requestContext
            );

            // ======================================================
            // RATE LIMITING
            // ======================================================

            /*
             * IMPORTANT
             *
             * The previous configuration could produce 429 responses
             * during React development.
             *
             * React development can generate many requests because of:
             *
             * - StrictMode
             * - HMR
             * - AuthContext
             * - WorkspaceContext
             * - Dashboard requests
             * - Document requests
             * - Multiple mounted components
             *
             * Therefore:
             *
             * DEVELOPMENT:
             * Local requests bypass the GLOBAL limiter.
             *
             * PRODUCTION:
             * Global rate limiter remains active.
             */

            const configuredDevelopmentLimit =
                Number(
                    process.env.DEV_GLOBAL_RATE_LIMIT ||
                    50000
                );

            const configuredProductionLimit =
                Number(
                    process.env.GLOBAL_RATE_LIMIT ||
                    1200
                );

            const globalRateLimit =
                NODE_ENV ===
                    'development'
                    ? configuredDevelopmentLimit
                    : configuredProductionLimit;

            const isLocalRequest =
                (req) => {
                    const hostname =
                        String(
                            req.hostname ||
                            ''
                        ).toLowerCase();

                    const remoteAddress =
                        String(
                            req.ip ||
                            ''
                        ).toLowerCase();

                    return (
                        hostname ===
                        'localhost' ||
                        hostname ===
                        '127.0.0.1' ||
                        hostname ===
                        '::1' ||
                        remoteAddress ===
                        '127.0.0.1' ||
                        remoteAddress ===
                        '::1' ||
                        remoteAddress ===
                        '::ffff:127.0.0.1'
                    );
                };

            const globalRateLimiter =
                rateLimit({
                    windowMs:
                        15 * 60 * 1000,

                    limit:
                        globalRateLimit,

                    standardHeaders:
                        'draft-7',

                    legacyHeaders:
                        false,

                    skip: (
                        req
                    ) => {
                        // Never rate-limit OPTIONS
                        if (
                            req.method ===
                            'OPTIONS'
                        ) {
                            return true;
                        }

                        /*
                         * Local development is not rate limited.
                         *
                         * This directly prevents the current
                         * localhost:5000/api/... 429 problem.
                         */
                        if (
                            NODE_ENV ===
                            'development' &&
                            isLocalRequest(
                                req
                            )
                        ) {
                            return true;
                        }

                        /*
                         * Health endpoint should always remain
                         * available for monitoring.
                         */
                        if (
                            req.path ===
                            '/health' ||
                            req.path ===
                            '/system/status'
                        ) {
                            return true;
                        }

                        return false;
                    },

                    message: {
                        success:
                            false,

                        error: {
                            code:
                                'RATE_LIMITED',

                            message:
                                'Too many requests. Please try again later.',
                        },
                    },

                    handler: (
                        req,
                        res
                    ) => {
                        logger.warn(
                            `[RATE_LIMITED] ${req.method} ${req.originalUrl} - IP: ${req.ip}`
                        );

                        return res
                            .status(429)
                            .json({
                                success:
                                    false,

                                error: {
                                    code:
                                        'RATE_LIMITED',

                                    message:
                                        'Too many requests. Please try again later.',

                                    retryAfter:
                                        'Please wait before retrying.',
                                },
                            });
                    },
                });

            app.use(
                globalRateLimiter
            );

            logger.info(
                `Global API rate limit: ${globalRateLimit} requests / 15 minutes (${NODE_ENV})`
            );

            if (
                NODE_ENV ===
                'development'
            ) {
                logger.info(
                    'Development mode: localhost global rate limiting is bypassed.'
                );
            }

            // ======================================================
            // HELMET
            // ======================================================

            app.use(
                helmet({
                    contentSecurityPolicy:
                        false,

                    crossOriginEmbedderPolicy:
                        false,
                })
            );

            // ======================================================
            // COMPRESSION
            // ======================================================

            app.use(
                compression()
            );

            // ======================================================
            // BODY PARSERS
            // ======================================================

            app.use(
                express.json({
                    limit:
                        '10mb',
                })
            );

            app.use(
                express.urlencoded({
                    extended:
                        true,

                    limit:
                        '10mb',
                })
            );

            // ======================================================
            // REQUEST LOGGER
            // ======================================================

            app.use(
                (
                    req,
                    res,
                    next
                ) => {
                    try {
                        logger.info(
                            `[${req.method}] ${req.originalUrl}`
                        );
                    } catch (
                    error
                    ) {
                        console.log(
                            `[${req.method}] ${req.originalUrl}`
                        );
                    }

                    next();
                }
            );

            // ======================================================
            // API ROUTES
            // ======================================================

            app.use(
                '/api',
                routes
            );

            logger.info(
                'API routes mounted at /api; profile endpoints: GET/PATCH /api/profile, POST/DELETE /api/profile/avatar'
            );

            // ======================================================
            // ROOT
            // ======================================================

            app.get(
                '/',
                (
                    req,
                    res
                ) => {
                    res.status(
                        200
                    ).json({
                        success:
                            true,

                        message:
                            'SyncDoc API is running',

                        version:
                            process.env.APP_VERSION ||
                            '5.1.0',

                        environment:
                            NODE_ENV,

                        timestamp:
                            new Date().toISOString(),
                    });
                }
            );

            // ======================================================
            // 404
            // ======================================================

            app.use(
                notFoundHandler
            );

            // ======================================================
            // GLOBAL ERROR HANDLER
            // ======================================================

            app.use(
                errorHandler
            );

            // ======================================================
            // SOCKET.IO
            // ======================================================

            const io =
                new Server(
                    server,
                    {
                        cors: {
                            origin: (
                                origin,
                                callback
                            ) => {
                                if (
                                    isAllowedOrigin(
                                        origin
                                    )
                                ) {
                                    return callback(
                                        null,
                                        true
                                    );
                                }

                                logger.warn(
                                    `Socket.IO CORS blocked origin: ${origin ||
                                    'unknown'
                                    }`
                                );

                                return callback(
                                    new Error(
                                        'Socket.IO CORS blocked'
                                    )
                                );
                            },

                            methods: [
                                'GET',
                                'POST',
                            ],

                            credentials:
                                true,
                        },

                        transports: [
                            'websocket',
                            'polling',
                        ],

                        pingTimeout:
                            60000,

                        pingInterval:
                            25000,

                        perMessageDeflate: {
                            threshold:
                                1024,
                        },
                    }
                );

            // ======================================================
            // SOCKET HANDLERS
            // ======================================================

            const collaborationService =
                setupSocketHandlers(
                    io
                );

            // ======================================================
            // APPLICATION REFERENCES
            // ======================================================

            app.set(
                'io',
                io
            );

            app.set(
                'yjsWss',
                yjsWss
            );

            app.set(
                'collaborationService',
                collaborationService
            );

            // ======================================================
            // START HTTP SERVER
            // ======================================================

            server.listen(
                PORT,
                () => {
                    logger.info(
                        '============================================================'
                    );

                    logger.info(
                        'SyncDoc Backend Started'
                    );

                    logger.info(
                        `Server: http://localhost:${PORT}`
                    );

                    logger.info(
                        `Health: http://localhost:${PORT}/api/health`
                    );

                    logger.info(
                        `System Status: http://localhost:${PORT}/api/system/status`
                    );

                    logger.info(
                        `API: http://localhost:${PORT}/api`
                    );

                    logger.info(
                        'Socket.IO: enabled'
                    );

                    logger.info(
                        'Yjs WebSocket: enabled'
                    );

                    logger.info(
                        `Yjs URL: ws://localhost:${PORT}/yjs/:documentId?token=JWT`
                    );

                    logger.info(
                        `MongoDB: ${mongoose.connection
                            .readyState === 1
                            ? 'connected'
                            : 'disconnected'
                        }`
                    );

                    logger.info(
                        `Redis: ${isRedisConnected()
                            ? 'connected'
                            : 'optional/unavailable'
                        }`
                    );

                    logger.info(
                        `Environment: ${NODE_ENV}`
                    );

                    logger.info(
                        `Rate Limit: ${globalRateLimit
                        } requests / 15 minutes`
                    );

                    if (
                        NODE_ENV ===
                        'development'
                    ) {
                        logger.info(
                            'Localhost development rate limiting: BYPASSED'
                        );
                    }

                    logger.info(
                        '============================================================'
                    );
                }
            );

            // ======================================================
            // GRACEFUL SHUTDOWN
            // ======================================================

            let isShuttingDown =
                false;

            const shutdown =
                async (
                    signal
                ) => {
                    if (
                        isShuttingDown
                    ) {
                        return;
                    }

                    isShuttingDown =
                        true;

                    logger.info(
                        `${signal} received. Shutting down gracefully...`
                    );

                    try {
                        // ------------------------------------------------
                        // Stop HTTP server
                        // ------------------------------------------------

                        server.close(
                            async () => {
                                logger.info(
                                    'HTTP server closed'
                                );

                                try {
                                    // ------------------------------------------
                                    // Socket.IO
                                    // ------------------------------------------

                                    io.close();

                                    logger.info(
                                        'Socket.IO closed'
                                    );

                                    // ------------------------------------------
                                    // Yjs clients
                                    // ------------------------------------------

                                    yjsWss.clients.forEach(
                                        (
                                            client
                                        ) => {
                                            try {
                                                client.close(
                                                    1001,
                                                    'Server shutting down'
                                                );
                                            } catch (
                                            error
                                            ) {
                                                logger.error(
                                                    'Yjs client close error:',
                                                    error
                                                );
                                            }
                                        }
                                    );

                                    // ------------------------------------------
                                    // Yjs server
                                    // ------------------------------------------

                                    await new Promise(
                                        (
                                            resolve
                                        ) => {
                                            yjsWss.close(
                                                (
                                                    error
                                                ) => {
                                                    if (
                                                        error
                                                    ) {
                                                        logger.error(
                                                            'Yjs WebSocket shutdown error:',
                                                            error
                                                        );
                                                    }

                                                    resolve();
                                                }
                                            );
                                        }
                                    );

                                    // ------------------------------------------
                                    // Redis
                                    // ------------------------------------------

                                    try {
                                        await disconnectRedis();

                                        logger.info(
                                            'Redis disconnected'
                                        );
                                    } catch (
                                    redisError
                                    ) {
                                        logger.error(
                                            'Redis shutdown error:',
                                            redisError
                                        );
                                    }

                                    // ------------------------------------------
                                    // MongoDB
                                    // ------------------------------------------

                                    await mongoose.disconnect();

                                    logger.info(
                                        'MongoDB disconnected'
                                    );

                                    logger.info(
                                        'SyncDoc shutdown completed successfully'
                                    );

                                    process.exit(
                                        0
                                    );
                                } catch (
                                error
                                ) {
                                    logger.error(
                                        'Shutdown cleanup error:',
                                        error
                                    );

                                    process.exit(
                                        1
                                    );
                                }
                            }
                        );
                    } catch (
                    error
                    ) {
                        logger.error(
                            'Shutdown error:',
                            error
                        );

                        process.exit(
                            1
                        );
                    }
                };

            // ======================================================
            // PROCESS SIGNALS
            // ======================================================

            process.once(
                'SIGTERM',
                () =>
                    shutdown(
                        'SIGTERM'
                    )
            );

            process.once(
                'SIGINT',
                () =>
                    shutdown(
                        'SIGINT'
                    )
            );
        } catch (
        error
        ) {
            logger.error(
                '============================================================'
            );

            logger.error(
                'Failed to start SyncDoc backend'
            );

            logger.error(
                error
            );

            logger.error(
                '============================================================'
            );

            process.exit(
                1
            );
        }
    };

// ============================================================
// UNHANDLED PROMISE REJECTION
// ============================================================

process.on(
    'unhandledRejection',
    (error) => {
        logger.error(
            'Unhandled Promise Rejection:',
            error
        );
    }
);

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on(
    'uncaughtException',
    (error) => {
        logger.error(
            'Uncaught Exception:',
            error
        );

        process.exit(
            1
        );
    }
);

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