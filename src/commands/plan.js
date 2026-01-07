const chalk = require('chalk').default || require('chalk');
const inquirer = require('inquirer').default || require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');

async function plan(task, options) {
  const groqService = new GroqService();
  await groqService.initialize();

  console.log(chalk.bold.blue('📋 AI-Powered Development Planning'));
  console.log(chalk.gray(`Planning: "${task}"\n`));

  // Gather project context
  const projectContext = await gatherProjectContext(process.cwd());

  // Get additional details from user
  const details = await inquirer.prompt([
    {
      type: 'list',
      name: 'complexity',
      message: 'Project complexity level:',
      choices: [
        { name: 'Simple - Basic feature or small fix', value: 'simple' },
        { name: 'Medium - Moderate feature with some complexity', value: 'medium' },
        { name: 'Complex - Large feature or system change', value: 'complex' }
      ],
      default: options.complexity || 'medium'
    },
    {
      type: 'input',
      name: 'techStack',
      message: 'Technology stack (optional):',
      default: options.tech || ''
    },
    {
      type: 'input',
      name: 'timeframe',
      message: 'Desired timeframe (optional):',
      default: ''
    },
    {
      type: 'confirm',
      name: 'includeRisks',
      message: 'Include risk assessment?',
      default: true
    },
    {
      type: 'confirm',
      name: 'savePlan',
      message: 'Save plan to file?',
      default: false
    }
  ]);

  // Generate comprehensive plan
  const planData = await generateComprehensivePlan(task, details, projectContext, groqService);

  // Display plan
  displayPlan(planData);

  // Save plan if requested
  if (details.savePlan) {
    const filename = await savePlan(planData, task);
    console.log(chalk.green(`\n✓ Plan saved to: ${filename}`));
  }

  // Interactive planning session
  await interactivePlanning(planData, groqService);
}

async function gatherProjectContext(projectPath) {
  const fileUtils = new FileUtils();

  try {
    const structure = await fileUtils.analyzeProjectStructure(projectPath, {
      maxDepth: 2,
      includeFileContents: false
    });

    // Try to read key project files
    const keyFiles = ['package.json', 'requirements.txt', 'README.md', 'Dockerfile', 'Makefile'];
    const context = {};

    for (const file of keyFiles) {
      try {
        const filePath = path.join(projectPath, file);
        const exists = await fs.pathExists(filePath);
        if (exists) {
          const content = await fs.readFile(filePath, 'utf8');
          context[file] = content.substring(0, 1000); // First 1000 chars
        }
      } catch (error) {
        // Skip missing files
      }
    }

    return {
      structure: structure.summary,
      keyFiles: context,
      projectType: detectProjectType(context)
    };
  } catch (error) {
    return { structure: null, keyFiles: {}, projectType: 'unknown' };
  }
}

function detectProjectType(context) {
  if (context['package.json']) {
    const pkg = JSON.parse(context['package.json'] || '{}');
    if (pkg.dependencies || pkg.devDependencies) {
      return 'javascript/nodejs';
    }
  }

  if (context['requirements.txt']) {
    return 'python';
  }

  if (context['Dockerfile']) {
    return 'docker';
  }

  return 'unknown';
}

async function generateComprehensivePlan(task, details, context, groqService) {
  const systemPrompt = `You are an expert project manager and software architect. Create detailed, actionable development plans.

Return your response as a JSON object with this exact structure:
{
  "executiveSummary": "Brief overview",
  "objectives": ["Objective 1", "Objective 2"],
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Task title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "estimatedHours": 4,
      "dependencies": ["TASK-000"],
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"]
    }
  ],
  "timeline": {
    "totalWeeks": 2,
    "milestones": [
      {
        "week": 1,
        "deliverables": ["Deliverable 1"],
        "tasks": ["TASK-001"]
      }
    ]
  },
  "resources": ["Resource 1", "Resource 2"],
  "risks": [
    {
      "risk": "Risk description",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation": "Mitigation strategy"
    }
  ],
  "successMetrics": ["Metric 1", "Metric 2"]
}`;

  const contextStr = context.structure ?
    `Project Structure: ${JSON.stringify(context.structure, null, 2)}\nProject Type: ${context.projectType}` :
    'No project context available';

  const userPrompt = `Create a comprehensive development plan for: "${task}"

Details:
- Complexity: ${details.complexity}
- Technology Stack: ${details.techStack || 'Not specified'}
- Timeframe: ${details.timeframe || 'Not specified'}
- Include Risk Assessment: ${details.includeRisks}

Project Context:
${contextStr}

Please provide a detailed, realistic plan with specific tasks, timelines, and considerations.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const response = await groqService.client.chat.completions.create({
      messages: messages,
      model: groqService.configManager.getDefaultModel(),
      temperature: 0.3,
      max_tokens: groqService.configManager.getMaxTokens()
    });

    const content = response.choices[0]?.message?.content;

    // Try to parse JSON response
    try {
      return JSON.parse(content);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from text
      return parseTextPlan(content, task, details);
    }
  } catch (error) {
    throw new Error(`Plan generation failed: ${error.message}`);
  }
}

function parseTextPlan(textContent, task, details) {
  // Fallback parser for non-JSON responses
  return {
    executiveSummary: `Plan for: ${task}`,
    objectives: ['Complete the specified task'],
    tasks: [
      {
        id: 'TASK-001',
        title: task,
        description: textContent.substring(0, 200),
        priority: 'medium',
        estimatedHours: 8,
        dependencies: [],
        acceptanceCriteria: ['Task completed successfully']
      }
    ],
    timeline: {
      totalWeeks: 1,
      milestones: [
        {
          week: 1,
          deliverables: [task],
          tasks: ['TASK-001']
        }
      ]
    },
    resources: ['Development environment'],
    risks: [],
    successMetrics: ['Task completion']
  };
}

function displayPlan(plan) {
  console.log(chalk.bold.green('\n📋 DEVELOPMENT PLAN\n'));

  // Executive Summary
  console.log(chalk.bold('🎯 Executive Summary:'));
  console.log(plan.executiveSummary || 'No summary provided');
  console.log();

  // Objectives
  if (plan.objectives && plan.objectives.length > 0) {
    console.log(chalk.bold('🎯 Objectives:'));
    plan.objectives.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj}`);
    });
    console.log();
  }

  // Tasks
  if (plan.tasks && plan.tasks.length > 0) {
    console.log(chalk.bold('📝 Tasks:'));

    plan.tasks.forEach((task, i) => {
      const priorityColor = task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'yellow' : 'green';
      console.log(chalk[priorityColor](`  ${i + 1}. ${task.title} (${task.priority} priority)`));
      console.log(chalk.gray(`     ID: ${task.id}`));
      console.log(chalk.gray(`     Est. Hours: ${task.estimatedHours || 'N/A'}`));
      if (task.description) {
        console.log(chalk.gray(`     Description: ${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}`));
      }
      if (task.dependencies && task.dependencies.length > 0) {
        console.log(chalk.gray(`     Dependencies: ${task.dependencies.join(', ')}`));
      }
      console.log();
    });
  }

  // Timeline
  if (plan.timeline) {
    console.log(chalk.bold('⏰ Timeline:'));
    console.log(`Total Duration: ${plan.timeline.totalWeeks || 1} week(s)`);

    if (plan.timeline.milestones) {
      plan.timeline.milestones.forEach(milestone => {
        console.log(chalk.cyan(`  Week ${milestone.week}:`));
        if (milestone.deliverables) {
          console.log(chalk.gray(`    Deliverables: ${milestone.deliverables.join(', ')}`));
        }
        if (milestone.tasks) {
          console.log(chalk.gray(`    Tasks: ${milestone.tasks.join(', ')}`));
        }
      });
    }
    console.log();
  }

  // Risks
  if (plan.risks && plan.risks.length > 0) {
    console.log(chalk.bold('⚠️  Risk Assessment:'));
    plan.risks.forEach((risk, i) => {
      console.log(`  ${i + 1}. ${risk.risk}`);
      console.log(chalk.gray(`     Probability: ${risk.probability || 'medium'} | Impact: ${risk.impact || 'medium'}`));
      if (risk.mitigation) {
        console.log(chalk.gray(`     Mitigation: ${risk.mitigation}`));
      }
      console.log();
    });
  }

  // Resources and Success Metrics
  if (plan.resources && plan.resources.length > 0) {
    console.log(chalk.bold('🛠️  Resources Needed:'));
    plan.resources.forEach(resource => {
      console.log(`  • ${resource}`);
    });
    console.log();
  }

  if (plan.successMetrics && plan.successMetrics.length > 0) {
    console.log(chalk.bold('📊 Success Metrics:'));
    plan.successMetrics.forEach(metric => {
      console.log(`  • ${metric}`);
    });
    console.log();
  }
}

async function savePlan(plan, task) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTask = task.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `ferzcli-plan-${safeTask}-${timestamp}.json`;

  await fs.writeJson(filename, {
    task: task,
    generatedAt: new Date().toISOString(),
    plan: plan
  }, { spaces: 2 });

  return filename;
}

async function interactivePlanning(plan, groqService) {
  const { continuePlanning } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'continuePlanning',
      message: 'Would you like to refine this plan or ask questions?',
      default: false
    }
  ]);

  if (continuePlanning) {
    console.log(chalk.bold('\n💬 Interactive Planning Session'));
    console.log(chalk.gray('Ask questions about the plan, request modifications, or get more details.\n'));

    while (true) {
      const { question } = await inquirer.prompt([
        {
          type: 'input',
          name: 'question',
          message: chalk.cyan('Planning question (or "exit"):'),
        }
      ]);

      if (question.toLowerCase() === 'exit') {
        break;
      }

      try {
        const context = `Current Plan: ${JSON.stringify(plan, null, 2)}\n\nUser Question: ${question}`;
        const response = await groqService.chat(context, {
          maxTokens: 500,
          temperature: 0.3
        });

        console.log(chalk.green('AI: ') + response);
        console.log();
      } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
    }
  }
}

module.exports = { plan };
