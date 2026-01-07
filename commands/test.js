const { Command } = require('commander');
const TestingFramework = require('../lib/testing');

async function test(options) {
  const projectPath = process.cwd();
  const testingFramework = new TestingFramework(projectPath, {
    framework: options.framework,
    coverage: !options.skipCoverage,
    parallel: options.parallel,
    watch: options.watch
  });

  try {
    console.log('🧪 ferzcli Testing Suite');
    console.log('======================');

    if (options.setup) {
      console.log('📦 Setting up testing framework...');
      const result = await testingFramework.setupTesting();
      console.log(`✅ ${result.framework} setup completed!`);
      return;
    }

    if (options.generate) {
      console.log(`📝 Generating test templates for: ${options.generate}`);
      const templates = await testingFramework.generateTestTemplates(options.generate);
      console.log('📄 Test templates generated:');
      console.log('- Unit test:', templates.unit.length, 'characters');
      console.log('- Integration test:', templates.integration.length, 'characters');
      console.log('- E2E test:', templates.e2e.length, 'characters');
      return;
    }

    // Run tests
    console.log('🚀 Running tests...');
    const result = await testingFramework.runTests({
      coverage: !options.skipCoverage,
      watch: options.watch
    });

    if (result.status === 'success') {
      console.log('✅ All tests passed!');
      
      if (!options.skipCoverage) {
        const coverage = await testingFramework.generateCoverageReport();
        if (coverage) {
          console.log(`📊 Coverage report: ${coverage.path}`);
        }
      }
    } else {
      console.log('❌ Tests failed:', result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Testing error:', error.message);
    process.exit(1);
  }
}

function createTestCommand() {
  return new Command('test')
    .description('Advanced testing suite with multiple framework support')
    .option('-f, --framework <type>', 'Testing framework (jest, phpunit, pytest, cypress, playwright)', 'auto')
    .option('--setup', 'Setup testing framework for the project')
    .option('--generate <feature>', 'Generate test templates for a feature')
    .option('--skip-coverage', 'Skip coverage report generation')
    .option('--parallel', 'Run tests in parallel')
    .option('--watch', 'Run tests in watch mode')
    .action(test);
}

module.exports = { test: createTestCommand };
