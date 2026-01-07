const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');

class TestGenerator {
    constructor() {
        this.groqService = new GroqService();
        this.fileUtils = new FileUtils();
    }

    async run(action, target, options) {
        await this.groqService.initialize();

        if (action === 'gen' || options.generate) {
            await this.generateTest(target || options.generate);
        } else {
            await this.runTests(target, options); // Placeholder for future runner
        }
    }

    async generateTest(targetFile) {
        console.log(chalk.blue(`\n🧪 Generating tests for: ${targetFile}`));

        if (!targetFile) {
            console.error(chalk.red('Error: Please specify a file to generate tests for.'));
            return;
        }

        const fullPath = path.resolve(process.cwd(), targetFile);
        if (!await fs.pathExists(fullPath)) {
            console.error(chalk.red(`Error: File not found: ${targetFile}`));
            return;
        }

        const content = await fs.readFile(fullPath, 'utf8');
        const ext = path.extname(targetFile);

        // Determine framework
        let framework = 'jest'; // default
        if (ext === '.php') framework = 'phpunit';
        if (ext === '.py') framework = 'pytest';

        console.log(chalk.gray(`Target Framework: ${framework}`));
        console.log(chalk.gray('AI Analyzing logic...'));

        const testCode = await this.groqService.chat(`
        Generate a comprehensive Unit Test for this code using ${framework}.
        
        Rules:
        1. Cover success cases and failure cases (edge cases).
        2. Mock external dependencies if possible.
        3. Return ONLY the code, no markdown backticks, no explanation.
        4. Use proper assertion syntax.

        Code:
        ${content.substring(0, 5000)}
    `, { maxTokens: 2000 });

        // Determine output path
        const testDir = path.join(process.cwd(), 'tests');
        await fs.ensureDir(testDir);

        const basename = path.basename(targetFile, ext);
        let testFilename = `${basename}.test${ext}`;
        if (framework === 'phpunit') testFilename = `${basename}Test.php`;
        if (framework === 'pytest') testFilename = `test_${basename}.py`;

        const outputPath = path.join(testDir, testFilename);

        console.log(chalk.cyan('\n📝 Generated Test Code:'));
        console.log(testCode.substring(0, 500) + '...\n');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: `Save to ${testFilename}?`,
                default: true
            }
        ]);

        if (confirm) {
            // Clean code (remove markdown blocks if any)
            const cleanCode = testCode.replace(/```\w*\n/g, '').replace(/```/g, '');
            await fs.writeFile(outputPath, cleanCode);
            console.log(chalk.green(`✅ Test saved to tests/${testFilename}`));
        }
    }

    async runTests(target, options) {
        const { exec } = require('child_process');
        const fs = require('fs-extra');
        const path = require('path');

        console.log(chalk.bold.blue('\n🚀 Starting Test Runner...'));

        let testCommand = '';
        const projectPath = process.cwd();

        // 1. Detect NPM/Node
        if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
            try {
                const pkg = await fs.readJson(path.join(projectPath, 'package.json'));
                if (pkg.scripts && pkg.scripts.test) {
                    testCommand = 'npm test';
                } else {
                    // Fallback to searching for common frameworks
                    if (await fs.pathExists(path.join(projectPath, 'jest.config.js'))) testCommand = 'npx jest';
                    else if (await fs.pathExists(path.join(projectPath, 'mocha.opts'))) testCommand = 'npx mocha';
                }
            } catch (e) { }
        }

        // 2. Detect PHP/Laravel
        if (!testCommand && await fs.pathExists(path.join(projectPath, 'composer.json'))) {
            if (await fs.pathExists(path.join(projectPath, 'artisan'))) {
                testCommand = 'php artisan test';
            } else if (await fs.pathExists(path.join(projectPath, 'vendor/bin/phpunit'))) {
                testCommand = './vendor/bin/phpunit';
            }
        }

        // 3. Detect Python
        if (!testCommand && (await fs.pathExists(path.join(projectPath, 'requirements.txt')) || await fs.pathExists(path.join(projectPath, 'pyproject.toml')))) {
            testCommand = 'pytest';
        }

        if (!testCommand) {
            console.error(chalk.red('❌ Could not detect a test runner (npm script, phpunit, or pytest).'));
            console.log(chalk.yellow('Tip: Use "ferzcli test gen <file>" to generate tests first.'));
            return;
        }

        console.log(chalk.gray(`Executing: ${testCommand}`));

        // Execute command and stream output
        const child = exec(testCommand, { cwd: projectPath });

        child.stdout.on('data', (data) => process.stdout.write(data));
        child.stderr.on('data', (data) => process.stderr.write(data));

        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green('\n✅ Tests Passed!'));
            } else {
                console.log(chalk.red(`\n❌ Tests Failed (Exit Code: ${code})`));
            }
        });
    }
}

async function runTestGenerator(action, target, options) {
    const generator = new TestGenerator();
    await generator.run(action, target, options);
}

module.exports = { runTestGenerator };
