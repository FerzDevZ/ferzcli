import * as vscode from 'vscode';
import axios from 'axios';

let statusBarItem: vscode.StatusBarItem;
let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {
    console.log('🎉 ferzcli VS Code extension is now active!');

    // Create status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ferzcli.superAgent';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();

    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('ferzcli');
    context.subscriptions.push(diagnosticCollection);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ferzcli.analyzeCode', analyzeCode),
        vscode.commands.registerCommand('ferzcli.generateCode', generateCode),
        vscode.commands.registerCommand('ferzcli.optimizeCode', optimizeCode),
        vscode.commands.registerCommand('ferzcli.superAgent', superAgentMode)
    );

    // Auto-analyze on save if enabled
    const config = vscode.workspace.getConfiguration('ferzcli');
    if (config.get('autoAnalyze')) {
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(autoAnalyze)
        );
    }
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('ferzcli');
    const hasApiKey = config.get('apiKey', '').length > 0;
    
    statusBarItem.text = hasApiKey ? '$(robot) ferzcli' : '$(robot) ferzcli ⚠️';
    statusBarItem.tooltip = hasApiKey ? 'ferzcli AI Assistant Ready' : 'Configure API Key';
    statusBarItem.show();
}

async function analyzeCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const selection = editor.selection;
    const text = selection.isEmpty 
        ? editor.document.getText()
        : editor.document.getText(selection);

    if (!text.trim()) {
        vscode.window.showWarningMessage('No code selected to analyze');
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing code with ferzcli...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Initializing analysis...' });
            
            const result = await callFerzcliAPI('analyze', {
                code: text,
                language: editor.document.languageId,
                filepath: editor.document.fileName
            });

            progress.report({ increment: 100, message: 'Analysis complete!' });

            // Show results
            const panel = vscode.window.createWebviewPanel(
                'ferzcliAnalysis',
                'ferzcli Code Analysis',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = generateAnalysisHTML(result);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
}

async function generateCode() {
    const prompt = await vscode.window.showInputBox({
        prompt: 'Describe the code you want to generate',
        placeHolder: 'e.g., Create a React component for user authentication'
    });

    if (!prompt) return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating code with ferzcli...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Generating code...' });
            
            const result = await callFerzcliAPI('generate', {
                prompt: prompt,
                context: getCurrentContext()
            });

            progress.report({ increment: 100, message: 'Code generated!' });

            // Insert or show generated code
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const selection = editor.selection;
                await editor.edit(editBuilder => {
                    editBuilder.replace(selection, result.code);
                });
            } else {
                const doc = await vscode.workspace.openTextDocument({
                    content: result.code,
                    language: result.language || 'javascript'
                });
                await vscode.window.showTextDocument(doc);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Code generation failed: ${error.message}`);
    }
}

async function optimizeCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const text = editor.document.getText();
    if (!text.trim()) {
        vscode.window.showWarningMessage('No code to optimize');
        return;
    }

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Optimizing code with ferzcli...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Analyzing code...' });
            progress.report({ increment: 50, message: 'Optimizing...' });
            
            const result = await callFerzcliAPI('optimize', {
                code: text,
                language: editor.document.languageId
            });

            progress.report({ increment: 100, message: 'Optimization complete!' });

            // Show diff
            const optimizedDoc = await vscode.workspace.openTextDocument({
                content: result.optimizedCode,
                language: editor.document.languageId
            });
            
            await vscode.commands.executeCommand('vscode.diff', 
                editor.document.uri, 
                optimizedDoc.uri, 
                'Original ↔ Optimized'
            );
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Optimization failed: ${error.message}`);
    }
}

async function superAgentMode() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const request = await vscode.window.showInputBox({
        prompt: 'What would you like ferzcli to implement?',
        placeHolder: 'e.g., Create a login system with dashboard'
    });

    if (!request) return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Super Agent Mode activated...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: 'Analyzing request...' });
            
            const result = await callFerzcliAPI('superagent', {
                request: request,
                projectPath: workspaceFolder.uri.fsPath,
                projectType: detectProjectType(workspaceFolder.uri.fsPath)
            });

            progress.report({ increment: 100, message: 'Implementation complete!' });

            // Show results
            const panel = vscode.window.createWebviewPanel(
                'ferzcliSuperAgent',
                'ferzcli Super Agent Results',
                vscode.ViewColumn.Beside,
                {}
            );

            panel.webview.html = generateSuperAgentHTML(result);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Super Agent failed: ${error.message}`);
    }
}

async function autoAnalyze(document: vscode.TextDocument) {
    if (document.languageId === 'log' || document.uri.scheme !== 'file') {
        return;
    }

    try {
        const result = await callFerzcliAPI('analyze', {
            code: document.getText(),
            language: document.languageId,
            filepath: document.fileName
        });

        // Update diagnostics
        const diagnostics: vscode.Diagnostic[] = [];
        
        if (result.issues) {
            result.issues.forEach((issue: any) => {
                const range = new vscode.Range(
                    new vscode.Position(issue.line - 1, issue.column - 1),
                    new vscode.Position(issue.line - 1, issue.column + issue.length)
                );
                
                const severity = issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
                               issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
                               vscode.DiagnosticSeverity.Information;
                
                diagnostics.push(new vscode.Diagnostic(range, issue.message, severity));
            });
        }

        diagnosticCollection.set(document.uri, diagnostics);
    } catch (error) {
        console.error('Auto-analysis failed:', error);
    }
}

async function callFerzcliAPI(endpoint: string, data: any): Promise<any> {
    const config = vscode.workspace.getConfiguration('ferzcli');
    const apiKey = config.get('apiKey', '');
    
    if (!apiKey) {
        throw new Error('ferzcli API key not configured. Please set ferzcli.apiKey in settings.');
    }

    const response = await axios.post(`https://api.ferzcli.dev/${endpoint}`, data, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        timeout: 30000
    });

    return response.data;
}

function getCurrentContext(): any {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return {};

    return {
        language: editor.document.languageId,
        filepath: editor.document.fileName,
        selection: editor.selection.isEmpty ? null : editor.document.getText(editor.selection),
        surroundingCode: editor.document.getText(
            new vscode.Range(
                Math.max(0, editor.selection.start.line - 5),
                0,
                Math.min(editor.document.lineCount, editor.selection.end.line + 5),
                0
            )
        )
    };
}

function detectProjectType(projectPath: string): string {
    // Simple project type detection
    const fs = require('fs');
    const path = require('path');

    if (fs.existsSync(path.join(projectPath, 'composer.json'))) return 'laravel';
    if (fs.existsSync(path.join(projectPath, 'package.json'))) return 'nodejs';
    if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust';
    
    return 'unknown';
}

function generateAnalysisHTML(result: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ferzcli Code Analysis</title>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .issue { margin: 10px 0; padding: 10px; border-radius: 4px; }
            .error { background: #f44747; color: white; }
            .warning { background: #cca700; color: white; }
            .info { background: #3794ff; color: white; }
            .metric { display: inline-block; margin: 5px; padding: 8px; background: #f3f3f3; border-radius: 4px; }
        </style>
    </head>
    <body>
        <h1>🔍 Code Analysis Results</h1>
        
        <div style="margin: 20px 0;">
            <h3>Metrics:</h3>
            <div class="metric">Complexity: ${result.complexity || 'N/A'}</div>
            <div class="metric">Maintainability: ${result.maintainability || 'N/A'}</div>
            <div class="metric">Test Coverage: ${result.coverage || 'N/A'}</div>
        </div>

        <div style="margin: 20px 0;">
            <h3>Issues Found:</h3>
            ${result.issues?.map((issue: any) => 
                `<div class="issue ${issue.severity}">
                    <strong>${issue.type}:</strong> ${issue.message}
                    <br><small>Line ${issue.line}, Column ${issue.column}</small>
                </div>`
            ).join('') || '<p>No issues found! 🎉</p>'}
        </div>

        <div style="margin: 20px 0;">
            <h3>Suggestions:</h3>
            <ul>
                ${result.suggestions?.map((suggestion: string) => 
                    `<li>${suggestion}</li>`
                ).join('') || '<li>No suggestions available</li>'}
            </ul>
        </div>
    </body>
    </html>`;
}

function generateSuperAgentHTML(result: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>ferzcli Super Agent Results</title>
        <style>
            body { font-family: var(--vscode-font-family); padding: 20px; }
            .phase { margin: 15px 0; padding: 15px; border-left: 4px solid #3794ff; background: #f8f9fa; }
            .file { margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; }
            .success { color: #28a745; }
            .error { color: #dc3545; }
        </style>
    </head>
    <body>
        <h1>🤖 Super Agent Implementation Results</h1>
        
        <div style="margin: 20px 0;">
            <h3>Request: "${result.originalRequest}"</h3>
            <p><strong>Intent Detected:</strong> ${result.intent}</p>
            <p><strong>Confidence:</strong> ${result.confidence}%</p>
        </div>

        <div style="margin: 20px 0;">
            <h3>Implementation Phases:</h3>
            ${result.phases?.map((phase: any) => 
                `<div class="phase">
                    <h4>${phase.name}</h4>
                    <p>${phase.description}</p>
                    <p class="${phase.status === 'completed' ? 'success' : 'error'}">
                        Status: ${phase.status}
                    </p>
                </div>`
            ).join('') || '<p>No phases executed</p>'}
        </div>

        <div style="margin: 20px 0;">
            <h3>Files Created/Modified:</h3>
            ${result.files?.map((file: any) => 
                `<div class="file">
                    <strong>${file.path}</strong> (${file.action})
                    <br><small>${file.description}</small>
                </div>`
            ).join('') || '<p>No files modified</p>'}
        </div>

        <div style="margin: 20px 0;">
            <h3>Commands Executed:</h3>
            <ul>
                ${result.commands?.map((cmd: string) => 
                    `<li><code>${cmd}</code></li>`
                ).join('') || '<li>No commands executed</li>'}
            </ul>
        </div>

        ${result.documentation ? `
        <div style="margin: 20px 0;">
            <h3>📚 Documentation Generated:</h3>
            <p>${result.documentation}</p>
        </div>` : ''}
    </body>
    </html>`;
}
