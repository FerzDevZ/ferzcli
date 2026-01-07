
const { exec } = require('child_process');
const path = require('path');
const chalk = require('chalk').default || require('chalk');

const commands = [
    'init',
    'chat',
    'analyze',
    'laravel',
    'git --help',
    'test --help',
    'api --help',
    'explain --help',
    'ui --help',
    'debug --help',
    'enhance',
    'test',
    'autocomplete',
    'plan',
    'auto',
];

const cliPath = path.join(__dirname, '../src/index.js');

async function runCommand(cmd) {
    return new Promise((resolve) => {
        exec(`node ${cliPath} ${cmd} --help`, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, cmd, error: stderr || error.message });
            } else {
                resolve({ success: true, cmd });
            }
        });
    });
}

async function verify() {
    console.log(chalk.bold('🚀 Verifying Ferzcli Commands (Smoke Test)...\n'));

    let failures = 0;

    for (const cmd of commands) {
        process.stdout.write(`Checking 'ferzcli ${cmd}'... `);
        const result = await runCommand(cmd);

        if (result.success) {
            console.log(chalk.green('✅ OK'));
        } else {
            console.log(chalk.red('❌ FAILED'));
            console.log(chalk.gray(`  Error: ${result.error.split('\n')[0]}`)); // Show first line of error
            failures++;
        }
    }

    console.log('\nResult:');
    if (failures === 0) {
        console.log(chalk.green(`✅ All ${commands.length} commands passed smoke test.`));
        process.exit(0);
    } else {
        console.log(chalk.red(`❌ ${failures} commands failed.`));
        process.exit(1);
    }
}

verify();
