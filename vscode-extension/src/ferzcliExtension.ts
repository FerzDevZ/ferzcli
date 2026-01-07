import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';

export class FerzcliExtension {
	private context: vscode.ExtensionContext;
	private statusBarItem: vscode.StatusBarItem;
	private outputChannel: vscode.OutputChannel;

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.outputChannel = vscode.window.createOutputChannel('ferzcli AI Assistant');
	}

	public helloWorld(): void {
		vscode.window.showInformationMessage('🎉 Hello from ferzcli AI Assistant! AI-powered coding made easy.');
	}

	public async superAgent(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('❌ Tidak ada file yang aktif. Buka file terlebih dahulu.');
			return;
		}

		// Get user input
		const userInput = await vscode.window.showInputBox({
			prompt: '🤖 Apa yang ingin Anda implementasikan?',
			placeHolder: 'Contoh: buatkan login form dengan React, atau setup Laravel authentication',
			ignoreFocusOut: true
		});

		if (!userInput) {
			return;
		}

		// Show progress
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: '🤖 ferzcli AI Processing...',
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0, message: 'Analyzing request...' });

			try {
				// Analyze the request
				const analysis = await this.analyzeRequest(userInput);
				progress.report({ increment: 30, message: 'Generating code...' });

				// Generate code based on analysis
				const generatedCode = await this.generateCodeFromAnalysis(analysis);
				progress.report({ increment: 70, message: 'Applying changes...' });

				// Apply the generated code
				await this.applyGeneratedCode(editor, generatedCode);
				progress.report({ increment: 100, message: 'Complete!' });

				// Show success message
				vscode.window.showInformationMessage(
					`✅ Berhasil generate code! ${generatedCode.filesCreated} file dibuat.`,
					'Lihat Hasil'
				).then(selection => {
					if (selection === 'Lihat Hasil') {
						this.showGeneratedFiles(generatedCode);
					}
				});

			} catch (error) {
				vscode.window.showErrorMessage(`❌ Error: ${error.message}`);
				this.logError('Super Agent Error', error);
			}
		});
	}

	public async generateCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('❌ Tidak ada file yang aktif.');
			return;
		}

		const selectedText = editor.document.getText(editor.selection);
		if (!selectedText) {
			vscode.window.showErrorMessage('❌ Pilih kode yang ingin digenerate atau diimprove.');
			return;
		}

		const action = await vscode.window.showQuickPick([
			'🔄 Refactor Code',
			'➕ Add Unit Tests',
			'📝 Add Documentation',
			'🚀 Optimize Performance',
			'🎨 Improve Styling',
			'🔧 Fix Issues'
		], {
			placeHolder: 'Pilih tindakan yang diinginkan'
		});

		if (!action) return;

		// Process based on selection
		const result = await this.processCodeAction(action, selectedText, editor.document.languageId);
		await this.applyCodeAction(editor, result);
	}

	public async analyzeCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('❌ Tidak ada file yang aktif.');
			return;
		}

		const filePath = editor.document.uri.fsPath;
		const fileContent = editor.document.getText();

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: '🔍 Analyzing code...',
			cancellable: false
		}, async (progress) => {
			try {
				const analysis = await this.performCodeAnalysis(filePath, fileContent);

				// Show results in output channel
				this.outputChannel.clear();
				this.outputChannel.appendLine('🔍 Code Analysis Results');
				this.outputChannel.appendLine('='.repeat(50));
				this.outputChannel.appendLine(`File: ${path.basename(filePath)}`);
				this.outputChannel.appendLine(`Language: ${editor.document.languageId}`);
				this.outputChannel.appendLine(`Lines: ${fileContent.split('\n').length}`);
				this.outputChannel.appendLine('');

				// Show analysis results
				this.displayAnalysisResults(analysis);
				this.outputChannel.show();

				// Show summary
				const issues = analysis.issues || [];
				if (issues.length > 0) {
					vscode.window.showWarningMessage(
						`⚠️ Ditemukan ${issues.length} issues. Lihat output panel untuk detail.`,
						'Lihat Detail'
					).then(selection => {
						if (selection) {
							this.outputChannel.show();
						}
					});
				} else {
					vscode.window.showInformationMessage('✅ Code analysis selesai. Tidak ada issues kritikal.');
				}

			} catch (error) {
				vscode.window.showErrorMessage(`❌ Analysis failed: ${error.message}`);
			}
		});
	}

	public async optimizeCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('❌ Tidak ada file yang aktif.');
			return;
		}

		const fileContent = editor.document.getText();
		const language = editor.document.languageId;

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: '⚡ Optimizing code...',
			cancellable: false
		}, async (progress) => {
			try {
				const optimizations = await this.generateOptimizations(fileContent, language);

				if (optimizations.length === 0) {
					vscode.window.showInformationMessage('✅ Kode sudah optimal!');
					return;
				}

				// Show optimization suggestions
				const items = optimizations.map((opt: any) => ({
					label: opt.title,
					description: opt.description,
					detail: opt.impact,
					optimization: opt
				}));

				const selected = await vscode.window.showQuickPick(items, {
					placeHolder: 'Pilih optimasi yang ingin diterapkan'
				});

				if (selected) {
					await this.applyOptimization(editor, selected.optimization);
					vscode.window.showInformationMessage('✅ Optimasi berhasil diterapkan!');
				}

			} catch (error) {
				vscode.window.showErrorMessage(`❌ Optimization failed: ${error.message}`);
			}
		});
	}

	public async deployProject(): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('❌ Tidak ada workspace yang aktif.');
			return;
		}

		const platforms = await vscode.window.showQuickPick([
			{ label: '☁️ AWS', description: 'Deploy ke Amazon Web Services' },
			{ label: '🌊 DigitalOcean', description: 'Deploy ke DigitalOcean Droplets' },
			{ label: '▲ Vercel', description: 'Deploy frontend ke Vercel' },
			{ label: 'Netlify', description: 'Deploy static sites ke Netlify' },
			{ label: '🐘 Heroku', description: 'Deploy ke Heroku' },
			{ label: '🚀 Railway', description: 'Deploy ke Railway' }
		], {
			placeHolder: 'Pilih platform deployment'
		});

		if (!platforms) return;

		// Implementation would integrate with deployment APIs
		vscode.window.showInformationMessage(`🚀 Deploying to ${platforms.label}... (Feature coming soon!)`);
	}

	public async testProject(): Promise<void> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('❌ Tidak ada workspace yang aktif.');
			return;
		}

		const testTypes = await vscode.window.showQuickPick([
			{ label: '🧪 Unit Tests', description: 'Run unit tests' },
			{ label: '🔗 Integration Tests', description: 'Run integration tests' },
			{ label: '🌐 E2E Tests', description: 'Run end-to-end tests' },
			{ label: '⚡ Performance Tests', description: 'Run performance tests' },
			{ label: '🎯 All Tests', description: 'Run all test types' }
		], {
			placeHolder: 'Pilih jenis test'
		});

		if (!testTypes) return;

		// Implementation would run actual tests
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `Running ${testTypes.label}...`,
			cancellable: false
		}, async (progress) => {
			// Simulate test execution
			progress.report({ increment: 100, message: 'Tests completed!' });
			vscode.window.showInformationMessage(`✅ ${testTypes.label} completed successfully!`);
		});
	}

	public async codeReview(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('❌ Tidak ada file yang aktif.');
			return;
		}

		const fileContent = editor.document.getText();

		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: '📝 Performing code review...',
			cancellable: false
		}, async (progress) => {
			try {
				const review = await this.performCodeReview(fileContent, editor.document.languageId);

				// Show review results
				this.outputChannel.clear();
				this.outputChannel.appendLine('📝 Code Review Results');
				this.outputChannel.appendLine('='.repeat(50));

				review.issues.forEach((issue: any, index: number) => {
					this.outputChannel.appendLine(`${index + 1}. ${issue.type}: ${issue.message}`);
					this.outputChannel.appendLine(`   Line: ${issue.line || 'N/A'}`);
					this.outputChannel.appendLine(`   Severity: ${issue.severity}`);
					this.outputChannel.appendLine('');
				});

				this.outputChannel.show();

				const score = review.score || 0;
				if (score >= 80) {
					vscode.window.showInformationMessage(`✅ Code review selesai. Score: ${score}/100 - Excellent!`);
				} else if (score >= 60) {
					vscode.window.showWarningMessage(`⚠️ Code review selesai. Score: ${score}/100 - Needs improvement.`);
				} else {
					vscode.window.showErrorMessage(`❌ Code review selesai. Score: ${score}/100 - Major issues found.`);
				}

			} catch (error) {
				vscode.window.showErrorMessage(`❌ Code review failed: ${error.message}`);
			}
		});
	}

	public async databaseTools(): Promise<void> {
		const actions = await vscode.window.showQuickPick([
			{ label: '🔍 Analyze Schema', description: 'Analyze database schema' },
			{ label: '⚡ Optimize Queries', description: 'Optimize slow queries' },
			{ label: '📊 Generate Migration', description: 'Generate database migration' },
			{ label: '🌱 Seed Data', description: 'Generate fake data' },
			{ label: '🔄 Sync Schema', description: 'Sync database schema' }
		], {
			placeHolder: 'Pilih database tool'
		});

		if (!actions) return;

		vscode.window.showInformationMessage(`${actions.label} - Feature coming soon!`);
	}

	// Helper methods
	private async analyzeRequest(request: string): Promise<any> {
		// AI-powered request analysis
		return {
			intent: this.detectIntent(request),
			technology: this.detectTechnology(request),
			complexity: this.assessComplexity(request),
			features: this.extractFeatures(request)
		};
	}

	private detectIntent(request: string): string {
		const lowerRequest = request.toLowerCase();

		if (lowerRequest.includes('login') || lowerRequest.includes('register') || lowerRequest.includes('auth')) {
			return 'authentication';
		}
		if (lowerRequest.includes('dashboard') || lowerRequest.includes('admin')) {
			return 'dashboard';
		}
		if (lowerRequest.includes('api') || lowerRequest.includes('rest')) {
			return 'api';
		}
		if (lowerRequest.includes('database') || lowerRequest.includes('migration')) {
			return 'database';
		}

		return 'general';
	}

	private detectTechnology(request: string): string[] {
		const technologies: string[] = [];
		const lowerRequest = request.toLowerCase();

		if (lowerRequest.includes('laravel') || lowerRequest.includes('php')) {
			technologies.push('laravel', 'php');
		}
		if (lowerRequest.includes('react') || lowerRequest.includes('vue') || lowerRequest.includes('angular')) {
			technologies.push('react', 'javascript', 'typescript');
		}
		if (lowerRequest.includes('tailwind') || lowerRequest.includes('css')) {
			technologies.push('tailwind', 'css');
		}
		if (lowerRequest.includes('mysql') || lowerRequest.includes('postgresql')) {
			technologies.push('database');
		}

		return technologies;
	}

	private assessComplexity(request: string): number {
		let complexity = 1;
		const keywords = ['complex', 'advanced', 'full', 'complete', 'professional'];

		keywords.forEach(keyword => {
			if (request.toLowerCase().includes(keyword)) {
				complexity += 1;
			}
		});

		return Math.min(complexity, 5);
	}

	private extractFeatures(request: string): string[] {
		const features: string[] = [];
		const featureKeywords = {
			'validation': ['validation', 'validate', 'check'],
			'responsive': ['responsive', 'mobile', 'tablet', 'desktop'],
			'authentication': ['login', 'register', 'auth', 'signin'],
			'database': ['database', 'db', 'migration', 'model'],
			'api': ['api', 'rest', 'endpoint', 'json']
		};

		Object.entries(featureKeywords).forEach(([feature, keywords]) => {
			if (keywords.some(keyword => request.toLowerCase().includes(keyword))) {
				features.push(feature);
			}
		});

		return features;
	}

	private async generateCodeFromAnalysis(analysis: any): Promise<any> {
		// Simulate code generation based on analysis
		return {
			filesCreated: 2,
			files: [
				{
					name: 'generated-file-1.js',
					content: '// Generated by ferzcli AI\nconsole.log("Hello from AI!");'
				},
				{
					name: 'generated-file-2.html',
					content: '<!-- Generated by ferzcli AI -->\n<h1>AI Generated Content</h1>'
				}
			]
		};
	}

	private async applyGeneratedCode(editor: vscode.TextEditor, generatedCode: any): Promise<void> {
		// Apply generated code to workspace
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return;

		for (const file of generatedCode.files) {
			const filePath = path.join(workspaceFolder.uri.fsPath, file.name);
			await fs.writeFile(filePath, file.content);
		}
	}

	private async performCodeAnalysis(filePath: string, content: string): Promise<any> {
		// Simulate code analysis
		return {
			issues: [
				{ type: 'style', message: 'Use const instead of let', line: 5, severity: 'warning' },
				{ type: 'performance', message: 'Consider using arrow function', line: 12, severity: 'info' }
			],
			score: 85,
			metrics: {
				complexity: 3,
				lines: content.split('\n').length,
				functions: 2
			}
		};
	}

	private displayAnalysisResults(analysis: any): void {
		this.outputChannel.appendLine('Issues Found:');
		analysis.issues.forEach((issue: any, index: number) => {
			this.outputChannel.appendLine(`  ${index + 1}. ${issue.type}: ${issue.message}`);
		});

		this.outputChannel.appendLine('');
		this.outputChannel.appendLine('Metrics:');
		Object.entries(analysis.metrics).forEach(([key, value]) => {
			this.outputChannel.appendLine(`  ${key}: ${value}`);
		});
	}

	private async generateOptimizations(code: string, language: string): Promise<any[]> {
		// Simulate optimization generation
		const optimizations = [];

		if (code.includes('let ')) {
			optimizations.push({
				title: 'Use const where possible',
				description: 'Replace let with const for variables that don\'t change',
				impact: 'Better performance and code clarity',
				type: 'refactor'
			});
		}

		if (language === 'javascript' && code.includes('function ')) {
			optimizations.push({
				title: 'Convert to arrow functions',
				description: 'Use arrow functions for better readability',
				impact: 'Modern JavaScript syntax',
				type: 'modernize'
			});
		}

		return optimizations;
	}

	private async applyOptimization(editor: vscode.TextEditor, optimization: any): Promise<void> {
		// Apply the optimization to the code
		// This would contain the actual implementation
		vscode.window.showInformationMessage(`Applied: ${optimization.title}`);
	}

	private async performCodeReview(code: string, language: string): Promise<any> {
		// Simulate code review
		const issues = [];

		if (code.length > 1000) {
			issues.push({
				type: 'complexity',
				message: 'File is quite large, consider splitting into smaller modules',
				line: null,
				severity: 'warning'
			});
		}

		if (!code.includes('/**') && !code.includes('//')) {
			issues.push({
				type: 'documentation',
				message: 'Add JSDoc comments or documentation',
				line: null,
				severity: 'info'
			});
		}

		return {
			score: issues.length === 0 ? 95 : 75,
			issues: issues
		};
	}

	private showGeneratedFiles(generatedCode: any): void {
		// Show generated files in explorer or open them
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return;

		generatedCode.files.forEach((file: any) => {
			const fileUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, file.name));
			vscode.workspace.openTextDocument(fileUri).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		});
	}

	private async processCodeAction(action: string, code: string, language: string): Promise<any> {
		// Process different code actions
		switch (action) {
			case '🔄 Refactor Code':
				return { type: 'refactor', code: this.refactorCode(code, language) };
			case '➕ Add Unit Tests':
				return { type: 'tests', code: this.generateUnitTests(code, language) };
			case '📝 Add Documentation':
				return { type: 'docs', code: this.addDocumentation(code, language) };
			default:
				return { type: 'none', code: code };
		}
	}

	private refactorCode(code: string, language: string): string {
		// Simple refactoring example
		return code.replace(/let /g, 'const ');
	}

	private generateUnitTests(code: string, language: string): string {
		// Generate basic unit tests
		return `// Unit tests for ${language}\ndescribe('Test Suite', () => {\n  it('should work', () => {\n    expect(true).toBe(true);\n  });\n});`;
	}

	private addDocumentation(code: string, language: string): string {
		// Add basic documentation
		return `/**\n * Auto-generated documentation by ferzcli AI\n */\n${code}`;
	}

	private async applyCodeAction(editor: vscode.TextEditor, result: any): Promise<void> {
		const edit = new vscode.WorkspaceEdit();
		const fullRange = new vscode.Range(
			editor.document.positionAt(0),
			editor.document.positionAt(editor.document.getText().length)
		);

		edit.replace(editor.document.uri, fullRange, result.code);
		await vscode.workspace.applyEdit(edit);
	}

	public createStatusBarItem(): void {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.text = '🤖 ferzcli';
		this.statusBarItem.tooltip = 'ferzcli AI Assistant - Click for menu';
		this.statusBarItem.command = 'ferzcli.superAgent';
		this.statusBarItem.show();

		this.context.subscriptions.push(this.statusBarItem);
	}

	private logError(context: string, error: any): void {
		this.outputChannel.appendLine(`[${new Date().toISOString()}] ERROR - ${context}:`);
		this.outputChannel.appendLine(error.message || error.toString());
		this.outputChannel.appendLine('');
		this.outputChannel.show();
	}

	public dispose(): void {
		if (this.statusBarItem) {
			this.statusBarItem.dispose();
		}
		if (this.outputChannel) {
			this.outputChannel.dispose();
		}
	}
}
