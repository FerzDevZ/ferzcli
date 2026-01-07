const { Command } = require('commander');
const DeploymentManager = require('../lib/deployers/deployment-manager');
const { ConfigManager } = require('../lib/config-manager');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');

async function deploy(options) {
  const configManager = new ConfigManager();
  const deploymentManager = new DeploymentManager();

  try {
    // Get current directory as project path
    const projectPath = process.cwd();

    console.log(chalk.bold.magenta('╔══════════════════════════════════════════════╗'));
    console.log(chalk.bold.magenta('║') + chalk.bold.white('              🚀 Cloud Deployment              ') + chalk.bold.magenta('║'));
    console.log(chalk.bold.magenta('║') + chalk.gray('        Deploy aplikasi ke cloud platform       ') + chalk.bold.magenta('║'));
    console.log(chalk.bold.magenta('╚══════════════════════════════════════════════╝'));
    console.log();

    // Detect project type
    console.log(chalk.blue('🔍 Menganalisis project...'));
    const projectType = await deploymentManager.detectProjectType(projectPath);
    console.log(chalk.gray(`📁 Tipe project: ${projectType}`));

    // Get recommended platforms
    const recommendedPlatforms = deploymentManager.getRecommendedPlatforms(projectType);
    console.log(chalk.gray(`💡 Platform yang direkomendasikan: ${recommendedPlatforms.join(', ')}`));
    console.log();

    // Choose platform
    let platform = options.platform;

    if (!platform) {
      const platformChoices = deploymentManager.getSupportedPlatforms().map(p => ({
        name: `${p} ${recommendedPlatforms.includes(p) ? chalk.green('(Direkomendasikan)') : ''}`,
        value: p,
        short: p
      }));

      const { selectedPlatform } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedPlatform',
          message: 'Pilih platform deployment:',
          choices: platformChoices
        }
      ]);

      platform = selectedPlatform;
    }

    // Show platform info
    const platformInfo = deploymentManager.getPlatformInfo(platform);
    console.log(chalk.cyan(`📋 Info ${platformInfo.name}:`));
    console.log(chalk.gray(`   ${platformInfo.description}`));
    console.log(chalk.gray(`   💰 Pricing: ${platformInfo.pricing}`));
    console.log(chalk.gray(`   🎯 Best for: ${platformInfo.bestFor.join(', ')}`));
    console.log();

    // Get deployment configuration
    const config = await getDeploymentConfig(platform);

    // Confirm deployment
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Lanjutkan deployment ke ${platform}?`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Deployment dibatalkan.'));
      return;
    }

    // Execute deployment
    const result = await deploymentManager.deploy(projectPath, platform, config);

    // Show success message
    console.log();
    console.log(chalk.green('🎉 Deployment berhasil!'));
    if (result.url) {
      console.log(chalk.cyan(`🌐 Aplikasi Anda live di: ${result.url}`));
    }

    // Show next steps
    showNextSteps(platform, result);

  } catch (error) {
    console.log(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

async function getDeploymentConfig(platform) {
  const config = {};

  switch (platform) {
    case 'vercel':
      const { vercelToken } = await inquirer.prompt([
        {
          type: 'password',
          name: 'vercelToken',
          message: 'Masukkan Vercel token (atau kosongkan untuk menggunakan env VERCEL_TOKEN):',
          mask: '*'
        }
      ]);
      if (vercelToken) config.token = vercelToken;
      break;

    case 'digitalocean':
      const answers = await inquirer.prompt([
        {
          type: 'password',
          name: 'doToken',
          message: 'Masukkan DigitalOcean token (atau kosongkan untuk menggunakan env DO_TOKEN):',
          mask: '*'
        },
        {
          type: 'list',
          name: 'region',
          message: 'Pilih region:',
          choices: [
            { name: 'New York (nyc3)', value: 'nyc3' },
            { name: 'San Francisco (sfo3)', value: 'sfo3' },
            { name: 'London (lon1)', value: 'lon1' },
            { name: 'Singapore (sgp1)', value: 'sgp1' }
          ],
          default: 'nyc3'
        },
        {
          type: 'list',
          name: 'size',
          message: 'Pilih instance size:',
          choices: [
            { name: 'Basic (s-1vcpu-1gb) - $6/month', value: 's-1vcpu-1gb' },
            { name: 'Standard (s-1vcpu-2gb) - $12/month', value: 's-1vcpu-2gb' },
            { name: 'Premium (s-2vcpu-2gb) - $22/month', value: 's-2vcpu-2gb' }
          ],
          default: 's-1vcpu-1gb'
        }
      ]);

      if (answers.doToken) config.token = answers.doToken;
      config.region = answers.region;
      config.size = answers.size;
      break;

    default:
      // No additional config needed for other platforms
      break;
  }

  return config;
}

function showNextSteps(platform, result) {
  console.log();
  console.log(chalk.bold.cyan('📝 Langkah selanjutnya:'));

  switch (platform) {
    case 'vercel':
      console.log(chalk.gray('   • vercel domains - Kelola custom domain'));
      console.log(chalk.gray('   • vercel env - Atur environment variables'));
      console.log(chalk.gray('   • vercel logs - Lihat deployment logs'));
      break;

    case 'digitalocean':
      console.log(chalk.gray('   • doctl apps list - Lihat daftar aplikasi'));
      console.log(chalk.gray('   • doctl apps logs <app-id> - Lihat logs aplikasi'));
      console.log(chalk.gray('   • Monitor aplikasi di dashboard DigitalOcean'));
      break;

    default:
      console.log(chalk.gray('   • Periksa dokumentasi platform untuk langkah selanjutnya'));
  }

  console.log();
  console.log(chalk.bold.green('✨ Selamat! Aplikasi Anda sudah siap digunakan.'));
}

module.exports = { deploy };
