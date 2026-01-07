const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');

class ApiWizard {
    constructor() {
        this.groqService = new GroqService();
        this.fileUtils = new FileUtils();
    }

    async run() {
        await this.groqService.initialize();

        console.log(chalk.bold.magenta('\n🔌 API Integration Wizard'));

        const { provider } = await inquirer.prompt([
            {
                type: 'list',
                name: 'provider',
                message: 'Select API to integrate:',
                choices: [
                    'Stripe (Payment)',
                    'Firebase (Auth/DB)',
                    'Google Maps',
                    'SendGrid (Email)',
                    'Twilio (SMS)',
                    'Custom (Describe)'
                ]
            }
        ]);

        let customDesc = '';
        if (provider === 'Custom (Describe)') {
            const { desc } = await inquirer.prompt([{
                type: 'input',
                name: 'desc',
                message: 'Describe the API integration:'
            }]);
            customDesc = desc;
        }

        console.log(chalk.gray(`\nGenerating integration code for ${provider}...`));

        const code = await this.groqService.chat(`
        Generate a complete Integration Class/Service for ${provider} ${customDesc}.
        
        Rules:
        1. Detect likely language from project context (default to JavaScript/Node.js if unknown).
        2. Include methods for common operations (e.g. for Stripe: createCharge, createCustomer).
        3. Include Error Handling.
        4. Return ONLY the code.
    `, { maxTokens: 1500 });

        console.log(chalk.cyan('\n📦 Generated Integration Code:'));
        console.log(chalk.gray('--------------------------------'));
        console.log(code);
        console.log(chalk.gray('--------------------------------'));

        const { saveConfirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'saveConfirm',
                message: 'Do you want to save this code to a file?',
                default: true
            }
        ]);

        if (saveConfirm) {
            const { filename } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'filename',
                    message: 'Enter filename (e.g., services/StripeService.js):',
                    validate: input => input.length > 0
                }
            ]);

            const fullPath = require('path').resolve(process.cwd(), filename);
            await require('fs-extra').ensureDir(require('path').dirname(fullPath));

            // Remove markdown code blocks if present
            const cleanCode = code.replace(/```\w*\n/g, '').replace(/```/g, '');

            await require('fs-extra').writeFile(fullPath, cleanCode);
            console.log(chalk.green(`✅ File saved to: ${filename}`));
        } else {
            console.log(chalk.green('\n✅ Done! Copy the code above to use it.'));
        }
    }
}

async function runApiWizard() {
    const wizard = new ApiWizard();
    await wizard.run();
}

module.exports = { runApiWizard };
