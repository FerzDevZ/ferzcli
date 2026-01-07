const fs = require('fs-extra');
const path = require('path');
const ora = require('ora').default || require('ora');
const chalk = require('chalk').default || require('chalk');

class ProjectBrain {
    constructor(projectPath, groqService) {
        this.projectPath = projectPath;
        this.groqService = groqService;
        this.indexPath = path.join(projectPath, '.ferzcli/brain_index.json');
        this.index = {
            files: {},
            lastUpdated: null,
            projectSummary: ''
        };
    }

    async load() {
        if (await fs.pathExists(this.indexPath)) {
            this.index = await fs.readJson(this.indexPath);
        }
    }

    async save() {
        await fs.ensureDir(path.dirname(this.indexPath));
        await fs.writeJson(this.indexPath, this.index, { spaces: 2 });
    }

    /**
     * Index all files in the project to create a "semantic map"
     */
    async buildIndex(force = false) {
        const spinner = ora('Building Project Brain (Semantic Map)...').start();

        try {
            const files = await this.getAllProjectFiles();
            let updatedCount = 0;

            for (const file of files) {
                const relativePath = path.relative(this.projectPath, file);
                const stats = await fs.stat(file);
                const mtime = stats.mtime.getTime();

                // Skip if not forced and file hasn't changed
                if (!force && this.index.files[relativePath] && this.index.files[relativePath].lastModified === mtime) {
                    continue;
                }

                spinner.text = `Analyzing ${relativePath}...`;
                const content = await fs.readFile(file, 'utf8');

                // Summarize file semantic purpose using AI
                const summary = await this.summarizeFile(relativePath, content);

                this.index.files[relativePath] = {
                    summary,
                    lastModified: mtime,
                    exports: this.extractExports(content) // Basic regex-based extraction
                };

                updatedCount++;
            }

            if (updatedCount > 0 || !this.index.projectSummary) {
                spinner.text = 'Generating Project Overview...';
                await this.generateProjectSummary();
            }

            this.index.lastUpdated = Date.now();
            await this.save();
            spinner.succeed(`Brain indexed: ${updatedCount} files updated.`);
        } catch (error) {
            spinner.fail(`Brain indexing failed: ${error.message}`);
        }
    }

    async summarizeFile(fileName, content) {
        // Truncate if too long for summary
        const tail = content.length > 2000 ? content.substring(0, 2000) + '\n... (truncated)' : content;

        const prompt = `Summarize the technical purpose of this file: ${fileName}
        Content:
        ${tail}
        
        Provide a 1-sentence summary focusing on what this file DOES in the project.
        No extra text.`;

        try {
            return await this.groqService.chat(prompt, { temperature: 0.1 });
        } catch (e) {
            return 'No summary available.';
        }
    }

    async generateProjectSummary() {
        const fileSummaries = Object.entries(this.index.files)
            .map(([path, data]) => `- ${path}: ${data.summary}`)
            .join('\n');

        const prompt = `Based on these file summaries, provide a short overview of what this project is and its main architecture:
        ${fileSummaries.substring(0, 5000)} // Safety truncate
        
        Return a paragraph as the project summary.`;

        try {
            this.index.projectSummary = await this.groqService.chat(prompt, { temperature: 0.2 });
        } catch (e) {
            this.index.projectSummary = 'Generic project.';
        }
    }

    extractExports(content) {
        // Basic regex for JS/TS/PHP exports/classes
        const matches = [];
        const classRegex = /class\s+([a-zA-Z0-9_]+)/g;
        const functionRegex = /function\s+([a-zA-Z0-9_]+)/g;

        let match;
        while ((match = classRegex.exec(content)) !== null) matches.push(`class:${match[1]}`);
        while ((match = functionRegex.exec(content)) !== null) matches.push(`fn:${match[1]}`);

        return matches.slice(0, 10); // Limit to top 10
    }

    async getAllProjectFiles() {
        const { FileUtils } = require('./file-utils');
        const fu = new FileUtils();
        const allFiles = await fu.getAllFiles(this.projectPath);

        // Filter out obvious noise
        return allFiles.filter(f => {
            const ext = path.extname(f);
            const relative = path.relative(this.projectPath, f);
            return !relative.startsWith('node_modules') &&
                !relative.startsWith('.git') &&
                !relative.startsWith('.ferzcli') &&
                ['.js', '.ts', '.php', '.py', '.html', '.css', '.json'].includes(ext);
        });
    }

    getContextForRequest(userRequest) {
        // Simple keyword-based semantic match for now
        // In the future, this can use vector similarity
        const relevantFiles = [];
        const requestLower = userRequest.toLowerCase();

        for (const [filePath, data] of Object.entries(this.index.files)) {
            const score = this.calculateMatchScore(requestLower, filePath, data);
            if (score > 0) {
                relevantFiles.push({ path: filePath, score });
            }
        }

        return relevantFiles
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Return top 5
    }

    calculateMatchScore(request, filePath, data) {
        let score = 0;
        const filename = path.basename(filePath).toLowerCase();

        // Match in filename (high weight)
        if (request.includes(filename.split('.')[0])) score += 10;

        // Match in summary
        if (request.split(' ').some(word => data.summary.toLowerCase().includes(word) && word.length > 3)) score += 5;

        // Match in path segments
        if (filePath.toLowerCase().split('/').some(seg => request.includes(seg))) score += 3;

        return score;
    }
}

module.exports = { ProjectBrain };
