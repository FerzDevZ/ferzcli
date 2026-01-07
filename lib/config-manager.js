const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk').default || require('chalk');
const os = require('os');
const crypto = require('crypto');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.ferzcli');
    this.configPath = path.join(this.configDir, 'config.json');
    this.secret = 'ferz-elite-2026'; // Simple XOR/Secret for obs
    this.store = {
      groqApiKey: '',
      defaultModel: 'llama-3.3-70b-versatile',
      autocompleteModel: 'llama-3.1-8b-instant',
      planningModel: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      temperature: 0.7,
      autoSave: true,
      defaultLanguage: 'id',
      lastUpdateCheck: 0
    };
    this.init();
  }

  async init() {
    await fs.ensureDir(this.configDir);
    if (await fs.pathExists(this.configPath)) {
      const data = await fs.readJson(this.configPath);
      this.store = { ...this.store, ...data };
    }
  }

  async save() {
    await fs.ensureDir(this.configDir);
    await fs.writeJson(this.configPath, this.store, { spaces: 2 });
  }

  // Simple encryption to hide keys from plain-text eyes
  encrypt(text) {
    if (!text) return '';
    const cipher = crypto.createCipher('aes-256-cbc', this.secret);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
  }

  decrypt(text) {
    if (!text) return '';
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.secret);
      let dec = decipher.update(text, 'hex', 'utf8');
      dec += decipher.final('utf8');
      return dec;
    } catch (e) {
      return text; // Fallback for legacy plain text
    }
  }

  async isInitialized() {
    const apiKey = this.getApiKey();
    return !!(apiKey && apiKey.trim().length > 0);
  }

  getApiKey() {
    return this.decrypt(this.store.groqApiKey);
  }

  async setApiKey(apiKey) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    this.store.groqApiKey = this.encrypt(apiKey.trim());
    await this.save();
  }

  getConfig(key) {
    return this.store[key];
  }

  async setConfig(key, value) {
    this.store[key] = value;
    await this.save();
  }

  getAllConfig() {
    return this.store;
  }

  async deleteConfig(key) {
    delete this.store[key];
    await this.save();
  }

  async resetConfig() {
    this.store = {
      groqApiKey: '',
      defaultModel: 'llama-3.3-70b-versatile',
      autocompleteModel: 'llama-3.1-8b-instant',
      planningModel: 'llama-3.3-70b-versatile',
      maxTokens: 4096,
      temperature: 0.7,
      autoSave: true,
      defaultLanguage: 'id'
    };
    await this.save();
  }

  async loadEnvFile(envPath = '.env') {
    try {
      const envContent = await fs.readFile(envPath, 'utf8');
      const envVars = {};

      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (key.startsWith('GROQ_') || key.startsWith('FERZCLI_')) {
            envVars[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes
          }
        }
      });

      // Auto-set GROQ_API_KEY if found
      if (envVars.GROQ_API_KEY) {
        this.setApiKey(envVars.GROQ_API_KEY);
        console.log(chalk.green('✓ Loaded GROQ_API_KEY from .env file'));
      }

      return envVars;
    } catch (error) {
      // .env file doesn't exist or can't be read, that's okay
      return {};
    }
  }

  getDefaultModel() {
    return this.store.defaultModel || 'llama-3.3-70b-versatile';
  }

  getAutocompleteModel() {
    return this.store.autocompleteModel || 'llama-3.1-8b-instant';
  }

  getPlanningModel() {
    return this.store.planningModel || 'llama-3.3-70b-versatile';
  }

  getMaxTokens() {
    return this.store.maxTokens;
  }

  getTemperature() {
    return this.store.temperature;
  }

  shouldAutoSave() {
    return this.store.autoSave;
  }

  getDefaultLanguage() {
    return this.store.defaultLanguage || 'id';
  }
}

module.exports = { ConfigManager };
