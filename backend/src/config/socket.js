const socketConfig = {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  perMessageDeflate: {
    threshold: 1024,
  },
};

module.exports = socketConfig;