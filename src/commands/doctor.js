const chalk = require('chalk').default || require('chalk');
const { execSync } = require('child_process');
const { ConfigManager } = require('../../lib/config-manager');
const { GroqService } = require('../../lib/groq-service');
const os = require('os');
const dns = require('dns').promises;

async function doctor() {
    console.log(chalk.bold.blue('\n👨‍⚕️ Ferzcli Doctor - Checking System Health...\n'));

    let issues = 0;
    const configManager = new ConfigManager();
    const groqService = new GroqService();

    // 1. Check Node.js Version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    if (majorVersion < 18) {
        console.log(chalk.red(`❌ Node.js version: ${nodeVersion} (Recommended: >= 18.x)`));
        issues++;
    } else {
        console.log(chalk.green(`✅ Node.js version: ${nodeVersion}`));
    }

    // 2. Check Git
    try {
        const gitVersion = execSync('git --version').toString().trim();
        console.log(chalk.green(`✅ Git installed: ${gitVersion}`));
    } catch (e) {
        console.log(chalk.yellow('⚠️  Git not found in PATH. Some features (Smart Commit) will be disabled.'));
        issues++;
    }

    // 3. Check Configuration initialization
    const isInitialized = await configManager.isInitialized();
    if (!isInitialized) {
        console.log(chalk.red('❌ Ferzcli not initialized. Run "ferzcli init" first.'));
        issues++;
    } else {
        console.log(chalk.green('✅ Configuration initialized'));
    }

    // 4. Check Internet & API Connection
    try {
        await dns.lookup('api.groq.com');
        console.log(chalk.green('✅ Internet connection to Groq API OK'));

        if (isInitialized) {
            process.stdout.write(chalk.gray('   Testing API Key authentication... '));
            try {
                await groqService.initialize();
                await groqService.chat('Test', { maxTokens: 1 });
                console.log(chalk.green('OK'));
            } catch (e) {
                console.log(chalk.red('FAILED'));
                console.log(chalk.red(`   Error: ${e.message}`));
                issues++;
            }
        }
    } catch (e) {
        console.log(chalk.red('❌ Could not connect to Groq API. Please check your internet.'));
        issues++;
    }

    // 5. System Info
    console.log(chalk.gray(`\nSystem Info:`));
    console.log(chalk.gray(`- OS: ${process.platform} (${os.release()})`));
    console.log(chalk.gray(`- Arch: ${process.arch}`));
    console.log(chalk.gray(`- Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`));

    if (issues === 0) {
        console.log(chalk.bold.green('\n✨ Everything looks great! Ferzcli is ready for production. 🚀'));
    } else {
        console.log(chalk.bold.yellow(`\n⚠️  Found ${issues} issue(s). Please fix them for the best experience.`));
    }
}

module.exports = { doctor };
