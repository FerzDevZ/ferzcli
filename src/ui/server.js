const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk').default || require('chalk');
// Open package removed to avoid dependency issues
const { GroqService } = require('../../lib/groq-service');
const { FileUtils } = require('../../lib/file-utils');
const { ProjectDetector } = require('../../lib/project-detector');

const PORT = 3000;

class UIServer {
    constructor() {
        this.groqService = new GroqService();
        this.fileUtils = new FileUtils();
        this.projectDetector = new ProjectDetector();
    }

    start() {
        const server = http.createServer(async (req, res) => {
            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            // Static Files
            if (req.url === '/' || req.url === '/index.html') {
                this.serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
                return;
            }

            // API Endpoints
            if (req.url === '/api/chat' && req.method === 'POST') {
                await this.handleChat(req, res);
                return;
            }

            if (req.url === '/api/project' && req.method === 'GET') {
                await this.handleProjectInfo(req, res);
                return;
            }

            if (req.url.startsWith('/api/files') && req.method === 'GET') {
                await this.handleFiles(req, res);
                return;
            }

            if (req.url.startsWith('/api/file-content') && req.method === 'GET') {
                await this.handleFileContent(req, res);
                return;
            }

            if (req.url === '/api/command' && req.method === 'POST') {
                await this.handleCommand(req, res);
                return;
            }

            res.writeHead(404);
            res.end('Not Found');
        });

        server.listen(PORT, async () => {
            console.log(chalk.green(`\n🚀 GUI Dashboard running at http://localhost:${PORT}`));
            console.log(chalk.gray('Press Ctrl+C to stop the server\n'));

            // Try to open browser
            try {
                // Using dynamic import for open if it's ESM in newer versions
                // For now, assuming basic exec fallback if 'open' pkg fails
                const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
                exec(`${start} http://localhost:${PORT}`);
            } catch (e) {
                console.log('Open http://localhost:3000 in your browser.');
            }
        });
    }

    serveFile(res, filePath, contentType) {
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading UI');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }

    async handleChat(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { message } = JSON.parse(body);
                await this.groqService.initialize();

                // Get project context for better AI answers
                const detection = await this.projectDetector.detect(process.cwd());
                const contextPrompt = `
You are an expert AI coding assistant integrated into the Ferzcli Pro Dashboard.
Project Context:
- Path: ${process.cwd()}
- Type: ${detection.type}
- Framework: ${detection.framework}
- Language: ${detection.language}
- Dependencies: ${Object.keys(detection.dependencies).slice(0, 10).join(', ')}

User Request: ${message}
`;

                const response = await this.groqService.chat(contextPrompt, { maxTokens: 1500 });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }

    async handleProjectInfo(req, res) {
        try {
            // Get files
            const files = await this.fileUtils.getAllFiles(process.cwd());

            // Detect Project details
            const detection = await this.projectDetector.detect(process.cwd());

            const summary = {
                path: process.cwd(),
                filesCount: files.length,
                ...detection,
                system: {
                    node: process.version,
                    platform: process.platform,
                    memory: process.memoryUsage().heapUsed
                }
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(summary));
        } catch (error) {
            console.error('Project Info Error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleFiles(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const dir = url.searchParams.get('path') || '.';
            const fullPath = path.resolve(process.cwd(), dir);

            // Basic security: prevent escaping project root
            if (!fullPath.startsWith(process.cwd())) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }

            const items = await fs.readdir(fullPath, { withFileTypes: true });
            const result = items
                .filter(item => !['node_modules', '.git', 'vendor', '.gemini'].includes(item.name))
                .map(item => ({
                    name: item.name,
                    path: path.relative(process.cwd(), path.join(fullPath, item.name)),
                    isDirectory: item.isDirectory(),
                    size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : 0
                }))
                .sort((a, b) => (b.isDirectory === a.isDirectory) ? a.name.localeCompare(b.name) : b.isDirectory ? 1 : -1);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleFileContent(req, res) {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const file = url.searchParams.get('path');
            if (!file) throw new Error('Path is required');

            const fullPath = path.resolve(process.cwd(), file);
            if (!fullPath.startsWith(process.cwd())) {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Access denied' }));
                return;
            }

            const content = await fs.readFile(fullPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    async handleCommand(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { command } = JSON.parse(body);
                // Execute harmless commands (demo purpose)
                // Real implementation needs security check
                exec(command, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ output: stdout || stderr || error.message }));
                });
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
}

module.exports = { UIServer };
