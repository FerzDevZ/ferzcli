const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { FileUtils } = require('../../lib/file-utils');
const { GroqService } = require('../../lib/groq-service');

async function debug(target, options) {
  const fileUtils = new FileUtils();
  const groqService = new GroqService();
  await groqService.initialize();

  const targetPath = path.resolve(target);
  const debugType = options.type || 'code';
  const outputLang = options.lang || 'en';
  const verbose = options.verbose || false;

  console.log(chalk.bold.blue('🐛 AI-Powered Debug & Error Analysis'));
  console.log(chalk.gray(`Target: ${targetPath}`));
  console.log(chalk.gray(`Type: ${debugType} | Language: ${outputLang.toUpperCase()}\n`));

  let targetContent = '';
  let fileType = 'unknown';

  // Get target content
  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      console.log(chalk.cyan('📁 Analyzing directory...'));
      const files = await fileUtils.readDirectory(targetPath, {
        recursive: true,
        includeContent: true,
        maxFileSize: 100 * 1024, // 100KB per file
        maxFiles: 20,
        patterns: getDebugPatterns(debugType)
      });

      targetContent = files.map(f => `File: ${f.relativePath}\n${f.content}`).join('\n\n');
      fileType = 'directory';
    } else {
      console.log(chalk.cyan('📄 Analyzing file...'));
      const fileData = await fileUtils.readFile(targetPath);
      targetContent = fileData.content;
      fileType = fileUtils.getFileType(targetPath);
    }
  } catch (error) {
    console.log(chalk.red(`❌ Could not read target: ${error.message}`));
    process.exit(1);
  }

  // Perform debugging based on type
  switch (debugType.toLowerCase()) {
    case 'code':
      await debugCode(targetContent, fileType, targetPath, groqService, outputLang, verbose);
      break;
    case 'database':
      await debugDatabase(targetContent, fileType, targetPath, groqService, outputLang);
      break;
    case 'performance':
      await debugPerformance(targetContent, fileType, targetPath, groqService, outputLang);
      break;
    case 'security':
      await debugSecurity(targetContent, fileType, targetPath, groqService, outputLang);
      break;
    default:
      console.log(chalk.red(`Unknown debug type: ${debugType}`));
      console.log(chalk.yellow('Available types: code, database, performance, security'));
      process.exit(1);
  }
}

function getDebugPatterns(debugType) {
  const patterns = {
    code: ['*.js', '*.ts', '*.php', '*.py', '*.java', '*.cpp', '*.c'],
    database: ['*.sql', '*.php', '*migration*', '*model*'],
    performance: ['*.js', '*.ts', '*.php', '*.py', '*.sql'],
    security: ['*.php', '*.js', '*.ts', '*.env', '*.config']
  };

  return patterns[debugType] || ['*'];
}

async function debugCode(content, fileType, targetPath, groqService, outputLang, verbose) {
  console.log(chalk.bold('🔍 Code Debug Analysis'));

  const langPrompt = outputLang === 'id' ?
    'Berikan analisis debug kode dalam bahasa Indonesia.' :
    'Provide code debugging analysis in English.';

  const debugPrompt = `
${langPrompt}

Debug this code for potential issues, bugs, and improvements:

File Type: ${fileType}
Target: ${targetPath}

Code Content:
${content.substring(0, 3000)}

Please analyze for:
1. Syntax errors
2. Logic errors
3. Potential bugs
4. Code quality issues
5. Best practices violations
6. Performance problems
7. Security vulnerabilities

Provide specific line numbers and actionable fixes.
${verbose ? 'Include detailed explanations and alternative solutions.' : 'Be concise but specific.'}
`;

  const aiDebug = await groqService.chat(debugPrompt, {
    maxTokens: verbose ? 3000 : 2000,
    temperature: 0.1
  });

  console.log(chalk.bold('\n🐛 Code Debug Results:\n'));
  console.log(aiDebug);

  // Save debug report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugFile = `debug-code-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Code Debug Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Debug Type**: Code Analysis

## Debug Analysis
${aiDebug}

## Original Code Preview
\`\`\`${fileType}
${content.substring(0, 1000)}${content.length > 1000 ? '\n... (truncated)' : ''}
\`\`\`
`;

  await fs.writeFile(debugFile, report);
  console.log(chalk.green(`\n💾 Debug report saved to: ${debugFile}`));
}

async function debugDatabase(content, fileType, targetPath, groqService, outputLang) {
  console.log(chalk.bold('🗄️  Database Debug Analysis'));

  const langPrompt = outputLang === 'id' ?
    'Berikan analisis debug database dalam bahasa Indonesia.' :
    'Provide database debugging analysis in English.';

  const debugPrompt = `
${langPrompt}

Debug this database-related code for potential issues:

File Type: ${fileType}
Target: ${targetPath}

Code Content:
${content.substring(0, 3000)}

Please analyze for:
1. SQL injection vulnerabilities
2. Query optimization issues
3. Connection problems
4. Transaction issues
5. Data integrity problems
6. Migration issues
7. ORM usage problems

Provide specific fixes and best practices.
`;

  const aiDebug = await groqService.chat(debugPrompt, {
    maxTokens: 2500,
    temperature: 0.1
  });

  console.log(chalk.bold('\n🗄️  Database Debug Results:\n'));
  console.log(aiDebug);

  // Save debug report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugFile = `debug-database-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Database Debug Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Debug Type**: Database Analysis

## Debug Analysis
${aiDebug}
`;

  await fs.writeFile(debugFile, report);
  console.log(chalk.green(`\n💾 Debug report saved to: ${debugFile}`));
}

async function debugPerformance(content, fileType, targetPath, groqService, outputLang) {
  console.log(chalk.bold('⚡ Performance Debug Analysis'));

  const langPrompt = outputLang === 'id' ?
    'Berikan analisis debug performa dalam bahasa Indonesia.' :
    'Provide performance debugging analysis in English.';

  const debugPrompt = `
${langPrompt}

Analyze this code for performance issues and optimization opportunities:

File Type: ${fileType}
Target: ${targetPath}

Code Content:
${content.substring(0, 3000)}

Please analyze for:
1. Inefficient algorithms
2. Memory leaks
3. Database query optimization
4. Caching opportunities
5. Resource usage issues
6. Bottlenecks
7. Scalability problems

Provide specific optimization recommendations with code examples.
`;

  const aiDebug = await groqService.chat(debugPrompt, {
    maxTokens: 2500,
    temperature: 0.3
  });

  console.log(chalk.bold('\n⚡ Performance Debug Results:\n'));
  console.log(aiDebug);

  // Save debug report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugFile = `debug-performance-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Performance Debug Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Debug Type**: Performance Analysis

## Performance Analysis
${aiDebug}
`;

  await fs.writeFile(debugFile, report);
  console.log(chalk.green(`\n💾 Debug report saved to: ${debugFile}`));
}

async function debugSecurity(content, fileType, targetPath, groqService, outputLang) {
  console.log(chalk.bold('🔒 Security Debug Analysis'));

  const langPrompt = outputLang === 'id' ?
    'Berikan analisis debug keamanan dalam bahasa Indonesia.' :
    'Provide security debugging analysis in English.';

  const debugPrompt = `
${langPrompt}

Perform security audit on this code:

File Type: ${fileType}
Target: ${targetPath}

Code Content:
${content.substring(0, 3000)}

Please analyze for:
1. SQL injection vulnerabilities
2. XSS (Cross-Site Scripting)
3. CSRF (Cross-Site Request Forgery)
4. Authentication bypass
5. Authorization issues
6. Input validation problems
7. Sensitive data exposure
8. Security misconfigurations

Provide severity levels and specific remediation steps.
`;

  const aiDebug = await groqService.chat(debugPrompt, {
    maxTokens: 2500,
    temperature: 0.1
  });

  console.log(chalk.bold('\n🔒 Security Debug Results:\n'));
  console.log(aiDebug);

  // Save debug report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const debugFile = `debug-security-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Security Debug Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Debug Type**: Security Audit

## Security Analysis
${aiDebug}

## Risk Levels
- **Critical**: Immediate action required
- **High**: Should be addressed soon
- **Medium**: Recommended to fix
- **Low**: Optional improvements
`;

  await fs.writeFile(debugFile, report);
  console.log(chalk.green(`\n💾 Security audit saved to: ${debugFile}`));
}

module.exports = { debug };
