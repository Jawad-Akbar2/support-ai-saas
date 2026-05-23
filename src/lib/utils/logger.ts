type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function formatLog(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  console.log(prefix, message, data || '');
}

export const logger = {
  info: (message: string, data?: any) => formatLog('info', message, data),
  warn: (message: string, data?: any) => formatLog('warn', message, data),
  error: (message: string, data?: any) => formatLog('error', message, data),
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      formatLog('debug', message, data);
    }
  },
};
