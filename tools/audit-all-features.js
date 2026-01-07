
const assert = require('assert');
const path = require('path');
const {
    SuperAgent,
    CursorAgent,
    InteractiveAgent,
    AutoCodeRepair,
    IntelligentPlanner,
    ConfigManager
} = require('../src/index.js');
const {
    analyzeLaravelProject,
    debugLaravelProject
} = require('../src/commands/laravel.js');
const chalk = require('chalk').default || require('chalk');

console.log(chalk.bold('🔍 Starting TOTAL FEATURE AUDIT...\n'));

let passed = 0;
let failed = 0;

// Mock Infrastructure
const mockConfigManager = {
    getApiKey: () => 'test_key',
    get: (key) => 'value',
    set: (key, value) => { }
};

const mockGroqService = {
    generateCode: async () => "Mock Code",
    chat: async () => 'Mock Response',
    analyzeCode: async () => ({ issues: [], score: 85 }),
    generatePlan: async () => ({ phases: [] }),
    initialize: async () => { }
};

// Mock File Utils to simulate Laravel project structure
const mockFileUtils = {
    getAllFiles: async () => ['app/Models/User.php', 'routes/web.php'],
    readFile: async () => '<?php echo "content";',
    analyzeProjectStructure: async () => ({
        summary: { totalFiles: 5, totalLines: 100 },
        files: []
    }),
    readDirectory: async () => [{ relativePath: 'file.php', content: '<?php' }],
    getDirectories: async () => ['app', 'config']
};

async function test(name, fn) {
    try {
        process.stdout.write(`Testing ${name}... `);
        await fn();
        console.log(chalk.green('PASS'));
        passed++;
    } catch (e) {
        console.log(chalk.red('FAIL'));
        console.error(chalk.red(`  Error: ${e.message}`));
        if (e.message.includes('not a function')) {
            console.error(chalk.yellow('  💡 Hint: Method might be missing or not exported properly.'));
        }
        failed++;
    }
}

async function runAudit() {
    process.env.GROQ_API_KEY = 'test_key';

    // ==========================================
    // 1. Audit: Laravel Specialist
    // ==========================================
    console.log(chalk.cyan('\n📦 Feature: Laravel Specialist'));

    await test('LaravelSpecialist: Analysis Function', async () => {
        // We test analyzeLaravelProject directly
        // It requires many args: projectPath, options, fileUtils, groqService, outputLang
        await analyzeLaravelProject(
            process.cwd(),
            { depth: 1 },
            mockFileUtils,
            mockGroqService,
            'en'
        );
        assert.ok(true, 'Analysis ran without throwing');
    });

    await test('LaravelSpecialist: Debug Function', async () => {
        await debugLaravelProject(
            process.cwd(),
            {},
            mockFileUtils,
            mockGroqService,
            'en'
        );
        assert.ok(true, 'Debug ran without throwing');
    });

    // ==========================================
    // 2. Audit: Code Analysis (CursorAgent)
    // ==========================================
    console.log(chalk.cyan('\n🔍 Feature: Code Analysis (CursorAgent)'));

    await test('CursorAgent: Instantiation & Mocking', async () => {
        const agent = new CursorAgent(process.cwd());
        agent.groqService = mockGroqService; // Inject mock
        agent.fileUtils = mockFileUtils; // Inject mock
        assert.ok(agent, 'Should instantiate');
    });

    await test('CursorAgent: Project Structure Analysis', async () => {
        const agent = new CursorAgent(process.cwd());
        agent.fileUtils = mockFileUtils;

        const structure = await agent.analyzeProjectStructure();
        assert.ok(structure.summary, 'Should have summary');
    });

    await test('CursorAgent: Critical Issue Detection', async () => {
        const agent = new CursorAgent(process.cwd(), mockConfigManager);
        agent.groqService = mockGroqService;
        agent.fileUtils = mockFileUtils;

        const report = await agent.detectCriticalIssues();
        assert.ok(Array.isArray(report), 'Should return array of issues');
    });

    // ==========================================
    // 3. Audit: Interactive Agent (Auto Debug)
    // ==========================================
    console.log(chalk.cyan('\n💬 Feature: Interactive Agent (Auto Debug)'));

    await test('InteractiveAgent: Instantiation', async () => {
        const agent = new InteractiveAgent(process.cwd());
        assert.ok(agent, 'Should instantiate');
    });

    // ==========================================
    // 4. Audit: Auto Code Repair (Enhance)
    // ==========================================
    console.log(chalk.cyan('\n🔧 Feature: Auto Code Repair'));

    await test('AutoCodeRepair: Instantiation', async () => {
        const agent = new AutoCodeRepair(process.cwd());
        assert.ok(agent, 'Should instantiate');
    });

    await test('AutoCodeRepair: Scan and Fix', async () => {
        const agent = new AutoCodeRepair(process.cwd());
        agent.groqService = mockGroqService;
        agent.fileUtils = mockFileUtils;
        agent.runCommand = async () => ''; // Mock command execution (backup)

        // Mock fixSyntaxErrors which might be called
        agent.fixSyntaxErrors = async () => ({ fixed: true, syntaxErrors: 0 });

        // Temporarily override scanAndFix if it does complex stuff, or just run it with mock
        // Assuming scanAndFix uses analyzeCode from groqService which is mocked
        const result = await agent.scanAndFix('dummy.js');
        assert.ok(result, 'Should return result');
    });

    // ==========================================
    // 5. Audit: Intelligent Planner (Plan)
    // ==========================================
    console.log(chalk.cyan('\n📋 Feature: Intelligent Planner'));

    await test('IntelligentPlanner: Instantiation', async () => {
        const planner = new IntelligentPlanner(process.cwd());
        assert.ok(planner, 'Should instantiate');
    });

    await test('IntelligentPlanner: Development Plan', async () => {
        const planner = new IntelligentPlanner(process.cwd());
        planner.groqService = mockGroqService;

        // Mock AI returning JSON for set of methods
        mockGroqService.chat = async () => JSON.stringify({
            phases: [],
            estimatedTimeline: '2 weeks'
        });

        const plan = await planner.generateDevelopmentPlan('Build a todo app');
        assert.ok(plan, 'Should return a plan');
    });

    console.log(`\nAudit Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runAudit();
