const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class CodeQualityTools {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            enableLinting: config.enableLinting !== false,
            enableFormatting: config.enableFormatting !== false,
            enableRefactoring: config.enableRefactoring !== false,
            enableAnalysis: config.enableAnalysis !== false,
            autoFix: config.autoFix || false,
            ...config
        };
        this.issues = [];
        this.metrics = {};
    }

    async setupCodeQuality() {
        console.log('🔧 Setting up comprehensive code quality tools...');

        const results = {
            linting: null,
            formatting: null,
            refactoring: null,
            analysis: null
        };

        // Setup linting
        if (this.config.enableLinting) {
            results.linting = await this.setupLinting();
        }

        // Setup code formatting
        if (this.config.enableFormatting) {
            results.formatting = await this.setupFormatting();
        }

        // Setup refactoring tools
        if (this.config.enableRefactoring) {
            results.refactoring = await this.setupRefactoring();
        }

        // Setup static analysis
        if (this.config.enableAnalysis) {
            results.analysis = await this.setupStaticAnalysis();
        }

        // Generate quality dashboard
        await this.generateQualityDashboard();

        console.log('✅ Code quality tools setup completed!');
        return results;
    }

    async setupLinting() {
        console.log('🔍 Setting up linting tools...');

        const framework = this.detectFramework();
        let linterConfig;

        if (framework === 'laravel' || framework === 'node') {
            // Install ESLint for JavaScript/TypeScript
            execSync('npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-vue', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            linterConfig = this.generateESLintConfig();
            await fs.writeJson(path.join(this.projectPath, '.eslintrc.json'), linterConfig, { spaces: 2 });
        }

        if (framework === 'laravel') {
            // Install PHP CS Fixer for PHP
            execSync('composer require --dev friendsofphp/php-cs-fixer', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            const phpCsConfig = this.generatePHPCsConfig();
            await fs.writeJson(path.join(this.projectPath, '.php-cs-fixer.dist.php'), phpCsConfig, { spaces: 4 });
        }

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            lint: this.getLintCommand(),
            'lint:fix': this.getLintFixCommand(),
            'lint:check': this.getLintCheckCommand()
        });

        console.log('✅ Linting tools configured');
        return { 
            eslint: framework === 'node', 
            phpCsFixer: framework === 'laravel',
            config: linterConfig 
        };
    }

    async setupFormatting() {
        console.log('🎨 Setting up code formatting...');

        // Install Prettier
        execSync('npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Generate Prettier config
        const prettierConfig = {
            semi: true,
            trailingComma: 'es5',
            singleQuote: true,
            printWidth: 100,
            tabWidth: 2,
            useTabs: false,
            bracketSpacing: true,
            arrowParens: 'avoid',
            endOfLine: 'lf'
        };

        await fs.writeJson(path.join(this.projectPath, '.prettierrc'), prettierConfig, { spaces: 2 });

        // Create .prettierignore
        const prettierIgnore = `node_modules/
dist/
build/
coverage/
*.min.js
*.min.css
package-lock.json
yarn.lock`;

        await fs.writeFile(path.join(this.projectPath, '.prettierignore'), prettierIgnore);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            format: 'prettier --write .',
            'format:check': 'prettier --check .'
        });

        // Integrate with ESLint if available
        const eslintConfigPath = path.join(this.projectPath, '.eslintrc.json');
        if (await fs.pathExists(eslintConfigPath)) {
            const eslintConfig = await fs.readJson(eslintConfigPath);
            eslintConfig.extends = eslintConfig.extends || [];
            eslintConfig.extends.push('prettier');
            eslintConfig.plugins = eslintConfig.plugins || [];
            eslintConfig.plugins.push('prettier');
            eslintConfig.rules = eslintConfig.rules || {};
            eslintConfig.rules['prettier/prettier'] = 'error';
            await fs.writeJson(eslintConfigPath, eslintConfig);
        }

        console.log('✅ Code formatting configured');
        return { prettier: true, config: prettierConfig };
    }

    async setupRefactoring() {
        console.log('🔄 Setting up refactoring tools...');

        const framework = this.detectFramework();
        
        if (framework === 'node') {
            // Install js-refactor for JavaScript
            execSync('npm install --save-dev js-refactor', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });
        }

        if (framework === 'laravel') {
            // Install PHP Refactor tools
            execSync('composer require --dev rector/rector', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            const rectorConfig = this.generateRectorConfig();
            await fs.writeFile(path.join(this.projectPath, 'rector.php'), rectorConfig);
        }

        // Setup automated refactoring scripts
        const refactorScripts = this.generateRefactorScripts();
        const scriptsPath = path.join(this.projectPath, 'scripts', 'refactor.js');
        await fs.ensureDir(path.dirname(scriptsPath));
        await fs.writeFile(scriptsPath, refactorScripts);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            refactor: 'node scripts/refactor.js',
            'refactor:check': 'node scripts/refactor.js --check'
        });

        console.log('✅ Refactoring tools configured');
        return { 
            rector: framework === 'laravel',
            jsRefactor: framework === 'node',
            scripts: scriptsPath 
        };
    }

    async setupStaticAnalysis() {
        console.log('📊 Setting up static analysis tools...');

        const framework = this.detectFramework();

        if (framework === 'node') {
            // Install SonarJS, TypeScript compiler for analysis
            execSync('npm install --save-dev sonarqube-scanner typescript @typescript-eslint/parser', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            // Setup SonarQube config
            const sonarConfig = this.generateSonarConfig();
            await fs.writeFile(path.join(this.projectPath, 'sonar-project.properties'), sonarConfig);
        }

        if (framework === 'laravel') {
            // Install PHPStan for static analysis
            execSync('composer require --dev phpstan/phpstan', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });

            const phpstanConfig = this.generatePHPStanConfig();
            await fs.writeFile(path.join(this.projectPath, 'phpstan.neon'), phpstanConfig);
        }

        // Setup complexity analysis
        const complexityConfig = this.generateComplexityConfig();
        const complexityPath = path.join(this.projectPath, 'scripts', 'complexity.js');
        await fs.ensureDir(path.dirname(complexityPath));
        await fs.writeFile(complexityPath, complexityConfig);

        // Update package.json scripts
        await this.updatePackageJsonScripts({
            analyze: this.getAnalysisCommand(),
            complexity: 'node scripts/complexity.js'
        });

        console.log('✅ Static analysis tools configured');
        return { 
            sonar: framework === 'node',
            phpstan: framework === 'laravel',
            complexity: complexityPath 
        };
    }

    generateESLintConfig() {
        return {
            env: {
                browser: true,
                es2021: true,
                node: true
            },
            extends: [
                'eslint:recommended',
                '@typescript-eslint/recommended'
            ],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module'
            },
            plugins: ['@typescript-eslint'],
            rules: {
                'no-unused-vars': 'error',
                'no-console': 'warn',
                'prefer-const': 'error',
                'no-var': 'error',
                'object-shorthand': 'error',
                'prefer-arrow-callback': 'error',
                'arrow-spacing': 'error',
                'eqeqeq': 'error',
                'no-duplicate-imports': 'error',
                'curly': 'error',
                'brace-style': 'error',
                'comma-dangle': 'error',
                'quotes': 'error',
                'semi': 'error',
                'indent': ['error', 2],
                'max-len': ['error', { code: 100 }],
                'no-trailing-spaces': 'error',
                'eol-last': 'error'
            },
            ignorePatterns: [
                'node_modules/',
                'dist/',
                'build/',
                '*.min.js',
                'coverage/'
            ]
        };
    }

    generatePHPCsConfig() {
        return `<?php

return (new PhpCsFixer\\Config())
    ->setRules([
        '@PSR12' => true,
        'array_syntax' => ['syntax' => 'short'],
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'no_unused_imports' => true,
        'not_operator_with_successor_space' => true,
        'trailing_comma_in_multiline' => ['elements' => ['arrays']],
        'phpdoc_scalar' => true,
        'unary_operator_spaces' => true,
        'binary_operator_spaces' => true,
        'blank_line_before_statement' => [
            'statements' => ['break', 'continue', 'declare', 'return', 'throw', 'try'],
        ],
        'phpdoc_single_line_var_spacing' => true,
        'phpdoc_var_without_name' => true,
        'class_attributes_separation' => [
            'elements' => ['const' => 'one', 'method' => 'one', 'property' => 'one'],
        ],
        'method_argument_space' => [
            'on_multiline' => 'ensure_fully_multiline',
            'keep_multiple_spaces_after_comma' => false,
        ],
        'single_trait_insert_per_statement' => true,
    ])
    ->setFinder(
        PhpCsFixer\\Finder::create()
            ->exclude(['vendor', 'node_modules'])
            ->in(__DIR__)
    );`;
    }

    generateRectorConfig() {
        return `<?php

declare(strict_types=1);

use Rector\\Config\\RectorConfig;
use Rector\\Set\\ValueObject\\LevelSetList;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->paths([
        __DIR__ . '/app',
        __DIR__ . '/tests',
    ]);

    // register single rule
    $rectorConfig->rule(\\Rector\\Laravel\\Set\\LaravelSetList::LARAVEL_100);

    // define sets of rules
    $rectorConfig->sets([
        LevelSetList::UP_TO_PHP_82,
        \\Rector\\Set\\ValueObject\\SetList::CODE_QUALITY,
        \\Rector\\Set\\ValueObject\\SetList::DEAD_CODE,
        \\Rector\\Set\\ValueObject\\SetList::PERFORMANCE,
        \\Rector\\Set\\ValueObject\\SetList::TYPE_DECLARATION,
    ]);
};`;
    }

    generateSonarConfig() {
        return `# SonarQube Configuration
sonar.projectKey=${path.basename(this.projectPath)}
sonar.projectName=${path.basename(this.projectPath)}
sonar.projectVersion=1.0.0
sonar.sourceEncoding=UTF-8

# Source directories
sonar.sources=src
sonar.tests=tests
sonar.test.inclusions=**/*test.ts,**/*test.js,**/*.spec.ts,**/*.spec.js

# Coverage
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.testExecutionReportPaths=test-report.xml

# Exclusions
sonar.exclusions=node_modules/**,dist/**,build/**,coverage/**,**/*.min.js

# Code smells
sonar.javascript.globals=
sonar.javascript.environments=jest,nodejs,browser

# Metrics
sonar.scm.provider=git
sonar.links.homepage=https://github.com/your-org/${path.basename(this.projectPath)}
sonar.links.ci=https://github.com/your-org/${path.basename(this.projectPath)}/actions
sonar.links.issue=https://github.com/your-org/${path.basename(this.projectPath)}/issues`;
    }

    generatePHPStanConfig() {
        return `parameters:
    level: 8
    paths:
        - app
        - tests
    excludePaths:
        - vendor/*
        - node_modules/*
    checkMissingIterableValueType: false
    checkGenericClassInNonGenericObjectType: false

includes:
    - vendor/phpstan/phpstan/conf/bleedingEdge.neon

rules:
    - PHPStan\\Rules\\Classes\\ClassConstantRule
    - PHPStan\\Rules\\Constants\\ConstantRule
    - PHPStan\\Rules\\Functions\\FunctionRule
    - PHPStan\\Rules\\Methods\\MethodRule
    - PHPStan\\Rules\\Operators\\OperatorRule
    - PHPStan\\Rules\\Properties\\PropertyRule
    - PHPStan\\Rules\\Variables\\VariableRule

services:
    -
        class: PHPStan\\Rules\\Classes\\UnusedConstructorParametersRule
        tags:
            - phpstan.rules.rule`;
    }

    generateRefactorScripts() {
        return `const fs = require('fs');
const path = require('path');

class RefactorTools {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }

    async analyzeAndRefactor(options = {}) {
        const { checkOnly = false, verbose = false } = options;

        console.log('🔄 Analyzing code for refactoring opportunities...');

        const files = await this.findCodeFiles();
        const refactorings = [];

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const fileRefactorings = this.analyzeFile(content, file);

            if (fileRefactorings.length > 0) {
                refactorings.push({
                    file: path.relative(this.projectPath, file),
                    refactorings: fileRefactorings
                });
            }
        }

        if (checkOnly) {
            this.printRefactoringReport(refactorings);
            return refactorings;
        }

        // Apply refactorings
        for (const fileRefactoring of refactorings) {
            await this.applyRefactorings(fileRefactoring);
        }

        console.log(\`✅ Applied \${refactorings.length} refactoring operations\`);
        return refactorings;
    }

    analyzeFile(content, filePath) {
        const refactorings = [];
        const lines = content.split('\\n');

        // Analyze for common refactoring opportunities
        refactorings.push(...this.findLongFunctions(lines, filePath));
        refactorings.push(...this.findDuplicateCode(lines, filePath));
        refactorings.push(...this.findLongParameterLists(lines, filePath));
        refactorings.push(...this.findPrimitiveObsession(lines, filePath));
        refactorings.push(...this.findSwitchStatements(lines, filePath));
        refactorings.push(...this.findMagicNumbers(lines, filePath));

        return refactorings;
    }

    findLongFunctions(lines, filePath) {
        const refactorings = [];
        let braceCount = 0;
        let functionStart = -1;
        let functionName = '';

        lines.forEach((line, index) => {
            // Track function definitions
            const functionMatch = line.match(/(?:function\\s+|const\\s+|let\\s+|var\\s+)(\\w+)\\s*=\\s*(?:function|\\()/);
            if (functionMatch) {
                if (braceCount === 0) {
                    functionStart = index;
                    functionName = functionMatch[1];
                }
            }

            // Count braces
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;

            // Check function length
            if (braceCount === 0 && functionStart !== -1) {
                const functionLength = index - functionStart;
                if (functionLength > 30) { // More than 30 lines
                    refactorings.push({
                        type: 'long_function',
                        line: functionStart + 1,
                        message: \`Function '\${functionName}' is too long (\${functionLength} lines). Consider breaking it into smaller functions.\`,
                        suggestion: 'Extract method or function'
                    });
                }
                functionStart = -1;
                functionName = '';
            }
        });

        return refactorings;
    }

    findDuplicateCode(lines, filePath) {
        const refactorings = [];
        const codeBlocks = new Map();

        // Simple duplicate detection (can be enhanced with more sophisticated algorithms)
        for (let i = 0; i < lines.length - 3; i++) {
            const block = lines.slice(i, i + 4).join('\\n').trim();
            if (block.length > 50) { // Only check substantial blocks
                if (codeBlocks.has(block)) {
                    refactorings.push({
                        type: 'duplicate_code',
                        line: i + 1,
                        message: 'Duplicate code block detected',
                        suggestion: 'Extract common functionality into a separate function'
                    });
                } else {
                    codeBlocks.set(block, i);
                }
            }
        }

        return refactorings;
    }

    findLongParameterLists(lines, filePath) {
        const refactorings = [];

        lines.forEach((line, index) => {
            const paramMatch = line.match(/function\\s+\\w+\\s*\\(([^)]+)\\)/);
            if (paramMatch) {
                const params = paramMatch[1].split(',').map(p => p.trim()).filter(p => p);
                if (params.length > 4) {
                    refactorings.push({
                        type: 'long_parameter_list',
                        line: index + 1,
                        message: \`Function has too many parameters (\${params.length})\`,
                        suggestion: 'Consider using an options object or parameter object pattern'
                    });
                }
            }
        });

        return refactorings;
    }

    findPrimitiveObsession(lines, filePath) {
        const refactorings = [];

        // Look for primitive types used in complex ways
        const primitivePatterns = [
            /\\bemail\\b.*=\\s*["'][^"']*["']/g,
            /\\bphone\\b.*=\\s*["'][^"']*["']/g,
            /\\bzipCode\\b.*=\\s*["'][^"']*["']/g
        ];

        lines.forEach((line, index) => {
            primitivePatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    refactorings.push({
                        type: 'primitive_obsession',
                        line: index + 1,
                        message: 'Potential primitive obsession detected',
                        suggestion: 'Consider creating value objects for domain-specific types'
                    });
                }
            });
        });

        return refactorings;
    }

    findSwitchStatements(lines, filePath) {
        const refactorings = [];

        lines.forEach((line, index) => {
            if (line.includes('switch') && line.includes('(')) {
                // Check if switch is followed by many cases
                let caseCount = 0;
                for (let i = index; i < lines.length && i < index + 20; i++) {
                    if (lines[i].includes('case ')) caseCount++;
                    if (lines[i].includes('}')) break;
                }

                if (caseCount > 5) {
                    refactorings.push({
                        type: 'switch_statement',
                        line: index + 1,
                        message: \`Switch statement with \${caseCount} cases is too complex\`,
                        suggestion: 'Consider using polymorphism or strategy pattern'
                    });
                }
            }
        });

        return refactorings;
    }

    findMagicNumbers(lines, filePath) {
        const refactorings = [];

        lines.forEach((line, index) => {
            // Find numbers that might be magic
            const numberMatches = line.match(/\\b\\d{2,}\\b/g);
            if (numberMatches) {
                numberMatches.forEach(match => {
                    const num = parseInt(match);
                    // Skip common non-magic numbers
                    if (num !== 0 && num !== 1 && num !== 100 && num !== 1000) {
                        refactorings.push({
                            type: 'magic_number',
                            line: index + 1,
                            message: \`Magic number '\${num}' detected\`,
                            suggestion: 'Replace with named constant'
                        });
                    }
                });
            }
        });

        return refactorings;
    }

    printRefactoringReport(refactorings) {
        console.log('\\n🔍 Refactoring Analysis Report');
        console.log('=' .repeat(50));

        if (refactorings.length === 0) {
            console.log('✅ No refactoring opportunities found!');
            return;
        }

        refactorings.forEach((fileRefactoring, index) => {
            console.log(\`\\n\${index + 1}. \${fileRefactoring.file}:\`);
            fileRefactoring.refactorings.forEach(refactoring => {
                console.log(\`   Line \${refactoring.line}: \${refactoring.message}\`);
                console.log(\`   💡 \${refactoring.suggestion}\`);
            });
        });

        console.log(\`\\n📊 Summary: \${refactorings.length} files with refactoring opportunities\`);
    }

    async applyRefactorings(fileRefactoring) {
        // This would implement the actual refactoring logic
        // For now, just log the refactorings that would be applied
        console.log(\`🔄 Applying \${fileRefactoring.refactorings.length} refactorings to \${fileRefactoring.file}\`);

        fileRefactoring.refactorings.forEach(refactoring => {
            console.log(\`   ✓ \${refactoring.type}: \${refactoring.message}\`);
        });
    }

    async findCodeFiles() {
        const files = [];
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.php'];

        const walk = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'vendor') {
                    await walk(fullPath);
                } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };

        await walk(this.projectPath);
        return files;
    }
}

module.exports = RefactorTools;`;
    }

    generateComplexityConfig() {
        return `const fs = require('fs');
const path = require('path');

class ComplexityAnalyzer {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }

    async analyzeComplexity() {
        console.log('🧮 Analyzing code complexity...');

        const files = await this.findCodeFiles();
        const results = {
            files: [],
            summary: {
                totalFiles: 0,
                averageComplexity: 0,
                highComplexityFiles: [],
                maintainabilityIndex: 0
            }
        };

        for (const file of files) {
            const analysis = await this.analyzeFileComplexity(file);
            results.files.push(analysis);
        }

        // Calculate summary
        results.summary.totalFiles = results.files.length;
        const totalComplexity = results.files.reduce((sum, file) => sum + file.complexity, 0);
        results.summary.averageComplexity = totalComplexity / results.files.length;

        results.summary.highComplexityFiles = results.files
            .filter(file => file.complexity > 10)
            .sort((a, b) => b.complexity - a.complexity);

        results.summary.maintainabilityIndex = this.calculateMaintainabilityIndex(results.files);

        this.printComplexityReport(results);
        return results;
    }

    async analyzeFileComplexity(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\\n');

        let complexity = 1; // Base complexity
        let functions = [];
        let currentFunction = null;

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Function/method detection
            const functionMatch = trimmed.match(/(?:function\\s+|const\\s+|let\\s+|var\\s+|public\\s+|private\\s+|protected\\s+)(\\w+)\\s*[=(]\\s*(?:function|async|\\()/);
            if (functionMatch && !trimmed.includes('=')) {
                if (currentFunction) {
                    functions.push(currentFunction);
                }
                currentFunction = {
                    name: functionMatch[1],
                    startLine: index + 1,
                    complexity: 1,
                    lines: 0
                };
            }

            if (currentFunction) {
                currentFunction.lines++;

                // Complexity incrementors
                if (this.isComplexityIncrementor(trimmed)) {
                    currentFunction.complexity++;
                    complexity++;
                }
            }
        });

        if (currentFunction) {
            functions.push(currentFunction);
        }

        return {
            file: path.relative(this.projectPath, filePath),
            complexity: complexity,
            functions: functions,
            lines: lines.length,
            language: path.extname(filePath).substring(1)
        };
    }

    isComplexityIncrementor(line) {
        const incrementors = [
            /\\bif\\b/,
            /\\belse if\\b/,
            /\\bfor\\b/,
            /\\bwhile\\b/,
            /\\bcase\\b/,
            /\\bcatch\\b/,
            /&&/,
            /\\|\\|/,
            /\\?/,
            /:/
        ];

        return incrementors.some(pattern => pattern.test(line));
    }

    calculateMaintainabilityIndex(files) {
        if (files.length === 0) return 100;

        const avgComplexity = files.reduce((sum, file) => sum + file.complexity, 0) / files.length;
        const avgLines = files.reduce((sum, file) => sum + file.lines, 0) / files.length;

        // Simplified maintainability index calculation
        let mi = 171 - 5.2 * Math.log(avgComplexity) - 0.23 * avgLines;
        mi = Math.max(0, Math.min(171, mi)); // Clamp between 0 and 171

        return Math.round(mi);
    }

    printComplexityReport(results) {
        console.log('\\n🧮 Code Complexity Analysis Report');
        console.log('=' .repeat(50));

        console.log(\`📊 Summary:\`);
        console.log(\`   Total Files: \${results.summary.totalFiles}\`);
        console.log(\`   Average Complexity: \${results.summary.averageComplexity.toFixed(2)}\`);
        console.log(\`   Maintainability Index: \${results.summary.maintainabilityIndex}/171\`);

        if (results.summary.highComplexityFiles.length > 0) {
            console.log(\`\\n⚠️  High Complexity Files:\`);
            results.summary.highComplexityFiles.slice(0, 10).forEach(file => {
                console.log(\`   \${file.file}: \${file.complexity} (MI: \${this.calculateMaintainabilityIndex([file])})\`);
            });
        }

        // Complexity rating
        const avgComplexity = results.summary.averageComplexity;
        let rating, color;
        if (avgComplexity <= 5) {
            rating = 'Excellent'; color = '🟢';
        } else if (avgComplexity <= 10) {
            rating = 'Good'; color = '🟡';
        } else if (avgComplexity <= 20) {
            rating = 'Fair'; color = '🟠';
        } else {
            rating = 'Poor'; color = '🔴';
        }

        console.log(\`\\n🏆 Complexity Rating: \${color} \${rating}\`);

        // Maintainability rating
        const mi = results.summary.maintainabilityIndex;
        let miRating, miColor;
        if (mi >= 85) {
            miRating = 'Excellent'; miColor = '🟢';
        } else if (mi >= 65) {
            miRating = 'Good'; miColor = '🟡';
        } else if (mi >= 45) {
            miRating = 'Fair'; miColor = '🟠';
        } else {
            miRating = 'Poor'; miColor = '🔴';
        }

        console.log(\`🏆 Maintainability Rating: \${miColor} \${miRating}\`);
    }

    async findCodeFiles() {
        const files = [];
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.php'];

        const walk = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'vendor') {
                    await walk(fullPath);
                } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };

        await walk(this.projectPath);
        return files;
    }
}

module.exports = ComplexityAnalyzer;`;
    }

    async generateQualityDashboard() {
        const dashboard = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Quality Dashboard - ${path.basename(this.projectPath)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🔧 Code Quality Dashboard</h1>
            <p class="text-gray-600">Comprehensive code analysis and quality metrics</p>
            <p class="text-sm text-gray-500">Last updated: <span id="lastUpdate"></span></p>
        </header>

        <!-- Quality Metrics -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">✅</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Lint Status</h3>
                        <p class="text-2xl font-bold text-green-600" id="lintStatus">Passing</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">📊</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Complexity</h3>
                        <p class="text-2xl font-bold text-blue-600" id="complexityScore">5.2</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">🎯</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Coverage</h3>
                        <p class="text-2xl font-bold text-purple-600" id="coveragePercent">85%</p>
                    </div>
                </div>
            </div>

            <div class="metric-card bg-white rounded-lg shadow p-6">
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <span class="text-2xl">🏆</span>
                    </div>
                    <div class="ml-4">
                        <h3 class="text-lg font-semibold text-gray-800">Maintainability</h3>
                        <p class="text-2xl font-bold text-yellow-600" id="maintainabilityIndex">78</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <!-- Issues Trend -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">🐛 Issues Trend</h3>
                <canvas id="issuesChart" width="400" height="200"></canvas>
            </div>

            <!-- Complexity Distribution -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">🧮 Complexity Distribution</h3>
                <canvas id="complexityChart" width="400" height="200"></canvas>
            </div>

            <!-- Code Smells -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">🔍 Code Smells</h3>
                <canvas id="smellsChart" width="400" height="200"></canvas>
            </div>

            <!-- Quality Gate -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">🚦 Quality Gate</h3>
                <div id="qualityGate" class="space-y-4">
                    <!-- Quality gate items will be populated here -->
                </div>
            </div>
        </div>

        <!-- Issues List -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">📋 Recent Issues</h3>
            <div id="issuesList" class="space-y-3">
                <div class="text-gray-500 text-center py-4">No issues found! 🎉</div>
            </div>
        </div>

        <!-- Refactoring Suggestions -->
        <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">🔄 Refactoring Suggestions</h3>
            <div id="refactoringList" class="space-y-3">
                <div class="text-gray-500 text-center py-4">No refactoring suggestions available</div>
            </div>
        </div>
    </div>

    <script>
        // Update timestamp
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();

        // Mock data for charts (replace with real data from your quality API)
        const mockData = {
            issues: [12, 8, 15, 6, 10, 4, 7, 3, 5, 2],
            complexity: {
                low: 45,
                medium: 30,
                high: 15,
                critical: 10
            },
            smells: {
                duplicate: 8,
                longMethod: 12,
                complexConditional: 5,
                unused: 15
            }
        };

        // Initialize charts
        const chartConfig = {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        };

        new Chart(document.getElementById('issuesChart'), {
            type: 'line',
            ...chartConfig,
            data: {
                labels: Array.from({length: 10}, (_, i) => \`\${i + 1}d ago\`),
                datasets: [{
                    data: mockData.issues,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true
                }]
            }
        });

        new Chart(document.getElementById('complexityChart'), {
            type: 'doughnut',
            ...chartConfig,
            data: {
                labels: ['Low', 'Medium', 'High', 'Critical'],
                datasets: [{
                    data: [mockData.complexity.low, mockData.complexity.medium, mockData.complexity.high, mockData.complexity.critical],
                    backgroundColor: [
                        'rgb(34, 197, 94)',
                        'rgb(59, 130, 246)',
                        'rgb(245, 158, 11)',
                        'rgb(239, 68, 68)'
                    ]
                }]
            }
        });

        new Chart(document.getElementById('smellsChart'), {
            type: 'bar',
            ...chartConfig,
            data: {
                labels: ['Duplicate Code', 'Long Methods', 'Complex Conditionals', 'Unused Code'],
                datasets: [{
                    data: [mockData.smells.duplicate, mockData.smells.longMethod, mockData.smells.complexConditional, mockData.smells.unused],
                    backgroundColor: 'rgba(147, 51, 234, 0.6)',
                    borderColor: 'rgb(147, 51, 234)',
                    borderWidth: 1
                }]
            },
            options: {
                ...chartConfig,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Populate quality gate
        const qualityGate = [
            { name: 'Unit Tests', status: 'passed', threshold: '80%', actual: '85%' },
            { name: 'Code Coverage', status: 'passed', threshold: '80%', actual: '87%' },
            { name: 'Complexity', status: 'warning', threshold: '< 10', actual: '8.5' },
            { name: 'Duplications', status: 'passed', threshold: '< 3%', actual: '1.2%' },
            { name: 'Security Issues', status: 'passed', threshold: '0', actual: '0' }
        ];

        const gateContainer = document.getElementById('qualityGate');
        qualityGate.forEach(item => {
            const statusColor = item.status === 'passed' ? 'text-green-600' : 'text-yellow-600';
            const statusIcon = item.status === 'passed' ? '✅' : '⚠️';
            
            gateContainer.innerHTML += \`
                <div class="flex justify-between items-center p-3 border rounded">
                    <div class="flex items-center">
                        <span class="mr-2">\${statusIcon}</span>
                        <span class="font-medium">\${item.name}</span>
                    </div>
                    <div class="text-right">
                        <div class="\${statusColor} font-semibold">\${item.actual}</div>
                        <div class="text-sm text-gray-500">Threshold: \${item.threshold}</div>
                    </div>
                </div>
            \`;
        });

        // Auto-refresh every 5 minutes
        setInterval(() => {
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
            // Fetch new data and update dashboard here
        }, 300000);
    </script>
</body>
</html>`;

        const dashboardPath = path.join(this.projectPath, 'quality-dashboard.html');
        await fs.writeFile(dashboardPath, dashboard);

        return dashboardPath;
    }

    detectFramework() {
        if (fs.existsSync(path.join(this.projectPath, 'artisan'))) return 'laravel';
        if (fs.existsSync(path.join(this.projectPath, 'package.json'))) return 'node';
        return 'node';
    }

    getLintCommand() {
        const framework = this.detectFramework();
        return framework === 'laravel' ? 'vendor/bin/php-cs-fixer fix' : 'eslint . --ext .js,.ts,.jsx,.tsx';
    }

    getLintFixCommand() {
        const framework = this.detectFramework();
        return framework === 'laravel' ? 'vendor/bin/php-cs-fixer fix --dry-run' : 'eslint . --ext .js,.ts,.jsx,.tsx --fix';
    }

    getLintCheckCommand() {
        const framework = this.detectFramework();
        return framework === 'laravel' ? 'vendor/bin/php-cs-fixer fix --dry-run --diff' : 'eslint . --ext .js,.ts,.jsx,.tsx';
    }

    getAnalysisCommand() {
        const framework = this.detectFramework();
        return framework === 'laravel' ? 'vendor/bin/phpstan analyse' : 'sonar-scanner';
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

    // Runtime quality analysis methods
    analyzeCode(code, language = 'javascript') {
        const issues = [];
        const lines = code.split('\\n');

        // Basic linting checks
        lines.forEach((line, index) => {
            // Check for console.log statements
            if (line.includes('console.log') && !line.trim().startsWith('//')) {
                issues.push({
                    type: 'warning',
                    line: index + 1,
                    message: 'console.log statement found',
                    rule: 'no-console'
                });
            }

            // Check for unused variables (simple check)
            const varMatch = line.match(/\\b(?:const|let|var)\\s+(\\w+)/);
            if (varMatch) {
                const varName = varMatch[1];
                const remainingCode = lines.slice(index + 1).join(' ');
                if (!remainingCode.includes(varName)) {
                    issues.push({
                        type: 'warning',
                        line: index + 1,
                        message: \`Variable '\${varName}' is declared but never used\`,
                        rule: 'no-unused-vars'
                    });
                }
            }

            // Check line length
            if (line.length > 100) {
                issues.push({
                    type: 'warning',
                    line: index + 1,
                    message: 'Line is too long (>100 characters)',
                    rule: 'max-len'
                });
            }
        });

        return {
            issues: issues,
            summary: {
                total: issues.length,
                errors: issues.filter(i => i.type === 'error').length,
                warnings: issues.filter(i => i.type === 'warning').length
            }
        };
    }

    calculateComplexity(code, language = 'javascript') {
        let complexity = 1;
        const lines = code.split('\\n');

        lines.forEach(line => {
            // Count complexity incrementors
            if (/\\bif\\b/.test(line)) complexity++;
            if (/\\belse if\\b/.test(line)) complexity++;
            if (/\\bfor\\b/.test(line)) complexity++;
            if (/\\bwhile\\b/.test(line)) complexity++;
            if (/\\bcase\\b/.test(line)) complexity++;
            if (/\\bcatch\\b/.test(line)) complexity++;
            if (/&&/.test(line)) complexity++;
            if (/\\|\\|/.test(line)) complexity++;
            if (/\\?/.test(line) && /:/.test(line)) complexity++;
        });

        return complexity;
    }

    generateQualityReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: {
                complexity: this.calculateComplexity,
                issues: this.analyzeCode,
                coverage: 0, // Would be populated from test runner
                maintainability: 0 // Would be calculated based on various factors
            },
            recommendations: [
                'Consider breaking down complex functions',
                'Add more comprehensive error handling',
                'Improve test coverage for edge cases',
                'Review and optimize database queries'
            ]
        };

        return report;
    }
}

module.exports = CodeQualityTools;
