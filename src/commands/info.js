const chalk = require('chalk').default || require('chalk');
const pkg = require('../../package.json');
const { ConfigManager } = require('../../lib/config-manager');
const { ProjectDetector } = require('../../lib/project-detector');

async function info() {
    const configManager = new ConfigManager();
    const projectDetector = new ProjectDetector();
    const detection = await projectDetector.detect(process.cwd());

    console.log(chalk.bold.blue('\nℹ️  Ferzcli Information'));
    console.log(chalk.gray('----------------------------------------'));
    console.log(chalk.cyan('Version:      ') + `v${pkg.version}`);
    console.log(chalk.cyan('Author:       ') + (pkg.author || 'Ferdinand'));
    console.log(chalk.cyan('License:      ') + (pkg.license || 'MIT'));

    console.log(chalk.bold.white('\n🔧 Configuration:'));
    const isInit = await configManager.isInitialized();
    console.log(chalk.cyan('Initialized:  ') + (isInit ? chalk.green('Yes') : chalk.red('No')));
    console.log(chalk.cyan('Default Model:') + ` ${configManager.getDefaultModel()}`);
    console.log(chalk.cyan('Language:    ') + ` ${configManager.getDefaultLanguage()}`);

    console.log(chalk.bold.white('\n🏗️  Current Project:'));
    console.log(chalk.cyan('Name:        ') + ` ${detection.name}`);
    console.log(chalk.cyan('Type:        ') + ` ${detection.type}`);
    console.log(chalk.cyan('Framework:   ') + ` ${detection.framework}`);
    console.log(chalk.cyan('Language:    ') + ` ${detection.language}`);
    console.log(chalk.cyan('Package Mgr: ') + ` ${detection.packageManager}`);

    console.log(chalk.gray('----------------------------------------\n'));
}

module.exports = { info };
