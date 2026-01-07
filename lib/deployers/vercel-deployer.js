const BaseDeployer = require('./base-deployer');
const fs = require('fs-extra');
const path = require('path');

class VercelDeployer extends BaseDeployer {
  constructor(projectPath, config = {}) {
    super(projectPath, config);
    this.name = 'Vercel';
    this.token = config.token || process.env.VERCEL_TOKEN;
  }

  async checkPrerequisites() {
    this.log('🔍 Checking Vercel prerequisites...');

    // Check if Vercel CLI is installed
    try {
      await this.executeCommand('vercel', ['--version']);
      this.log('✅ Vercel CLI is installed');
    } catch (error) {
      throw new Error('Vercel CLI is not installed. Run: npm install -g vercel');
    }

    // Check if token is provided
    if (!this.token) {
      throw new Error('Vercel token is required. Set VERCEL_TOKEN environment variable or pass in config.');
    }

    // Check if this is a frontend project
    const packageJson = path.join(this.projectPath, 'package.json');
    if (!await fs.pathExists(packageJson)) {
      throw new Error('This doesn\'t appear to be a Node.js project. Vercel deployment requires package.json.');
    }

    return true;
  }

  async prepareDeployment() {
    this.log('📦 Preparing Vercel deployment...');

    // Create vercel.json if it doesn't exist
    const vercelConfig = path.join(this.projectPath, 'vercel.json');
    if (!await fs.pathExists(vercelConfig)) {
      const config = {
        version: 2,
        builds: [
          {
            src: 'package.json',
            use: '@vercel/static-build',
            config: {
              distDir: 'build'
            }
          }
        ],
        routes: [
          {
            src: '/(.*)',
            dest: '/index.html'
          }
        ]
      };

      await fs.writeJson(vercelConfig, config, { spaces: 2 });
      this.log('✅ Created vercel.json configuration');
    }

    // Login to Vercel
    await this.executeCommand('vercel', ['login', this.token]);

    return true;
  }

  async deploy() {
    this.log('🚀 Deploying to Vercel...');

    // Deploy the project
    const result = await this.executeCommand('vercel', [
      '--prod',
      '--yes'
    ]);

    // Extract deployment URL from output
    const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
    const deploymentUrl = urlMatch ? urlMatch[0] : 'Deployment URL not found in output';

    this.log(`✅ Successfully deployed to: ${deploymentUrl}`);

    return {
      url: deploymentUrl,
      platform: 'vercel',
      logs: this.getLogs()
    };
  }

  async postDeploy() {
    this.log('🎉 Vercel deployment completed!');
    this.log('📝 Useful commands:');
    this.log('   vercel logs - View deployment logs');
    this.log('   vercel domains - Manage custom domains');
    this.log('   vercel env - Manage environment variables');
  }
}

module.exports = VercelDeployer;
