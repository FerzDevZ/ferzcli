const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');
const { ConfigManager } = require('../../lib/config-manager');

async function chat(options) {
  const groqService = new GroqService();
  await groqService.initialize();

  const fileUtils = new FileUtils();
  const configManager = new ConfigManager();
  const outputLang = options.lang || 'en';

  let context = [];
  let systemPrompt = null;

  // Load context if provided
  if (options.context) {
    try {
      const stats = await fs.stat(options.context);

      if (stats.isDirectory()) {
        console.log(chalk.gray(`Loading context from directory: ${options.context}`));
        const files = await fileUtils.readDirectory(options.context, {
          recursive: true,
          includeContent: true,
          maxFileSize: 10 * 1024, // Reduced to 10KB per file to avoid rate limits
          maxFiles: 5, // Reduced to 5 files max
          patterns: ['*.php', '*.js', '*.ts', '*.py', '*.java', 'composer.json', 'package.json', 'README.md']
        });

        // Sort by relevance and size, take only top files
        const relevantFiles = files
          .filter(f => f.content && !f.isDirectory)
          .sort((a, b) => {
            // Prioritize important files
            const priorityFiles = ['composer.json', 'package.json', 'README.md', 'artisan'];
            const aPriority = priorityFiles.some(p => a.relativePath.includes(p)) ? 1 : 0;
            const bPriority = priorityFiles.some(p => b.relativePath.includes(p)) ? 1 : 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            // Then by size (smaller first)
            return a.size - b.size;
          })
          .slice(0, 3); // Take only top 3 most relevant files

        context = relevantFiles.map(f => ({
          role: 'system',
          content: `File: ${f.relativePath}\nContent (truncated):\n${f.content.substring(0, 2000)}`
        }));

        console.log(chalk.green(`✓ Loaded ${relevantFiles.length} context files`));
        systemPrompt = `You are a helpful AI coding assistant. You have access to ${relevantFiles.length} key project files as context. Use this information to provide accurate, relevant assistance.`;
      } else {
        console.log(chalk.gray(`Loading context from file: ${options.context}`));
        const fileData = await fileUtils.readFile(options.context);
        const truncatedContent = fileData.content.length > 3000 ?
          fileData.content.substring(0, 3000) + '\n...[truncated]' :
          fileData.content;

        context = [{
          role: 'system',
          content: `File: ${path.basename(options.context)}\nContent:\n${truncatedContent}`
        }];
        systemPrompt = `You are a helpful AI coding assistant. You have access to the specified file as context. Use this information to provide accurate assistance.`;
      }
    } catch (error) {
      console.log(chalk.yellow(`Warning: Could not load context from ${options.context}: ${error.message}`));
    }
  } else {
    const langInstruction = outputLang === 'id' ?
      'Berikan semua respons dalam bahasa Indonesia.' :
      'Provide all responses in English.';

    systemPrompt = `You are ferzcli, a powerful AI coding assistant. ${langInstruction}

You help with:
- Writing and debugging code
- Explaining complex concepts
- Providing development best practices
- Analyzing code quality
- Generating documentation
- Planning development tasks

Be helpful, accurate, and provide actionable advice.`;
  }

  console.log(chalk.bold.blue('🤖 ferzcli Interactive Chat'));
  console.log(chalk.gray('Type your message or "exit" to quit, "clear" to clear history, "help" for commands\n'));

  if (context.length > 0) {
    console.log(chalk.green(`✓ Loaded ${context.length} file(s) as context`));
  }

  const chatOptions = {
    model: options.model,
    systemPrompt,
    context,
    stream: true
  };

  while (true) {
    try {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.cyan('You:'),
          validate: (input) => {
            if (!input || input.trim().length === 0) {
              return 'Please enter a message';
            }
            return true;
          }
        }
      ]);

      const input = message.trim().toLowerCase();

      // Handle special commands
      if (input === 'exit' || input === 'quit') {
        console.log(chalk.yellow('Goodbye! 👋'));
        break;
      }

      if (input === 'clear') {
        groqService.clearHistory();
        console.log(chalk.green('✓ Chat history cleared'));
        continue;
      }

      if (input === 'help') {
        console.log(chalk.bold('\nAvailable commands:'));
        console.log(chalk.cyan('  exit/quit') + chalk.gray(' - Exit the chat'));
        console.log(chalk.cyan('  clear') + chalk.gray(' - Clear chat history'));
        console.log(chalk.cyan('  help') + chalk.gray(' - Show this help'));
        console.log(chalk.cyan('  history') + chalk.gray(' - Show chat history'));
        console.log(chalk.cyan('  save <filename>') + chalk.gray(' - Save chat history'));
        console.log();
        continue;
      }

      if (input === 'history') {
        const history = groqService.getHistory();
        if (history.length === 0) {
          console.log(chalk.gray('No chat history yet.'));
        } else {
          console.log(chalk.bold('\nChat History:'));
          history.forEach((msg, index) => {
            const role = msg.role === 'user' ? chalk.cyan('You') : chalk.green('AI');
            const content = msg.content.length > 100 ?
              msg.content.substring(0, 100) + '...' :
              msg.content;
            console.log(`${index + 1}. ${role}: ${content}`);
          });
        }
        console.log();
        continue;
      }

      if (input.startsWith('save ')) {
        const filename = input.substring(5).trim();
        if (!filename) {
          console.log(chalk.red('Please specify a filename: save <filename>'));
          continue;
        }

        try {
          const history = groqService.getHistory();
          const chatLog = history.map(msg => ({
            timestamp: new Date().toISOString(),
            role: msg.role,
            content: msg.content
          }));

          await fs.writeJson(filename, chatLog, { spaces: 2 });
          console.log(chalk.green(`✓ Chat history saved to ${filename}`));
        } catch (error) {
          console.log(chalk.red(`Failed to save chat: ${error.message}`));
        }
        continue;
      }

      // Regular chat message
      console.log(chalk.green('AI: '), { stream: true });
      const response = await groqService.chat(message, chatOptions);
      console.log(); // Add newline after streaming response

      // Auto-save if enabled
      if (configManager.shouldAutoSave()) {
        try {
          const historyFile = path.join(process.cwd(), '.ferzcli-history.json');
          const history = groqService.getHistory();
          await fs.writeJson(historyFile, {
            timestamp: new Date().toISOString(),
            history: history
          }, { spaces: 2 });
        } catch (error) {
          // Silent fail for auto-save
        }
      }

    } catch (error) {
      console.log(chalk.red(`Error: ${error.message}`));
      if (error.message.includes('API key')) {
        console.log(chalk.yellow('Try running "ferzcli init" to reconfigure your API key.'));
        break;
      }
    }
  }
}

module.exports = { chat };
