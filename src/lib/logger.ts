/**
 * Simple structured logger for the application
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, data, error } = entry;

    if (this.isDevelopment) {
      // Human-readable format for development
      let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

      if (data) {
        logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
      }

      if (error) {
        logMessage += `\nError: ${error.stack || error.message}`;
      }

      return logMessage;
    } else {
      // JSON format for production (better for log aggregation)
      return JSON.stringify({
        timestamp,
        level,
        message,
        data: data || undefined,
        error: error
          ? { message: error.message, stack: error.stack }
          : undefined,
      });
    }
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data || undefined,
      error: error || undefined,
    };

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedLog);
        break;
      case LogLevel.WARN:
        console.warn(formattedLog);
        break;
      case LogLevel.INFO:
        console.info(formattedLog);
        break;
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formattedLog);
        }
        break;
    }
  }

  error(message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, data);
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, data);
  }
}

export const logger = new Logger();
