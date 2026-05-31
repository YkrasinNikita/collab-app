const pino = require('pino');

let transport;
// Включаем красивый вывод только если pino-pretty установлен (обычно при локальной разработке)
try {
  require.resolve('pino-pretty');
  transport = {
    target: 'pino-pretty',
    options: { colorize: true },
  };
} catch (e) {
  // pino-pretty не найден, будет стандартный JSON-лог
}

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport,
});

module.exports = logger;