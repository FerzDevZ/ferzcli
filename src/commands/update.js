const chalk = require('chalk').default || require('chalk');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const pkg = require('../../package.json');

async function update() {
    console.log(chalk.bold.blue('\n🆙 Checking for Ferzcli updates...'));
    console.log(chalk.gray(`Current version: v${pkg.version}`));

    try {
        // Check latest version on NPM
        const { stdout: latest } = await execAsync('npm show ferzcli version');
        const latestVersion = latest.trim();

        if (latestVersion === pkg.version) {
            console.log(chalk.green('✅ You are already using the latest version!'));
        } else {
            console.log(chalk.yellow(`🆕 A new version is available: v${latestVersion}`));
            console.log(chalk.gray('\nRun the following command to update:'));
            console.log(chalk.cyan(`   npm install -g ferzcli`));

            // Note: We don't auto-run the global install because it might need sudo
            // and we want to be safe.
        }
    } catch (e) {
        console.log(chalk.red('\n❌ Could not check for updates.'));
        console.log(chalk.gray('Maybe the package is not yet published to NPM.'));
    }
}

module.exports = { update };
