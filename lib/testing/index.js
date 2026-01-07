const { execSync, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class TestingFramework {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            framework: config.framework || this.detectFramework(),
            coverage: config.coverage !== false,
            parallel: config.parallel || false,
            watch: config.watch || false,
            ...config
        };
    }

    async setupTesting() {
        console.log('🧪 Setting up testing framework...');

        const framework = this.config.framework;
        
        switch (framework) {
            case 'jest':
                return await this.setupJest();
            case 'phpunit':
                return await this.setupPHPUnit();
            case 'pytest':
                return await this.setupPyTest();
            case 'cypress':
                return await this.setupCypress();
            case 'playwright':
                return await this.setupPlaywright();
            default:
                throw new Error(`Unsupported testing framework: ${framework}`);
        }
    }

    async setupJest() {
        console.log('📦 Setting up Jest for JavaScript/TypeScript...');

        // Install Jest
        execSync('npm install --save-dev jest @types/jest ts-jest', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create Jest configuration
        const jestConfig = {
            preset: 'ts-jest',
            testEnvironment: 'node',
            roots: ['<rootDir>/src', '<rootDir>/tests'],
            testMatch: [
                '**/__tests__/**/*.+(ts|tsx|js)',
                '**/*.(test|spec).+(ts|tsx|js)'
            ],
            transform: {
                '^.+\\.(ts|tsx)$': 'ts-jest'
            },
            collectCoverageFrom: [
                'src/**/*.{ts,tsx,js,jsx}',
                '!src/**/*.d.ts'
            ],
            coverageDirectory: 'coverage',
            coverageReporters: ['text', 'lcov', 'html']
        };

        await fs.writeJson(path.join(this.projectPath, 'jest.config.js'), jestConfig, { spaces: 2 });

        // Create test directory structure
        await fs.ensureDir(path.join(this.projectPath, 'tests/unit'));
        await fs.ensureDir(path.join(this.projectPath, 'tests/integration'));

        // Create example test
        const exampleTest = `
describe('Example Test Suite', () => {
    test('should pass basic test', () => {
        expect(1 + 1).toBe(2);
    });

    test('should handle async operations', async () => {
        const result = await Promise.resolve('test');
        expect(result).toBe('test');
    });
});
`;
        await fs.writeFile(path.join(this.projectPath, 'tests/unit/example.test.ts'), exampleTest);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            test: 'jest',
            'test:watch': 'jest --watch',
            'test:coverage': 'jest --coverage'
        });

        console.log('✅ Jest setup completed!');
        return { framework: 'jest', status: 'success' };
    }

    async setupPHPUnit() {
        console.log('📦 Setting up PHPUnit for PHP...');

        // Install PHPUnit via Composer
        execSync('composer require --dev phpunit/phpunit', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create PHPUnit configuration
        const phpunitConfig = `<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/10.0/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit Tests">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature Tests">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">./app</directory>
        </include>
        <report>
            <html outputDirectory="reports/coverage/html"/>
            <text outputDirectory="reports/coverage" outputFile="coverage.txt"/>
        </report>
    </coverage>
</phpunit>`;

        await fs.writeFile(path.join(this.projectPath, 'phpunit.xml'), phpunitConfig);

        // Create test directories
        await fs.ensureDir(path.join(this.projectPath, 'tests/Unit'));
        await fs.ensureDir(path.join(this.projectPath, 'tests/Feature'));

        // Create example test
        const exampleTest = `<?php

namespace Tests\\Unit;

use PHPUnit\\Framework\\TestCase;

class ExampleTest extends TestCase
{
    public function test_basic_test()
    {
        $this->assertTrue(true);
    }

    public function test_array_operations()
    {
        $array = [1, 2, 3];
        $this->assertCount(3, $array);
        $this->assertContains(2, $array);
    }
}
`;
        await fs.writeFile(path.join(this.projectPath, 'tests/Unit/ExampleTest.php'), exampleTest);

        // Create composer.json test script if not exists
        const composerJsonPath = path.join(this.projectPath, 'composer.json');
        if (await fs.pathExists(composerJsonPath)) {
            const composerJson = await fs.readJson(composerJsonPath);
            composerJson.scripts = composerJson.scripts || {};
            composerJson.scripts.test = 'phpunit';
            composerJson.scripts['test:coverage'] = 'phpunit --coverage-html reports/coverage';
            await fs.writeJson(composerJsonPath, composerJson, { spaces: 4 });
        }

        console.log('✅ PHPUnit setup completed!');
        return { framework: 'phpunit', status: 'success' };
    }

    async setupPyTest() {
        console.log('📦 Setting up PyTest for Python...');

        // Install pytest
        execSync('pip install pytest pytest-cov pytest-html', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create pytest configuration
        const pytestConfig = `[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --cov=src
    --cov-report=html:reports/coverage
    --cov-report=term-missing
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow running tests
`;

        await fs.writeFile(path.join(this.projectPath, 'pytest.ini'), pytestConfig);

        // Create test directories
        await fs.ensureDir(path.join(this.projectPath, 'tests/unit'));
        await fs.ensureDir(path.join(this.projectPath, 'tests/integration'));

        // Create example test
        const exampleTest = `import pytest

class TestExample:
    def test_basic_assertion(self):
        assert 1 + 1 == 2
    
    def test_string_operations(self):
        text = "hello world"
        assert "hello" in text
        assert text.upper() == "HELLO WORLD"
    
    @pytest.mark.parametrize("input,expected", [
        (1, 2),
        (2, 4),
        (3, 6)
    ])
    def test_multiplication(self, input, expected):
        assert input * 2 == expected

def test_list_operations():
    numbers = [1, 2, 3, 4, 5]
    assert len(numbers) == 5
    assert sum(numbers) == 15
    assert 3 in numbers
`;

        await fs.writeFile(path.join(this.projectPath, 'tests/unit/test_example.py'), exampleTest);

        console.log('✅ PyTest setup completed!');
        return { framework: 'pytest', status: 'success' };
    }

    async setupCypress() {
        console.log('📦 Setting up Cypress for E2E testing...');

        // Install Cypress
        execSync('npm install --save-dev cypress', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Initialize Cypress
        execSync('npx cypress install', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create Cypress configuration
        const cypressConfig = `{
  "baseUrl": "http://localhost:3000",
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "defaultCommandTimeout": 10000,
  "requestTimeout": 10000,
  "responseTimeout": 10000,
  "video": true,
  "screenshotOnRunFailure": true,
  "trashAssetsBeforeRuns": true,
  "retries": {
    "runMode": 2,
    "openMode": 0
  },
  "env": {
    "API_URL": "http://localhost:3001"
  }
}`;

        await fs.writeFile(path.join(this.projectPath, 'cypress.json'), cypressConfig);

        // Create example E2E test
        const exampleTest = `describe('Example E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load homepage', () => {
    cy.contains('Welcome').should('be.visible');
  });

  it('should navigate to login page', () => {
    cy.get('[data-cy=login-link]').click();
    cy.url().should('include', '/login');
    cy.get('[data-cy=email]').should('be.visible');
    cy.get('[data-cy=password]').should('be.visible');
  });

  it('should handle form submission', () => {
    cy.get('[data-cy=email]').type('test@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=submit]').click();
    cy.contains('Login successful').should('be.visible');
  });

  it('should test API endpoints', () => {
    cy.request('/api/users').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('users');
    });
  });
});`;

        await fs.ensureDir(path.join(this.projectPath, 'cypress/integration'));
        await fs.writeFile(path.join(this.projectPath, 'cypress/integration/example.spec.js'), exampleTest);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            'cypress:open': 'cypress open',
            'cypress:run': 'cypress run',
            'test:e2e': 'cypress run'
        });

        console.log('✅ Cypress setup completed!');
        return { framework: 'cypress', status: 'success' };
    }

    async setupPlaywright() {
        console.log('📦 Setting up Playwright for E2E testing...');

        // Install Playwright
        execSync('npm install --save-dev @playwright/test', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Install browsers
        execSync('npx playwright install', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create Playwright configuration
        const playwrightConfig = `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});`;

        await fs.writeFile(path.join(this.projectPath, 'playwright.config.ts'), playwrightConfig);

        // Create example test
        const exampleTest = `import { test, expect } from '@playwright/test';

test.describe('Example Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should handle login flow', async ({ page }) => {
    await page.click('[data-testid=login-link]');
    await expect(page).toHaveURL(/.*login/);
    
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=submit]');
    
    await expect(page.locator('text=Login successful')).toBeVisible();
  });

  test('should test API responses', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('users');
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('text=Mobile Menu')).toBeVisible();
  });
});`;

        await fs.ensureDir(path.join(this.projectPath, 'tests'));
        await fs.writeFile(path.join(this.projectPath, 'tests/example.spec.ts'), exampleTest);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            'test:playwright': 'playwright test',
            'test:playwright:ui': 'playwright test --ui'
        });

        console.log('✅ Playwright setup completed!');
        return { framework: 'playwright', status: 'success' };
    }

    async runTests(options = {}) {
        console.log('🧪 Running tests...');

        const { coverage = this.config.coverage, watch = this.config.watch } = options;
        const framework = this.config.framework;

        try {
            let command;

            switch (framework) {
                case 'jest':
                    command = coverage ? 'npm run test:coverage' : 
                             watch ? 'npm run test:watch' : 'npm test';
                    break;
                case 'phpunit':
                    command = coverage ? 'composer run test:coverage' : 'composer run test';
                    break;
                case 'pytest':
                    command = coverage ? 'pytest --cov' : 'pytest';
                    break;
                case 'cypress':
                    command = 'npm run test:e2e';
                    break;
                case 'playwright':
                    command = 'npm run test:playwright';
                    break;
                default:
                    throw new Error(`Unknown testing framework: ${framework}`);
            }

            console.log(`Running: ${command}`);
            execSync(command, {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            console.log('✅ Tests completed successfully!');
            return { status: 'success', framework };
        } catch (error) {
            console.error('❌ Tests failed:', error.message);
            return { status: 'failed', framework, error: error.message };
        }
    }

    async generateTestTemplates(feature) {
        console.log(`📝 Generating test templates for: ${feature}`);

        const templates = {
            unit: this.generateUnitTest(feature),
            integration: this.generateIntegrationTest(feature),
            e2e: this.generateE2eTest(feature)
        };

        return templates;
    }

    generateUnitTest(feature) {
        const framework = this.config.framework;
        
        switch (framework) {
            case 'jest':
                return `
describe('${feature} Unit Tests', () => {
    test('should handle ${feature} functionality', () => {
        // TODO: Implement unit test
        expect(true).toBe(true);
    });
});
`;
            case 'phpunit':
                return `<?php

namespace Tests\\Unit;

use PHPUnit\\Framework\\TestCase;

class ${feature}Test extends TestCase
{
    public function test_${feature}_functionality()
    {
        // TODO: Implement unit test
        $this->assertTrue(true);
    }
}
`;
            case 'pytest':
                return `import pytest

class Test${feature}:
    def test_${feature}_functionality(self):
        # TODO: Implement unit test
        assert True
`;
            default:
                return `// TODO: Implement ${feature} unit test`;
        }
    }

    generateIntegrationTest(feature) {
        // Similar structure for integration tests
        return `// Integration test for ${feature}`;
    }

    generateE2eTest(feature) {
        // E2E test templates
        return `// E2E test for ${feature}`;
    }

    detectFramework() {
        // Auto-detect testing framework based on project structure
        if (fs.existsSync(path.join(this.projectPath, 'jest.config.js'))) return 'jest';
        if (fs.existsSync(path.join(this.projectPath, 'phpunit.xml'))) return 'phpunit';
        if (fs.existsSync(path.join(this.projectPath, 'pytest.ini'))) return 'pytest';
        if (fs.existsSync(path.join(this.projectPath, 'cypress.json'))) return 'cypress';
        if (fs.existsSync(path.join(this.projectPath, 'playwright.config.ts'))) return 'playwright';
        
        // Default based on language
        if (fs.existsSync(path.join(this.projectPath, 'package.json'))) return 'jest';
        if (fs.existsSync(path.join(this.projectPath, 'composer.json'))) return 'phpunit';
        if (fs.existsSync(path.join(this.projectPath, 'requirements.txt'))) return 'pytest';
        
        return 'jest'; // Default
    }

    async updatePackageJsonScripts(scripts) {
        const packageJsonPath = path.join(this.projectPath, 'package.json');
        
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            packageJson.scripts = packageJson.scripts || {};
            Object.assign(packageJson.scripts, scripts);
            await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }
    }

    async generateCoverageReport() {
        console.log('📊 Generating coverage report...');

        const framework = this.config.framework;
        let coverageDir;

        switch (framework) {
            case 'jest':
                coverageDir = 'coverage';
                break;
            case 'phpunit':
                coverageDir = 'reports/coverage';
                break;
            case 'pytest':
                coverageDir = 'reports/coverage';
                break;
            default:
                coverageDir = 'coverage';
        }

        const coveragePath = path.join(this.projectPath, coverageDir);
        if (await fs.pathExists(coveragePath)) {
            console.log(`📁 Coverage report available at: ${coveragePath}`);
            return { path: coveragePath, framework };
        }

        return null;
    }
}

module.exports = TestingFramework;
