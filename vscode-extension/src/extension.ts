import * as vscode from 'vscode';
import { FerzcliExtension } from './ferzcliExtension';

let ferzcliExtension: FerzcliExtension;

export function activate(context: vscode.ExtensionContext) {
	console.log('🎉 ferzcli AI Assistant extension is now active!');

	// Initialize the main extension class
	ferzcliExtension = new FerzcliExtension(context);

	// Register all commands
	const commands = [
		vscode.commands.registerCommand('ferzcli.helloWorld', () => ferzcliExtension.helloWorld()),
		vscode.commands.registerCommand('ferzcli.superAgent', () => ferzcliExtension.superAgent()),
		vscode.commands.registerCommand('ferzcli.generateCode', () => ferzcliExtension.generateCode()),
		vscode.commands.registerCommand('ferzcli.analyzeCode', () => ferzcliExtension.analyzeCode()),
		vscode.commands.registerCommand('ferzcli.optimizeCode', () => ferzcliExtension.optimizeCode()),
		vscode.commands.registerCommand('ferzcli.deployProject', () => ferzcliExtension.deployProject()),
		vscode.commands.registerCommand('ferzcli.testProject', () => ferzcliExtension.testProject()),
		vscode.commands.registerCommand('ferzcli.codeReview', () => ferzcliExtension.codeReview()),
		vscode.commands.registerCommand('ferzcli.databaseTools', () => ferzcliExtension.databaseTools()),
	];

	// Add to context subscriptions
	context.subscriptions.push(...commands);

	// Register status bar item
	ferzcliExtension.createStatusBarItem();

	// Show welcome message
	setTimeout(() => {
		vscode.window.showInformationMessage(
			'🤖 ferzcli AI Assistant aktif! Tekan Ctrl+Shift+F untuk Super Agent Mode.',
			'Pelajari Lebih Lanjut'
		).then(selection => {
			if (selection === 'Pelajari Lebih Lanjut') {
				vscode.env.openExternal(vscode.Uri.parse('https://ferzcli.dev/docs'));
			}
		});
	}, 3000);
}

export function deactivate() {
	if (ferzcliExtension) {
		ferzcliExtension.dispose();
	}
	console.log('😴 ferzcli AI Assistant extension deactivated');
}
