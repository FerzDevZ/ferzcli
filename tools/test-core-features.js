
const assert = require('assert');
const path = require('path');
const { SuperAgent } = require('../src/index.js'); // Now exported
const { ConfigManager } = require('../lib/config-manager');
const chalk = require('chalk').default || require('chalk');

console.log(chalk.bold('🧪 Running Ferzcli Core Feature Tests...\n'));

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        process.stdout.write(`Testing ${name}... `);
        fn(); // execute test
        // assert wrapper usually throws, if verifying async code we need await.
        // For simplicity, we'll keep it sync or handle promise if needed.
        // But SuperAgent methods are async.
        console.log(chalk.green('PASS'));
        passed++;
    } catch (e) {
        console.log(chalk.red('FAIL'));
        console.error(chalk.red(`  Error: ${e.message}`));
        // console.error(e.stack);
        failed++;
    }
}

async function runTests() {
    process.env.GROQ_API_KEY = 'test_key'; // Mock env

    // 1. ConfigManager Tests
    test('ConfigManager: Initialization', () => {
        const config = new ConfigManager();
        assert.ok(config, 'ConfigManager should initialize');
    });

    // 2. SuperAgent Plan Routing Tests
    // We need to verify that SuperAgent routes requests correctly
    // Since methods call GroqService, we must mock it.

    const mockGroqService = {
        generateCode: async () => "Mock Code",
        chat: async () => '["mock_file.txt"]' // Mock JSON response for universal plan
    };

    const agent = new SuperAgent(process.cwd(), 'Unknown');
    agent.groqService = mockGroqService; // Inject mock
    agent.configManager = { getApiKey: () => 'test_key' }; // Inject mock config

    // Test A: Generic Web Request
    await (async () => {
        try {
            process.stdout.write('Testing SuperAgent: Generic Web Routing... ');
            const request = {
                intent: 'custom_feature',
                description: 'create a html css website',
                needsLaravelSetup: false
            };
            const currentState = {};

            const plan = await agent.createComprehensivePlan(request, currentState);

            // Check if it has web specific tasks
            const hasIndexHtml = plan.phases.some(p => p.tasks.some(t => t.name.includes('index.html')));
            assert.ok(hasIndexHtml, 'Should generate generic web plan for HTML request');
            console.log(chalk.green('PASS'));
            passed++;
        } catch (e) {
            console.log(chalk.red('FAIL'));
            console.error(e.message);
            failed++;
        }
    })();

    // Test B: Universal Fallback
    await (async () => {
        try {
            process.stdout.write('Testing SuperAgent: Universal Fallback Routing... ');
            const request = {
                intent: 'custom_feature',
                description: 'create a python script for data analysis',
                needsLaravelSetup: false
            };
            const currentState = {};

            const plan = await agent.createComprehensivePlan(request, currentState);

            // Check if it called universal plan (which calls chat mock returning mock_file.txt)
            const hasMockFile = plan.phases.some(p => p.tasks.some(t => t.name.includes('mock_file.txt')));
            assert.ok(hasMockFile, 'Should generate universal plan for Python request');
            console.log(chalk.green('PASS'));
            passed++;
        } catch (e) {
            console.log(chalk.red('FAIL'));
            console.error(e.message);
            failed++;
        }
    })();

    // Test C: System Doctor
    await (async () => {
        try {
            process.stdout.write('Testing SuperAgent: System Doctor... ');
            // We can't easily assert console output here without spying, 
            // but we can ensure it doesn't throw.
            await agent.checkEnvironment();
            console.log(chalk.green('PASS'));
            passed++;
        } catch (e) {
            console.log(chalk.red('FAIL'));
            console.error(e.message);
            failed++;
        }
    })();

    // 3. Logic Hardening Checks (Mocking invalid inputs)
    // Test D: Null Request Handling
    await (async () => {
        try {
            process.stdout.write('Testing SuperAgent: Null Request Resilience... ');
            const request = { description: null };
            // This might crash if code doesn't check for null description
            // createComprehensivePlan accesses request.description.toLowerCase()

            try {
                await agent.createComprehensivePlan(request, {});
                // If it doesn't throw, check result
            } catch (e) {
                // Determine if it's a "good" error or a crash 
                // Currently it will likely throw "Cannot read property of null"
                // We WANT to fix this if it fails.
                throw e;
            }
            console.log(chalk.green('PASS'));
            passed++;
        } catch (e) {
            console.log(chalk.red('FAIL (Expected for now, signals hardening needed)'));
            // console.error(e.message); // Commented to keep output clean
            failed++;
        }
    })();

    // Test E: Absolute Null Object Crash
    await (async () => {
        try {
            process.stdout.write('Testing SuperAgent: Absolute Null Object Crash... ');
            try {
                await agent.createComprehensivePlan(null, {});
            } catch (e) {
                // If it crashes with TypeError, that's what we want to prevent
                if (e instanceof TypeError) throw e;
            }
            console.log(chalk.green('PASS'));
            passed++;
        } catch (e) {
            console.log(chalk.red('FAIL (Crash confirmed)'));
            process.stdout.write(chalk.gray(`    Reason: ${e.message}\n`));
            failed++;
        }
    })();

    console.log(`\nTest Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
