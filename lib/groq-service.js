const Groq = require('groq-sdk');
const { ConfigManager } = require('./config-manager');
const chalk = require('chalk').default || require('chalk');
const ora = require('ora').default || require('ora');

class GroqService {
  constructor() {
    this.configManager = new ConfigManager();
    this.client = null;
    this.conversationHistory = [];
  }

  async initialize() {
    await this.configManager.ready;
    const apiKey = this.configManager.getApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured. Run "ferzcli init" first.');
    }

    this.client = new Groq({
      apiKey: apiKey,
    });

    return this;
  }

  async chat(message, options = {}) {
    if (!this.client) {
      await this.initialize();
    }

    const {
      model = this.configManager.getDefaultModel(),
      temperature = this.configManager.getTemperature(),
      maxTokens = this.configManager.getMaxTokens(),
      context = [],
      systemPrompt = null,
      stream = false,
      onChunk = null
    } = options;

    // Build messages array
    const messages = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add context messages
    context.forEach(ctx => {
      messages.push({
        role: ctx.role || 'user',
        content: ctx.content
      });
    });

    // Add conversation history
    messages.push(...this.conversationHistory);

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    const spinner = ora('Thinking...').start();

    try {
      const chatCompletion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: temperature,
        max_tokens: maxTokens,
        stream: stream
      });

      spinner.stop();

      let response;
      if (stream) {
        response = '';
        for await (const chunk of chatCompletion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (onChunk) {
            onChunk(content);
          } else {
            process.stdout.write(content);
          }
          response += content;
        }
        if (!onChunk) console.log(); // New line if default stream
      } else {
        response = chatCompletion.choices[0]?.message?.content || '';
      }

      // Add to conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      // Keep history manageable (last 20 exchanges)
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-40);
      }

      return response;
    } catch (error) {
      spinner.stop();
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  async completeCode(prefix, options = {}) {
    const {
      language = 'javascript',
      context = '',
      model = this.configManager.getAutocompleteModel(),
      temperature = 0.1,
      maxTokens = 512
    } = options;

    const systemPrompt = `You are an expert ${language} programmer. Complete the following code intelligently.
Rules:
- Only return the completion, no explanations
- Maintain the same coding style and indentation
- Complete logically and syntactically correct code
- If completing a function, include proper closing braces
- Consider the context provided`;

    const fullPrompt = context ?
      `Context:\n${context}\n\nComplete this ${language} code:\n${prefix}` :
      `Complete this ${language} code:\n${prefix}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: fullPrompt }
    ];

    const spinner = ora('Generating completion...').start();

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: temperature,
        max_tokens: maxTokens,
        stop: ['\n\n', '```']
      });

      spinner.stop();
      return completion.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      spinner.stop();
      throw new Error(`Code completion error: ${error.message}`);
    }
  }

  async analyzeCode(code, options = {}) {
    const {
      language = 'javascript',
      task = 'analyze',
      model = this.configManager.getDefaultModel()
    } = options;

    const prompts = {
      analyze: `Analyze this ${language} code and provide insights about:
- Code quality and best practices
- Potential bugs or issues
- Performance considerations
- Security concerns
- Suggestions for improvement

Code to analyze:
${code}`,

      explain: `Explain what this ${language} code does in detail:
${code}`,

      optimize: `Optimize this ${language} code for better performance and readability:
${code}

Provide the optimized version with explanations of changes.`,

      refactor: `Refactor this ${language} code to improve structure and maintainability:
${code}

Provide the refactored version with explanations.`
    };

    const systemPrompt = `You are an expert ${language} code reviewer and optimizer. Provide detailed, actionable feedback.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompts[task] || prompts.analyze }
    ];

    const spinner = ora(`${task.charAt(0).toUpperCase() + task.slice(1)}ing code...`).start();

    try {
      const analysis = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.3,
        max_tokens: this.configManager.getMaxTokens()
      });

      spinner.stop();
      return analysis.choices[0]?.message?.content || '';
    } catch (error) {
      spinner.stop();
      throw new Error(`Code analysis error: ${error.message}`);
    }
  }

  async generatePlan(task, options = {}) {
    const {
      complexity = 'medium',
      tech = 'general',
      model = this.configManager.getPlanningModel()
    } = options;

    const systemPrompt = `You are an expert project manager and software architect. Create detailed, actionable development plans.

For each plan, provide:
1. Executive summary
2. Task breakdown with priorities
3. Estimated timeframes
4. Dependencies and prerequisites
5. Risk assessment
6. Success metrics

Structure the response clearly with sections and bullet points.`;

    const userPrompt = `Create a detailed development plan for: "${task}"

Complexity level: ${complexity}
Technology stack: ${tech}

Please provide a comprehensive plan with specific, actionable tasks.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const spinner = ora('Generating development plan...').start();

    try {
      const plan = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.4,
        max_tokens: this.configManager.getMaxTokens()
      });

      spinner.stop();
      return plan.choices[0]?.message?.content || '';
    } catch (error) {
      spinner.stop();
      throw new Error(`Plan generation error: ${error.message}`);
    }
  }

  async generateCode(task, options = {}) {
    const {
      language = 'javascript',
      model = this.configManager.getDefaultModel(),
      context = ''
    } = options;

    const systemPrompt = `You are an expert ${language} programmer. Generate full, production-ready source code for the requested file.
Rules:
- Only return the code content, NO explanations, NO markdown blocks unless requested
- Include necessary imports and standard boilerplate
- Ensure code is syntactically correct and follows best practices
- If context is provided, ensure the new code integrates well`;

    const userPrompt = `Generate ${language} code for: "${task}"
File Context:
${context}

Generate complete file content:`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const spinner = ora(`Generating ${language} code...`).start();

    try {
      const completion = await this.client.chat.completions.create({
        messages: messages,
        model: model,
        temperature: 0.2,
        max_tokens: 4096
      });

      spinner.stop();
      let code = completion.choices[0]?.message?.content || '';

      // Clean up markdown blocks if AI included them
      code = code.replace(/^```[a-z]*\n/i, '').replace(/\n```$/g, '');

      return code;
    } catch (error) {
      spinner.stop();
      throw new Error(`Code generation error: ${error.message}`);
    }
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getHistory() {
    return this.conversationHistory;
  }

  setHistory(history) {
    this.conversationHistory = history;
  }

  async saveSession(projectPath) {
    const sessionPath = path.join(projectPath, '.ferzcli/session.json');
    await fs.ensureDir(path.dirname(sessionPath));
    await fs.writeJson(sessionPath, {
      history: this.conversationHistory,
      timestamp: Date.now()
    });
  }

  async loadSession(projectPath) {
    const sessionPath = path.join(projectPath, '.ferzcli/session.json');
    if (await fs.pathExists(sessionPath)) {
      const data = await fs.readJson(sessionPath);
      this.conversationHistory = data.history || [];
      return true;
    }
    return false;
  }
}

module.exports = { GroqService };
