const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class BaseDeployer {
  constructor(projectPath, config = {}) {
    this.projectPath = projectPath;
    this.config = config;
    this.logs = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    this.logs.push(logEntry);
    console.log(logEntry);
  }

  async executeCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Executing: ${command} ${args.join(' ')}`);

      const child = spawn(command, args, {
        cwd: this.projectPath,
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        this.log(data.toString().trim(), 'stdout');
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        this.log(data.toString().trim(), 'stderr');
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    // Override in subclasses
    return true;
  }

  async prepareDeployment() {
    // Override in subclasses
    throw new Error('prepareDeployment must be implemented by subclass');
  }

  async deploy() {
    // Override in subclasses
    throw new Error('deploy must be implemented by subclass');
  }

  async postDeploy() {
    // Override in subclasses
    this.log('Deployment completed successfully!');
  }

  async run() {
    try {
      this.log('🚀 Starting deployment process...');

      // Check prerequisites
      await this.checkPrerequisites();

      // Prepare deployment
      await this.prepareDeployment();

      // Execute deployment
      const result = await this.deploy();

      // Post-deployment tasks
      await this.postDeploy();

      return result;
    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  getLogs() {
    return this.logs;
  }
}

module.exports = BaseDeployer;
