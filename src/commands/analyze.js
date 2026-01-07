const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const Table = require('cli-table3');
const { FileUtils } = require('../../lib/file-utils');
const { GroqService } = require('../../lib/groq-service');

async function analyze(targetPath, options) {
  const fileUtils = new FileUtils();
  const groqService = new GroqService();
  await groqService.initialize();

  try {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      await analyzeDirectory(targetPath, options, fileUtils, groqService);
    } else {
      await analyzeFile(targetPath, options, fileUtils, groqService);
    }
  } catch (error) {
    console.error(chalk.red('Analysis failed:', error.message));
    process.exit(1);
  }
}

async function analyzeDirectory(dirPath, options, fileUtils, groqService) {
  console.log(chalk.bold.blue(`🔍 Analyzing directory: ${dirPath}`));

  const structure = await fileUtils.analyzeProjectStructure(dirPath, {
    maxDepth: parseInt(options.depth) || 3,
    includeFileContents: false,
    maxFilesPerType: 10
  });

  // Display summary
  console.log(chalk.bold('\n📊 Project Summary:'));
  console.log(`Total Files: ${structure.summary.totalFiles}`);
  console.log(`Total Directories: ${structure.summary.totalDirectories}`);
  console.log(`Total Size: ${structure.summary.totalSize}`);
  console.log(`File Types: ${structure.summary.fileTypes}`);

  // Display file type breakdown
  if (options.format === 'text') {
    console.log(chalk.bold('\n📁 File Type Breakdown:'));

    const typeTable = new Table({
      head: ['Type', 'Count', 'Total Size', 'Avg Size'],
      style: { head: ['cyan'] }
    });

    Object.entries(structure.summary.typeBreakdown).forEach(([ext, data]) => {
      typeTable.push([ext, data.count, data.totalSize, data.averageSize]);
    });

    console.log(typeTable.toString());

    // Display recent files
    console.log(chalk.bold('\n🕒 Recent Files:'));
    const recentTable = new Table({
      head: ['File', 'Modified', 'Size'],
      style: { head: ['cyan'] }
    });

    structure.recentFiles.slice(0, 10).forEach(file => {
      recentTable.push([
        file.path.length > 50 ? '...' + file.path.slice(-47) : file.path,
        new Date(file.modified).toLocaleDateString(),
        file.size
      ]);
    });

    console.log(recentTable.toString());
  } else {
    console.log(JSON.stringify(structure, null, 2));
  }

  // AI-powered analysis if requested
  const { performAiAnalysis } = await require('inquirer').prompt([
    {
      type: 'confirm',
      name: 'performAiAnalysis',
      message: 'Perform AI-powered code analysis on key files?',
      default: false
    }
  ]);

  if (performAiAnalysis) {
    await performAIAnalysis(dirPath, fileUtils, groqService);
  }
}

async function analyzeFile(filePath, options, fileUtils, groqService) {
  console.log(chalk.bold.blue(`🔍 Analyzing file: ${filePath}`));

  const fileData = await fileUtils.readFile(filePath);
  const fileType = fileUtils.getFileType(filePath);

  console.log(chalk.bold('\n📄 File Information:'));
  console.log(`Path: ${fileData.path}`);
  console.log(`Type: ${fileType}`);
  console.log(`Size: ${fileUtils.formatBytes(fileData.size)}`);
  console.log(`Lines: ${fileData.lines}`);
  console.log(`Modified: ${fileData.modified.toLocaleString()}`);

  if (options.format === 'json') {
    console.log(JSON.stringify(fileData, null, 2));
    return;
  }

  // Show file preview
  console.log(chalk.bold('\n📖 File Preview:'));
  const lines = fileData.content.split('\n');
  const previewLines = lines.slice(0, 20);
  previewLines.forEach((line, index) => {
    const lineNum = (index + 1).toString().padStart(4, ' ');
    console.log(chalk.gray(lineNum + ': ') + line);
  });

  if (lines.length > 20) {
    console.log(chalk.gray(`... and ${lines.length - 20} more lines`));
  }

  // AI analysis for code files
  if (isCodeFile(fileType) && fileData.size < 100 * 1024) { // < 100KB
    console.log(chalk.bold('\n🤖 AI Code Analysis:'));

    const analysis = await groqService.analyzeCode(fileData.content, {
      language: fileType,
      task: 'analyze'
    });

    console.log(analysis);
  }
}

async function performAIAnalysis(dirPath, fileUtils, groqService) {
  console.log(chalk.bold('\n🤖 Performing AI-powered project analysis...'));

  // Get key files to analyze
  const files = await fileUtils.readDirectory(dirPath, {
    recursive: true,
    includeContent: true,
    maxFileSize: 50 * 1024, // 50KB limit
    maxFiles: 10,
    patterns: [
      '**/*.{js,ts,jsx,tsx,py,java,cpp,c,cs,php,rb,go,rs}',
      'package.json',
      'requirements.txt',
      'README.md',
      'Dockerfile'
    ]
  });

  const codeFiles = files.filter(f => f.content && isCodeFile(fileUtils.getFileType(f.path)));

  if (codeFiles.length === 0) {
    console.log(chalk.yellow('No analyzable code files found.'));
    return;
  }

  console.log(chalk.gray(`Analyzing ${codeFiles.length} key files...`));

  // Analyze each file
  for (const file of codeFiles) {
    console.log(chalk.bold(`\n📄 Analyzing: ${file.relativePath}`));

    try {
      const analysis = await groqService.analyzeCode(file.content, {
        language: fileUtils.getFileType(file.path),
        task: 'analyze'
      });

      // Show summary
      const summary = analysis.split('\n').slice(0, 5).join('\n');
      console.log(chalk.gray(summary));

      if (analysis.split('\n').length > 5) {
        console.log(chalk.gray('... (truncated)'));
      }
    } catch (error) {
      console.log(chalk.red(`Analysis failed: ${error.message}`));
    }
  }

  // Overall project insights
  console.log(chalk.bold('\n🏗️  Project Insights:'));

  const projectOverview = codeFiles.map(f => `${f.relativePath} (${fileUtils.getFileType(f.path)})`).join('\n');
  const insightPrompt = `Based on these project files, provide brief insights about the project structure, technology stack, and potential areas for improvement:\n\n${projectOverview}`;

  try {
    const insights = await groqService.chat(insightPrompt, {
      maxTokens: 300,
      temperature: 0.3
    });

    console.log(insights);
  } catch (error) {
    console.log(chalk.red(`Failed to generate insights: ${error.message}`));
  }
}

function isCodeFile(fileType) {
  const codeTypes = [
    'javascript', 'typescript', 'react', 'react-typescript',
    'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby',
    'go', 'rust', 'swift', 'kotlin', 'scala', 'shell'
  ];
  return codeTypes.includes(fileType);
}

module.exports = { analyze };
