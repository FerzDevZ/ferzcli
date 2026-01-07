const fs = require('fs-extra');
const path = require('path');

class ProjectDetector {
    async detect(dirPath) {
        const result = {
            name: path.basename(dirPath),
            type: 'Generic Project',
            framework: 'None',
            language: 'Unknown',
            dependencies: {},
            packageManager: 'unknown'
        };

        // 1. Check for Node.js
        if (await fs.pathExists(path.join(dirPath, 'package.json'))) {
            result.language = 'JavaScript/TypeScript';
            result.packageManager = 'npm';

            try {
                const pkg = await fs.readJson(path.join(dirPath, 'package.json'));
                result.dependencies = { ...pkg.dependencies, ...pkg.devDependencies };

                if (result.dependencies['react']) result.framework = 'React';
                if (result.dependencies['next']) { result.framework = 'Next.js'; result.type = 'Web App'; }
                if (result.dependencies['vue']) result.framework = 'Vue.js';
                if (result.dependencies['laravel-mix']) result.framework = 'Laravel Mix';
                if (result.dependencies['express']) { result.framework = 'Express'; result.type = 'Backend API'; }
            } catch (e) { }
        }

        // 2. Check for PHP/Laravel
        if (await fs.pathExists(path.join(dirPath, 'composer.json'))) {
            result.language = 'PHP';
            result.packageManager = 'composer';
            try {
                const composer = await fs.readJson(path.join(dirPath, 'composer.json'));
                const deps = { ...composer.require, ...composer['require-dev'] };
                result.dependencies = deps;

                if (deps['laravel/framework']) {
                    result.framework = 'Laravel';
                    result.type = 'Full Stack Framework';
                }
            } catch (e) { }
        }

        // 3. Python
        if (await fs.pathExists(path.join(dirPath, 'requirements.txt'))) {
            result.language = 'Python';
            result.packageManager = 'pip';
            result.framework = 'Python Script';
            // rudimentary check
            const content = await fs.readFile(path.join(dirPath, 'requirements.txt'), 'utf8');
            if (content.includes('django')) result.framework = 'Django';
            if (content.includes('flask')) result.framework = 'Flask';
            if (content.includes('fastapi')) result.framework = 'FastAPI';
        }

        return result;
    }
}

module.exports = { ProjectDetector };
