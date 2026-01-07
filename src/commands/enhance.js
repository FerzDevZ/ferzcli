const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const path = require('path');
const inquirer = require('inquirer').default || require('inquirer');
const { FileUtils } = require('../../lib/file-utils');
const { GroqService } = require('../../lib/groq-service');

async function enhance(target, options) {
  const fileUtils = new FileUtils();
  const groqService = new GroqService();
  await groqService.initialize();

  const targetPath = path.resolve(target);
  const enhancementType = options.type || 'performance';
  const outputLang = options.lang || 'en';
  const writeChanges = options.write || false;

  console.log(chalk.bold.blue('⚡ AI-Powered Code Enhancement & Optimization'));
  console.log(chalk.gray(`Target: ${targetPath}`));
  console.log(chalk.gray(`Type: ${enhancementType} | Language: ${outputLang.toUpperCase()}`));
  console.log(chalk.gray(`Write Changes: ${writeChanges ? 'YES' : 'NO (preview only)'}\n`));

  let targetContent = '';
  let fileType = 'unknown';
  let isDirectory = false;

  // Get target content
  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      isDirectory = true;
      console.log(chalk.cyan('📁 Analyzing directory for enhancement opportunities...'));

      // Get overview of files in directory
      const files = await fileUtils.readDirectory(targetPath, {
        recursive: false,
        includeContent: false,
        maxFiles: 50
      });

      targetContent = `Directory: ${targetPath}\nFiles: ${files.length}\n${files.map(f => `${f.relativePath} (${fileUtils.formatBytes(f.size || 0)})`).join('\n')}`;
      fileType = 'directory';
    } else {
      console.log(chalk.cyan('📄 Analyzing file for enhancements...'));
      const fileData = await fileUtils.readFile(targetPath);
      targetContent = fileData.content;
      fileType = fileUtils.getFileType(targetPath);
    }
  } catch (error) {
    console.log(chalk.red(`❌ Could not read target: ${error.message}`));
    process.exit(1);
  }

  // Perform enhancement based on type
  switch (enhancementType.toLowerCase()) {
    case 'performance':
      await enhancePerformance(targetContent, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory);
      break;
    case 'security':
      await enhanceSecurity(targetContent, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory);
      break;
    case 'readability':
      await enhanceReadability(targetContent, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory);
      break;
    case 'architecture':
      await enhanceArchitecture(targetContent, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory);
      break;
    default:
      console.log(chalk.red(`Unknown enhancement type: ${enhancementType}`));
      console.log(chalk.yellow('Available types: performance, security, readability, architecture'));
      process.exit(1);
  }
}

async function enhancePerformance(content, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory) {
  console.log(chalk.bold('⚡ Performance Enhancement'));

  const langPrompt = outputLang === 'id' ?
    'Berikan saran enhancement performa dalam bahasa Indonesia dengan kode yang dapat diimplementasikan.' :
    'Provide performance enhancement suggestions in English with implementable code.';

  const enhancePrompt = `
${langPrompt}

Enhance this code for better performance:

File Type: ${fileType}
Target: ${targetPath}
Is Directory: ${isDirectory}

Code/Content:
${content.substring(0, 3000)}

Provide specific performance optimizations:
1. Algorithm improvements
2. Database query optimization
3. Caching strategies
4. Memory optimization
5. I/O improvements
6. Code profiling suggestions

${writeChanges ? 'Provide the complete optimized code that can be directly implemented.' : 'Provide specific recommendations with before/after code examples.'}
`;

  const aiEnhancement = await groqService.chat(enhancePrompt, {
    maxTokens: writeChanges ? 4000 : 3000,
    temperature: 0.3
  });

  console.log(chalk.bold('\n⚡ Performance Enhancement Results:\n'));
  console.log(aiEnhancement);

  if (writeChanges && !isDirectory) {
    await applyEnhancement(targetPath, aiEnhancement, 'performance', outputLang);
  }

  // Save enhancement report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const enhancementFile = `enhance-performance-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Performance Enhancement Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Enhancement**: Performance Optimization

## AI Enhancement Recommendations
${aiEnhancement}

## Original Code Preview
\`\`\`${fileType}
${content.substring(0, 500)}${content.length > 500 ? '\n... (truncated)' : ''}
\`\`\`
`;

  await fs.writeFile(enhancementFile, report);
  console.log(chalk.green(`\n💾 Enhancement report saved to: ${enhancementFile}`));
}

async function enhanceSecurity(content, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory) {
  console.log(chalk.bold('🔒 Security Enhancement'));

  const langPrompt = outputLang === 'id' ?
    'Berikan saran enhancement keamanan dalam bahasa Indonesia dengan kode yang dapat diimplementasikan.' :
    'Provide security enhancement suggestions in English with implementable code.';

  const enhancePrompt = `
${langPrompt}

Enhance this code for better security:

File Type: ${fileType}
Target: ${targetPath}
Is Directory: ${isDirectory}

Code/Content:
${content.substring(0, 3000)}

Provide specific security enhancements:
1. Input validation and sanitization
2. SQL injection prevention
3. XSS protection
4. CSRF protection
5. Authentication & authorization
6. Secure coding practices
7. Security headers and configurations

${writeChanges ? 'Provide the complete secured code that can be directly implemented.' : 'Provide specific recommendations with secure code examples.'}
`;

  const aiEnhancement = await groqService.chat(enhancePrompt, {
    maxTokens: writeChanges ? 4000 : 3000,
    temperature: 0.2
  });

  console.log(chalk.bold('\n🔒 Security Enhancement Results:\n'));
  console.log(aiEnhancement);

  if (writeChanges && !isDirectory) {
    await applyEnhancement(targetPath, aiEnhancement, 'security', outputLang);
  }

  // Save enhancement report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const enhancementFile = `enhance-security-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Security Enhancement Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Enhancement**: Security Hardening

## AI Security Recommendations
${aiEnhancement}
`;

  await fs.writeFile(enhancementFile, report);
  console.log(chalk.green(`\n💾 Security enhancement saved to: ${enhancementFile}`));
}

async function enhanceReadability(content, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory) {
  console.log(chalk.bold('📖 Code Readability Enhancement'));

  const langPrompt = outputLang === 'id' ?
    'Berikan saran enhancement readability dalam bahasa Indonesia dengan kode yang lebih bersih.' :
    'Provide readability enhancement suggestions in English with cleaner code.';

  const enhancePrompt = `
${langPrompt}

Improve code readability and maintainability:

File Type: ${fileType}
Target: ${targetPath}
Is Directory: ${isDirectory}

Code/Content:
${content.substring(0, 3000)}

Provide specific readability improvements:
1. Better variable naming
2. Code formatting and structure
3. Comments and documentation
4. Function decomposition
5. Remove code duplication
6. Consistent coding style
7. Meaningful error messages

${writeChanges ? 'Provide the complete refactored code with improved readability.' : 'Provide specific recommendations with before/after examples.'}
`;

  const aiEnhancement = await groqService.chat(enhancePrompt, {
    maxTokens: writeChanges ? 4000 : 3000,
    temperature: 0.4
  });

  console.log(chalk.bold('\n📖 Readability Enhancement Results:\n'));
  console.log(aiEnhancement);

  if (writeChanges && !isDirectory) {
    await applyEnhancement(targetPath, aiEnhancement, 'readability', outputLang);
  }

  // Save enhancement report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const enhancementFile = `enhance-readability-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Readability Enhancement Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Enhancement**: Code Readability

## AI Readability Improvements
${aiEnhancement}
`;

  await fs.writeFile(enhancementFile, report);
  console.log(chalk.green(`\n💾 Readability enhancement saved to: ${enhancementFile}`));
}

async function enhanceArchitecture(content, fileType, targetPath, groqService, outputLang, writeChanges, isDirectory) {
  console.log(chalk.bold('🏗️  Architecture Enhancement'));

  const langPrompt = outputLang === 'id' ?
    'Berikan saran enhancement arsitektur dalam bahasa Indonesia.' :
    'Provide architecture enhancement suggestions in English.';

  const enhancePrompt = `
${langPrompt}

Improve code architecture and design patterns:

File Type: ${fileType}
Target: ${targetPath}
Is Directory: ${isDirectory}

Code/Content:
${content.substring(0, 3000)}

Provide architectural improvements:
1. Design pattern recommendations
2. SOLID principles application
3. Separation of concerns
4. Dependency injection
5. Interface design
6. Code organization
7. Scalability improvements

${writeChanges ? 'Provide architectural refactoring suggestions with implementation examples.' : 'Provide high-level architectural recommendations and design patterns.'}
`;

  const aiEnhancement = await groqService.chat(enhancePrompt, {
    maxTokens: 3000,
    temperature: 0.3
  });

  console.log(chalk.bold('\n🏗️  Architecture Enhancement Results:\n'));
  console.log(aiEnhancement);

  if (writeChanges && !isDirectory) {
    await applyEnhancement(targetPath, aiEnhancement, 'architecture', outputLang);
  }

  // Save enhancement report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const enhancementFile = `enhance-architecture-${path.basename(targetPath)}-${timestamp}.md`;

  const report = `# Architecture Enhancement Report
Generated: ${new Date().toISOString()}

## Target
- **File**: ${targetPath}
- **Type**: ${fileType}
- **Enhancement**: Architecture Improvement

## AI Architecture Recommendations
${aiEnhancement}
`;

  await fs.writeFile(enhancementFile, report);
  console.log(chalk.green(`\n💾 Architecture enhancement saved to: ${enhancementFile}`));
}

async function applyEnhancement(targetPath, aiEnhancement, enhancementType, outputLang) {
  console.log(chalk.yellow('\n⚠️  Write mode enabled. AI will attempt to apply changes directly.'));

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Apply ${enhancementType} enhancements to ${path.basename(targetPath)}?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.gray('Changes not applied. Use --write flag to enable write mode.'));
    return;
  }

  // Extract code from AI response (this is a simplified implementation)
  // In a real implementation, you'd need more sophisticated parsing
  const codeMatch = aiEnhancement.match(/```[\w]*\n([\s\S]*?)\n```/);

  if (codeMatch && codeMatch[1]) {
    const enhancedCode = codeMatch[1];

    // Create backup
    const backupPath = `${targetPath}.backup.${Date.now()}`;
    await fs.copy(targetPath, backupPath);

    // Apply changes
    await fs.writeFile(targetPath, enhancedCode);

    console.log(chalk.green(`✅ Enhanced code applied to: ${targetPath}`));
    console.log(chalk.gray(`📋 Backup created: ${backupPath}`));
  } else {
    console.log(chalk.red('❌ Could not extract enhanced code from AI response.'));
    console.log(chalk.gray('Please review the enhancement report and apply changes manually.'));
  }
}

module.exports = { enhance };
