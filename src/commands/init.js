const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');
const { ConfigManager } = require('../../lib/config-manager');
const { FileUtils } = require('../../lib/file-utils');
const { GroqService } = require('../../lib/groq-service');
const ora = require('ora').default || require('ora');

async function init(options = {}) {
  console.log(chalk.bold.blue('🚀 Welcome to ferzcli - Powerful AI Coding Assistant'));
  console.log(chalk.gray('Initializing your ferzcli configuration...\n'));

  const configManager = new ConfigManager();
  const fileUtils = new FileUtils();

  // Instant Setup with Master Key
  if (options.ferzapikey) {
    const spinner = ora('Setting up Master Key configuration...').start();
    await configManager.ready;
    const masterKey = configManager.getApiKey(); // This gets the master key if user key is empty
    if (masterKey && masterKey.startsWith('gsk_')) {
      await configManager.setApiKey(masterKey);
      spinner.succeed('Master Key activated successfully!');
      console.log(chalk.green('✓ ferzcli is now ready to use with built-in elite configuration.'));
      return;
    } else {
      spinner.fail('Master Key not found in this build.');
      console.log(chalk.yellow('Please enter your API key manually or check the build version.'));
    }
  }

  // Check if already initialized
  const isInitialized = await configManager.isInitialized();
  if (isInitialized) {
    const { reinitialize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reinitialize',
        message: 'ferzcli is already initialized. Do you want to reconfigure?',
        default: false
      }
    ]);

    if (!reinitialize) {
      console.log(chalk.green('✓ ferzcli is already configured and ready to use!'));
      console.log(chalk.gray('Run "ferzcli chat" to start an interactive session.'));
      return;
    }
  }

  // Try to load from environment variable or .env file first
  console.log(chalk.gray('Checking for existing GROQ_API_KEY...'));
  let apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    const envVars = await configManager.loadEnvFile();
    apiKey = envVars.GROQ_API_KEY;
  }

  if (!apiKey) {
    // Prompt user for API key
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your Groq API key:',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'API key cannot be empty';
          }
          if (!input.startsWith('gsk_')) {
            return 'Invalid API key format. Groq API keys start with "gsk_"';
          }
          return true;
        }
      }
    ]);
    apiKey = answers.apiKey;
  }

  // Save API key
  await configManager.setApiKey(apiKey);
  console.log(chalk.green('✓ API key configured successfully'));

  // Test the API key
  const spinner = ora('Testing API connection...').start();
  try {
    const groqService = new GroqService();
    await groqService.initialize();

    // Simple test chat
    await groqService.chat('Hello, this is a test message from ferzcli initialization.', {
      maxTokens: 50
    });

    spinner.stop();
    console.log(chalk.green('✓ API connection successful'));
  } catch (error) {
    spinner.stop();
    console.log(chalk.red('✗ API test failed:', error.message));
    console.log(chalk.yellow('Note: You can still use ferzcli, but the API key might be invalid.'));
  }

  // Configure optimal settings for powerful coding assistance
  console.log(chalk.gray('\nConfiguring optimal settings for powerful coding assistance...'));

  const settings = {
    defaultModel: 'llama-3.3-70b-versatile', // Best for advanced coding
    temperature: 0.3, // Optimal for code generation
    autoSave: true
  };

  console.log(chalk.green('✓ Using Llama 3.3 70B (best for advanced coding tasks)'));
  console.log(chalk.green('✓ Temperature set to 0.3 (optimal for code generation)'));
  console.log(chalk.green('✓ Auto-save enabled for chat history'));

  // Save settings
  configManager.setConfig('defaultModel', settings.defaultModel);
  configManager.setConfig('temperature', settings.temperature);
  configManager.setConfig('autoSave', settings.autoSave);

  console.log(chalk.green('\n✓ ferzcli initialization complete!'));
  console.log(chalk.bold('\n🎉 You\'re all set! Here are some commands to get started:'));
  console.log(chalk.cyan('  ferzcli chat          ') + chalk.gray('- Start interactive AI chat'));
  console.log(chalk.cyan('  ferzcli analyze <path>') + chalk.gray('- Analyze codebase files'));
  console.log(chalk.cyan('  ferzcli plan "task"   ') + chalk.gray('- Generate development plans'));
  console.log(chalk.cyan('  ferzcli autocomplete "code"') + chalk.gray('- Get code completion'));
  console.log(chalk.cyan('  ferzcli config --list ') + chalk.gray('- View configuration'));

  console.log(chalk.gray('\nFor more help, run: ferzcli --help'));
}

module.exports = { init };
