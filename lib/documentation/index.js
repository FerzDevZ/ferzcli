const fs = require('fs-extra');
const path = require('path');

class DocumentationGenerator {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            type: config.type || 'html', // html, markdown, pdf
            includeApi: config.includeApi !== false,
            includeCode: config.includeCode !== false,
            includeArchitecture: config.includeArchitecture !== false,
            autoGenerate: config.autoGenerate || false,
            ...config
        };
        this.docs = {
            api: [],
            code: [],
            architecture: {}
        };
    }

    async generateDocumentation() {
        console.log('📚 Generating comprehensive documentation...');

        const results = {
            api: null,
            code: null,
            architecture: null,
            overview: null,
            deployment: null
        };

        // Generate API documentation
        if (this.config.includeApi) {
            results.api = await this.generateAPIDocs();
        }

        // Generate code documentation
        if (this.config.includeCode) {
            results.code = await this.generateCodeDocs();
        }

        // Generate architecture documentation
        if (this.config.includeArchitecture) {
            results.architecture = await this.generateArchitectureDocs();
        }

        // Generate project overview
        results.overview = await this.generateProjectOverview();

        // Generate deployment documentation
        results.deployment = await this.generateDeploymentDocs();

        // Create documentation index
        await this.generateDocumentationIndex(results);

        console.log('✅ Documentation generation completed!');
        return results;
    }

    async generateAPIDocs() {
        console.log('🔗 Generating API documentation...');

        const apiFiles = await this.findAPIFiles();
        const apiDocs = [];

        for (const file of apiFiles) {
            const content = await fs.readFile(file, 'utf8');
            const endpoints = this.parseAPIEndpoints(content, file);
            apiDocs.push(...endpoints);
        }

        // Generate OpenAPI/Swagger spec
        const swaggerSpec = this.generateSwaggerSpec(apiDocs);
        const swaggerPath = path.join(this.projectPath, 'docs', 'api', 'swagger.json');
        await fs.ensureDir(path.dirname(swaggerPath));
        await fs.writeJson(swaggerPath, swaggerSpec, { spaces: 2 });

        // Generate HTML documentation
        const htmlDocs = this.generateAPIHTML(apiDocs);
        const htmlPath = path.join(this.projectPath, 'docs', 'api', 'index.html');
        await fs.writeFile(htmlPath, htmlDocs);

        // Generate Postman collection
        const postmanCollection = this.generatePostmanCollection(apiDocs);
        const postmanPath = path.join(this.projectPath, 'docs', 'api', 'postman_collection.json');
        await fs.writeJson(postmanPath, postmanCollection, { spaces: 2 });

        return {
            swagger: swaggerPath,
            html: htmlPath,
            postman: postmanPath,
            endpoints: apiDocs.length
        };
    }

    async generateCodeDocs() {
        console.log('📝 Generating code documentation...');

        const codeFiles = await this.findCodeFiles();
        const codeDocs = [];

        for (const file of codeFiles) {
            const content = await fs.readFile(file, 'utf8');
            const documentation = this.extractCodeDocumentation(content, file);
            if (documentation.functions.length > 0 || documentation.classes.length > 0) {
                codeDocs.push(documentation);
            }
        }

        // Generate JSDoc/HTML docs
        const jsdocConfig = {
            source: {
                include: codeFiles,
                includePattern: '\\.js$',
                exclude: ['node_modules/']
            },
            opts: {
                destination: path.join(this.projectPath, 'docs', 'code'),
                recurse: true
            }
        };

        const jsdocPath = path.join(this.projectPath, 'jsdoc.conf.json');
        await fs.writeJson(jsdocPath, jsdocConfig, { spaces: 2 });

        // Generate Markdown documentation
        const markdownDocs = this.generateCodeMarkdown(codeDocs);
        const markdownPath = path.join(this.projectPath, 'docs', 'code', 'README.md');
        await fs.ensureDir(path.dirname(markdownPath));
        await fs.writeFile(markdownPath, markdownDocs);

        return {
            jsdoc: jsdocPath,
            markdown: markdownPath,
            files: codeDocs.length
        };
    }

    async generateArchitectureDocs() {
        console.log('🏗️ Generating architecture documentation...');

        const architecture = {
            overview: await this.analyzeArchitecture(),
            components: await this.identifyComponents(),
            dataFlow: await this.analyzeDataFlow(),
            dependencies: await this.analyzeDependencies(),
            deployment: await this.analyzeDeployment()
        };

        // Generate architecture decision records (ADRs)
        const adrTemplate = `# Architecture Decision Record

## Title
[Decision title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
[What is the context and why is this decision needed?]

## Decision
[What is the decision?]

## Consequences
[What are the consequences of this decision?]

## Alternatives Considered
[What other alternatives were considered?]

## Related Decisions
[Links to related ADRs]`;

        const adrPath = path.join(this.projectPath, 'docs', 'architecture', 'adr-template.md');
        await fs.ensureDir(path.dirname(adrPath));
        await fs.writeFile(adrPath, adrTemplate);

        // Generate component diagrams
        const componentDiagram = this.generateComponentDiagram(architecture.components);
        const diagramPath = path.join(this.projectPath, 'docs', 'architecture', 'components.md');
        await fs.writeFile(diagramPath, componentDiagram);

        // Generate data flow diagram
        const dataFlowDiagram = this.generateDataFlowDiagram(architecture.dataFlow);
        const dataFlowPath = path.join(this.projectPath, 'docs', 'architecture', 'data-flow.md');
        await fs.writeFile(dataFlowPath, dataFlowDiagram);

        return {
            adrTemplate: adrPath,
            components: diagramPath,
            dataFlow: dataFlowPath,
            architecture
        };
    }

    async generateProjectOverview() {
        console.log('📋 Generating project overview...');

        const packageJson = await this.readPackageJson();
        const overview = {
            name: packageJson.name || path.basename(this.projectPath),
            version: packageJson.version || '1.0.0',
            description: packageJson.description || '',
            technologies: await this.detectTechnologies(),
            structure: await this.analyzeProjectStructure(),
            features: await this.extractFeatures(),
            setup: this.generateSetupInstructions(),
            usage: this.generateUsageInstructions()
        };

        // Generate README.md
        const readme = this.generateREADME(overview);
        const readmePath = path.join(this.projectPath, 'README.md');
        await fs.writeFile(readmePath, readme);

        // Generate CONTRIBUTING.md
        const contributing = this.generateContributingGuide();
        const contributingPath = path.join(this.projectPath, 'CONTRIBUTING.md');
        await fs.writeFile(contributingPath, contributing);

        return {
            readme: readmePath,
            contributing: contributingPath,
            overview
        };
    }

    async generateDeploymentDocs() {
        console.log('🚀 Generating deployment documentation...');

        const deployment = {
            prerequisites: this.generatePrerequisites(),
            local: this.generateLocalDeployment(),
            staging: this.generateStagingDeployment(),
            production: this.generateProductionDeployment(),
            ci: this.generateCIDocs(),
            monitoring: this.generateMonitoringDocs()
        };

        // Generate deployment guides
        const deploymentGuide = this.generateDeploymentGuide(deployment);
        const deploymentPath = path.join(this.projectPath, 'docs', 'deployment', 'README.md');
        await fs.ensureDir(path.dirname(deploymentPath));
        await fs.writeFile(deploymentPath, deploymentGuide);

        // Generate Docker files if needed
        if (!await fs.pathExists(path.join(this.projectPath, 'Dockerfile'))) {
            const dockerfile = this.generateDockerfile();
            await fs.writeFile(path.join(this.projectPath, 'Dockerfile'), dockerfile);
        }

        if (!await fs.pathExists(path.join(this.projectPath, 'docker-compose.yml'))) {
            const dockerCompose = this.generateDockerCompose();
            await fs.writeFile(path.join(this.projectPath, 'docker-compose.yml'), dockerCompose);
        }

        return {
            guide: deploymentPath,
            dockerfile: path.join(this.projectPath, 'Dockerfile'),
            dockerCompose: path.join(this.projectPath, 'docker-compose.yml')
        };
    }

    // API Documentation Methods
    async findAPIFiles() {
        const files = [];
        const extensions = ['.js', '.ts', '.php'];

        const walk = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'vendor') {
                    await walk(fullPath);
                } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                    const content = await fs.readFile(fullPath, 'utf8');
                    if (this.isAPIFile(content)) {
                        files.push(fullPath);
                    }
                }
            }
        };

        await walk(this.projectPath);
        return files;
    }

    isAPIFile(content) {
        const apiPatterns = [
            /router\./,
            /app\./,
            /Route::/,
            /@Route/,
            /express/,
            /fastify/,
            /koa/
        ];

        return apiPatterns.some(pattern => pattern.test(content));
    }

    parseAPIEndpoints(content, filePath) {
        const endpoints = [];
        const lines = content.split('\\n');

        // Parse Express.js routes
        const expressRoutes = content.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]*)['"]/g);
        if (expressRoutes) {
            expressRoutes.forEach(route => {
                const match = route.match(/router\.(\w+)\s*\(\s*['"]([^'"]*)['"]/);
                if (match) {
                    endpoints.push({
                        method: match[1].toUpperCase(),
                        path: match[2],
                        file: path.relative(this.projectPath, filePath),
                        framework: 'express'
                    });
                }
            });
        }

        // Parse Laravel routes
        const laravelRoutes = content.match(/Route::(get|post|put|delete|patch)\s*\(\s*['"]([^'"]*)['"]/g);
        if (laravelRoutes) {
            laravelRoutes.forEach(route => {
                const match = route.match(/Route::(\w+)\s*\(\s*['"]([^'"]*)['"]/);
                if (match) {
                    endpoints.push({
                        method: match[1].toUpperCase(),
                        path: match[2],
                        file: path.relative(this.projectPath, filePath),
                        framework: 'laravel'
                    });
                }
            });
        }

        return endpoints;
    }

    generateSwaggerSpec(endpoints) {
        const spec = {
            openapi: '3.0.0',
            info: {
                title: path.basename(this.projectPath) + ' API',
                version: '1.0.0',
                description: 'API documentation generated by ferzcli'
            },
            servers: [
                {
                    url: 'http://localhost:3000/api/v1',
                    description: 'Development server'
                }
            ],
            paths: {},
            components: {
                schemas: {},
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        };

        // Group endpoints by path
        const pathGroups = {};
        endpoints.forEach(endpoint => {
            if (!pathGroups[endpoint.path]) {
                pathGroups[endpoint.path] = {};
            }
            pathGroups[endpoint.path][endpoint.method.toLowerCase()] = {
                summary: `${endpoint.method} ${endpoint.path}`,
                description: `Endpoint: ${endpoint.path}`,
                responses: {
                    200: {
                        description: 'Successful response'
                    }
                },
                security: [
                    {
                        bearerAuth: []
                    }
                ]
            };
        });

        spec.paths = pathGroups;
        return spec;
    }

    generateAPIHTML(endpoints) {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${path.basename(this.projectPath)} API Documentation</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">🔗 API Documentation</h1>
            <p class="text-gray-600">${path.basename(this.projectPath)} API endpoints</p>
        </header>

        <div class="space-y-6">
            ${endpoints.map(endpoint => `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex items-center mb-4">
                    <span class="px-3 py-1 rounded text-sm font-semibold 
                        ${endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : ''}
                        ${endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' : ''}
                        ${endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' : ''}
                    ">
                        ${endpoint.method}
                    </span>
                    <code class="ml-4 text-lg font-mono">${endpoint.path}</code>
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    <strong>File:</strong> ${endpoint.file}
                </div>
                <div class="text-sm text-gray-600">
                    <strong>Framework:</strong> ${endpoint.framework}
                </div>
            </div>
            `).join('')}
        </div>

        <div class="mt-12 bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-semibold mb-4">📊 API Statistics</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">${endpoints.length}</div>
                    <div class="text-sm text-gray-600">Total Endpoints</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">${endpoints.filter(e => e.method === 'GET').length}</div>
                    <div class="text-sm text-gray-600">GET Endpoints</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">${endpoints.filter(e => e.method === 'POST').length}</div>
                    <div class="text-sm text-gray-600">POST Endpoints</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">${new Set(endpoints.map(e => e.file)).size}</div>
                    <div class="text-sm text-gray-600">Files</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    generatePostmanCollection(endpoints) {
        return {
            info: {
                name: path.basename(this.projectPath) + ' API',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: endpoints.map(endpoint => ({
                name: `${endpoint.method} ${endpoint.path}`,
                request: {
                    method: endpoint.method,
                    header: [
                        {
                            key: 'Content-Type',
                            value: 'application/json'
                        },
                        {
                            key: 'Authorization',
                            value: 'Bearer {{token}}'
                        }
                    ],
                    url: {
                        raw: `{{base_url}}${endpoint.path}`,
                        host: ['{{base_url}}'],
                        path: endpoint.path.split('/').filter(p => p)
                    }
                }
            })),
            variable: [
                {
                    key: 'base_url',
                    value: 'http://localhost:3000/api/v1'
                },
                {
                    key: 'token',
                    value: ''
                }
            ]
        };
    }

    // Code Documentation Methods
    async findCodeFiles() {
        const files = [];
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.php'];

        const walk = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'vendor') {
                    await walk(fullPath);
                } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };

        await walk(this.projectPath);
        return files;
    }

    extractCodeDocumentation(content, filePath) {
        const documentation = {
            file: path.relative(this.projectPath, filePath),
            functions: [],
            classes: [],
            interfaces: [],
            types: []
        };

        const lines = content.split('\\n');

        lines.forEach((line, index) => {
            // Extract JSDoc comments
            if (line.trim().startsWith('/**')) {
                const comment = this.extractJSDocComment(lines, index);
                const nextLine = lines[index + comment.lines];

                // Check what the comment documents
                if (nextLine && nextLine.includes('function')) {
                    documentation.functions.push({
                        name: this.extractFunctionName(nextLine),
                        description: comment.description,
                        params: comment.params,
                        returns: comment.returns,
                        line: index + 1
                    });
                } else if (nextLine && (nextLine.includes('class') || nextLine.includes('export class'))) {
                    documentation.classes.push({
                        name: this.extractClassName(nextLine),
                        description: comment.description,
                        line: index + 1
                    });
                }
            }

            // Extract PHP docblocks
            if (line.trim().startsWith('/**') && filePath.endsWith('.php')) {
                const comment = this.extractPHPComment(lines, index);
                const nextLine = lines[index + comment.lines];

                if (nextLine && nextLine.includes('function')) {
                    documentation.functions.push({
                        name: this.extractPHPFunctionName(nextLine),
                        description: comment.description,
                        params: comment.params,
                        returns: comment.returns,
                        line: index + 1
                    });
                } else if (nextLine && nextLine.includes('class')) {
                    documentation.classes.push({
                        name: this.extractPHPClassName(nextLine),
                        description: comment.description,
                        line: index + 1
                    });
                }
            }
        });

        return documentation;
    }

    extractJSDocComment(lines, startIndex) {
        const comment = {
            description: '',
            params: [],
            returns: '',
            lines: 0
        };

        let i = startIndex;
        while (i < lines.length && !lines[i].trim().endsWith('*/')) {
            const line = lines[i].trim();

            if (line.includes('@param')) {
                const paramMatch = line.match(/@param\s+{(\w+)}\s+(\w+)\s+(.+)/);
                if (paramMatch) {
                    comment.params.push({
                        type: paramMatch[1],
                        name: paramMatch[2],
                        description: paramMatch[3]
                    });
                }
            } else if (line.includes('@returns') || line.includes('@return')) {
                const returnMatch = line.match(/@returns?\s+{(\w+)}\s+(.+)/);
                if (returnMatch) {
                    comment.returns = {
                        type: returnMatch[1],
                        description: returnMatch[2]
                    };
                }
            } else if (!line.includes('/**') && !line.includes('*/') && !line.includes('@')) {
                comment.description += line.replace('*', '').trim() + ' ';
            }

            comment.lines++;
            i++;
        }

        comment.description = comment.description.trim();
        return comment;
    }

    extractPHPComment(lines, startIndex) {
        // Similar to JSDoc but for PHP
        return this.extractJSDocComment(lines, startIndex);
    }

    extractFunctionName(line) {
        const match = line.match(/(?:function|const|let|var)\s+(\w+)/);
        return match ? match[1] : 'anonymous';
    }

    extractClassName(line) {
        const match = line.match(/(?:export\s+)?class\s+(\w+)/);
        return match ? match[1] : 'anonymous';
    }

    extractPHPFunctionName(line) {
        const match = line.match(/function\s+(\w+)/);
        return match ? match[1] : 'anonymous';
    }

    extractPHPClassName(line) {
        const match = line.match(/class\s+(\w+)/);
        return match ? match[1] : 'anonymous';
    }

    generateCodeMarkdown(codeDocs) {
        let markdown = `# Code Documentation

This document contains automatically generated documentation for the codebase.

## Table of Contents

`;

        // Generate table of contents
        codeDocs.forEach(doc => {
            markdown += `- [${doc.file}](#${doc.file.replace(/[./]/g, '-')})\n`;
        });

        markdown += '\n';

        // Generate detailed documentation
        codeDocs.forEach(doc => {
            markdown += `## ${doc.file}

`;

            if (doc.classes.length > 0) {
                markdown += '### Classes\n\n';
                doc.classes.forEach(cls => {
                    markdown += `#### ${cls.name}\n\n`;
                    if (cls.description) {
                        markdown += `${cls.description}\n\n`;
                    }
                    markdown += `*Defined at line ${cls.line}*\n\n`;
                });
            }

            if (doc.functions.length > 0) {
                markdown += '### Functions\n\n';
                doc.functions.forEach(func => {
                    markdown += `#### ${func.name}\n\n`;
                    if (func.description) {
                        markdown += `${func.description}\n\n`;
                    }

                    if (func.params && func.params.length > 0) {
                        markdown += '**Parameters:**\n\n';
                        func.params.forEach(param => {
                            markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
                        });
                        markdown += '\n';
                    }

                    if (func.returns) {
                        markdown += `**Returns:** (${func.returns.type}) ${func.returns.description}\n\n`;
                    }

                    markdown += `*Defined at line ${func.line}*\n\n`;
                });
            }
        });

        return markdown;
    }

    // Architecture Documentation Methods
    async analyzeArchitecture() {
        const structure = await this.analyzeProjectStructure();
        const technologies = await this.detectTechnologies();

        return {
            type: this.detectArchitectureType(structure, technologies),
            layers: this.identifyLayers(structure),
            patterns: this.detectPatterns(structure),
            technologies: technologies,
            structure: structure
        };
    }

    async identifyComponents() {
        const files = await this.findCodeFiles();
        const components = {
            controllers: [],
            models: [],
            services: [],
            repositories: [],
            middleware: [],
            utils: []
        };

        for (const file of files) {
            const relativePath = path.relative(this.projectPath, file);
            const content = await fs.readFile(file, 'utf8');

            if (relativePath.includes('controller') || content.includes('Controller')) {
                components.controllers.push(relativePath);
            } else if (relativePath.includes('model') || content.includes('extends Model')) {
                components.models.push(relativePath);
            } else if (relativePath.includes('service') || content.includes('Service')) {
                components.services.push(relativePath);
            } else if (relativePath.includes('repository') || content.includes('Repository')) {
                components.repositories.push(relativePath);
            } else if (relativePath.includes('middleware') || content.includes('middleware')) {
                components.middleware.push(relativePath);
            } else if (relativePath.includes('util') || relativePath.includes('helper')) {
                components.utils.push(relativePath);
            }
        }

        return components;
    }

    async analyzeDataFlow() {
        // Analyze data flow between components
        const components = await this.identifyComponents();
        const dataFlow = {
            inputs: [],
            processing: [],
            outputs: [],
            storage: []
        };

        // Identify data flow patterns
        if (components.controllers.length > 0) {
            dataFlow.inputs.push('HTTP Requests');
        }

        if (components.services.length > 0) {
            dataFlow.processing.push('Business Logic Processing');
        }

        if (components.models.length > 0) {
            dataFlow.storage.push('Database Operations');
        }

        if (components.repositories.length > 0) {
            dataFlow.outputs.push('Data Retrieval & Storage');
        }

        return dataFlow;
    }

    async analyzeDependencies() {
        const packageJson = await this.readPackageJson();
        const dependencies = {
            runtime: packageJson.dependencies || {},
            development: packageJson.devDependencies || {},
            peer: packageJson.peerDependencies || {}
        };

        // Analyze Laravel dependencies
        if (await fs.pathExists(path.join(this.projectPath, 'composer.json'))) {
            const composerJson = await fs.readJson(path.join(this.projectPath, 'composer.json'));
            dependencies.php = {
                runtime: composerJson.require || {},
                development: composerJson['require-dev'] || {}
            };
        }

        return dependencies;
    }

    async analyzeDeployment() {
        return {
            strategy: this.detectDeploymentStrategy(),
            environments: ['development', 'staging', 'production'],
            infrastructure: this.detectInfrastructureRequirements(),
            scaling: this.analyzeScalingRequirements()
        };
    }

    detectArchitectureType(structure, technologies) {
        if (technologies.includes('laravel')) return 'MVC';
        if (technologies.includes('express') || technologies.includes('fastify')) return 'Layered Architecture';
        if (technologies.includes('react') && technologies.includes('express')) return 'SPA with API';
        return 'Monolithic';
    }

    identifyLayers(structure) {
        return {
            presentation: structure.directories.filter(d => d.includes('view') || d.includes('template') || d.includes('public')),
            application: structure.directories.filter(d => d.includes('controller') || d.includes('service')),
            domain: structure.directories.filter(d => d.includes('model') || d.includes('entity')),
            infrastructure: structure.directories.filter(d => d.includes('config') || d.includes('database') || d.includes('middleware'))
        };
    }

    detectPatterns(structure) {
        const patterns = [];

        if (structure.directories.some(d => d.includes('repository'))) {
            patterns.push('Repository Pattern');
        }

        if (structure.directories.some(d => d.includes('service'))) {
            patterns.push('Service Layer Pattern');
        }

        if (structure.directories.some(d => d.includes('factory'))) {
            patterns.push('Factory Pattern');
        }

        if (structure.directories.some(d => d.includes('observer') || d.includes('listener'))) {
            patterns.push('Observer Pattern');
        }

        return patterns;
    }

    generateComponentDiagram(components) {
        let diagram = '# Component Diagram\n\n```mermaid\ngraph TD\n';

        // Add components
        Object.entries(components).forEach(([type, files]) => {
            if (files.length > 0) {
                diagram += `    ${type}[${type.charAt(0).toUpperCase() + type.slice(1)}]\n`;
            }
        });

        // Add relationships
        diagram += '\n    %% Relationships\n';
        if (components.controllers.length > 0 && components.services.length > 0) {
            diagram += '    controllers --> services\n';
        }
        if (components.services.length > 0 && components.models.length > 0) {
            diagram += '    services --> models\n';
        }
        if (components.models.length > 0 && components.repositories.length > 0) {
            diagram += '    models --> repositories\n';
        }

        diagram += '```\n';
        return diagram;
    }

    generateDataFlowDiagram(dataFlow) {
        let diagram = '# Data Flow Diagram\n\n```mermaid\ngraph LR\n';

        // Add data flow components
        dataFlow.inputs.forEach(input => {
            diagram += `    ${input.replace(/\s+/g, '')}[${input}]\n`;
        });

        dataFlow.processing.forEach(process => {
            diagram += `    ${process.replace(/\s+/g, '')}[${process}]\n`;
        });

        dataFlow.outputs.forEach(output => {
            diagram += `    ${output.replace(/\s+/g, '')}[${output}]\n`;
        });

        // Add connections
        if (dataFlow.inputs.length > 0 && dataFlow.processing.length > 0) {
            diagram += `    ${dataFlow.inputs[0].replace(/\s+/g, '')} --> ${dataFlow.processing[0].replace(/\s+/g, '')}\n`;
        }

        if (dataFlow.processing.length > 0 && dataFlow.outputs.length > 0) {
            diagram += `    ${dataFlow.processing[0].replace(/\s+/g, '')} --> ${dataFlow.outputs[0].replace(/\s+/g, '')}\n`;
        }

        diagram += '```\n';
        return diagram;
    }

    // Project Overview Methods
    async readPackageJson() {
        const packagePath = path.join(this.projectPath, 'package.json');
        if (await fs.pathExists(packagePath)) {
            return await fs.readJson(packagePath);
        }
        return {};
    }

    async detectTechnologies() {
        const technologies = [];

        if (await fs.pathExists(path.join(this.projectPath, 'package.json'))) {
            const packageJson = await fs.readJson(path.join(this.projectPath, 'package.json'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps.express) technologies.push('express');
            if (deps.fastify) technologies.push('fastify');
            if (deps.react) technologies.push('react');
            if (deps.vue) technologies.push('vue');
            if (deps.angular) technologies.push('angular');
            if (deps.next) technologies.push('next.js');
            if (deps.nuxt) technologies.push('nuxt.js');
            if (deps['@nestjs/core']) technologies.push('nestjs');
        }

        if (await fs.pathExists(path.join(this.projectPath, 'composer.json'))) {
            technologies.push('laravel');
        }

        if (await fs.pathExists(path.join(this.projectPath, 'requirements.txt'))) {
            technologies.push('python');
        }

        if (await fs.pathExists(path.join(this.projectPath, 'Cargo.toml'))) {
            technologies.push('rust');
        }

        return technologies;
    }

    async analyzeProjectStructure() {
        const structure = {
            directories: [],
            files: [],
            configFiles: []
        };

        const walk = async (dir, level = 0) => {
            if (level > 3) return; // Limit depth

            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory() && !item.startsWith('.')) {
                    structure.directories.push(path.relative(this.projectPath, fullPath));
                    await walk(fullPath, level + 1);
                } else if (stat.isFile()) {
                    const relativePath = path.relative(this.projectPath, fullPath);
                    structure.files.push(relativePath);

                    if (item.includes('config') || ['.env', '.env.example', 'docker-compose.yml', 'Dockerfile'].includes(item)) {
                        structure.configFiles.push(relativePath);
                    }
                }
            }
        };

        await walk(this.projectPath);
        return structure;
    }

    async extractFeatures() {
        const features = [];
        const codeFiles = await this.findCodeFiles();

        for (const file of codeFiles) {
            const content = await fs.readFile(file, 'utf8');

            // Extract features from comments and function names
            const lines = content.split('\\n');
            lines.forEach(line => {
                if (line.includes('TODO') || line.includes('FIXME')) {
                    // Skip TODO comments
                } else if (line.includes('auth') || line.includes('login') || line.includes('register')) {
                    if (!features.includes('Authentication')) features.push('Authentication');
                } else if (line.includes('payment') || line.includes('stripe') || line.includes('paypal')) {
                    if (!features.includes('Payment Processing')) features.push('Payment Processing');
                } else if (line.includes('email') || line.includes('mail')) {
                    if (!features.includes('Email Service')) features.push('Email Service');
                } else if (line.includes('notification')) {
                    if (!features.includes('Notifications')) features.push('Notifications');
                } else if (line.includes('upload') || line.includes('file')) {
                    if (!features.includes('File Upload')) features.push('File Upload');
                }
            });
        }

        return features;
    }

    generateSetupInstructions() {
        return `# Setup Instructions

## Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

## Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${path.basename(this.projectPath)}
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

4. Run database migrations:
\`\`\`bash
npm run migrate
\`\`\`

5. Start the development server:
\`\`\`bash
npm run dev
\`\`\`

The application will be available at http://localhost:3000`;
    }

    generateUsageInstructions() {
        return `# Usage

## Development

\`\`\`bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
\`\`\`

## API Endpoints

The API documentation is available at \`/api/docs\` when the server is running.

## Deployment

See the [deployment documentation](./docs/deployment/README.md) for detailed instructions.`;
    }

    generateREADME(overview) {
        return `# ${overview.name}

${overview.description}

## 🚀 Features

${overview.features.map(feature => `- ${feature}`).join('\\n')}

## 🛠️ Technologies

${overview.technologies.map(tech => `- ${tech.charAt(0).toUpperCase() + tech.slice(1)}`).join('\\n')}

## 📁 Project Structure

\`\`\`
${overview.structure.directories.slice(0, 10).map(dir => `${dir}/`).join('\\n')}
\`\`\`

## 🏁 Quick Start

${overview.setup}

## 📖 Usage

${overview.usage}

## 📚 Documentation

- [API Documentation](./docs/api/index.html)
- [Code Documentation](./docs/code/README.md)
- [Architecture Documentation](./docs/architecture/README.md)
- [Deployment Guide](./docs/deployment/README.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👥 Authors

${this.generateAuthorsSection()}

---

Built with ❤️ using [ferzcli](https://github.com/ferzcli/ferzcli)`;
    }

    generateContributingGuide() {
        return `# Contributing to ${path.basename(this.projectPath)}

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use github to host code, to track issues and feature requests, as well as accept pull requests.

## We Use [Github Flow](https://guides.github.com/introduction/flow/index.html), So All Code Changes Happen Through Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from \`main\`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using Github's [issues](../../issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](../../issues/new); it's that easy!

## Write bug reports with detail, background, and sample code

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can.
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Use a Consistent Coding Style

- Use ESLint and Prettier for code formatting
- Follow the existing code style
- 2 spaces for indentation rather than tabs
- You can try running \`npm run lint\` for style unification

## License

By contributing, you agree that your contributions will be licensed under its MIT License.`;
    }

    generateAuthorsSection() {
        return `- **ferzcli** - *AI Assistant* - [GitHub](https://github.com/ferzcli)`;
    }

    // Deployment Documentation Methods
    generatePrerequisites() {
        return `## Prerequisites

Before deploying, ensure you have the following:

### System Requirements
- Node.js 16.x or higher
- npm 7.x or higher
- Git
- SSL certificate (for production)

### Environment Variables
\`\`\`bash
NODE_ENV=production
PORT=3000
DATABASE_URL=your_database_url
REDIS_URL=your_redis_url
JWT_SECRET=your_jwt_secret
\`\`\`

### External Services
- Database (PostgreSQL/MySQL/MongoDB)
- Redis (for caching and sessions)
- Email service (SendGrid/Mailgun)
- File storage (AWS S3/Cloudinary)`;
    }

    generateLocalDeployment() {
        return `## Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd ${path.basename(this.projectPath)}
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your local configuration
   \`\`\`

4. **Run database migrations**
   \`\`\`bash
   npm run migrate
   \`\`\`

5. **Start the application**
   \`\`\`bash
   npm run dev
   \`\`\`

The application will be available at http://localhost:3000`;
    }

    generateStagingDeployment() {
        return `## Staging Deployment

### Using Docker

1. **Build the Docker image**
   \`\`\`bash
   docker build -t ${path.basename(this.projectPath)}:staging .
   \`\`\`

2. **Run with docker-compose**
   \`\`\`bash
   docker-compose -f docker-compose.staging.yml up -d
   \`\`\`

### Using Heroku

1. **Create Heroku app**
   \`\`\`bash
   heroku create ${path.basename(this.projectPath)}-staging
   \`\`\`

2. **Set environment variables**
   \`\`\`bash
   heroku config:set NODE_ENV=staging --app ${path.basename(this.projectPath)}-staging
   \`\`\`

3. **Deploy**
   \`\`\`bash
   git push heroku staging:main
   \`\`\``;
    }

    generateProductionDeployment() {
        return `## Production Deployment

### AWS Deployment

1. **EC2 Instance Setup**
   \`\`\`bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install PM2
   sudo npm install -g pm2

   # Clone repository
   git clone <repository-url>
   cd ${path.basename(this.projectPath)}

   # Install dependencies
   npm ci --production

   # Build application
   npm run build
   \`\`\`

2. **PM2 Configuration**
   \`\`\`json
   {
     "name": "${path.basename(this.projectPath)}",
     "script": "dist/index.js",
     "instances": "max",
     "env": {
       "NODE_ENV": "production",
       "PORT": 3000
     }
   }
   \`\`\`

3. **Start with PM2**
   \`\`\`bash
   pm2 start ecosystem.config.json
   pm2 save
   pm2 startup
   \`\`\`

### Docker Production

1. **Build and run**
   \`\`\`bash
   docker build -t ${path.basename(this.projectPath)}:latest .
   docker run -d -p 3000:3000 --env-file .env ${path.basename(this.projectPath)}:latest
   \`\`\`

### Nginx Configuration

\`\`\`nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\``;
    }

    generateCIDocs() {
        return `## CI/CD Pipeline

### GitHub Actions

Create \`.github/workflows/deploy.yml\`:

\`\`\`yaml
name: Deploy

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build
      run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: echo "Deploy to production server"
\`\`\`

### Jenkins Pipeline

\`\`\`groovy
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/your-org/${path.basename(this.projectPath)}.git'
            }
        }
        
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Test') {
            steps {
                sh 'npm test'
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
        
        stage('Deploy') {
            steps {
                sh 'npm run deploy'
            }
        }
    }
}
\`\`\``;
    }

    generateMonitoringDocs() {
        return `## Monitoring & Observability

### Health Checks

The application exposes health check endpoints:

- \`GET /health\` - Basic health check
- \`GET /health/detailed\` - Detailed health check with dependencies
- \`GET /ready\` - Readiness check for load balancers

### Metrics

Application metrics are exposed via Prometheus:

- HTTP request duration
- Error rates
- Memory usage
- CPU usage
- Database connection pool stats

Access metrics at \`/metrics\` endpoint.

### Logging

Logs are structured and include:

- Request ID tracing
- Error stack traces
- Performance metrics
- Security events

### Alerting

Alerts are configured for:

- High error rates (>5%)
- Slow response times (>5s)
- Memory usage (>80%)
- Disk space (>90%)

Alerts are sent via Slack, email, and webhooks.`;
    }

    generateDeploymentGuide(deployment) {
        return `# Deployment Guide

This guide covers how to deploy ${path.basename(this.projectPath)} to various environments.

${deployment.prerequisites}

${deployment.local}

${deployment.staging}

${deployment.production}

${deployment.ci}

${deployment.monitoring}

## Troubleshooting

### Common Issues

1. **Port already in use**
   \`\`\`bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   \`\`\`

2. **Environment variables not loaded**
   - Ensure .env file exists
   - Check variable names match code expectations

3. **Database connection failed**
   - Verify database credentials
   - Check network connectivity
   - Ensure database server is running

4. **Build failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are available

### Performance Tuning

1. **Memory optimization**
   - Use PM2 cluster mode
   - Set appropriate heap size
   - Monitor memory leaks

2. **Database optimization**
   - Use connection pooling
   - Implement query caching
   - Add database indexes

3. **Caching strategy**
   - Implement Redis for session storage
   - Cache API responses
   - Use CDN for static assets

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation active
- [ ] Security headers set
- [ ] Dependencies updated regularly`;
    }

    generateDockerfile() {
        const framework = this.detectFramework();

        if (framework === 'laravel') {
            return `# Laravel Dockerfile
FROM php:8.1-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    git \\
    curl \\
    libpng-dev \\
    libonig-dev \\
    libxml2-dev \\
    zip \\
    unzip

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy composer files
COPY composer.json composer.lock ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Copy application code
COPY . .

# Set permissions
RUN chown -R www-data:www-data /var/www \\
    && chmod -R 755 /var/www/storage

# Expose port
EXPOSE 9000

CMD ["php-fpm"]`;
        } else {
            return `# Node.js Dockerfile
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Build application (if needed)
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "start"]`;
        }
    }

    generateDockerCompose() {
        return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: ${path.basename(this.projectPath)}
      MYSQL_USER: app
      MYSQL_PASSWORD: apppassword
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  db_data:
  redis_data:

networks:
  default:
    driver: bridge`;
    }

    detectDeploymentStrategy() {
        if (this.config.includeDocker) return 'Docker';
        if (this.config.includeKubernetes) return 'Kubernetes';
        return 'Traditional';
    }

    detectInfrastructureRequirements() {
        return {
            compute: 'EC2/t3.micro or equivalent',
            storage: 'EBS/S3',
            database: 'RDS',
            caching: 'ElastiCache',
            cdn: 'CloudFront'
        };
    }

    analyzeScalingRequirements() {
        return {
            horizontal: 'Auto Scaling Groups',
            vertical: 'Instance type upgrades',
            loadBalancer: 'Application Load Balancer',
            caching: 'Redis cluster'
        };
    }

    async generateDocumentationIndex(results) {
        const indexContent = `# 📚 ${path.basename(this.projectPath)} Documentation

Welcome to the comprehensive documentation for ${path.basename(this.projectPath)}.

## 📖 Table of Contents

### 🚀 Getting Started
- [README](../README.md) - Project overview and setup
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

### 🔗 API Documentation
- [API Endpoints](api/index.html) - Interactive API documentation
- [Swagger/OpenAPI Spec](api/swagger.json) - Machine-readable API specification
- [Postman Collection](api/postman_collection.json) - API testing collection

### 💻 Code Documentation
- [Code Documentation](code/README.md) - Auto-generated code documentation
- [JSDoc Documentation](code/index.html) - Interactive code documentation

### 🏗️ Architecture
- [Architecture Overview](architecture/README.md) - System architecture
- [Component Diagram](architecture/components.md) - Component relationships
- [Data Flow Diagram](architecture/data-flow.md) - Data flow visualization
- [ADR Template](architecture/adr-template.md) - Architecture Decision Records

### 🚀 Deployment
- [Deployment Guide](deployment/README.md) - Complete deployment instructions
- [Docker Setup](deployment/docker.md) - Containerization guide
- [CI/CD Pipeline](deployment/ci-cd.md) - Automated deployment

### 🛠️ Development Tools
- [Code Quality](quality-dashboard.html) - Code quality metrics
- [Monitoring](monitoring/dashboard.html) - Application monitoring
- [Testing](testing/README.md) - Testing guidelines

## 📊 Project Statistics

- **API Endpoints**: ${results.api?.endpoints || 0}
- **Code Files**: ${results.code?.files || 0}
- **Test Coverage**: ${results.code?.coverage || 'N/A'}%
- **Documentation Pages**: ${Object.keys(results).length}

## 🔧 Quick Links

- [GitHub Repository](https://github.com/your-org/${path.basename(this.projectPath)})
- [Issue Tracker](https://github.com/your-org/${path.basename(this.projectPath)}/issues)
- [Project Board](https://github.com/your-org/${path.basename(this.projectPath)}/projects)

## 📞 Support

- [Documentation Issues](https://github.com/your-org/${path.basename(this.projectPath)}/issues/new?labels=documentation)
- [Development Support](https://github.com/your-org/${path.basename(this.projectPath)}/discussions)

---

*This documentation was automatically generated by [ferzcli](https://github.com/ferzcli/ferzcli)*`;

        const indexPath = path.join(this.projectPath, 'docs', 'README.md');
        await fs.ensureDir(path.dirname(indexPath));
        await fs.writeFile(indexPath, indexContent);

        return indexPath;
    }
}

module.exports = DocumentationGenerator;
