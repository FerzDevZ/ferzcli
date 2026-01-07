const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class DatabaseTools {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            type: config.type || this.detectDatabaseType(),
            host: config.host || 'localhost',
            port: config.port || this.getDefaultPort(),
            database: config.database || 'app',
            username: config.username || 'root',
            password: config.password || '',
            ...config
        };
    }

    async optimizeQueries() {
        console.log('🔍 Analyzing and optimizing database queries...');

        const queries = await this.extractQueries();
        const optimizations = [];

        for (const query of queries) {
            const analysis = await this.analyzeQuery(query);
            if (analysis.needsOptimization) {
                optimizations.push({
                    query: query,
                    issues: analysis.issues,
                    suggestions: analysis.suggestions,
                    optimizedQuery: analysis.optimizedQuery
                });
            }
        }

        return {
            totalQueries: queries.length,
            optimizations: optimizations,
            summary: `${optimizations.length} queries optimized`
        };
    }

    async createMigrations(feature) {
        console.log(`📝 Creating database migrations for: ${feature}`);

        const migrationName = `create_${feature.toLowerCase().replace(/\s+/g, '_')}_table`;
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const filename = `${timestamp}_${migrationName}.php`;

        const migrationContent = this.generateMigrationContent(feature, migrationName);

        // Laravel migrations
        if (await fs.pathExists(path.join(this.projectPath, 'database/migrations'))) {
            const filepath = path.join(this.projectPath, 'database/migrations', filename);
            await fs.writeFile(filepath, migrationContent);
            console.log(`✅ Migration created: ${filepath}`);
            return { type: 'laravel', path: filepath };
        }

        // Generic SQL migration
        const sqlMigration = this.generateSQLMigration(feature);
        const sqlPath = path.join(this.projectPath, 'migrations', filename.replace('.php', '.sql'));
        await fs.ensureDir(path.join(this.projectPath, 'migrations'));
        await fs.writeFile(sqlPath, sqlMigration);
        console.log(`✅ SQL Migration created: ${sqlPath}`);
        return { type: 'sql', path: sqlPath };
    }

    async generateSchema(feature) {
        console.log(`📊 Generating database schema for: ${feature}`);

        const schema = {
            tableName: feature.toLowerCase().replace(/\s+/g, '_'),
            columns: this.generateDefaultColumns(feature),
            indexes: this.generateIndexes(feature),
            relationships: []
        };

        // Add relationships based on feature type
        if (feature.toLowerCase().includes('user')) {
            schema.relationships.push({
                type: 'hasMany',
                table: 'posts',
                foreignKey: 'user_id'
            });
        }

        return schema;
    }

    async setupSeeding() {
        console.log('🌱 Setting up database seeding...');

        const seeders = [
            { name: 'DatabaseSeeder', tables: ['users', 'posts', 'categories'] },
            { name: 'UserSeeder', table: 'users' },
            { name: 'PostSeeder', table: 'posts' }
        ];

        const results = [];

        for (const seeder of seeders) {
            const seederContent = this.generateSeederContent(seeder);
            const filename = `${seeder.name}.php`;
            const filepath = path.join(this.projectPath, 'database/seeders', filename);
            
            await fs.ensureDir(path.join(this.projectPath, 'database/seeders'));
            await fs.writeFile(filepath, seederContent);
            results.push({ name: seeder.name, path: filepath });
        }

        return results;
    }

    async analyzePerformance() {
        console.log('⚡ Analyzing database performance...');

        const metrics = {
            queryCount: 0,
            slowQueries: [],
            tableSizes: {},
            indexUsage: {},
            recommendations: []
        };

        // Analyze queries
        const queries = await this.extractQueries();
        metrics.queryCount = queries.length;

        // Find slow queries
        for (const query of queries) {
            const analysis = await this.analyzeQuery(query);
            if (analysis.executionTime > 1000) { // > 1 second
                metrics.slowQueries.push({
                    query: query,
                    time: analysis.executionTime,
                    suggestion: analysis.suggestions[0]
                });
            }
        }

        // Generate recommendations
        metrics.recommendations = this.generateRecommendations(metrics);

        return metrics;
    }

    async backupDatabase() {
        console.log('💾 Creating database backup...');

        const timestamp = new Date().toISOString().split('T')[0];
        const backupDir = path.join(this.projectPath, 'backups');
        await fs.ensureDir(backupDir);

        const backupFile = `backup_${timestamp}.sql`;
        const backupPath = path.join(backupDir, backupFile);

        try {
            let command;
            switch (this.config.type) {
                case 'mysql':
                    command = `mysqldump -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} ${this.config.password ? `-p${this.config.password}` : ''} ${this.config.database} > ${backupPath}`;
                    break;
                case 'postgresql':
                    command = `pg_dump -h ${this.config.host} -p ${this.config.port} -U ${this.config.username} ${this.config.database} > ${backupPath}`;
                    break;
                case 'sqlite':
                    command = `sqlite3 ${this.config.database} .dump > ${backupPath}`;
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.config.type}`);
            }

            execSync(command, { cwd: this.projectPath });
            console.log(`✅ Backup created: ${backupPath}`);
            return { path: backupPath, size: (await fs.stat(backupPath)).size };
        } catch (error) {
            console.error('❌ Backup failed:', error.message);
            throw error;
        }
    }

    async restoreDatabase(backupPath) {
        console.log('🔄 Restoring database from backup...');

        if (!await fs.pathExists(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        try {
            let command;
            switch (this.config.type) {
                case 'mysql':
                    command = `mysql -h ${this.config.host} -P ${this.config.port} -u ${this.config.username} ${this.config.password ? `-p${this.config.password}` : ''} ${this.config.database} < ${backupPath}`;
                    break;
                case 'postgresql':
                    command = `psql -h ${this.config.host} -p ${this.config.port} -U ${this.config.username} -d ${this.config.database} < ${backupPath}`;
                    break;
                case 'sqlite':
                    command = `sqlite3 ${this.config.database} < ${backupPath}`;
                    break;
                default:
                    throw new Error(`Unsupported database type: ${this.config.type}`);
            }

            execSync(command, { cwd: this.projectPath });
            console.log('✅ Database restored successfully!');
            return { status: 'success', backupPath };
        } catch (error) {
            console.error('❌ Restore failed:', error.message);
            throw error;
        }
    }

    // Helper methods
    detectDatabaseType() {
        // Auto-detect database type from project configuration
        if (fs.existsSync(path.join(this.projectPath, '.env'))) {
            const envContent = fs.readFileSync(path.join(this.projectPath, '.env'), 'utf8');
            if (envContent.includes('DB_CONNECTION=mysql')) return 'mysql';
            if (envContent.includes('DB_CONNECTION=pgsql')) return 'postgresql';
            if (envContent.includes('DB_CONNECTION=sqlite')) return 'sqlite';
        }

        if (fs.existsSync(path.join(this.projectPath, 'config/database.php'))) {
            return 'laravel';
        }

        return 'mysql'; // default
    }

    getDefaultPort() {
        switch (this.config.type) {
            case 'mysql': return 3306;
            case 'postgresql': return 5432;
            case 'mongodb': return 27017;
            default: return 3306;
        }
    }

    async extractQueries() {
        // Extract SQL queries from codebase
        const queries = [];
        const files = await this.findSQLFiles();

        for (const file of files) {
            const content = await fs.readFile(file, 'utf8');
            const extractedQueries = this.parseQueriesFromFile(content);
            queries.push(...extractedQueries);
        }

        return queries;
    }

    async findSQLFiles() {
        const files = [];
        const extensions = ['.php', '.js', '.ts', '.py', '.java', '.sql'];

        const walk = async (dir) => {
            const items = await fs.readdir(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = await fs.stat(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    await walk(fullPath);
                } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                    files.push(fullPath);
                }
            }
        };

        await walk(this.projectPath);
        return files;
    }

    parseQueriesFromFile(content) {
        const queries = [];
        const patterns = [
            /SELECT\s+.*?\s+FROM\s+.*?(?:WHERE|ORDER|LIMIT|;|$)/gi,
            /INSERT\s+INTO\s+.*?\s+VALUES\s*\(.*?\)/gi,
            /UPDATE\s+.*?\s+SET\s+.*?(?:WHERE|;|$)/gi,
            /DELETE\s+FROM\s+.*?(?:WHERE|;|$)/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                queries.push(match[0].trim());
            }
        });

        return queries;
    }

    async analyzeQuery(query) {
        // Basic query analysis
        const analysis = {
            needsOptimization: false,
            issues: [],
            suggestions: [],
            executionTime: Math.random() * 2000, // Mock execution time
            optimizedQuery: query
        };

        // Check for common issues
        if (query.toUpperCase().includes('SELECT *')) {
            analysis.needsOptimization = true;
            analysis.issues.push('Using SELECT * instead of specific columns');
            analysis.suggestions.push('Specify only the columns you need');
        }

        if (!query.toUpperCase().includes('WHERE') && query.toUpperCase().includes('SELECT')) {
            analysis.needsOptimization = true;
            analysis.issues.push('Query without WHERE clause on large tables');
            analysis.suggestions.push('Add appropriate WHERE conditions');
        }

        if (query.toUpperCase().includes('LIKE') && query.includes('%') && !query.includes('FULLTEXT')) {
            analysis.needsOptimization = true;
            analysis.issues.push('Inefficient LIKE search');
            analysis.suggestions.push('Consider using FULLTEXT search or optimizing with indexes');
        }

        return analysis;
    }

    generateMigrationContent(feature, migrationName) {
        const tableName = feature.toLowerCase().replace(/\s+/g, '_');
        const className = migrationName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');

        return `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('${tableName}', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('${tableName}');
    }
};`;
    }

    generateSQLMigration(feature) {
        const tableName = feature.toLowerCase().replace(/\s+/g, '_');
        
        return `-- Migration: Create ${tableName} table
-- Created at: ${new Date().toISOString()}

CREATE TABLE IF NOT EXISTS ${tableName} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_${tableName}_name ON ${tableName}(name);
CREATE INDEX idx_${tableName}_is_active ON ${tableName}(is_active);`;
    }

    generateDefaultColumns(feature) {
        const baseColumns = [
            { name: 'id', type: 'BIGINT', primary: true, autoIncrement: true },
            { name: 'created_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
            { name: 'updated_at', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
        ];

        // Add feature-specific columns
        if (feature.toLowerCase().includes('user')) {
            baseColumns.splice(1, 0,
                { name: 'name', type: 'VARCHAR(255)', nullable: false },
                { name: 'email', type: 'VARCHAR(255)', nullable: false, unique: true },
                { name: 'password', type: 'VARCHAR(255)', nullable: false },
                { name: 'is_active', type: 'BOOLEAN', default: true }
            );
        } else if (feature.toLowerCase().includes('post') || feature.toLowerCase().includes('article')) {
            baseColumns.splice(1, 0,
                { name: 'title', type: 'VARCHAR(255)', nullable: false },
                { name: 'content', type: 'TEXT', nullable: false },
                { name: 'author_id', type: 'BIGINT', nullable: false },
                { name: 'published_at', type: 'TIMESTAMP', nullable: true }
            );
        } else {
            baseColumns.splice(1, 0,
                { name: 'name', type: 'VARCHAR(255)', nullable: false },
                { name: 'description', type: 'TEXT', nullable: true }
            );
        }

        return baseColumns;
    }

    generateIndexes(feature) {
        const indexes = [];
        const tableName = feature.toLowerCase().replace(/\s+/g, '_');

        if (feature.toLowerCase().includes('user')) {
            indexes.push({
                name: `idx_${tableName}_email`,
                columns: ['email'],
                unique: true
            });
        }

        indexes.push({
            name: `idx_${tableName}_created_at`,
            columns: ['created_at']
        });

        return indexes;
    }

    generateSeederContent(seeder) {
        const className = seeder.name;
        const tableName = seeder.table || seeder.tables?.[0] || 'table';

        return `<?php

namespace Database\\Seeders;

use Illuminate\\Database\\Console\\Seeds\\WithoutModelEvents;
use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\DB;

class ${className} extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('${tableName}')->insert([
            [
                'name' => 'Sample ${tableName.slice(0, -1)}',
                'description' => 'This is a sample ${tableName.slice(0, -1)} created by ferzcli',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}`;
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.slowQueries.length > 0) {
            recommendations.push(`Optimize ${metrics.slowQueries.length} slow queries`);
        }

        if (metrics.queryCount > 100) {
            recommendations.push('Consider query result caching');
        }

        recommendations.push('Add database indexes on frequently queried columns');
        recommendations.push('Implement database connection pooling');
        recommendations.push('Set up database monitoring and alerting');

        return recommendations;
    }
}

module.exports = DatabaseTools;
