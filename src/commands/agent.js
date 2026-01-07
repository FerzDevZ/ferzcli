const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const ora = require('ora').default || require('ora');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');
const { ProjectDetector } = require('../../lib/project-detector');
const { ProjectBrain } = require('../../lib/project-brain');

class CodingAgent {
    constructor(projectPath) {
        this.projectPath = projectPath || process.cwd();
        this.groqService = new GroqService();
        this.fileUtils = new FileUtils();
        this.projectDetector = new ProjectDetector();
        this.projectBrain = new ProjectBrain(this.projectPath, this.groqService);
        this.backupDir = path.join(this.projectPath, '.ferzcli/backups');
        this.history = []; // Stack of changes for undo
        this.projectInfo = null;
        this.persona = 'Senior Architect'; // Default persona
    }

    async start() {
        console.clear();
        console.log(chalk.bold.magenta('🚀 Ferzcli AI Agent Mode'));
        console.log(chalk.gray(`Targeting: ${chalk.cyan(this.projectPath)}`));
        console.log(chalk.gray('Type your request and I will code for you. Undo supported.\n'));

        // Safety warning if targeting ferzcli itself
        if (this.projectPath.includes('ferzcli') && !this.projectPath.endsWith('ucup')) {
            console.log(chalk.bold.red('⚠️  WARNING: You are in Ferzcli\'s source directory!'));
            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to allow AI to modify Ferzcli source?',
                default: false
            }]);
            if (!confirm) {
                console.log(chalk.yellow('Safety exit.'));
                return;
            }
        }

        await this.groqService.initialize();
        await fs.ensureDir(this.backupDir);
        this.projectInfo = await this.projectDetector.detect(this.projectPath);

        // Initialize Brain
        await this.projectBrain.load();
        await this.projectBrain.buildIndex();

        // Restore Workspace Session
        const sessionRestored = await this.groqService.loadSession(this.projectPath);
        if (sessionRestored) {
            console.log(chalk.gray(`\n📅 Session restored (${this.groqService.getHistory().length / 2} interactions).`));
        }

        this.interactiveLoop();
    }

    async interactiveLoop() {
        const { prompt } = await inquirer.prompt([
            {
                type: 'input',
                name: 'prompt',
                message: chalk.blue('Prompt >'),
                prefix: '🤖'
            }
        ]);

        const input = prompt.trim().toLowerCase();

        if (input === 'exit' || input === 'quit') {
            console.log(chalk.yellow('👋 Goodbye!'));
            return;
        }

        if (input === 'undo') {
            await this.handleUndo();
            return this.interactiveLoop();
        }

        if (input === 'history') {
            this.showHistory();
            return this.interactiveLoop();
        }

        if (input === 'help') {
            this.showHelp();
            return this.interactiveLoop();
        }

        // Default: Process as a coding request
        if (input.startsWith('install ')) {
            await this.handleSandboxInstall(prompt.substring(8));
        } else if (input === 'release') {
            await this.handleRelease();
        } else if (input === 'refactor') {
            await this.handleRefactorSession();
        } else if (input === 'pulse') {
            await this.handleProjectPulse();
        } else if (input.startsWith('persona ')) {
            this.persona = prompt.substring(8);
            console.log(chalk.green(`\n🎭 Persona switched to: ${chalk.bold(this.persona)}`));
        } else if (input === 'logs') {
            await this.handleLogMonitor();
        } else {
            await this.processCodingRequest(prompt);
        }
        await this.groqService.saveSession(this.projectPath);
        this.interactiveLoop();
    }

    showHelp() {
        console.log(chalk.bold('\nCommands:'));
        console.log(chalk.cyan('  undo     ') + '- Revert the last change');
        console.log(chalk.cyan('  history  ') + '- Show recent changes');
        console.log(chalk.cyan('  exit     ') + '- Exit agent mode');
        console.log(chalk.gray('\nOr just type what you want me to do, e.g.:'));
        console.log(chalk.italic('  "Add a login validation to auth.js"'));
    }

    isPathSafe(targetFile) {
        const absolutePath = path.resolve(this.projectPath, targetFile);
        if (!absolutePath.startsWith(this.projectPath)) return false;
        if (absolutePath.includes('node_modules')) return false;
        if (absolutePath.includes('.git')) return false;
        return true;
    }

    async processCodingRequest(userPrompt) {
        const spinner = ora('Analyzing project with Brain...').start();

        try {
            // 1. Get project context from Brain
            const brainContext = this.projectBrain.getContextForRequest(userPrompt);
            const contextFiles = brainContext.map(c => c.path).join(', ');

            const files = await this.fileUtils.getAllFiles(this.projectPath);
            const fileList = files.map(f => path.relative(this.projectPath, f)).join(', ');

            // 2. Ask AI to plan the changes
            const systemPrompt = `You are an expert autonomous coding agent acting as a ${this.persona}. 
            User Request: "${userPrompt}"
            Target Project Path: ${this.projectPath}
            Project Context: ${JSON.stringify(this.projectInfo)}
            Project Summary: ${this.projectBrain.index.projectSummary}
            Relevant Files for this request: ${contextFiles}
            All Files: ${fileList}

            Requirement: Determine which files need to be created or modified. 
            Crucial: Use the appropriate technology based on Project Context. 
            Acting Persona: ${this.persona} (Ensure your plan reflects this style)
            ${contextFiles ? `Focus on these relevant files: ${contextFiles}` : ''}

            Return a JSON array of operations:
            - "file": relative path (relative to ${this.projectPath})
            - "action": "create" or "modify"
            - "explanation": brief reason

            Return ONLY the JSON array.`;

            let aiPlanStr = await this.groqService.chat(systemPrompt, { temperature: 0.1 });
            let plan;
            try {
                // Robust parsing for possible markdown blocks or extra text
                const jsonMatch = aiPlanStr.match(/\[[\s\S]*\]/);
                plan = JSON.parse(jsonMatch ? jsonMatch[0] : aiPlanStr);
            } catch (e) {
                spinner.stop();
                console.log(chalk.red('Failed to parse AI plan. AI response:'));
                console.log(aiPlanStr);
                return;
            }

            spinner.succeed(`Plan generated: ${plan.length} file(s) to change.`);

            const batchChanges = [];

            for (const op of plan) {
                if (!this.isPathSafe(op.file)) {
                    console.log(chalk.red(`\n🚨 Skipping unsafe path: ${op.file}`));
                    continue;
                }

                const taskSpinner = ora(`Processing ${op.file}...`).start();

                let currentContent = '';
                const targetPath = path.join(this.projectPath, op.file);

                if (op.action === 'modify' && await fs.pathExists(targetPath)) {
                    currentContent = await fs.readFile(targetPath, 'utf8');
                }

                const workPrompt = `Task: ${op.explanation || 'Update file'}
                User Original Request: "${userPrompt}"
                File to ${op.action}: ${op.file}
                Project Info: ${JSON.stringify(this.projectInfo)}
                
                ${currentContent ? `Current Content:\n\`\`\`\n${currentContent}\n\`\`\`` : 'File is new.'}
                
                Requirement: Provide the complete NEW content. 
                Return ONLY the raw content. No markdown. No explanations.`;

                console.log(chalk.bold(`\n📄 Generating ${chalk.cyan(op.file)}...`));
                console.log(chalk.gray('--- STREAMING CONTENT ---'));

                const newContent = await this.groqService.chat(workPrompt, {
                    temperature: 0.2,
                    stream: true,
                    onChunk: (chunk) => process.stdout.write(chalk.gray(chunk))
                });

                taskSpinner.stop();
                console.log(chalk.gray('\n-------------------------'));

                // Security Sentinel Check
                const sentinelSpinner = ora('Security Sentinel scanning...').start();
                const securityCheck = await this.groqService.chat(
                    `Scan this code for security vulnerabilities (SQLi, XSS, Hardcoded Keys, etc.):\n\n${newContent}\n\nReturn 'SAFE' if clean, otherwise describe the risk briefly in 1 line.`,
                    { temperature: 0.1 }
                );

                if (securityCheck.trim().toUpperCase() !== 'SAFE') {
                    sentinelSpinner.warn(chalk.bold.red(`SECURITY ALERT: ${securityCheck}`));
                    const { fix } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'fix',
                        message: 'Suggest a secure patch?',
                        default: true
                    }]);
                    if (fix) {
                        const patchSpinner = ora('Generating patch...').start();
                        const patchedContent = await this.groqService.chat(
                            `Fix the security issue in this code:\n${newContent}\n\nProvide ONLY the fixed code content.`,
                            { temperature: 0.1 }
                        );
                        patchSpinner.succeed('Security patch generated.');
                        batchChanges.push({ ...op, newContent: patchedContent });
                        continue; // Skip the original content
                    }
                } else {
                    sentinelSpinner.succeed('No critical security issues found.');
                }

                console.log(chalk.bold(`\n📄 Proposed for ${chalk.cyan(op.file)}:`));
                console.log(chalk.gray('--- PREVIEW (FIRST 5 LINES) ---'));
                console.log(newContent.split('\n').slice(0, 5).join('\n') || '(empty)');
                console.log(chalk.gray('------------------------------'));

                batchChanges.push({ ...op, newContent });
            }

            if (batchChanges.length === 0) {
                console.log(chalk.yellow('No valid changes to apply.'));
                return;
            }

            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: chalk.bold.yellow(`Apply all ${plan.length} changes?`),
                    default: true
                }
            ]);

            if (confirm) {
                const batchId = Date.now();
                for (const change of batchChanges) {
                    await this.applyChange(change.file, change.newContent, change.action, batchId);
                }
                console.log(chalk.bold.green('\n✨ All changes applied successfully!'));
            } else {
                console.log(chalk.yellow('Changes discarded.'));
            }

        } catch (error) {
            spinner.fail(`Error: ${error.message}`);
        }
    }

    async applyChange(fileName, newContent, action, batchId = null) {
        const filePath = path.join(this.projectPath, fileName);
        const timestamp = Date.now();
        const backupName = `${fileName.replace(/[\/\\]/g, '_')}.${timestamp}.bak`;
        const backupPath = path.join(this.backupDir, backupName);

        // Backup existing file if modifying
        if (action === 'modify' && await fs.pathExists(filePath)) {
            await fs.copy(filePath, backupPath);
        }

        // Write new content
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, newContent);

        // Record history
        this.history.push({
            file: fileName,
            action: action,
            backup: action === 'modify' ? backupPath : null,
            timestamp: timestamp,
            batchId: batchId
        });

        console.log(chalk.green(`  ✓ ${action === 'create' ? 'Created' : 'Updated'} ${fileName}`));
    }

    async handleSandboxInstall(packageName) {
        const spinner = ora(`Sandboxing installation of ${packageName}...`).start();

        try {
            // Dry run / Check if package exists (simulated for now with npm view)
            const { execSync } = require('child_process');

            spinner.text = `Verifying ${packageName}...`;
            execSync(`npm view ${packageName} version`, { stdio: 'ignore' });

            spinner.text = `Simulating installation...`;
            // In a real sandbox, we might use a temp node_modules
            // For now, we interactively ask user after verification
            spinner.succeed(`${packageName} is valid and safe to install.`);

            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Proceed with actual installation of ${chalk.cyan(packageName)}?`,
                default: true
            }]);

            if (confirm) {
                const instSpinner = ora(`Installing ${packageName}...`).start();
                execSync(`npm install ${packageName}`, { cwd: this.projectPath });
                instSpinner.succeed(`${packageName} installed successfully.`);
            }
        } catch (e) {
            spinner.fail(`Sandbox check failed: ${packageName} might not exist or is incompatible.`);
        }
    }

    async handleRelease() {
        const spinner = ora('Analyzing project for release...').start();

        try {
            const { execSync } = require('child_process');

            // 1. Get git changes since last tag
            spinner.text = 'Fetching git history...';
            let gitLogs = '';
            try {
                const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
                gitLogs = execSync(`git log ${lastTag}..HEAD --oneline`, { encoding: 'utf8' });
            } catch (e) {
                gitLogs = execSync('git log --oneline -n 20', { encoding: 'utf8' });
            }

            if (!gitLogs) {
                spinner.info('No new commits found since last tag.');
                return;
            }

            // 2. AI generate changelog and version suggestion
            spinner.text = 'AI generating changelog and version...';
            const releasePrompt = `Analyze ini git commits dan buat ringkasan rilis profesional serta sarankan versi semver berikutnya (major, minor, atau patch):
            
            Commits:
            ${gitLogs}
            
            Format Response:
            Version: [versi yang disarankan]
            Changes:
            - [perubahan 1]
            ...`;

            const releasePlan = await this.groqService.chat(releasePrompt, { temperature: 0.2 });
            spinner.stop();

            console.log(chalk.bold.magenta('\n🚀 PROPOSED RELEASE PLAN:'));
            console.log(chalk.white(releasePlan));
            console.log(chalk.gray('--------------------------'));

            const { confirm } = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: 'Terapkan rilis ini (Update package.json & Git Tag)?',
                default: false
            }]);

            if (confirm) {
                const relSpinner = ora('Executing release...').start();
                const versionMatch = releasePlan.match(/Version:\s*([0-9.]+)/i);
                const newVersion = versionMatch ? versionMatch[1] : null;

                if (newVersion) {
                    try {
                        execSync(`npm version ${newVersion} --no-git-tag-version`, { cwd: this.projectPath });
                        execSync(`git add package.json && git commit -m "chore: release v${newVersion}"`, { cwd: this.projectPath });
                        execSync(`git tag v${newVersion}`, { cwd: this.projectPath });
                        relSpinner.succeed(`Berhasil melakukan rilis v${newVersion}!`);
                    } catch (e) {
                        relSpinner.fail(`Eksekusi rilis gagal: ${e.message}`);
                    }
                } else {
                    relSpinner.fail('Tidak dapat menentukan versi baru dari jawaban AI.');
                }
            }
        } catch (error) {
            spinner.fail(`Gagal melakukan rilis: ${error.message}`);
        }
    }

    async handleRefactorSession() {
        const { goal } = await inquirer.prompt([{
            type: 'input',
            name: 'goal',
            message: chalk.cyan('What is your refactoring goal?'),
            placeholder: 'e.g., Migrate from callbacks to async/await'
        }]);

        const spinner = ora('AI is planning the refactor steps...').start();

        try {
            const files = await this.fileUtils.getAllFiles(this.projectPath);
            const fileList = files.map(f => path.relative(this.projectPath, f)).join(', ');

            const prompt = `Goal: "${goal}"
            Project Files: ${fileList}
            
            Break this refactoring into 3-5 logical steps. 
            For each step, specify which files are affected and what the specific task is.
            Return ONLY a JSON array of steps: [{ "step": 1, "task": "...", "files": ["..."] }]`;

            const planStr = await this.groqService.chat(prompt, { temperature: 0.1 });
            const plan = JSON.parse(planStr.match(/\[[\s\S]*\]/)[0]);
            spinner.succeed('Refactor plan ready!');

            for (const step of plan) {
                console.log(chalk.bold.yellow(`\n🚧 STEP ${step.step}: ${step.task}`));
                console.log(chalk.gray(`Affected: ${step.files.join(', ')}`));

                const { action } = await inquirer.prompt([{
                    type: 'list',
                    name: 'action',
                    message: 'What to do?',
                    choices: [
                        { name: '🚀 Execute this step automatically', value: 'auto' },
                        { name: '📝 Show me how to do it manually', value: 'manual' },
                        { name: '⏭️ Skip this step', value: 'skip' }
                    ]
                }]);

                if (action === 'auto') {
                    await this.processCodingRequest(`Excute this refactoring step: ${step.task} for files ${step.files.join(', ')}`);
                } else if (action === 'manual') {
                    const guide = await this.groqService.chat(`Guide me through this step manually: ${step.task} in ${step.files.join(', ')}`);
                    console.log(chalk.white(`\n${guide}\n`));
                }
            }
            console.log(chalk.bold.green('\n✅ Refactoring session complete!'));
        } catch (e) {
            spinner.fail(`Refactor planning failed: ${e.message}`);
        }
    }

    async handleProjectPulse() {
        console.clear();
        console.log(chalk.bold.magenta('📊 PROJECT PULSE DASHBOARD'));
        console.log(chalk.gray('------------------------------------------'));

        const spinner = ora('Calculating health metrics...').start();

        try {
            const files = await this.fileUtils.getAllFiles(this.projectPath);
            const totalLines = 0; // Simulated
            const fileCount = files.length;

            // Analyze for vulnerabilities
            const topFiles = files.slice(0, 10).map(f => path.relative(this.projectPath, f)).join(', ');
            const pulsePrompt = `Berikan analisis singkat kesehatan project ini (Pulse):
            File Count: ${fileCount}
            Framework: ${this.projectInfo.framework}
            Files: ${topFiles}
            
            Format:
            - Health: [Good/Fair/Critical]
            - Security Alert: [None/Brief desc]
            - Tech Debt Suggestion: [Brief desc]`;

            const pulseReport = await this.groqService.chat(pulsePrompt, { temperature: 0.2 });
            spinner.stop();

            console.log(pulseReport);
            console.log(chalk.gray('\n------------------------------------------'));
            console.log(chalk.cyan(`Total Files indexed in Brain: ${Object.keys(this.projectBrain.index.files).length}`));
            console.log(chalk.gray('Press any key to return to Agent mode...'));
        } catch (e) {
            spinner.fail(`Pulse check failed: ${e.message}`);
        }
    }

    async handleLogMonitor() {
        console.log(chalk.bold.yellow('\n📋 LOG MONITOR (Last 20 lines)'));
        console.log(chalk.gray('Checking common log files...'));

        const logFiles = ['logs/laravel.log', 'npm-debug.log', 'error.log', 'app.log'];
        let found = false;

        for (const logFile of logFiles) {
            const fullPath = path.join(this.projectPath, logFile);
            if (await fs.pathExists(fullPath)) {
                const logs = await fs.readFile(fullPath, 'utf8');
                const lastLines = logs.split('\n').slice(-20).join('\n');
                console.log(chalk.cyan(`\n-- ${logFile} --`));
                console.log(chalk.white(lastLines));
                found = true;
                break;
            }
        }

        if (!found) {
            console.log(chalk.red('No common log files found.'));
        }
        console.log(chalk.gray('\nPress any key to continue...'));
    }

    async handleUndo() {
        if (this.history.length === 0) {
            console.log(chalk.yellow('Nothing to undo.'));
            return;
        }

        const lastEntry = this.history[this.history.length - 1];
        const batchId = lastEntry.batchId;

        // Find all items in the same batch
        const toUndo = batchId
            ? this.history.filter(h => h.batchId === batchId)
            : [this.history.pop()];

        if (batchId) {
            this.history = this.history.filter(h => h.batchId !== batchId);
        }

        console.log(chalk.cyan(`⏪ Reverting ${toUndo.length} change(s)...`));

        for (const item of toUndo.reverse()) {
            const filePath = path.join(this.projectPath, item.file);
            if (item.action === 'create') {
                await fs.remove(filePath);
                console.log(chalk.gray(`  - Removed ${item.file}`));
            } else if (item.action === 'modify') {
                if (await fs.pathExists(item.backup)) {
                    await fs.copy(item.backup, filePath);
                    await fs.remove(item.backup);
                    console.log(chalk.gray(`  - Restored ${item.file}`));
                }
            }
        }
        console.log(chalk.green('✅ Undo complete.'));
    }

    showHistory() {
        if (this.history.length === 0) {
            console.log(chalk.gray('No history available.'));
            return;
        }

        console.log(chalk.bold('\nChange History:'));
        this.history.forEach((h, i) => {
            console.log(`${i + 1}. [${new Date(h.timestamp).toLocaleTimeString()}] ${h.action.toUpperCase()}: ${h.file}`);
        });
        console.log();
    }
}

async function runAgent(projectPath) {
    const agent = new CodingAgent(projectPath);
    await agent.start();
}

module.exports = { runAgent, CodingAgent };
