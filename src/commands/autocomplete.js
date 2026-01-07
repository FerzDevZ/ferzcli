const chalk = require('chalk').default || require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');

async function autocomplete(prefix, options) {
  const groqService = new GroqService();
  await groqService.initialize();

  const fileUtils = new FileUtils();
  const outputLang = options.lang || 'en';

  console.log(chalk.bold.blue('✨ AI-Powered Code Autocomplete'));
  console.log(chalk.gray(`Completing: "${prefix}" | Language: ${outputLang.toUpperCase()}\n`));

  let context = '';
  let language = options.language;

  // Try to detect language from current directory files
  if (!language) {
    language = await detectLanguageFromProject(process.cwd(), fileUtils);
  }

  // Gather context from current project
  try {
    const projectFiles = await fileUtils.readDirectory(process.cwd(), {
      recursive: false, // Only current directory
      includeContent: true,
      maxFileSize: 10 * 1024, // 10KB per file
      maxFiles: 5,
      patterns: [`**/*.{${getLanguageExtensions(language).join(',')}}`]
    });

    const relevantFiles = projectFiles
      .filter(f => f.content && f.content.includes(prefix.split(' ')[0])) // Find files with similar code
      .slice(0, 3);

    if (relevantFiles.length > 0) {
      context = `Project context from ${relevantFiles.length} similar file(s):\n\n`;
      relevantFiles.forEach(file => {
        context += `File: ${file.relativePath}\n${file.content.substring(0, 1000)}\n\n`;
      });
    }
  } catch (error) {
    // Ignore context loading errors
  }

  // Get multiple completion suggestions
  const suggestions = await generateMultipleCompletions(prefix, context, language, groqService);

  if (suggestions.length === 0) {
    console.log(chalk.yellow('No completion suggestions generated.'));
    return;
  }

  console.log(chalk.bold('💡 Completion Suggestions:\n'));

  suggestions.forEach((suggestion, index) => {
    console.log(chalk.cyan(`Option ${index + 1}:`));
    console.log(chalk.green(suggestion.completion));
    if (suggestion.explanation) {
      console.log(chalk.gray(`  ${suggestion.explanation}`));
    }
    console.log();
  });

  // Show usage examples if applicable
  if (language && suggestions[0].completion) {
    console.log(chalk.bold('📝 Usage Example:'));
    console.log(chalk.gray('Original: ') + prefix);
    console.log(chalk.green('Completed: ') + prefix + suggestions[0].completion);
    console.log();
  }
}

async function generateMultipleCompletions(prefix, context, language, groqService) {
  const suggestions = [];

  // Generate multiple completion variations
  const prompts = [
    {
      prompt: `Complete this ${language} code naturally: ${prefix}`,
      temperature: 0.1,
      explanation: "Conservative completion"
    },
    {
      prompt: `Complete this ${language} code with best practices: ${prefix}`,
      temperature: 0.3,
      explanation: "Best practices focused"
    },
    {
      prompt: `Complete this ${language} code creatively: ${prefix}`,
      temperature: 0.7,
      explanation: "Creative completion"
    }
  ];

  for (const promptConfig of prompts) {
    try {
      const fullPrompt = context ?
        `Context:\n${context}\n\n${promptConfig.prompt}` :
        promptConfig.prompt;

      const messages = [
        {
          role: 'system',
          content: `You are an expert ${language} programmer providing code completions. Only return the completion text, no explanations or code blocks.`
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ];

      const completion = await groqService.client.chat.completions.create({
        messages: messages,
        model: groqService.configManager.getAutocompleteModel(),
        temperature: promptConfig.temperature,
        max_tokens: 256,
        stop: ['\n\n', '```', ';']
      });

      const completionText = completion.choices[0]?.message?.content?.trim();

      if (completionText && completionText.length > 0 && !suggestions.some(s => s.completion === completionText)) {
        suggestions.push({
          completion: completionText,
          explanation: promptConfig.explanation
        });
      }
    } catch (error) {
      // Skip failed suggestions
      continue;
    }
  }

  // If we don't have enough suggestions, try a more general approach
  if (suggestions.length < 2) {
    try {
      const generalCompletion = await groqService.completeCode(prefix, {
        language: language,
        context: context,
        temperature: 0.5
      });

      if (generalCompletion && !suggestions.some(s => s.completion === generalCompletion)) {
        suggestions.push({
          completion: generalCompletion,
          explanation: "General completion"
        });
      }
    } catch (error) {
      // Ignore
    }
  }

  return suggestions.slice(0, 3); // Return top 3 suggestions
}

async function detectLanguageFromProject(projectPath, fileUtils) {
  try {
    const files = await fileUtils.readDirectory(projectPath, {
      recursive: false,
      includeContent: false,
      maxFiles: 50
    });

    const extensions = {};
    files.forEach(file => {
      if (!file.isDirectory) {
        const ext = path.extname(file.path).toLowerCase();
        extensions[ext] = (extensions[ext] || 0) + 1;
      }
    });

    // Find most common extension
    let mostCommon = null;
    let maxCount = 0;

    for (const [ext, count] of Object.entries(extensions)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = ext;
      }
    }

    // Map extension to language
    const languageMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'javascript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust'
    };

    return languageMap[mostCommon] || 'javascript';
  } catch (error) {
    return 'javascript'; // Default fallback
  }
}

function getLanguageExtensions(language) {
  const extensionMap = {
    javascript: ['js', 'jsx', 'mjs'],
    typescript: ['ts', 'tsx'],
    python: ['py', 'pyw'],
    java: ['java'],
    cpp: ['cpp', 'cc', 'cxx', 'c++'],
    c: ['c', 'h'],
    csharp: ['cs'],
    php: ['php'],
    ruby: ['rb'],
    go: ['go'],
    rust: ['rs']
  };

  return extensionMap[language] || ['js'];
}

module.exports = { autocomplete };
