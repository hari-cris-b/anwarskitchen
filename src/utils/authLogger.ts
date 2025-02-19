type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  details?: Record<string, any>;
}

class AuthLogger {
  private static instance: AuthLogger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 100;

  private constructor() {}

  static getInstance(): AuthLogger {
    if (!AuthLogger.instance) {
      AuthLogger.instance = new AuthLogger();
    }
    return AuthLogger.instance;
  }

  private log(level: LogLevel, component: string, message: string, details?: Record<string, any>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      details
    };

    console[level](
      `[${entry.component}] ${entry.message}`,
      entry.details || ''
    );

    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  debug(component: string, message: string, details?: Record<string, any>) {
    this.log('debug', component, message, details);
  }

  info(component: string, message: string, details?: Record<string, any>) {
    this.log('info', component, message, details);
  }

  warn(component: string, message: string, details?: Record<string, any>) {
    this.log('warn', component, message, details);
  }

  error(component: string, message: string, details?: Record<string, any>) {
    this.log('error', component, message, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLastLog(): LogEntry | undefined {
    return this.logs[0];
  }

  clearLogs() {
    this.logs = [];
  }

  // Special auth-related logging methods
  logLogin(mode: 'staff' | 'super_admin', email: string, success: boolean, error?: string) {
    this.log(
      success ? 'info' : 'error',
      'Auth',
      success ? 'Login successful' : 'Login failed',
      {
        mode,
        email,
        error,
        timestamp: new Date().toISOString()
      }
    );
  }

  logRoleCheck(userId: string, role: string | null, hasAccess: boolean, route: string) {
    this.log(
      'debug',
      'RoleCheck',
      hasAccess ? 'Access granted' : 'Access denied',
      {
        userId,
        role,
        route,
        hasAccess,
        timestamp: new Date().toISOString()
      }
    );
  }

  logRedirect(from: string, to: string, reason: string) {
    this.log(
      'info',
      'Navigation',
      'Route redirect',
      {
        from,
        to,
        reason,
        timestamp: new Date().toISOString()
      }
    );
  }

  logProfileLoad(userId: string, success: boolean, error?: string) {
    this.log(
      success ? 'info' : 'error',
      'Profile',
      success ? 'Profile loaded' : 'Profile load failed',
      {
        userId,
        error,
        timestamp: new Date().toISOString()
      }
    );
  }

  // Method to get filtered logs
  getFilteredLogs(options: {
    level?: LogLevel;
    component?: string;
    since?: Date;
  }): LogEntry[] {
    return this.logs.filter(log => {
      if (options.level && log.level !== options.level) return false;
      if (options.component && log.component !== options.component) return false;
      if (options.since && new Date(log.timestamp) < options.since) return false;
      return true;
    });
  }
}

export const authLogger = AuthLogger.getInstance();