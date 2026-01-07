const fs = require('fs-extra');
const path = require('path');
const fastGlob = require('fast-glob');
const mime = require('mime-types');

class FileUtils {
  constructor() {
    this.ignorePatterns = [
      'node_modules/**',
      '.git/**',
      '.DS_Store',
      '*.log',
      '.env',
      '.env.local',
      '.env.*.local',
      'dist/**',
      'build/**',
      '*.tmp',
      '*.temp',
      '.cursor/**',
      '.vscode/**',
      '.idea/**',
      'coverage/**',
      '*.min.js',
      '*.min.css'
    ];
  }

  async readFile(filePath, options = {}) {
    try {
      const {
        encoding = 'utf8',
        maxSize = 1024 * 1024, // 1MB default
        startLine = null,
        endLine = null
      } = options;

      const stats = await fs.stat(filePath);
      if (stats.size > maxSize) {
        throw new Error(`File too large (${stats.size} bytes). Maximum allowed: ${maxSize} bytes`);
      }

      let content = await fs.readFile(filePath, encoding);

      // Handle line-based reading
      if (startLine !== null || endLine !== null) {
        const lines = content.split('\n');
        const start = startLine ? Math.max(0, startLine - 1) : 0;
        const end = endLine ? Math.min(lines.length, endLine) : lines.length;
        content = lines.slice(start, end).join('\n');
      }

      return {
        content,
        path: filePath,
        size: stats.size,
        modified: stats.mtime,
        type: this.getFileType(filePath),
        lines: content.split('\n').length
      };
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  async readDirectory(dirPath, options = {}) {
    const {
      recursive = true,
      maxFiles = 1000,
      includeContent = false,
      maxFileSize = 1024 * 1024, // 1MB
      patterns = ['**/*'],
      excludePatterns = this.ignorePatterns
    } = options;

    try {
      const globPatterns = patterns.map(p => path.join(dirPath, p));
      const ignorePatterns = excludePatterns.map(p => path.join(dirPath, p));

      const files = await fastGlob(globPatterns, {
        ignore: ignorePatterns,
        absolute: true,
        stats: true,
        followSymbolicLinks: false
      });

      const results = [];
      let fileCount = 0;

      for (const file of files) {
        if (fileCount >= maxFiles) {
          break;
        }

        const fileInfo = {
          path: file.path,
          relativePath: path.relative(dirPath, file.path),
          size: file.stats.size,
          modified: file.stats.mtime,
          type: this.getFileType(file.path),
          isDirectory: file.stats.isDirectory()
        };

        if (!fileInfo.isDirectory && includeContent && file.stats.size <= maxFileSize) {
          try {
            const content = await fs.readFile(file.path, 'utf8');
            fileInfo.content = content;
            fileInfo.lines = content.split('\n').length;
          } catch (error) {
            fileInfo.content = null;
            fileInfo.readError = error.message;
          }
        }

        results.push(fileInfo);
        fileCount++;
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
    }
  }

  async analyzeProjectStructure(projectPath, options = {}) {
    const {
      maxDepth = 3,
      includeFileContents = false,
      maxFilesPerType = 10
    } = options;

    try {
      const files = await this.readDirectory(projectPath, {
        recursive: true,
        includeContent: includeFileContents,
        maxFiles: 5000
      });

      // Group files by type
      const fileTypes = {};
      const directories = [];
      let totalSize = 0;
      let totalFiles = 0;

      for (const file of files) {
        totalSize += file.size || 0;
        totalFiles++;

        if (file.isDirectory) {
          directories.push(file);
        } else {
          const ext = path.extname(file.path).toLowerCase() || 'no-extension';
          if (!fileTypes[ext]) {
            fileTypes[ext] = [];
          }
          if (fileTypes[ext].length < maxFilesPerType) {
            fileTypes[ext].push(file);
          }
        }
      }

      // Generate summary
      const summary = {
        totalFiles,
        totalDirectories: directories.length,
        totalSize: this.formatBytes(totalSize),
        fileTypes: Object.keys(fileTypes).length,
        typeBreakdown: {}
      };

      // Detailed breakdown by file type
      for (const [ext, filesOfType] of Object.entries(fileTypes)) {
        const typeSize = filesOfType.reduce((sum, f) => sum + (f.size || 0), 0);
        summary.typeBreakdown[ext] = {
          count: filesOfType.length,
          totalSize: this.formatBytes(typeSize),
          averageSize: this.formatBytes(typeSize / filesOfType.length),
          files: filesOfType.map(f => ({
            path: f.relativePath,
            size: this.formatBytes(f.size || 0),
            modified: f.modified
          }))
        };
      }

      return {
        summary,
        structure: this.buildDirectoryTree(files, projectPath, maxDepth),
        recentFiles: files
          .filter(f => !f.isDirectory)
          .sort((a, b) => new Date(b.modified) - new Date(a.modified))
          .slice(0, 20)
          .map(f => ({
            path: f.relativePath,
            modified: f.modified,
            size: this.formatBytes(f.size || 0)
          }))
      };
    } catch (error) {
      throw new Error(`Failed to analyze project structure: ${error.message}`);
    }
  }

  buildDirectoryTree(files, rootPath, maxDepth) {
    const tree = {};
    const rootName = path.basename(rootPath);

    for (const file of files) {
      const relativePath = path.relative(rootPath, file.path);
      const parts = relativePath.split(path.sep);

      if (parts.length > maxDepth) continue;

      let current = tree;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }

    return { [rootName]: tree };
  }

  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(ext) || 'application/octet-stream';

    // Map common file types
    const typeMap = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.jsx': 'react',
      '.tsx': 'react-typescript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.go': 'go',
      '.rs': 'rust',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.xml': 'xml',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.md': 'markdown',
      '.txt': 'text',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.fish': 'shell',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.dockerfile': 'dockerfile',
      '.gitignore': 'gitignore',
      '.env': 'env'
    };

    return typeMap[ext] || (mimeType.startsWith('text/') ? 'text' : 'binary');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async searchInFiles(searchTerm, directory, options = {}) {
    const {
      caseSensitive = false,
      regex = false,
      includePatterns = ['**/*'],
      excludePatterns = this.ignorePatterns,
      maxResults = 100
    } = options;

    try {
      const files = await this.readDirectory(directory, {
        recursive: true,
        patterns: includePatterns,
        excludePatterns: excludePatterns,
        includeContent: true
      });

      const results = [];
      const searchRegex = regex ?
        new RegExp(searchTerm, caseSensitive ? 'g' : 'gi') :
        new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');

      for (const file of files) {
        if (file.content && results.length < maxResults) {
          const lines = file.content.split('\n');
          const matches = [];

          lines.forEach((line, index) => {
            const match = line.match(searchRegex);
            if (match) {
              matches.push({
                line: index + 1,
                content: line.trim(),
                match: match[0]
              });
            }
          });

          if (matches.length > 0) {
            results.push({
              file: file.relativePath,
              matches: matches,
              totalMatches: matches.length
            });
          }
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  async getFileContext(filePath, lineNumber, contextLines = 3) {
    try {
      const fileData = await this.readFile(filePath);
      const lines = fileData.content.split('\n');

      const startLine = Math.max(0, lineNumber - contextLines - 1);
      const endLine = Math.min(lines.length, lineNumber + contextLines);

      return {
        file: filePath,
        line: lineNumber,
        context: lines.slice(startLine, endLine),
        startLine: startLine + 1,
        endLine: endLine
      };
    } catch (error) {
      throw new Error(`Failed to get file context: ${error.message}`);
    }
  }

  async getAllFiles(dirPath, options = {}) {
    try {
      const files = await this.readDirectory(dirPath, {
        recursive: true,
        includeContent: false,
        maxFiles: 5000,
        ...options
      });

      // Return array of file paths (only files, not directories)
      return files
        .filter(file => !file.isDirectory)
        .map(file => file.path);
    } catch (error) {
      throw new Error(`Failed to get all files: ${error.message}`);
    }
  }

  async getDirectories(dirPath, options = {}) {
    try {
      const files = await this.readDirectory(dirPath, {
        recursive: false,
        includeContent: false,
        maxFiles: 1000,
        ...options
      });

      // Return array of directory paths
      return files
        .filter(file => file.isDirectory)
        .map(file => file.path);
    } catch (error) {
      throw new Error(`Failed to get directories: ${error.message}`);
    }
  }
}

module.exports = { FileUtils };
