const BaseDeployer = require('./base-deployer');
const fs = require('fs-extra');
const path = require('path');

class DigitalOceanDeployer extends BaseDeployer {
  constructor(projectPath, config = {}) {
    super(projectPath, config);
    this.name = 'DigitalOcean';
    this.token = config.token || process.env.DO_TOKEN;
    this.region = config.region || 'nyc3';
    this.size = config.size || 's-1vcpu-1gb';
  }

  async checkPrerequisites() {
    this.log('🔍 Checking DigitalOcean prerequisites...');

    // Check if doctl is installed
    try {
      await this.executeCommand('doctl', ['version']);
      this.log('✅ DigitalOcean CLI (doctl) is installed');
    } catch (error) {
      throw new Error('DigitalOcean CLI is not installed. Install from: https://docs.digitalocean.com/reference/doctl/how-to/install/');
    }

    // Check if token is provided
    if (!this.token) {
      throw new Error('DigitalOcean token is required. Set DO_TOKEN environment variable or pass in config.');
    }

    // Authenticate
    await this.executeCommand('doctl', ['auth', 'init', '--access-token', this.token]);

    return true;
  }

  async prepareDeployment() {
    this.log('📦 Preparing DigitalOcean deployment...');

    // Check if Dockerfile exists, create if not
    const dockerfile = path.join(this.projectPath, 'Dockerfile');
    if (!await fs.pathExists(dockerfile)) {
      const dockerContent = this.generateDockerfile();
      await fs.writeFile(dockerfile, dockerContent);
      this.log('✅ Created Dockerfile for deployment');
    }

    // Create .do/deploy.template.yaml if it doesn't exist
    const deployTemplate = path.join(this.projectPath, '.do', 'deploy.template.yaml');
    await fs.ensureDir(path.dirname(deployTemplate));

    if (!await fs.pathExists(deployTemplate)) {
      const template = this.generateDeployTemplate();
      await fs.writeFile(deployTemplate, template);
      this.log('✅ Created DigitalOcean App Spec template');
    }

    return true;
  }

  async deploy() {
    this.log('🚀 Deploying to DigitalOcean App Platform...');

    // Create the app
    const result = await this.executeCommand('doctl', [
      'apps', 'create',
      '--spec', '.do/deploy.template.yaml',
      '--format', 'ID,DefaultIngress'
    ]);

    const lines = result.stdout.trim().split('\n');
    const appData = lines[1]?.split('\t') || [];
    const appId = appData[0];
    const appUrl = appData[1];

    if (!appId) {
      throw new Error('Failed to create DigitalOcean app');
    }

    this.log(`✅ App created with ID: ${appId}`);
    this.log(`🌐 App URL: ${appUrl}`);

    // Wait for deployment to complete
    this.log('⏳ Waiting for deployment to complete...');
    await this.waitForDeployment(appId);

    return {
      appId,
      url: appUrl,
      platform: 'digitalocean',
      logs: this.getLogs()
    };
  }

  async waitForDeployment(appId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const result = await this.executeCommand('doctl', [
          'apps', 'get', appId,
          '--format', 'Phase'
        ]);

        const phase = result.stdout.trim();
        this.log(`Deployment phase: ${phase}`);

        if (phase === 'ACTIVE') {
          this.log('✅ Deployment completed successfully!');
          return;
        } else if (phase === 'ERROR' || phase === 'FAILED') {
          throw new Error(`Deployment failed with phase: ${phase}`);
        }

        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw error;
        }
        this.log(`Attempt ${i + 1} failed, retrying...`);
      }
    }

    throw new Error('Deployment timed out');
  }

  async postDeploy() {
    this.log('🎉 DigitalOcean deployment completed!');
    this.log('📝 Useful commands:');
    this.log('   doctl apps list - List your apps');
    this.log('   doctl apps logs <app-id> - View app logs');
    this.log('   doctl apps update <app-id> --spec .do/deploy.template.yaml - Update app');
  }

  generateDockerfile() {
    // Detect project type and generate appropriate Dockerfile
    const packageJson = path.join(this.projectPath, 'package.json');
    const composerJson = path.join(this.projectPath, 'composer.json');

    if (fs.existsSync(composerJson)) {
      // Laravel/PHP project
      return `# Laravel Dockerfile for DigitalOcean
FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    libpng-dev \\
    libonig-dev \\
    libxml2-dev \\
    zip \\
    unzip \\
    nodejs \\
    npm

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files
COPY composer.* ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Copy application code
COPY . .

# Install Node dependencies and build assets
RUN npm install && npm run build

# Set permissions
RUN chown -R www-data:www-data /var/www \\
    && chmod -R 755 /var/www/storage

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]`;
    } else if (fs.existsSync(packageJson)) {
      // Node.js/React project
      return `# Node.js Dockerfile for DigitalOcean
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]`;
    } else {
      throw new Error('Unable to determine project type. Please create a Dockerfile manually.');
    }
  }

  generateDeployTemplate() {
    const packageJson = path.join(this.projectPath, 'package.json');
    const isNode = fs.existsSync(packageJson);

    return `name: ${path.basename(this.projectPath)}
services:
- name: web
  source_dir: /
  github:
    repo: your-username/your-repo
    branch: main
  run_command: ${isNode ? 'npm start' : 'php artisan serve --host=0.0.0.0 --port=8080'}
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: ${this.size}
  health_check:
    http_path: /
  ${isNode ? 'build_command: npm run build' : ''}

databases:
- name: db
  engine: PG
  version: "12"
  size: db-s-1vcpu-1gb
  num_nodes: 1`;
  }
}

module.exports = DigitalOceanDeployer;
