const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { FileUtils } = require('../../lib/file-utils');
const { GroqService } = require('../../lib/groq-service');

async function laravel(action, options) {
  const fileUtils = new FileUtils();
  const groqService = new GroqService();
  await groqService.initialize();

  const projectPath = path.resolve(options.path);
  const outputLang = options.lang || 'en';

  // Verify it's a Laravel project
  if (!await isLaravelProject(projectPath)) {
    console.log(chalk.red('❌ This is not a Laravel project directory.'));
    console.log(chalk.gray('Make sure you are in the Laravel project root directory.'));
    process.exit(1);
  }

  console.log(chalk.bold.blue('🚀 Laravel AI Assistant'));
  console.log(chalk.gray(`Project: ${projectPath}`));
  console.log(chalk.gray(`Action: ${action} | Language: ${outputLang.toUpperCase()}\n`));

  switch (action.toLowerCase()) {
    case 'analyze':
      await analyzeLaravelProject(projectPath, options, fileUtils, groqService, outputLang);
      break;
    case 'debug':
      await debugLaravelProject(projectPath, options, fileUtils, groqService, outputLang);
      break;
    case 'enhance':
      await enhanceLaravelProject(projectPath, options, fileUtils, groqService, outputLang);
      break;
    case 'plan':
      await planLaravelDevelopment(projectPath, options, fileUtils, groqService, outputLang);
      break;
    default:
      console.log(chalk.red(`Unknown action: ${action}`));
      console.log(chalk.yellow('Available actions: analyze, debug, enhance, plan'));
      process.exit(1);
  }
}

async function isLaravelProject(projectPath) {
  const laravelFiles = [
    'artisan',
    'composer.json',
    'app',
    'config',
    'routes',
    'resources',
    'database'
  ];

  try {
    const composerPath = path.join(projectPath, 'composer.json');
    if (await fs.pathExists(composerPath)) {
      const composer = await fs.readJson(composerPath);
      return composer.name && composer.name.includes('laravel');
    }

    // Check for Laravel directory structure
    for (const file of laravelFiles) {
      if (await fs.pathExists(path.join(projectPath, file))) {
        return true;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return false;
}

async function analyzeLaravelProject(projectPath, options, fileUtils, groqService, outputLang) {
  console.log(chalk.bold('🔍 Deep Laravel Project Analysis'));
  console.log(chalk.gray('Analyzing architecture, dependencies, and code quality...\n'));

  const analysis = {
    structure: null,
    composer: null,
    routes: [],
    models: [],
    controllers: [],
    migrations: [],
    config: [],
    issues: []
  };

  // Analyze project structure
  console.log(chalk.cyan('📁 Analyzing project structure...'));
  analysis.structure = await fileUtils.analyzeProjectStructure(projectPath, {
    maxDepth: parseInt(options.depth) || 5,
    includeFileContents: false
  });

  // Analyze composer.json
  try {
    const composerPath = path.join(projectPath, 'composer.json');
    if (await fs.pathExists(composerPath)) {
      analysis.composer = await fs.readJson(composerPath);
      console.log(chalk.green('✅ Found composer.json'));
    }
  } catch (error) {
    analysis.issues.push('Could not read composer.json');
  }

  // Analyze routes
  console.log(chalk.cyan('🛣️  Analyzing routes...'));
  const routesPath = path.join(projectPath, 'routes');
  if (await fs.pathExists(routesPath)) {
    const routeFiles = await fileUtils.readDirectory(routesPath, {
      recursive: false,
      includeContent: true,
      patterns: ['*.php']
    });

    analysis.routes = routeFiles.map(f => ({
      file: f.relativePath,
      content: f.content ? f.content.substring(0, 1000) : null
    }));
  }

  // Analyze models
  console.log(chalk.cyan('📊 Analyzing models...'));
  const modelsPath = path.join(projectPath, 'app', 'Models');
  if (await fs.pathExists(modelsPath)) {
    const modelFiles = await fileUtils.readDirectory(modelsPath, {
      recursive: true,
      includeContent: true,
      patterns: ['*.php']
    });

    analysis.models = modelFiles.map(f => ({
      file: f.relativePath,
      content: f.content ? f.content.substring(0, 2000) : null
    }));
  }

  // Analyze controllers
  console.log(chalk.cyan('🎮 Analyzing controllers...'));
  const controllersPath = path.join(projectPath, 'app', 'Http', 'Controllers');
  if (await fs.pathExists(controllersPath)) {
    const controllerFiles = await fileUtils.readDirectory(controllersPath, {
      recursive: true,
      includeContent: true,
      patterns: ['*.php']
    });

    analysis.controllers = controllerFiles.map(f => ({
      file: f.relativePath,
      content: f.content ? f.content.substring(0, 2000) : null
    }));
  }

  // AI Analysis
  console.log(chalk.cyan('🤖 Generating AI insights...'));

  const langPrompt = outputLang === 'id' ?
    'Berikan analisis dalam bahasa Indonesia.' :
    'Provide analysis in English.';

  const analysisPrompt = `
${langPrompt}

Analyze this Laravel project comprehensively:

Project Structure: ${JSON.stringify(analysis.structure.summary, null, 2)}

Routes (${analysis.routes.length} files):
${analysis.routes.slice(0, 3).map(r => `File: ${r.file}\n${r.content?.substring(0, 500)}`).join('\n\n')}

Models (${analysis.models.length} files):
${analysis.models.slice(0, 3).map(m => `File: ${m.file}\n${m.content?.substring(0, 500)}`).join('\n\n')}

Controllers (${analysis.controllers.length} files):
${analysis.controllers.slice(0, 3).map(c => `File: ${c.file}\n${c.content?.substring(0, 500)}`).join('\n\n')}

Please provide:
1. Architecture assessment
2. Code quality analysis
3. Security considerations
4. Performance optimization suggestions
5. Best practices recommendations
6. Potential issues or improvements

Be specific and actionable.
`;

  const aiAnalysis = await groqService.chat(analysisPrompt, {
    maxTokens: 3000,
    temperature: 0.3
  });

  // Display results
  console.log(chalk.bold('\n📊 Laravel Project Analysis Results:\n'));

  console.log(chalk.bold('🏗️  Project Overview:'));
  console.log(`- Total Files: ${analysis.structure.summary.totalFiles}`);
  console.log(`- Routes: ${analysis.routes.length}`);
  console.log(`- Models: ${analysis.models.length}`);
  console.log(`- Controllers: ${analysis.controllers.length}`);
  console.log(`- Migrations: ${analysis.migrations.length}`);

  if (analysis.composer) {
    console.log(`- Laravel Version: ${analysis.composer.require?.['laravel/framework'] || 'Unknown'}`);
    console.log(`- PHP Version: ${analysis.composer.require?.php || 'Unknown'}`);
  }

  console.log(chalk.bold('\n🤖 AI Analysis:'));
  console.log(aiAnalysis);

  // Save analysis to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const analysisFile = `laravel-analysis-${timestamp}.md`;

  const report = `# Laravel Project Analysis Report
Generated: ${new Date().toISOString()}

## Project Overview
- **Path**: ${projectPath}
- **Total Files**: ${analysis.structure.summary.totalFiles}
- **Routes**: ${analysis.routes.length}
- **Models**: ${analysis.models.length}
- **Controllers**: ${analysis.controllers.length}

## AI Analysis
${aiAnalysis}

## Raw Data
${JSON.stringify(analysis, null, 2)}
`;

  await fs.writeFile(analysisFile, report);
  console.log(chalk.green(`\n💾 Analysis saved to: ${analysisFile}`));
}

async function debugLaravelProject(projectPath, options, fileUtils, groqService, outputLang) {
  console.log(chalk.bold('🐛 Laravel Debug & Error Analysis'));
  console.log(chalk.gray('Detecting potential issues, bugs, and errors...\n'));

  // Common Laravel issues to check
  const issues = {
    config: [],
    routes: [],
    models: [],
    controllers: [],
    migrations: [],
    security: [],
    performance: []
  };

  // Check for common issues
  console.log(chalk.cyan('🔍 Scanning for common issues...'));

  // Check routes
  const routesPath = path.join(projectPath, 'routes');
  if (await fs.pathExists(routesPath)) {
    const routeFiles = await fileUtils.readDirectory(routesPath, {
      recursive: false,
      includeContent: true,
      patterns: ['*.php']
    });

    for (const file of routeFiles) {
      if (file.content) {
        // Check for potential route issues
        if (file.content.includes('Route::') && file.content.includes('function')) {
          // Basic route validation
          if (!file.content.includes('use Illuminate\\Support\\Facades\\Route')) {
            issues.routes.push(`Missing Route facade import in ${file.relativePath}`);
          }
        }
      }
    }
  }

  // Check controllers
  const controllersPath = path.join(projectPath, 'app', 'Http', 'Controllers');
  if (await fs.pathExists(controllersPath)) {
    const controllerFiles = await fileUtils.readDirectory(controllersPath, {
      recursive: true,
      includeContent: true,
      patterns: ['*.php']
    });

    for (const file of controllerFiles) {
      if (file.content) {
        // Check for common controller issues
        if (file.content.includes('public function') && !file.content.includes('return')) {
          issues.controllers.push(`Method without return in ${file.relativePath}`);
        }

        if (file.content.includes('$request') && !file.content.includes('Request $request')) {
          issues.controllers.push(`Untyped request parameter in ${file.relativePath}`);
        }
      }
    }
  }

  // AI Debug Analysis
  const langPrompt = outputLang === 'id' ?
    'Berikan analisis debugging dalam bahasa Indonesia.' :
    'Provide debugging analysis in English.';

  const debugPrompt = `
${langPrompt}

Debug this Laravel project for potential issues:

Issues Found:
Routes: ${issues.routes.join(', ')}
Controllers: ${issues.controllers.join(', ')}
Models: ${issues.models.join(', ')}
Config: ${issues.config.join(', ')}

Please analyze and provide:
1. Critical errors that need immediate attention
2. Security vulnerabilities
3. Performance issues
4. Code quality problems
5. Best practices violations
6. Specific fix recommendations

Be specific with file names and line numbers where possible.
`;

  const aiDebug = await groqService.chat(debugPrompt, {
    maxTokens: 2500,
    temperature: 0.2
  });

  // Display results
  console.log(chalk.bold('\n🐛 Debug Results:\n'));

  if (issues.routes.length > 0) {
    console.log(chalk.red('🚨 Route Issues:'));
    issues.routes.forEach(issue => console.log(`  - ${issue}`));
  }

  if (issues.controllers.length > 0) {
    console.log(chalk.red('🎮 Controller Issues:'));
    issues.controllers.forEach(issue => console.log(`  - ${issue}`));
  }

  console.log(chalk.bold('\n🤖 AI Debug Analysis:'));
  console.log(aiDebug);

  // Save debug report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugFile = `laravel-debug-${timestamp}.md`;

  const report = `# Laravel Debug Report
Generated: ${new Date().toISOString()}

## Issues Found

### Routes
${issues.routes.map(i => `- ${i}`).join('\n')}

### Controllers
${issues.controllers.map(i => `- ${i}`).join('\n')}

### Models
${issues.models.map(i => `- ${i}`).join('\n')}

## AI Debug Analysis
${aiDebug}
`;

  await fs.writeFile(debugFile, report);
  console.log(chalk.green(`\n💾 Debug report saved to: ${debugFile}`));
}

async function enhanceLaravelProject(projectPath, options, fileUtils, groqService, outputLang) {
  console.log(chalk.bold('⚡ Laravel Enhancement & Optimization'));
  console.log(chalk.gray('Suggesting improvements and optimizations...\n'));

  const enhancementType = options.type || 'performance';

  const langPrompt = outputLang === 'id' ?
    'Berikan saran enhancement dalam bahasa Indonesia.' :
    'Provide enhancement suggestions in English.';

  const enhancementPrompt = `
${langPrompt}

Provide Laravel enhancement suggestions for: ${enhancementType}

Focus on:
1. Code optimization techniques
2. Architecture improvements
3. Security enhancements
4. Performance optimizations
5. Best practices implementation
6. Modern Laravel features adoption

Provide specific, actionable recommendations with code examples where applicable.
`;

  const aiEnhancement = await groqService.chat(enhancementPrompt, {
    maxTokens: 2500,
    temperature: 0.4
  });

  console.log(chalk.bold(`\n⚡ Laravel ${enhancementType.charAt(0).toUpperCase() + enhancementType.slice(1)} Enhancements:\n`));
  console.log(aiEnhancement);

  // Save enhancement report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const enhancementFile = `laravel-enhancement-${enhancementType}-${timestamp}.md`;

  const report = `# Laravel Enhancement Report - ${enhancementType}
Generated: ${new Date().toISOString()}

## Enhancement Type: ${enhancementType}

## AI Recommendations
${aiEnhancement}
`;

  await fs.writeFile(enhancementFile, report);
  console.log(chalk.green(`\n💾 Enhancement report saved to: ${enhancementFile}`));
}

async function planLaravelDevelopment(projectPath, options, fileUtils, groqService, outputLang) {
  console.log(chalk.bold('📋 Laravel Development Planning'));
  console.log(chalk.gray('Creating comprehensive development roadmap...\n'));

  const langPrompt = outputLang === 'id' ?
    'Buat rencana pengembangan dalam bahasa Indonesia.' :
    'Create development plan in English.';

  const planPrompt = `
${langPrompt}

Create a comprehensive Laravel development plan considering:
1. Current architecture and codebase
2. Modern Laravel features adoption
3. Security enhancements
4. Performance optimization
5. Code quality improvements
6. Testing strategies
7. Deployment and DevOps

Provide detailed roadmap with priorities, timelines, and specific tasks.
`;

  const aiPlan = await groqService.chat(planPrompt, {
    maxTokens: 3000,
    temperature: 0.4
  });

  console.log(chalk.bold('\n📋 Laravel Development Plan:\n'));
  console.log(aiPlan);

  // Save development plan
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planFile = `laravel-dev-plan-${timestamp}.md`;

  const report = `# Laravel Development Plan
Generated: ${new Date().toISOString()}

## Comprehensive Development Roadmap
${aiPlan}
`;

  await fs.writeFile(planFile, report);
  console.log(chalk.green(`\n💾 Development plan saved to: ${planFile}`));
}

module.exports = {
  laravel,
  analyzeLaravelProject,
  debugLaravelProject,
  enhanceLaravelProject,
  planLaravelDevelopment,
  isLaravelProject
};
