const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const { ConfigManager } = require('../../lib/config-manager');

async function config(options) {
  const configManager = new ConfigManager();

  if (options.set) {
    // Set configuration value
    const [key, value] = options.set.split('=');
    if (!key || !value) {
      console.error(chalk.red('Invalid format. Use: --set key=value'));
      process.exit(1);
    }

    try {
      configManager.setConfig(key.trim(), parseValue(value.trim()));
      console.log(chalk.green(`✓ Set ${key} = ${value}`));
    } catch (error) {
      console.error(chalk.red(`Failed to set config: ${error.message}`));
    }
  } else if (options.get) {
    // Get configuration value
    const value = configManager.getConfig(options.get);
    if (value === undefined) {
      console.log(chalk.yellow(`Configuration "${options.get}" not found.`));
    } else {
      console.log(`${options.get}: ${JSON.stringify(value, null, 2)}`);
    }
  } else if (options.list) {
    // List all configuration
    const allConfig = configManager.getAllConfig();

    if (Object.keys(allConfig).length === 0) {
      console.log(chalk.yellow('No configuration found. Run "ferzcli init" first.'));
      return;
    }

    console.log(chalk.bold('🔧 ferzcli Configuration:\n'));

    Object.entries(allConfig).forEach(([key, value]) => {
      if (key === 'groqApiKey') {
        // Mask API key for security
        const maskedKey = value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 'Not set';
        console.log(`${key}: ${chalk.gray(maskedKey)}`);
      } else {
        console.log(`${key}: ${JSON.stringify(value)}`);
      }
    });
  } else {
    // Interactive configuration
    await interactiveConfig(configManager);
  }
}

function parseValue(value) {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // Try to parse as number
    if (!isNaN(value)) {
      return Number(value);
    }
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    // Return as string
    return value;
  }
}

async function interactiveConfig(configManager) {
  console.log(chalk.bold('🔧 Interactive Configuration\n'));

  const choices = [
    { name: 'View all settings', value: 'list' },
    { name: 'Change API key', value: 'apiKey' },
    { name: 'Change default model', value: 'model' },
    { name: 'Change temperature', value: 'temperature' },
    { name: 'Change max tokens', value: 'maxTokens' },
    { name: 'Toggle auto-save', value: 'autoSave' },
    { name: 'Reset all settings', value: 'reset' },
    { name: 'Exit', value: 'exit' }
  ];

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to configure?',
        choices: choices
      }
    ]);

    try {
      switch (action) {
        case 'list':
          const allConfig = configManager.getAllConfig();
          console.log(chalk.bold('\nCurrent Configuration:'));
          Object.entries(allConfig).forEach(([key, value]) => {
            if (key === 'groqApiKey') {
              const maskedKey = value ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 'Not set';
              console.log(`${key}: ${chalk.gray(maskedKey)}`);
            } else {
              console.log(`${key}: ${JSON.stringify(value)}`);
            }
          });
          console.log();
          break;

        case 'apiKey':
          const { newApiKey } = await inquirer.prompt([
            {
              type: 'password',
              name: 'newApiKey',
              message: 'Enter new Groq API key:',
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
          configManager.setApiKey(newApiKey);
          console.log(chalk.green('✓ API key updated'));
          break;

        case 'model':
          const { model } = await inquirer.prompt([
            {
              type: 'list',
              name: 'model',
              message: 'Choose default AI model:',
              choices: [
                { name: 'Mixtral 8x7B (Recommended)', value: 'mixtral-8x7b-32768' },
                { name: 'Gemma 7B', value: 'gemma-7b-it' },
                { name: 'Llama 2 70B', value: 'llama2-70b-4096' },
                { name: 'Code Llama 34B (for coding)', value: 'codellama-34b-instruct' }
              ],
              default: configManager.getDefaultModel()
            }
          ]);
          configManager.setConfig('defaultModel', model);
          console.log(chalk.green('✓ Default model updated'));
          break;

        case 'temperature':
          const { temperature } = await inquirer.prompt([
            {
              type: 'list',
              name: 'temperature',
              message: 'Choose creativity level:',
              choices: [
                { name: 'Conservative (0.1) - More predictable', value: 0.1 },
                { name: 'Balanced (0.7) - Good balance', value: 0.7 },
                { name: 'Creative (1.2) - More varied responses', value: 1.2 }
              ],
              default: configManager.getTemperature()
            }
          ]);
          configManager.setConfig('temperature', temperature);
          console.log(chalk.green('✓ Temperature updated'));
          break;

        case 'maxTokens':
          const { maxTokens } = await inquirer.prompt([
            {
              type: 'list',
              name: 'maxTokens',
              message: 'Choose maximum response length:',
              choices: [
                { name: 'Short (1024) - Quick responses', value: 1024 },
                { name: 'Medium (2048) - Balanced', value: 2048 },
                { name: 'Long (4096) - Detailed responses', value: 4096 },
                { name: 'Extra Long (8192) - Very detailed', value: 8192 }
              ],
              default: configManager.getMaxTokens()
            }
          ]);
          configManager.setConfig('maxTokens', maxTokens);
          console.log(chalk.green('✓ Max tokens updated'));
          break;

        case 'autoSave':
          const currentAutoSave = configManager.shouldAutoSave();
          const { autoSave } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'autoSave',
              message: `Auto-save chat history? (currently: ${currentAutoSave ? 'enabled' : 'disabled'})`,
              default: !currentAutoSave
            }
          ]);
          configManager.setConfig('autoSave', autoSave);
          console.log(chalk.green('✓ Auto-save updated'));
          break;

        case 'reset':
          const { confirmReset } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmReset',
              message: 'Are you sure you want to reset all settings?',
              default: false
            }
          ]);

          if (confirmReset) {
            configManager.resetConfig();
            console.log(chalk.green('✓ All settings reset'));
          }
          break;

        case 'exit':
          return;

        default:
          console.log(chalk.yellow('Unknown action'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }

    console.log(); // Add spacing
  }
}

module.exports = { config };
