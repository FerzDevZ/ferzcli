const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const { GroqService } = require('../../lib/groq-service');

class CodeTutor {
    constructor() {
        this.groqService = new GroqService();
    }

    async run(targetFile) {
        await this.groqService.initialize();

        if (!targetFile) {
            console.error(chalk.red('Please specify a file to explain.'));
            return;
        }

        const fullPath = path.resolve(process.cwd(), targetFile);
        if (!await fs.pathExists(fullPath)) {
            console.error(chalk.red(`File not found: ${targetFile}`));
            return;
        }

        const content = await fs.readFile(fullPath, 'utf8');

        console.log(chalk.bold.blue(`\n👨‍🏫 Doctor Code is reading ${targetFile}...`));

        const explanation = await this.groqService.chat(`
        You are an expert coding tutor. Explain the following code to a junior developer.
        
        Structure:
        1. **Summary**: What does this file do?
        2. **Key Logic**: Explain the critical parts (line by line if complex).
        3. **Best Practices**: Mention any good (or bad) patterns used.
        4. **Suggestions**: How to improve it?

        Code:
        ${content.substring(0, 4000)}
    `, { maxTokens: 1500 });

        console.log('\n' + explanation + '\n');

        // Interactive follow-up loop
        const inquirer = require('inquirer').default || require('inquirer');

        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do next?',
                    choices: [
                        'Ask a follow-up question',
                        'Explain another part',
                        'Refactor this code',
                        'Exit'
                    ]
                }
            ]);

            if (action === 'Exit') break;

            if (action === 'Ask a follow-up question') {
                const { question } = await inquirer.prompt([{
                    type: 'input',
                    name: 'question',
                    message: 'Your question:'
                }]);

                console.log(chalk.gray('Analyzing...'));
                const answer = await this.groqService.chat(`
                    Context: Previous explanation of ${targetFile}.
                    Question: ${question}
                    
                    Answer briefly and clearly.
                `);
                console.log('\n' + answer + '\n');
            }

            if (action === 'Refactor this code') {
                console.log(chalk.gray('Generating refactored version...'));
                const refactor = await this.groqService.chat(`
                    Refactor the following code to be cleaner and more efficient.
                    Code: ${content.substring(0, 3000)}
                 `);
                console.log('\n' + refactor + '\n');
            }

            if (action === 'Explain another part') {
                console.log(chalk.yellow('Please run "ferzcli explain <file>" again with the new file.'));
                break;
            }
        }
    }
}

async function runCodeTutor(targetFile) {
    const tutor = new CodeTutor();
    await tutor.run(targetFile);
}

module.exports = { runCodeTutor };
