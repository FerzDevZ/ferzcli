const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('fast-glob');

async function build() {
    const rootDir = process.cwd();
    const distDir = path.join(rootDir, 'dist');
    const obfuscatedDir = path.join(distDir, 'obfuscated');

    console.log('🚀 Starting Ferzcli Pro Build Process...');

    // 1. Cleanup
    await fs.remove(distDir);
    await fs.ensureDir(obfuscatedDir);

    // 2. copy files to obfuscated dir (maintaining structure)
    console.log('📦 Copying source files...');
    const filesToCopy = await glob([
        'src/index.js',
        'src/commands/*.js',
        'lib/**/*.js',
        'package.json'
    ], { cwd: rootDir });

    for (const file of filesToCopy) {
        if (file.endsWith('.backup') || file.endsWith('.simple')) continue;
        if (file.includes('lib/code-quality')) continue; // Exclude problematic file
        const dest = path.join(obfuscatedDir, file);
        await fs.ensureDir(path.dirname(dest));
        await fs.copy(path.join(rootDir, file), dest);
    }

    // 3. Obfuscate JS files
    console.log('🛡️  Obfuscating source code...');
    const jsFiles = await glob(['**/*.js'], { cwd: obfuscatedDir, absolute: true });

    for (const file of jsFiles) {
        if (file.includes('node_modules')) continue;
        if (file.includes('lib/code-quality')) continue;

        console.log(`  - Obfuscating: ${path.relative(obfuscatedDir, file)}`);
        const source = await fs.readFile(file, 'utf8');
        const obfuscationResult = JavaScriptObfuscator.obfuscate(source, {
            compact: true,
            controlFlowFlattening: false, // Safer
            deadCodeInjection: false,
            stringArray: true,
            stringArrayEncoding: ['base64'],
            stringArrayThreshold: 0.75,
            unicodeEscapeSequence: false
        });

        await fs.writeFile(file, obfuscationResult.getObfuscatedCode());
    }

    // 4. Bundle with pkg
    console.log('🏗️  Bundling into binaries (Linux, Win, Mac)...');
    try {
        // We use pkg on the obfuscated directory
        execSync('npx pkg . --out-path ../bin', {
            cwd: obfuscatedDir,
            stdio: 'inherit'
        });
        console.log('✨ Build successful! Binaries are in dist/bin/');
    } catch (error) {
        console.error('❌ Pkg bundling failed:', error.message);
    }
}

build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
