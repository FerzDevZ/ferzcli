const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class CollaborationSystem {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            enableCodeReview: config.enableCodeReview !== false,
            enablePairProgramming: config.enablePairProgramming !== false,
            enableProjectSharing: config.enableProjectSharing !== false,
            gitIntegration: config.gitIntegration !== false,
            reviewWorkflow: config.reviewWorkflow || 'github', // github, gitlab, bitbucket
            ...config
        };
        this.reviews = [];
        this.sessions = new Map();
        this.sharedProjects = new Map();
    }

    async setupCollaboration() {
        console.log('🤝 Setting up collaboration system...');

        const results = {
            codeReview: null,
            pairProgramming: null,
            projectSharing: null,
            gitIntegration: null
        };

        // Setup code review system
        if (this.config.enableCodeReview) {
            results.codeReview = await this.setupCodeReview();
        }

        // Setup pair programming
        if (this.config.enablePairProgramming) {
            results.pairProgramming = await this.setupPairProgramming();
        }

        // Setup project sharing
        if (this.config.enableProjectSharing) {
            results.projectSharing = await this.setupProjectSharing();
        }

        // Setup Git integration
        if (this.config.gitIntegration) {
            results.gitIntegration = await this.setupGitIntegration();
        }

        // Generate collaboration dashboard
        await this.generateCollaborationDashboard();

        console.log('✅ Collaboration system setup completed!');
        return results;
    }

    async setupCodeReview() {
        console.log('🔍 Setting up code review system...');

        // Install code review tools
        execSync('npm install husky lint-staged @commitlint/cli @commitlint/config-conventional', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Setup Husky for Git hooks
        execSync('npx husky install', { cwd: this.projectPath, stdio: 'inherit' });

        // Create commitlint config
        const commitlintConfig = `module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test'
      ]
    ],
    'subject-case': [2, 'always', 'lower-case']
  }
};`;

        await fs.writeFile(path.join(this.projectPath, 'commitlint.config.js'), commitlintConfig);

        // Setup pre-commit hook
        const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged`;

        const preCommitPath = path.join(this.projectPath, '.husky', 'pre-commit');
        await fs.ensureDir(path.dirname(preCommitPath));
        await fs.writeFile(preCommitPath, preCommitHook);
        execSync(`chmod +x ${preCommitPath}`);

        // Setup commit-msg hook
        const commitMsgHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit \${1}`;

        const commitMsgPath = path.join(this.projectPath, '.husky', 'commit-msg');
        await fs.writeFile(commitMsgPath, commitMsgHook);
        execSync(`chmod +x ${commitMsgPath}`);

        // Create lint-staged config
        const lintStagedConfig = {
            '*.{js,ts,jsx,tsx}': [
                'eslint --fix',
                'prettier --write'
            ],
            '*.{php}': [
                'php-cs-fixer fix'
            ],
            '*.{py}': [
                'black',
                'flake8'
            ]
        };

        await fs.writeJson(path.join(this.projectPath, '.lintstagedrc'), lintStagedConfig);

        // Setup code review workflow
        const workflowConfig = await this.setupReviewWorkflow();
        
        // Generate code review guidelines
        await this.generateReviewGuidelines();

        console.log('✅ Code review system configured');
        return { 
            husky: true, 
            commitlint: true, 
            lintStaged: true, 
            workflow: workflowConfig 
        };
    }

    async setupReviewWorkflow() {
        const workflowTemplates = {
            github: {
                name: 'Code Review',
                on: {
                    pull_request: {
                        types: ['opened', 'synchronize', 'reopened']
                    }
                },
                jobs: {
                    review: {
                        'runs-on': 'ubuntu-latest',
                        steps: [
                            { uses: 'actions/checkout@v3' },
                            { uses: 'actions/setup-node@v3', with: { 'node-version': '18' } },
                            { run: 'npm ci' },
                            { run: 'npm run lint' },
                            { run: 'npm test' },
                            {
                                uses: 'dorny/test-reporter@v1',
                                if: 'success() || failure()',
                                with: {
                                    name: 'Test Results',
                                    path: 'test-results.xml',
                                    reporter: 'jest-junit'
                                }
                            }
                        ]
                    }
                }
            },
            gitlab: {
                stages: ['lint', 'test', 'review'],
                lint: {
                    stage: 'lint',
                    script: ['npm run lint'],
                    only: ['merge_requests']
                },
                test: {
                    stage: 'test',
                    script: ['npm test'],
                    coverage: '/Lines\\s*:\\s*(\\d+\\.\\d+)%/',
                    only: ['merge_requests']
                }
            }
        };

        const workflow = workflowTemplates[this.config.reviewWorkflow];
        if (workflow) {
            const workflowPath = this.config.reviewWorkflow === 'github'
                ? path.join(this.projectPath, '.github', 'workflows', 'code-review.yml')
                : path.join(this.projectPath, '.gitlab-ci.yml');

            await fs.ensureDir(path.dirname(workflowPath));
            await fs.writeYaml(workflowPath, workflow);
        }

        return { type: this.config.reviewWorkflow, path: workflowPath };
    }

    async setupPairProgramming() {
        console.log('👥 Setting up pair programming system...');

        // Install collaborative editing tools
        execSync('npm install y-websocket y-codemirror y-monaco socket.io @types/socket.io', {
            cwd: this.projectPath,
            stdio: 'inherit'
        });

        // Create pair programming server
        const pairServer = this.generatePairProgrammingServer();
        const serverPath = path.join(this.projectPath, 'collaboration', 'pair-server.js');
        await fs.ensureDir(path.dirname(serverPath));
        await fs.writeFile(serverPath, pairServer);

        // Create pair programming client
        const pairClient = this.generatePairProgrammingClient();
        const clientPath = path.join(this.projectPath, 'collaboration', 'pair-client.html');
        await fs.writeFile(clientPath, pairClient);

        // Setup WebSocket server for real-time collaboration
        const wsServer = this.generateWebSocketServer();
        const wsPath = path.join(this.projectPath, 'collaboration', 'ws-server.js');
        await fs.writeFile(wsPath, wsServer);

        console.log('✅ Pair programming system configured');
        return { 
            server: serverPath, 
            client: clientPath, 
            websocket: wsPath 
        };
    }

    async setupProjectSharing() {
        console.log('📤 Setting up project sharing system...');

        // Create project sharing API
        const sharingAPI = this.generateProjectSharingAPI();
        const apiPath = path.join(this.projectPath, 'collaboration', 'sharing-api.js');
        await fs.ensureDir(path.dirname(apiPath));
        await fs.writeFile(apiPath, sharingAPI);

        // Create project templates
        await this.createProjectTemplates();

        // Setup project export/import tools
        const exportTool = this.generateExportTool();
        const exportPath = path.join(this.projectPath, 'scripts', 'export-project.js');
        await fs.ensureDir(path.dirname(exportPath));
        await fs.writeFile(exportPath, exportTool);

        const importTool = this.generateImportTool();
        const importPath = path.join(this.projectPath, 'scripts', 'import-project.js');
        await fs.writeFile(importPath, importTool);

        console.log('✅ Project sharing system configured');
        return { 
            api: apiPath, 
            export: exportPath, 
            import: importPath 
        };
    }

    async setupGitIntegration() {
        console.log('🔀 Setting up Git integration...');

        // Initialize Git if not already done
        if (!await fs.pathExists(path.join(this.projectPath, '.git'))) {
            execSync('git init', { cwd: this.projectPath, stdio: 'inherit' });
        }

        // Create Git workflow tools
        const gitTools = this.generateGitTools();
        const toolsPath = path.join(this.projectPath, 'scripts', 'git-tools.js');
        await fs.ensureDir(path.dirname(toolsPath));
        await fs.writeFile(toolsPath, gitTools);

        // Setup Git hooks for collaboration
        const gitHooks = this.generateGitHooks();
        const hooksPath = path.join(this.projectPath, '.githooks', 'post-commit');
        await fs.ensureDir(path.dirname(hooksPath));
        await fs.writeFile(hooksPath, gitHooks);
        execSync(`chmod +x ${hooksPath}`);

        // Configure Git for collaboration
        execSync('git config core.hooksPath .githooks', { cwd: this.projectPath });

        console.log('✅ Git integration configured');
        return { tools: toolsPath, hooks: hooksPath };
    }

    generatePairProgrammingServer() {
        return `const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const yws = require('y-websocket').setupWSConnection;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Yjs WebSocket server for CRDT
const wss = new (require('ws').Server)({ server });
wss.on('connection', (conn, req) => {
    yws(conn, req, { gc: false });
});

// Socket.io for additional collaboration features
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-session', (sessionId) => {
        socket.join(sessionId);
        console.log(\`User \${socket.id} joined session \${sessionId}\`);
    });

    socket.on('code-change', (data) => {
        socket.to(data.sessionId).emit('code-change', {
            userId: socket.id,
            changes: data.changes,
            timestamp: Date.now()
        });
    });

    socket.on('cursor-move', (data) => {
        socket.to(data.sessionId).emit('cursor-move', {
            userId: socket.id,
            position: data.position
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(\`Pair programming server running on port \${PORT}\`);
});`;
    }

    generatePairProgrammingClient() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pair Programming - ${path.basename(this.projectPath)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
    <script src="https://unpkg.com/y-monaco@0.1.0/dist/y-monaco.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">👥 Pair Programming</h1>
            <p class="text-gray-600">Collaborative coding session</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- Session Info -->
            <div class="lg:col-span-1">
                <div class="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 class="text-lg font-semibold mb-4">Session Info</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Session ID</label>
                            <input type="text" id="sessionId" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="Enter session ID">
                        </div>
                        <button id="joinSession" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Join Session
                        </button>
                    </div>
                </div>

                <!-- Active Users -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4">Active Users</h3>
                    <div id="activeUsers" class="space-y-2">
                        <div class="text-gray-500 text-sm">No users online</div>
                    </div>
                </div>
            </div>

            <!-- Code Editor -->
            <div class="lg:col-span-3">
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold mb-4">Code Editor</h3>
                    <div id="editor" class="h-96 border rounded-md"></div>
                </div>
            </div>
        </div>

        <!-- Chat -->
        <div class="mt-8">
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-lg font-semibold mb-4">Chat</h3>
                <div id="chatMessages" class="h-48 border rounded-md p-4 mb-4 overflow-y-auto bg-gray-50">
                    <!-- Messages will appear here -->
                </div>
                <div class="flex space-x-2">
                    <input type="text" id="chatInput" class="flex-1 border-gray-300 rounded-md shadow-sm" placeholder="Type a message...">
                    <button id="sendMessage" class="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                        Send
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://unpkg.com/monaco-editor@0.34.0/min/vs/loader.min.js"></script>
    <script>
        let editor;
        let socket;
        let ydoc;
        let ytext;

        // Initialize Monaco Editor
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.34.0/min/vs' } });
        require(['vs/editor/editor.main'], function () {
            editor = monaco.editor.create(document.getElementById('editor'), {
                value: '// Start coding here...',
                language: 'javascript',
                theme: 'vs-dark'
            });

            // Initialize Yjs for real-time collaboration
            initializeCollaboration();
        });

        function initializeCollaboration() {
            // Initialize Socket.io
            socket = io();

            // Join session
            document.getElementById('joinSession').addEventListener('click', () => {
                const sessionId = document.getElementById('sessionId').value;
                if (sessionId) {
                    socket.emit('join-session', sessionId);
                    initializeYjs(sessionId);
                }
            });

            // Chat functionality
            document.getElementById('sendMessage').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });

            document.getElementById('sendMessage').addEventListener('click', sendMessage);

            socket.on('code-change', (data) => {
                // Handle incoming code changes
                console.log('Code change received:', data);
            });

            socket.on('cursor-move', (data) => {
                // Handle cursor movements
                console.log('Cursor move:', data);
            });
        }

        function initializeYjs(sessionId) {
            // Initialize Yjs document
            ydoc = new Y.Doc();
            ytext = ydoc.getText('monaco');

            // Connect to Yjs WebSocket
            const wsProvider = new WebsocketProvider(
                'ws://localhost:3001',
                sessionId,
                ydoc
            );

            // Bind Monaco editor to Yjs
            const monacoBinding = new MonacoBinding(
                ytext,
                editor.getModel(),
                new Set([editor]),
                wsProvider.awareness
            );
        }

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (message) {
                socket.emit('chat-message', { message, timestamp: Date.now() });
                addMessage('You', message);
                input.value = '';
            }
        }

        function addMessage(user, message) {
            const messages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'mb-2';
            messageDiv.innerHTML = \`<strong>\${user}:</strong> \${message}\`;
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        socket.on('chat-message', (data) => {
            addMessage(data.user || 'Anonymous', data.message);
        });
    </script>
</body>
</html>`;
    }

    generateWebSocketServer() {
        return `const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // Broadcast to all connected clients except sender
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        ...data,
                        timestamp: Date.now()
                    }));
                }
            });
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

console.log('WebSocket server running on port 8080');`;
    }

    generateProjectSharingAPI() {
        return `const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Share project
router.post('/share', upload.single('project'), async (req, res) => {
    try {
        const { name, description, tags } = req.body;
        const shareId = generateShareId();
        
        const shareData = {
            id: shareId,
            name: name || 'Shared Project',
            description: description || '',
            tags: tags ? tags.split(',') : [],
            filePath: req.file.path,
            createdAt: new Date().toISOString(),
            downloads: 0
        };

        // Save share metadata
        await saveShareMetadata(shareId, shareData);
        
        res.json({
            success: true,
            shareId: shareId,
            shareUrl: \`\${process.env.BASE_URL}/share/\${shareId}\`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download shared project
router.get('/download/:shareId', async (req, res) => {
    try {
        const shareData = await getShareMetadata(req.params.shareId);
        if (!shareData) {
            return res.status(404).json({ error: 'Share not found' });
        }

        // Increment download count
        shareData.downloads++;
        await saveShareMetadata(req.params.shareId, shareData);

        res.download(shareData.filePath, \`\${shareData.name}.zip\`);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get share info
router.get('/info/:shareId', async (req, res) => {
    try {
        const shareData = await getShareMetadata(req.params.shareId);
        if (!shareData) {
            return res.status(404).json({ error: 'Share not found' });
        }

        res.json({
            id: shareData.id,
            name: shareData.name,
            description: shareData.description,
            tags: shareData.tags,
            createdAt: shareData.createdAt,
            downloads: shareData.downloads
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List public shares
router.get('/public', async (req, res) => {
    try {
        const shares = await getAllShares();
        res.json({
            success: true,
            shares: shares.map(share => ({
                id: share.id,
                name: share.name,
                description: share.description,
                tags: share.tags,
                createdAt: share.createdAt,
                downloads: share.downloads
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function generateShareId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function saveShareMetadata(shareId, data) {
    const metadataPath = path.join(__dirname, '../../data/shares', \`\${shareId}.json\`);
    await fs.ensureDir(path.dirname(metadataPath));
    await fs.writeJson(metadataPath, data);
}

async function getShareMetadata(shareId) {
    const metadataPath = path.join(__dirname, '../../data/shares', \`\${shareId}.json\`);
    if (await fs.pathExists(metadataPath)) {
        return await fs.readJson(metadataPath);
    }
    return null;
}

async function getAllShares() {
    const sharesDir = path.join(__dirname, '../../data/shares');
    await fs.ensureDir(sharesDir);
    
    const files = await fs.readdir(sharesDir);
    const shares = [];
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            const shareData = await fs.readJson(path.join(sharesDir, file));
            shares.push(shareData);
        }
    }
    
    return shares.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = router;`;
    }

    generateGitTools() {
        return `const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitTools {
    constructor(projectPath) {
        this.projectPath = projectPath;
    }

    // Create feature branch
    createFeatureBranch(featureName) {
        const branchName = \`feature/\${featureName.replace(/\\s+/g, '-').toLowerCase()}\`;
        execSync(\`git checkout -b \${branchName}\`, { cwd: this.projectPath });
        return branchName;
    }

    // Create pull request template
    createPRTemplate() {
        const template = \`## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Checklist
- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No security vulnerabilities

## Screenshots (if applicable)
<!-- Add screenshots here -->

## Additional Notes
<!-- Any additional information -->\`;

        const templatePath = path.join(this.projectPath, '.github', 'PULL_REQUEST_TEMPLATE.md');
        fs.writeFileSync(templatePath, template);
        return templatePath;
    }

    // Setup protected branches
    setupBranchProtection() {
        const config = {
            branches: {
                main: {
                    protection: {
                        required_status_checks: {
                            strict: true,
                            contexts: ['continuous-integration/travis-ci']
                        },
                        enforce_admins: true,
                        required_pull_request_reviews: {
                            required_approving_review_count: 1,
                            dismiss_stale_reviews: true
                        },
                        restrictions: null
                    }
                }
            }
        };

        // This would typically be done via GitHub API
        console.log('Branch protection configuration:', JSON.stringify(config, null, 2));
        return config;
    }

    // Generate changelog
    generateChangelog() {
        try {
            const changelog = execSync('git log --oneline --decorate --graph -10', { 
                cwd: this.projectPath,
                encoding: 'utf8'
            });
            return changelog;
        } catch (error) {
            return 'Unable to generate changelog';
        }
    }

    // Get contributors
    getContributors() {
        try {
            const contributors = execSync('git shortlog -sn --no-merges', { 
                cwd: this.projectPath,
                encoding: 'utf8'
            });
            return contributors;
        } catch (error) {
            return 'Unable to get contributors';
        }
    }

    // Create release
    createRelease(version, notes) {
        const tagName = \`v\${version}\`;
        execSync(\`git tag -a \${tagName} -m "\${notes}"\`, { cwd: this.projectPath });
        execSync(\`git push origin \${tagName}\`, { cwd: this.projectPath });
        return tagName;
    }
}

module.exports = GitTools;`;
    }

    generateGitHooks() {
        return `#!/bin/sh

# Post-commit hook for collaboration
COMMIT_HASH=\$(git rev-parse HEAD)
BRANCH_NAME=\$(git rev-parse --abbrev-ref HEAD)
COMMIT_MESSAGE=\$(git log -1 --pretty=%B)

# Send notification to collaboration server
curl -X POST http://localhost:3002/api/commits \\
  -H "Content-Type: application/json" \\
  -d "{
    \\"hash\\": \\"$COMMIT_HASH\\",
    \\"branch\\": \\"$BRANCH_NAME\\",
    \\"message\\": \\"$COMMIT_MESSAGE\\",
    \\"author\\": \\"$(git config user.name)\\",
    \\"timestamp\\": \\"$(date -Iseconds)\\"
  }" 2>/dev/null || true

echo "Commit notification sent to collaboration server"`;
    }

    async generateReviewGuidelines() {
        const guidelines = `# Code Review Guidelines

## General Principles
- **Constructive Feedback**: Always provide constructive feedback with suggested improvements
- **Respect**: Be respectful and professional in all communications
- **Learning**: Code reviews are opportunities for learning and knowledge sharing
- **Quality**: Prioritize code quality, maintainability, and best practices

## Review Checklist

### Code Quality
- [ ] Code follows established style guidelines
- [ ] Variable and function names are descriptive and meaningful
- [ ] No unused variables or imports
- [ ] Code is properly commented where necessary
- [ ] No hardcoded values (use constants/config)

### Functionality
- [ ] Code implements the intended functionality
- [ ] Edge cases are properly handled
- [ ] Error handling is appropriate
- [ ] Input validation is implemented

### Performance
- [ ] No obvious performance bottlenecks
- [ ] Database queries are optimized
- [ ] Memory usage is efficient
- [ ] Large operations are properly paginated

### Security
- [ ] No security vulnerabilities (SQL injection, XSS, CSRF)
- [ ] Sensitive data is properly protected
- [ ] Authentication and authorization are correct
- [ ] Input sanitization is implemented

### Testing
- [ ] Unit tests are included and passing
- [ ] Integration tests cover critical paths
- [ ] Edge cases are tested
- [ ] Test coverage meets minimum requirements

### Documentation
- [ ] Code is self-documenting where possible
- [ ] Complex logic is properly documented
- [ ] API endpoints are documented
- [ ] Database schema changes are documented

## Review Process

1. **Automated Checks**: Ensure all automated tests and linting pass
2. **Self Review**: Author should review their own code first
3. **Peer Review**: At least one team member reviews the code
4. **Approval**: Code requires approval before merging
5. **Merge**: Approved code is merged to main branch

## Review Comments

### Types of Comments
- **Nits**: Minor style or preference issues
- **Suggestions**: Recommended improvements
- **Questions**: Clarification needed
- **Blockers**: Issues that must be fixed before merge

### Comment Format
\`\`\`
[Type] Description

Current code:
\`\`\`javascript
// problematic code
\`\`\`

Suggested improvement:
\`\`\`javascript
// improved code
\`\`\`

Reasoning: Brief explanation of why this change is beneficial
\`\`\`

## Response to Reviews

When responding to review comments:
1. **Acknowledge**: Thank the reviewer and acknowledge the feedback
2. **Explain**: If needed, explain why certain decisions were made
3. **Action**: Address each comment appropriately
4. **Follow-up**: Make requested changes or explain why changes aren't needed

## Escalation

If disagreements arise during review:
1. Discuss privately with the reviewer
2. Involve a senior team member if needed
3. Document decisions for future reference
4. Update guidelines if process improvements are identified`;

        const guidelinesPath = path.join(this.projectPath, 'CODE_REVIEW_GUIDELINES.md');
        await fs.writeFile(guidelinesPath, guidelines);

        return guidelinesPath;
    }

    async generateCollaborationDashboard() {
        const dashboard = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaboration Dashboard - ${path.basename(this.projectPath)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.socket.io/4.0.0/socket.io.min.js"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🤝 Collaboration Dashboard</h1>
            <p class="text-gray-600">Team collaboration and project sharing</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Active Sessions -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">👥 Active Pair Programming Sessions</h3>
                <div id="activeSessions" class="space-y-3">
                    <div class="text-gray-500 text-center py-4">No active sessions</div>
                </div>
                <button class="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Start New Session
                </button>
            </div>

            <!-- Recent Reviews -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">🔍 Recent Code Reviews</h3>
                <div id="recentReviews" class="space-y-3">
                    <div class="text-gray-500 text-center py-4">No recent reviews</div>
                </div>
                <button class="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                    View All Reviews
                </button>
            </div>

            <!-- Shared Projects -->
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">📤 Shared Projects</h3>
                <div id="sharedProjects" class="space-y-3">
                    <div class="text-gray-500 text-center py-4">No shared projects</div>
                </div>
                <button class="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700">
                    Share Current Project
                </button>
            </div>
        </div>

        <!-- Git Activity -->
        <div class="mt-8 bg-white rounded-lg shadow p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">🔀 Recent Git Activity</h3>
            <div id="gitActivity" class="space-y-3">
                <div class="text-gray-500 text-center py-4">Loading git activity...</div>
            </div>
        </div>

        <!-- Real-time Chat -->
        <div class="mt-8 bg-white rounded-lg shadow p-6">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">💬 Team Chat</h3>
            <div id="chatMessages" class="h-64 border rounded-md p-4 mb-4 overflow-y-auto bg-gray-50">
                <!-- Messages will appear here -->
            </div>
            <div class="flex space-x-2">
                <input type="text" id="chatInput" class="flex-1 border-gray-300 rounded-md shadow-sm" placeholder="Type a message...">
                <button id="sendMessage" class="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                    Send
                </button>
            </div>
        </div>
    </div>

    <script>
        const socket = io();

        // Load initial data
        loadSessions();
        loadReviews();
        loadSharedProjects();
        loadGitActivity();

        // Chat functionality
        document.getElementById('sendMessage').addEventListener('click', sendMessage);
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        socket.on('chat-message', (data) => {
            addMessage(data.user, data.message, data.timestamp);
        });

        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (message) {
                socket.emit('chat-message', { 
                    message, 
                    user: 'You',
                    timestamp: Date.now() 
                });
                addMessage('You', message, Date.now());
                input.value = '';
            }
        }

        function addMessage(user, message, timestamp) {
            const messages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'mb-2';
            const time = new Date(timestamp).toLocaleTimeString();
            messageDiv.innerHTML = \`<strong>\${user}:</strong> \${message} <small class="text-gray-500">\${time}</small>\`;
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }

        function loadSessions() {
            // Load active pair programming sessions
            fetch('/api/collaboration/sessions')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('activeSessions');
                    if (data.sessions && data.sessions.length > 0) {
                        container.innerHTML = data.sessions.map(session => 
                            \`<div class="flex justify-between items-center p-3 bg-blue-50 rounded-md">
                                <div>
                                    <div class="font-semibold">\${session.name}</div>
                                    <div class="text-sm text-gray-600">\${session.participants} participants</div>
                                </div>
                                <button class="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                                    Join
                                </button>
                            </div>\`
                        ).join('');
                    }
                })
                .catch(err => console.error('Failed to load sessions:', err));
        }

        function loadReviews() {
            // Load recent code reviews
            fetch('/api/collaboration/reviews?limit=5')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('recentReviews');
                    if (data.reviews && data.reviews.length > 0) {
                        container.innerHTML = data.reviews.map(review => 
                            \`<div class="p-3 border rounded-md">
                                <div class="font-semibold">\${review.title}</div>
                                <div class="text-sm text-gray-600">By \${review.author} • \${review.status}</div>
                            </div>\`
                        ).join('');
                    }
                })
                .catch(err => console.error('Failed to load reviews:', err));
        }

        function loadSharedProjects() {
            // Load shared projects
            fetch('/api/sharing/public?limit=5')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('sharedProjects');
                    if (data.shares && data.shares.length > 0) {
                        container.innerHTML = data.shares.map(project => 
                            \`<div class="p-3 border rounded-md">
                                <div class="font-semibold">\${project.name}</div>
                                <div class="text-sm text-gray-600">\${project.description}</div>
                                <div class="text-xs text-gray-500">\${project.downloads} downloads</div>
                            </div>\`
                        ).join('');
                    }
                })
                .catch(err => console.error('Failed to load shared projects:', err));
        }

        function loadGitActivity() {
            // Load recent Git activity
            fetch('/api/git/activity?limit=10')
                .then(res => res.json())
                .then(data => {
                    const container = document.getElementById('gitActivity');
                    if (data.commits && data.commits.length > 0) {
                        container.innerHTML = data.commits.map(commit => 
                            \`<div class="flex justify-between items-center p-3 border-b">
                                <div>
                                    <div class="font-mono text-sm">\${commit.hash.substring(0, 7)}</div>
                                    <div class="text-sm">\${commit.message}</div>
                                </div>
                                <div class="text-right text-sm text-gray-600">
                                    <div>\${commit.author}</div>
                                    <div>\${new Date(commit.timestamp).toLocaleDateString()}</div>
                                </div>
                            </div>\`
                        ).join('');
                    } else {
                        container.innerHTML = '<div class="text-gray-500 text-center py-4">No recent commits</div>';
                    }
                })
                .catch(err => console.error('Failed to load git activity:', err));
        }

        // Auto-refresh every 30 seconds
        setInterval(() => {
            loadSessions();
            loadReviews();
            loadSharedProjects();
            loadGitActivity();
        }, 30000);
    </script>
</body>
</html>`;

        const dashboardPath = path.join(this.projectPath, 'collaboration', 'dashboard.html');
        await fs.ensureDir(path.dirname(dashboardPath));
        await fs.writeFile(dashboardPath, dashboard);

        return dashboardPath;
    }

    // Runtime collaboration methods
    createReview(pullRequest, reviewer) {
        const review = {
            id: Date.now().toString(),
            pullRequest: pullRequest,
            reviewer: reviewer,
            status: 'pending',
            comments: [],
            createdAt: new Date().toISOString()
        };

        this.reviews.push(review);
        return review;
    }

    addReviewComment(reviewId, comment, author, line = null) {
        const review = this.reviews.find(r => r.id === reviewId);
        if (review) {
            review.comments.push({
                id: Date.now().toString(),
                author: author,
                comment: comment,
                line: line,
                timestamp: new Date().toISOString()
            });
        }
        return review;
    }

    shareProject(projectData, userId) {
        const shareId = Math.random().toString(36).substring(2, 15);
        const sharedProject = {
            id: shareId,
            ...projectData,
            sharedBy: userId,
            sharedAt: new Date().toISOString(),
            downloads: 0
        };

        this.sharedProjects.set(shareId, sharedProject);
        return sharedProject;
    }

    getSharedProjects() {
        return Array.from(this.sharedProjects.values());
    }

    getReviews(status = null) {
        if (status) {
            return this.reviews.filter(review => review.status === status);
        }
        return this.reviews;
    }

    startPairSession(sessionId, creator) {
        const session = {
            id: sessionId,
            creator: creator,
            participants: [creator],
            active: true,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this.sessions.set(sessionId, session);
        return session;
    }

    joinPairSession(sessionId, userId) {
        const session = this.sessions.get(sessionId);
        if (session && session.active) {
            if (!session.participants.includes(userId)) {
                session.participants.push(userId);
            }
            session.lastActivity = new Date().toISOString();
            return session;
        }
        return null;
    }

    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(session => session.active);
    }
}

module.exports = CollaborationSystem;
