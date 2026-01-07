const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class MonitoringSystem {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            provider: config.provider || 'sentry', // sentry, rollbar, bugsnag, datadog
            enableMetrics: config.enableMetrics !== false,
            enableLogging: config.enableLogging !== false,
            enableAlerts: config.enableAlerts !== false,
            environment: config.environment || 'development',
            ...config
        };
        this.metrics = {};
        this.logs = [];
        this.alerts = [];
    }

    async setupMonitoring() {
        console.log('📊 Setting up comprehensive monitoring system...');

        const results = {
            errorTracking: null,
            metrics: null,
            logging: null,
            alerts: null
        };

        // Setup error tracking
        results.errorTracking = await this.setupErrorTracking();

        // Setup metrics collection
        if (this.config.enableMetrics) {
            results.metrics = await this.setupMetrics();
        }

        // Setup logging
        if (this.config.enableLogging) {
            results.logging = await this.setupLogging();
        }

        // Setup alerts
        if (this.config.enableAlerts) {
            results.alerts = await this.setupAlerts();
        }

        // Generate monitoring dashboard
        await this.generateMonitoringDashboard();

        console.log('✅ Monitoring system setup completed!');
        return results;
    }

    async setupErrorTracking() {
        console.log('🐛 Setting up error tracking...');

        const provider = this.config.provider;
        let setupResult;

        switch (provider) {
            case 'sentry':
                setupResult = await this.setupSentry();
                break;
            case 'rollbar':
                setupResult = await this.setupRollbar();
                break;
            case 'bugsnag':
                setupResult = await this.setupBugsnag();
                break;
            case 'datadog':
                setupResult = await this.setupDataDog();
                break;
            default:
                throw new Error(`Unsupported error tracking provider: ${provider}`);
        }

        // Generate error boundary components
        await this.generateErrorBoundaries();

        return setupResult;
    }

    async setupSentry() {
        const packageName = this.detectFramework() === 'laravel' ? 'sentry/sentry-laravel' : '@sentry/node';

        // Install Sentry
        if (this.detectFramework() === 'laravel') {
            execSync('composer require sentry/sentry-laravel', { cwd: this.projectPath, stdio: 'inherit' });
        } else {
            execSync(`npm install ${packageName}`, { cwd: this.projectPath, stdio: 'inherit' });
        }

        // Generate Sentry configuration
        const sentryConfig = this.generateSentryConfig();
        const configPath = this.detectFramework() === 'laravel' 
            ? path.join(this.projectPath, 'config', 'sentry.php')
            : path.join(this.projectPath, 'sentry.config.js');

        await fs.ensureDir(path.dirname(configPath));
        await fs.writeFile(configPath, sentryConfig);

        // Setup environment variables
        await this.updateEnvironmentFile({
            SENTRY_DSN: 'your_sentry_dsn_here',
            SENTRY_ENVIRONMENT: this.config.environment
        });

        console.log('✅ Sentry error tracking configured');
        return { provider: 'sentry', configPath };
    }

    async setupRollbar() {
        const packageName = 'rollbar';

        execSync(`npm install ${packageName}`, { cwd: this.projectPath, stdio: 'inherit' });

        const rollbarConfig = this.generateRollbarConfig();
        const configPath = path.join(this.projectPath, 'rollbar.config.js');
        await fs.writeFile(configPath, rollbarConfig);

        await this.updateEnvironmentFile({
            ROLLBAR_ACCESS_TOKEN: 'your_rollbar_token_here',
            ROLLBAR_ENVIRONMENT: this.config.environment
        });

        console.log('✅ Rollbar error tracking configured');
        return { provider: 'rollbar', configPath };
    }

    async setupBugsnag() {
        const packageName = this.detectFramework() === 'laravel' ? 'bugsnag/bugsnag-laravel' : 'bugsnag-js';

        if (this.detectFramework() === 'laravel') {
            execSync(`composer require ${packageName}`, { cwd: this.projectPath, stdio: 'inherit' });
        } else {
            execSync(`npm install ${packageName}`, { cwd: this.projectPath, stdio: 'inherit' });
        }

        const bugsnagConfig = this.generateBugsnagConfig();
        const configPath = this.detectFramework() === 'laravel'
            ? path.join(this.projectPath, 'config', 'bugsnag.php')
            : path.join(this.projectPath, 'bugsnag.config.js');

        await fs.ensureDir(path.dirname(configPath));
        await fs.writeFile(configPath, bugsnagConfig);

        await this.updateEnvironmentFile({
            BUGSNAG_API_KEY: 'your_bugsnag_api_key_here'
        });

        console.log('✅ Bugsnag error tracking configured');
        return { provider: 'bugsnag', configPath };
    }

    async setupDataDog() {
        const packages = ['dd-trace', 'datadog-winston'];

        for (const pkg of packages) {
            execSync(`npm install ${pkg}`, { cwd: this.projectPath, stdio: 'inherit' });
        }

        const datadogConfig = this.generateDataDogConfig();
        const configPath = path.join(this.projectPath, 'datadog.config.js');
        await fs.writeFile(configPath, datadogConfig);

        await this.updateEnvironmentFile({
            DD_API_KEY: 'your_datadog_api_key_here',
            DD_APP_KEY: 'your_datadog_app_key_here',
            DD_ENV: this.config.environment
        });

        console.log('✅ DataDog monitoring configured');
        return { provider: 'datadog', configPath };
    }

    async setupMetrics() {
        console.log('📈 Setting up metrics collection...');

        // Setup Prometheus metrics
        const prometheusConfig = await this.setupPrometheusMetrics();
        
        // Setup custom metrics
        const customMetrics = await this.setupCustomMetrics();

        // Setup health checks
        const healthChecks = await this.setupHealthChecks();

        return {
            prometheus: prometheusConfig,
            custom: customMetrics,
            health: healthChecks
        };
    }

    async setupPrometheusMetrics() {
        execSync('npm install prom-client express-prometheus-middleware', { 
            cwd: this.projectPath, 
            stdio: 'inherit' 
        });

        const prometheusConfig = `
const promClient = require('prom-client');
const express = require('express');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: '${path.basename(this.projectPath)}',
  env: process.env.NODE_ENV || 'development'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const errorCounter = new promClient.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['type', 'endpoint']
});

module.exports = {
  register,
  httpRequestDuration,
  activeConnections,
  errorCounter
};`;

        const configPath = path.join(this.projectPath, 'monitoring', 'prometheus.js');
        await fs.ensureDir(path.dirname(configPath));
        await fs.writeFile(configPath, prometheusConfig);

        return { configPath };
    }

    async setupCustomMetrics() {
        const customMetrics = `
const metrics = require('./prometheus');

// Business logic metrics
const userRegistrations = new metrics.register.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations'
});

const apiCalls = new metrics.register.Counter({
  name: 'api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['endpoint', 'method']
});

const databaseQueryDuration = new metrics.register.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['table', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const cacheHitRatio = new metrics.register.Gauge({
  name: 'cache_hit_ratio',
  help: 'Cache hit ratio percentage'
});

// Performance metrics
const memoryUsage = new metrics.register.Gauge({
  name: 'memory_usage_bytes',
  help: 'Current memory usage in bytes'
});

const cpuUsage = new metrics.register.Gauge({
  name: 'cpu_usage_percentage',
  help: 'Current CPU usage percentage'
});

module.exports = {
  userRegistrations,
  apiCalls,
  databaseQueryDuration,
  cacheHitRatio,
  memoryUsage,
  cpuUsage
};`;

        const customMetricsPath = path.join(this.projectPath, 'monitoring', 'custom-metrics.js');
        await fs.writeFile(customMetricsPath, customMetrics);

        return { path: customMetricsPath };
    }

    async setupHealthChecks() {
        const healthCheckCode = `
const express = require('express');
const router = express.Router();

// Basic health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check database connection
    health.services.database = await checkDatabaseHealth();
    
    // Check cache connection
    health.services.cache = await checkCacheHealth();
    
    // Check external services
    health.services.external = await checkExternalServicesHealth();
    
    // Check disk space
    health.services.disk = await checkDiskSpace();
    
    res.json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

// Readiness check
router.get('/ready', async (req, res) => {
  try {
    // Quick checks for readiness
    await checkDatabaseConnection();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

async function checkDatabaseHealth() {
  // Implement database health check
  return { status: 'healthy', responseTime: '10ms' };
}

async function checkCacheHealth() {
  // Implement cache health check
  return { status: 'healthy' };
}

async function checkExternalServicesHealth() {
  // Implement external services health check
  return { status: 'healthy' };
}

async function checkDiskSpace() {
  const fs = require('fs').promises;
  const stats = await fs.statvfs('/');
  const freeSpace = stats.f_bavail * stats.f_frsize;
  const totalSpace = stats.f_blocks * stats.f_frsize;
  const usedPercentage = ((totalSpace - freeSpace) / totalSpace) * 100;
  
  return {
    status: usedPercentage > 90 ? 'warning' : 'healthy',
    freeSpace: freeSpace,
    usedPercentage: usedPercentage.toFixed(2) + '%'
  };
}

async function checkDatabaseConnection() {
  // Quick database connection check
  return true;
}

module.exports = router;`;

        const healthPath = path.join(this.projectPath, 'monitoring', 'health-checks.js');
        await fs.writeFile(healthPath, healthCheckCode);

        return { path: healthPath };
    }

    async setupLogging() {
        console.log('📝 Setting up advanced logging system...');

        // Setup Winston logger
        execSync('npm install winston winston-daily-rotate-file express-winston', { 
            cwd: this.projectPath, 
            stdio: 'inherit' 
        });

        const loggingConfig = this.generateLoggingConfig();
        const configPath = path.join(this.projectPath, 'logging', 'config.js');
        await fs.ensureDir(path.dirname(configPath));
        await fs.writeFile(configPath, loggingConfig);

        // Setup log rotation
        const logRotateConfig = {
            auditFile: path.join(this.projectPath, 'logs', 'audit.json'),
            frequency: 'daily',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '14d'
        };

        await fs.writeJson(path.join(this.projectPath, 'logging', 'rotate-config.json'), logRotateConfig);

        console.log('✅ Advanced logging system configured');
        return { configPath, rotateConfig: path.join(this.projectPath, 'logging', 'rotate-config.json') };
    }

    async setupAlerts() {
        console.log('🚨 Setting up alerting system...');

        const alertConfig = {
            channels: {
                slack: {
                    enabled: false,
                    webhook: process.env.SLACK_WEBHOOK_URL,
                    channel: '#alerts'
                },
                email: {
                    enabled: false,
                    smtp: {
                        host: process.env.SMTP_HOST,
                        port: process.env.SMTP_PORT,
                        auth: {
                            user: process.env.SMTP_USER,
                            pass: process.env.SMTP_PASS
                        }
                    },
                    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || []
                },
                webhook: {
                    enabled: false,
                    url: process.env.ALERT_WEBHOOK_URL
                }
            },
            rules: {
                errorRate: {
                    threshold: 5, // errors per minute
                    window: 60, // seconds
                    cooldown: 300 // seconds
                },
                responseTime: {
                    threshold: 5000, // milliseconds
                    window: 60,
                    cooldown: 300
                },
                memoryUsage: {
                    threshold: 80, // percentage
                    window: 300,
                    cooldown: 600
                },
                diskUsage: {
                    threshold: 90, // percentage
                    window: 3600,
                    cooldown: 3600
                }
            }
        };

        const alertPath = path.join(this.projectPath, 'monitoring', 'alerts.js');
        const alertCode = this.generateAlertSystem(alertConfig);
        await fs.writeFile(alertPath, alertCode);

        await fs.writeJson(path.join(this.projectPath, 'monitoring', 'alert-config.json'), alertConfig);

        console.log('✅ Alerting system configured');
        return { configPath: path.join(this.projectPath, 'monitoring', 'alert-config.json'), codePath: alertPath };
    }

    generateSentryConfig() {
        if (this.detectFramework() === 'laravel') {
            return `<?php

return [
    'dsn' => env('SENTRY_DSN'),
    'environment' => env('SENTRY_ENVIRONMENT', 'production'),
    'tracing' => [
        'enabled' => true,
        'sample_rate' => 1.0,
    ],
    'send_default_pii' => false,
    'traces_sample_rate' => 0.1,
    'profiles_sample_rate' => 0.1,
];`;
        } else {
            return `const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Console(),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});`;
        }
    }

    generateRollbarConfig() {
        return `const Rollbar = require('rollbar');

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  environment: process.env.ROLLBAR_ENVIRONMENT || 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: process.env.npm_package_version,
        guess_uncaught_frames: true
      }
    }
  }
});

module.exports = rollbar;`;
    }

    generateBugsnagConfig() {
        if (this.detectFramework() === 'laravel') {
            return `<?php

return [
    'api_key' => env('BUGSNAG_API_KEY'),
    'notify_release_stages' => ['production', 'staging'],
    'send_code' => true,
    'filters' => ['password', 'credit_card'],
];`;
        } else {
            return `const Bugsnag = require('bugsnag-js');

Bugsnag.start({
  apiKey: process.env.BUGSNAG_API_KEY,
  releaseStage: process.env.NODE_ENV || 'development',
  enabledReleaseStages: ['production', 'staging'],
  notifyReleaseStages: ['production', 'staging'],
  appVersion: process.env.npm_package_version,
  metadata: {
    user: {
      id: 'user_id',
      name: 'user_name',
      email: 'user_email'
    }
  }
});`;
        }
    }

    generateDataDogConfig() {
        return `const tracer = require('dd-trace').init({
  service: '${path.basename(this.projectPath)}',
  env: process.env.DD_ENV || 'development',
  version: process.env.npm_package_version,
  logInjection: true
});

const winston = require('winston');
const DataDogWinston = require('datadog-winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new DataDogWinston({
      apiKey: process.env.DD_API_KEY,
      hostname: process.env.DD_HOSTNAME || require('os').hostname(),
      service: '${path.basename(this.projectPath)}',
      ddsource: 'nodejs',
      ddtags: \`env:\${process.env.DD_ENV || 'development'}\`
    })
  ]
});

module.exports = { tracer, logger };`;
    }

    generateLoggingConfig() {
        return `const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logDirectory = path.join(process.cwd(), 'logs');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Error log transport
const errorTransport = new DailyRotateFile({
  filename: path.join(logDirectory, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  format: logFormat,
  maxSize: '20m',
  maxFiles: '14d'
});

// Combined log transport
const combinedTransport = new DailyRotateFile({
  filename: path.join(logDirectory, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  format: logFormat,
  maxSize: '20m',
  maxFiles: '14d'
});

// Request log transport
const requestTransport = new DailyRotateFile({
  filename: path.join(logDirectory, 'request-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return \`\${timestamp} [\${level.toUpperCase()}]: \${message} \${Object.keys(meta).length ? JSON.stringify(meta) : ''}\`;
    })
  ),
  maxSize: '20m',
  maxFiles: '14d'
});

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    errorTransport,
    combinedTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  exceptionHandlers: [
    errorTransport
  ],
  rejectionHandlers: [
    errorTransport
  ]
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: \`\${duration}ms\`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

module.exports = { logger, requestLogger, requestTransport };`;
    }

    generateAlertSystem(alertConfig) {
        return `
const axios = require('axios');

class AlertManager {
  constructor(config) {
    this.config = config;
    this.alertHistory = new Map();
  }

  async checkAndAlert(metricName, value, threshold, type = 'greater') {
    const key = \`\${metricName}_\${type}_\${threshold}\`;
    const now = Date.now();
    
    // Check cooldown
    const lastAlert = this.alertHistory.get(key);
    const cooldownMs = this.config.rules[metricName]?.cooldown * 1000 || 300000; // 5 minutes default
    
    if (lastAlert && (now - lastAlert) < cooldownMs) {
      return; // Still in cooldown
    }
    
    let shouldAlert = false;
    switch (type) {
      case 'greater':
        shouldAlert = value > threshold;
        break;
      case 'less':
        shouldAlert = value < threshold;
        break;
      case 'equal':
        shouldAlert = value === threshold;
        break;
    }
    
    if (shouldAlert) {
      await this.sendAlert(metricName, value, threshold, type);
      this.alertHistory.set(key, now);
    }
  }

  async sendAlert(metricName, value, threshold, type) {
    const message = \`🚨 Alert: \${metricName} is \${type} than threshold (\${value} vs \${threshold})\`;
    
    // Send to all enabled channels
    const promises = [];
    
    if (this.config.channels.slack.enabled) {
      promises.push(this.sendSlackAlert(message));
    }
    
    if (this.config.channels.email.enabled) {
      promises.push(this.sendEmailAlert(message));
    }
    
    if (this.config.channels.webhook.enabled) {
      promises.push(this.sendWebhookAlert(message));
    }
    
    await Promise.all(promises);
  }

  async sendSlackAlert(message) {
    try {
      await axios.post(this.config.channels.slack.webhook, {
        text: message,
        channel: this.config.channels.slack.channel
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  async sendEmailAlert(message) {
    // Implement email sending logic
    console.log('📧 Email alert:', message);
  }

  async sendWebhookAlert(message) {
    try {
      await axios.post(this.config.channels.webhook.url, {
        message: message,
        timestamp: new Date().toISOString(),
        service: '${path.basename(this.projectPath)}',
        environment: this.config.environment
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  // Predefined alert checks
  async checkErrorRate(errorsPerMinute) {
    await this.checkAndAlert('errorRate', errorsPerMinute, this.config.rules.errorRate.threshold);
  }

  async checkResponseTime(avgResponseTime) {
    await this.checkAndAlert('responseTime', avgResponseTime, this.config.rules.responseTime.threshold);
  }

  async checkMemoryUsage(percentage) {
    await this.checkAndAlert('memoryUsage', percentage, this.config.rules.memoryUsage.threshold);
  }

  async checkDiskUsage(percentage) {
    await this.checkAndAlert('diskUsage', percentage, this.config.rules.diskUsage.threshold);
  }
}

module.exports = AlertManager;`;
    }

    async generateMonitoringDashboard() {
        console.log('📊 Generating monitoring dashboard...');

        const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(this.projectPath)} - Monitoring Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .metric-card {
            transition: transform 0.2s;
        }
        .metric-card:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
                📊 ${path.basename(this.projectPath)} Monitoring Dashboard
            </h1>
            <p class="text-gray-600">Environment: <span class="font-semibold">${this.config.environment}</span></p>
            <p class="text-sm text-gray-500">Last updated: <span id="lastUpdate"></span></p>
        </header>

        <!-- Health Status -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">🖥️</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">System Health</h3>
                        <p class="text-2xl font-bold text-green-600" id="systemHealth">Healthy</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">⚡</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Response Time</h3>
                        <p class="text-2xl font-bold text-blue-600" id="responseTime">245ms</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">🐛</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Error Rate</h3>
                        <p class="text-2xl font-bold text-yellow-600" id="errorRate">0.1%</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">💾</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Memory Usage</h3>
                        <p class="text-2xl font-bold text-purple-600" id="memoryUsage">68%</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Response Time Chart -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Response Time Trend</h3>
                <canvas id="responseTimeChart" width="400" height="200"></canvas>
            </div>

            <!-- Error Rate Chart -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Error Rate Trend</h3>
                <canvas id="errorRateChart" width="400" height="200"></canvas>
            </div>

            <!-- Memory Usage Chart -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Memory Usage Trend</h3>
                <canvas id="memoryChart" width="400" height="200"></canvas>
            </div>

            <!-- CPU Usage Chart -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">CPU Usage Trend</h3>
                <canvas id="cpuChart" width="400" height="200"></canvas>
            </div>
        </div>

        <!-- Recent Alerts -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Recent Alerts</h3>
            <div id="alertsList" class="space-y-3">
                <div class="text-gray-500 text-center py-4">No recent alerts</div>
            </div>
        </div>

        <!-- Logs -->
        <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Recent Logs</h3>
            <div id="logsContainer" class="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto font-mono text-sm">
                <div id="logsList">
                    <!-- Logs will be populated here -->
                </div>
            </div>
        </div>
    </div>

    <script>
        // Update timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();

        // Mock data for charts (replace with real data from your monitoring API)
        const mockData = {
            responseTime: [245, 234, 267, 289, 223, 256, 278, 234, 245, 267],
            errorRate: [0.1, 0.05, 0.2, 0.1, 0.05, 0.15, 0.1, 0.05, 0.1, 0.08],
            memory: [68, 72, 65, 70, 67, 69, 71, 68, 66, 68],
            cpu: [45, 52, 48, 55, 42, 49, 53, 47, 44, 51]
        };

        // Initialize charts
        const chartConfig = {
            type: 'line',
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        };

        new Chart(document.getElementById('responseTimeChart'), {
            ...chartConfig,
            data: {
                labels: Array.from({length: 10}, (_, i) => \`\${i + 1}m ago\`),
                datasets: [{
                    data: mockData.responseTime,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true
                }]
            }
        });

        new Chart(document.getElementById('errorRateChart'), {
            ...chartConfig,
            data: {
                labels: Array.from({length: 10}, (_, i) => \`\${i + 1}m ago\`),
                datasets: [{
                    data: mockData.errorRate,
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true
                }]
            }
        });

        new Chart(document.getElementById('memoryChart'), {
            ...chartConfig,
            data: {
                labels: Array.from({length: 10}, (_, i) => \`\${i + 1}m ago\`),
                datasets: [{
                    data: mockData.memory,
                    borderColor: 'rgb(147, 51, 234)',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    fill: true
                }]
            }
        });

        new Chart(document.getElementById('cpuChart'), {
            ...chartConfig,
            data: {
                labels: Array.from({length: 10}, (_, i) => \`\${i + 1}m ago\`),
                datasets: [{
                    data: mockData.cpu,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                }]
            }
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            // Fetch new data and update charts here
        }, 30000);
    </script>
</body>
</html>`;

        const dashboardPath = path.join(this.projectPath, 'monitoring', 'dashboard.html');
        await fs.writeFile(dashboardPath, dashboardHTML);

        console.log(`✅ Monitoring dashboard created: ${dashboardPath}`);
        return { path: dashboardPath };
    }

    async generateErrorBoundaries() {
        if (this.detectFramework() === 'laravel') {
            // Laravel error handling
            const errorHandler = `<?php

namespace App\\Exceptions;

use Illuminate\\Foundation\\Exceptions\\Handler as ExceptionHandler;
use Throwable;
use Sentry;

class Handler extends ExceptionHandler
{
    public function report(Throwable $exception)
    {
        if (app()->bound('sentry')) {
            app('sentry')->captureException($exception);
        }

        parent::report($exception);
    }

    public function render($request, Throwable $exception)
    {
        if (app()->bound('sentry')) {
            app('sentry')->captureException($exception);
        }

        return parent::render($request, $exception);
    }
}`;
            const handlerPath = path.join(this.projectPath, 'app', 'Exceptions', 'Handler.php');
            await fs.ensureDir(path.dirname(handlerPath));
            await fs.writeFile(handlerPath, errorHandler);
        } else {
            // Node.js error boundaries
            const errorHandler = `const { logger } = require('./logging/config');

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
    logger.error('Express error:', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
};

module.exports = { errorHandler };`;

            const errorPath = path.join(this.projectPath, 'middleware', 'error-handler.js');
            await fs.ensureDir(path.dirname(errorPath));
            await fs.writeFile(errorPath, errorHandler);
        }
    }

    async updateEnvironmentFile(variables) {
        const envPath = path.join(this.projectPath, '.env');
        let envContent = '';

        if (await fs.pathExists(envPath)) {
            envContent = await fs.readFile(envPath, 'utf8');
        }

        for (const [key, value] of Object.entries(variables)) {
            if (!envContent.includes(key + '=')) {
                envContent += `\n${key}=${value}`;
            }
        }

        await fs.writeFile(envPath, envContent);
    }

    detectFramework() {
        if (fs.existsSync(path.join(this.projectPath, 'artisan'))) return 'laravel';
        if (fs.existsSync(path.join(this.projectPath, 'package.json'))) return 'node';
        return 'node';
    }

    // Runtime monitoring methods
    recordMetric(name, value, labels = {}) {
        if (!this.metrics[name]) {
            this.metrics[name] = [];
        }

        this.metrics[name].push({
            value,
            labels,
            timestamp: Date.now()
        });

        // Keep only last 1000 entries per metric
        if (this.metrics[name].length > 1000) {
            this.metrics[name] = this.metrics[name].slice(-1000);
        }
    }

    log(level, message, meta = {}) {
        const logEntry = {
            level,
            message,
            meta,
            timestamp: new Date().toISOString()
        };

        this.logs.push(logEntry);

        // Keep only last 10000 log entries
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(-10000);
        }
    }

    createAlert(type, message, severity = 'medium') {
        const alert = {
            type,
            message,
            severity,
            timestamp: new Date().toISOString(),
            resolved: false
        };

        this.alerts.push(alert);
    }

    getMetrics() {
        return this.metrics;
    }

    getLogs(level = null, limit = 100) {
        let filteredLogs = this.logs;
        
        if (level) {
            filteredLogs = this.logs.filter(log => log.level === level);
        }

        return filteredLogs.slice(-limit);
    }

    getAlerts(activeOnly = true) {
        let filteredAlerts = this.alerts;
        
        if (activeOnly) {
            filteredAlerts = this.alerts.filter(alert => !alert.resolved);
        }

        return filteredAlerts;
    }
}

module.exports = MonitoringSystem;
