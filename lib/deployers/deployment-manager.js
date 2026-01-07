const VercelDeployer = require('./vercel-deployer');
const DigitalOceanDeployer = require('./digitalocean-deployer');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class DeploymentManager {
  constructor() {
    this.deployers = {
      vercel: VercelDeployer,
      digitalocean: DigitalOceanDeployer,
      // Add more deployers here
    };
  }

  async detectProjectType(projectPath) {
    const checks = {
      laravel: async () => {
        const composer = path.join(projectPath, 'composer.json');
        const artisan = path.join(projectPath, 'artisan');
        return await fs.pathExists(composer) && await fs.pathExists(artisan);
      },
      react: async () => {
        const packageJson = path.join(projectPath, 'package.json');
        if (!await fs.pathExists(packageJson)) return false;

        const pkg = await fs.readJson(packageJson);
        return pkg.dependencies && (pkg.dependencies.react || pkg.dependencies['react-scripts']);
      },
      vue: async () => {
        const packageJson = path.join(projectPath, 'package.json');
        if (!await fs.pathExists(packageJson)) return false;

        const pkg = await fs.readJson(packageJson);
        return pkg.dependencies && pkg.dependencies.vue;
      },
      nodejs: async () => {
        const packageJson = path.join(projectPath, 'package.json');
        return await fs.pathExists(packageJson);
      },
      static: async () => {
        const indexHtml = path.join(projectPath, 'index.html');
        const dist = path.join(projectPath, 'dist');
        const build = path.join(projectPath, 'build');

        return await fs.pathExists(indexHtml) ||
               await fs.pathExists(dist) ||
               await fs.pathExists(build);
      }
    };

    for (const [type, check] of Object.entries(checks)) {
      if (await check()) {
        return type;
      }
    }

    return 'unknown';
  }

  getRecommendedPlatforms(projectType) {
    const recommendations = {
      laravel: ['digitalocean', 'heroku', 'aws'],
      react: ['vercel', 'netlify', 'digitalocean'],
      vue: ['vercel', 'netlify', 'digitalocean'],
      nodejs: ['vercel', 'digitalocean', 'heroku'],
      static: ['vercel', 'netlify', 'github-pages'],
      unknown: ['vercel', 'netlify']
    };

    return recommendations[projectType] || recommendations.unknown;
  }

  async deploy(projectPath, platform, config = {}) {
    console.log(chalk.blue(`🚀 Starting deployment to ${platform}...`));

    if (!this.deployers[platform]) {
      throw new Error(`Unsupported platform: ${platform}. Supported platforms: ${Object.keys(this.deployers).join(', ')}`);
    }

    const projectType = await this.detectProjectType(projectPath);
    console.log(chalk.gray(`📁 Detected project type: ${projectType}`));

    const recommended = this.getRecommendedPlatforms(projectType);
    if (!recommended.includes(platform)) {
      console.log(chalk.yellow(`⚠️  Note: ${platform} is not the most common choice for ${projectType} projects.`));
      console.log(chalk.gray(`   Recommended platforms: ${recommended.join(', ')}`));
    }

    const DeployerClass = this.deployers[platform];
    const deployer = new DeployerClass(projectPath, config);

    try {
      const result = await deployer.run();
      console.log(chalk.green(`✅ Deployment to ${platform} completed successfully!`));
      console.log(chalk.cyan(`🌐 Your app is live at: ${result.url || 'Check deployment logs'}`));

      return result;
    } catch (error) {
      console.log(chalk.red(`❌ Deployment to ${platform} failed: ${error.message}`));
      throw error;
    }
  }

  async getDeploymentStatus(platform, appId, config = {}) {
    // Implementation for checking deployment status
    console.log(chalk.blue(`📊 Checking deployment status for ${platform} app: ${appId}`));

    // This would be implemented per platform
    return { status: 'unknown', platform };
  }

  async rollback(platform, appId, config = {}) {
    // Implementation for rolling back deployments
    console.log(chalk.yellow(`🔄 Rolling back ${platform} app: ${appId}`));

    // This would be implemented per platform
    return { success: false, message: 'Rollback not implemented yet' };
  }

  getSupportedPlatforms() {
    return Object.keys(this.deployers);
  }

  getPlatformInfo(platform) {
    const info = {
      vercel: {
        name: 'Vercel',
        description: 'Best for frontend applications, static sites, and serverless functions',
        features: ['CDN', 'Serverless', 'Custom domains', 'Analytics'],
        pricing: 'Hobby plan: Free, Pro plan: $20/month',
        bestFor: ['React', 'Vue', 'Next.js', 'Static sites']
      },
      digitalocean: {
        name: 'DigitalOcean App Platform',
        description: 'Full-stack deployment with databases, scaling, and monitoring',
        features: ['Auto-scaling', 'Managed databases', 'CDN', 'Monitoring'],
        pricing: 'Starter: $5/month, Basic: $12/month',
        bestFor: ['Laravel', 'Node.js', 'Full-stack apps']
      }
    };

    return info[platform] || {
      name: platform,
      description: 'Platform information not available',
      features: [],
      pricing: 'Contact provider',
      bestFor: ['Various']
    };
  }
}

module.exports = DeploymentManager;
