const { exec } = require('child_process');
const util = require('util');
const inquirer = require('inquirer').default || require('inquirer');
const chalk = require('chalk').default || require('chalk');
const { GroqService } = require('../../lib/groq-service');
const { ConfigManager } = require('../../lib/config-manager');

const execAsync = util.promisify(exec);

class GitAssistant {
    constructor() {
        this.groqService = new GroqService();
        this.configManager = new ConfigManager();
    }

    async run(action) {
        if (action === 'commit') {
            await this.handleSmartCommit();
        } else {
            console.log(chalk.yellow(`Unknown git action: ${action}`));
            console.log('Available actions: commit');
        }
    }

    async handleSmartCommit() {
        console.log(chalk.bold.blue('\n🤖 Smart Git Commit'));
        console.log(chalk.gray('Analyzing changes...\n'));

        try {
            // Check if git is initialized
            try {
                await execAsync('git rev-parse --is-inside-work-tree');
            } catch (e) {
                console.log(chalk.red('❌ Not a git repository (or any of the parent directories).'));
                console.log(chalk.gray('Use "git init" to initialize a repository first.'));
                return;
            }

            // Initialize AI
            await this.groqService.initialize();

            // Check for staged changes
            let diff = await this.getDiff(true); // staged

            if (!diff) {
                console.log(chalk.yellow('⚠️  No staged changes found.'));

                // Check for unstaged changes
                const unstagedDiff = await this.getDiff(false);
                if (!unstagedDiff) {
                    console.log(chalk.red('❌ No changes detected in the repository.'));
                    return;
                }

                const { stageAll } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'stageAll',
                        message: 'Do you want to stage all changes (git add .)?',
                        default: true
                    }
                ]);

                if (stageAll) {
                    await execAsync('git add .');
                    diff = await this.getDiff(true);
                } else {
                    console.log('Please stage your changes manually using "git add <file>".');
                    return;
                }
            }

            console.log(chalk.cyan('🧠 Generating commit message...'));

            const commitMessage = await this.generateMessage(diff);

            console.log(chalk.bold('\n📝 Proposed Commit Message:'));
            console.log(chalk.greenBox ? chalk.greenBox(commitMessage) : chalk.green(commitMessage));
            console.log();

            const { confirm } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'confirm',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '✅ Commit with this message', value: 'commit' },
                        { name: '✏️  Edit message', value: 'edit' },
                        { name: '❌ Cancel', value: 'cancel' }
                    ]
                }
            ]);

            if (confirm === 'commit') {
                await this.commit(commitMessage);
            } else if (confirm === 'edit') {
                const { newMessage } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'newMessage',
                        message: 'Enter commit message:',
                        default: commitMessage
                    }
                ]);
                await this.commit(newMessage);
            } else {
                console.log(chalk.gray('Commit cancelled.'));
            }

        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
        }
    }

    async getDiff(staged = true) {
        try {
            const { stdout } = await execAsync(`git diff ${staged ? '--cached' : ''}`);
            return stdout.trim();
        } catch (e) {
            return null;
        }
    }

    async generateMessage(diff) {
        const prompt = `
      You are a senior developer. Generate a concise, conventional commit message based on the following git diff.
      
      Rules:
      1. Use Conventional Commits format (feat, fix, docs, style, refactor, test, chore).
      2. Keep the first line under 50 characters.
      3. Provide a brief description body if the change is complex.
      4. RETURN ONLY THE COMMIT MESSAGE. No intro/outro.

      Diff:
      ${diff.substring(0, 4000)} ${diff.length > 4000 ? '...(truncated)' : ''}
    `;

        return await this.groqService.chat(prompt, {
            maxTokens: 200,
            temperature: 0.3
        });
    }

    async commit(message) {
        try {
            // Escape double quotes
            const safeMessage = message.replace(/"/g, '\\"');
            await execAsync(`git commit -m "${safeMessage}"`);
            console.log(chalk.green('\n✅ Committed successfully!'));
        } catch (e) {
            console.error(chalk.red(`Failed to commit: ${e.message}`));
        }
    }
}

async function runGitAssistant(action, options) {
    const assistant = new GitAssistant();
    await assistant.run(action);
}

module.exports = { runGitAssistant, GitAssistant };
