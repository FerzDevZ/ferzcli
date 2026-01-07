
const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/index.js');

function analyzeFile(filePath) {
    console.log(`Analyzing ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Simplistic regex-based parser
    // 1. Find classes
    // 2. Inside classes, find method definitions
    // 3. Inside classes, find this.method() calls

    const classRegex = /class\s+(\w+)\s*(?:extends\s+(\w+))?\s*{/g;
    let match;

    const classes = {};
    const lines = content.split('\n');

    // We need to keep track of brace nesting to find class boundaries
    let currentClass = null;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for class start
        const classMatch = /class\s+(\w+)/.exec(line);
        if (classMatch && !currentClass) {
            currentClass = {
                name: classMatch[1],
                startLine: i + 1,
                methods: new Set(),
                calls: []
            };
            classes[currentClass.name] = currentClass;
            braceCount = 0;
        }

        if (currentClass) {
            // Count braces to find end of class
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            braceCount += openBraces - closeBraces;

            // Look for method definitions: async methodName( or methodName(
            // Excluding constructor, control structures (if, for, switch, catch, etc)
            const methodDefRegex = /^\s*(?:async\s+)?(\w+)\s*\(/;
            const methodMatch = methodDefRegex.exec(line);
            if (methodMatch) {
                const name = methodMatch[1];
                const ignored = ['if', 'for', 'while', 'switch', 'catch', 'constructor', 'function'];
                if (!ignored.includes(name)) {
                    currentClass.methods.add(name);
                }
            }

            // Look for this.methodName( calls
            const callRegex = /this\.(\w+)\s*\(/g;
            let callMatch;
            while ((callMatch = callRegex.exec(line)) !== null) {
                currentClass.calls.push({
                    name: callMatch[1],
                    line: i + 1
                });
            }

            // Check if class ended
            if (braceCount === 0 && openBraces > 0) {
                // It just started, handled above
            } else if (braceCount <= 0 && currentClass) {
                currentClass.endLine = i + 1;
                currentClass = null;
            }
        }
    }

    // Analyze results
    let issuesFound = 0;

    for (const className in classes) {
        const cls = classes[className];
        console.log(`\nChecking Class: ${cls.name} (Lines ${cls.startLine}-${cls.endLine})`);
        console.log(`Found ${cls.methods.size} methods.`);

        const missing = new Set();

        cls.calls.forEach(call => {
            // Check existence
            // Note: This is simple, doesn't check parent classes explicitly but assumes standard structure
            // Also simplistic check for 'groqService' calls which are external

            if (!cls.methods.has(call.name)) {
                // Heuristic: Ignore likely external properties or standardized ones if needed
                // But for explicit this.method() calls, it should be in the class or parent.
                // We'll list them for review.

                // Common false positives to filter
                if (['log', 'error', 'warn'].includes(call.name)) return; // Console-like wrappers?

                // If the call is on an object property of this, e.g. this.groqService.chat(), 
                // the regex 'this.groqService' might be matched as method 'groqService' if followed by (
                // Actually regex is `this\.(\w+)\s*\(`.
                // So `this.groqService.chat(` matches `groqService`.
                // We need to check if `groqService` is a property, not a method.
                // For now, let's report it and we can verify.

                missing.add(call.name);
            }
        });

        if (missing.size > 0) {
            console.log(chalkYellow(`Potential missing methods or property calls in ${cls.name}:`));
            missing.forEach(m => {
                // Find lines
                const occurrences = cls.calls.filter(c => c.name === m).map(c => c.line).join(', ');
                console.log(`  - this.${m}() on lines: ${occurrences}`);
            });
            issuesFound += missing.size;
        } else {
            console.log(chalkGreen("  ✓ No obvious missing local method calls found."));
        }
    }

    return issuesFound;
}

// Simple chalk replacement for standalone script
function chalkGreen(msg) { return `\x1b[32m${msg}\x1b[0m`; }
function chalkYellow(msg) { return `\x1b[33m${msg}\x1b[0m`; }
function chalkRed(msg) { return `\x1b[31m${msg}\x1b[0m`; }

try {
    analyzeFile(targetFile);
} catch (e) {
    console.error(chalkRed("Analysis failed: " + e.message));
}
