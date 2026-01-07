const fs = require('fs-extra');
const path = require('path');

class APIGenerator {
    constructor(projectPath, config = {}) {
        this.projectPath = projectPath;
        this.config = {
            type: config.type || 'rest', // rest, graphql, grpc
            framework: config.framework || this.detectFramework(),
            version: config.version || 'v1',
            authentication: config.authentication || 'jwt',
            ...config
        };
    }

    async generateAPI(feature, endpoints = []) {
        console.log(`🚀 Generating ${this.config.type.toUpperCase()} API for: ${feature}`);

        const results = {
            controllers: [],
            models: [],
            routes: [],
            documentation: null,
            tests: []
        };

        switch (this.config.type) {
            case 'rest':
                return await this.generateRESTAPI(feature, endpoints);
            case 'graphql':
                return await this.generateGraphQLAPI(feature, endpoints);
            case 'grpc':
                return await this.generateGRPCAPI(feature, endpoints);
            default:
                throw new Error(`Unsupported API type: ${this.config.type}`);
        }
    }

    async generateRESTAPI(feature, endpoints) {
        const results = {
            controllers: [],
            models: [],
            routes: [],
            documentation: null,
            tests: []
        };

        // Generate Model
        const modelResult = await this.generateModel(feature);
        results.models.push(modelResult);

        // Generate Controller
        const controllerResult = await this.generateController(feature, endpoints);
        results.controllers.push(controllerResult);

        // Generate Routes
        const routesResult = await this.generateRoutes(feature, endpoints);
        results.routes.push(routesResult);

        // Generate API Documentation
        results.documentation = await this.generateSwaggerDoc(feature, endpoints);

        // Generate Tests
        results.tests = await this.generateAPITests(feature, endpoints);

        // Generate Validation Rules
        await this.generateValidationRules(feature);

        return results;
    }

    async generateModel(feature) {
        console.log(`📝 Generating model for: ${feature}`);

        const modelName = feature.charAt(0).toUpperCase() + feature.slice(1);
        const tableName = feature.toLowerCase() + 's';

        let modelContent;
        if (this.config.framework === 'laravel') {
            modelContent = this.generateLaravelModel(modelName, tableName);
            const filepath = path.join(this.projectPath, 'app/Models', `${modelName}.php`);
            await fs.ensureDir(path.join(this.projectPath, 'app/Models'));
            await fs.writeFile(filepath, modelContent);
            return { type: 'laravel', name: modelName, path: filepath };
        } else {
            modelContent = this.generateNodeModel(modelName, tableName);
            const filepath = path.join(this.projectPath, 'models', `${modelName.toLowerCase()}.js`);
            await fs.ensureDir(path.join(this.projectPath, 'models'));
            await fs.writeFile(filepath, modelContent);
            return { type: 'node', name: modelName, path: filepath };
        }
    }

    async generateController(feature, endpoints) {
        console.log(`🎮 Generating controller for: ${feature}`);

        const controllerName = feature.charAt(0).toUpperCase() + feature.slice(1) + 'Controller';
        const modelName = feature.charAt(0).toUpperCase() + feature.slice(1);

        // Default CRUD endpoints if none specified
        if (endpoints.length === 0) {
            endpoints = ['index', 'show', 'store', 'update', 'destroy'];
        }

        let controllerContent;
        if (this.config.framework === 'laravel') {
            controllerContent = this.generateLaravelController(controllerName, modelName, endpoints);
            const filepath = path.join(this.projectPath, 'app/Http/Controllers', `${controllerName}.php`);
            await fs.ensureDir(path.join(this.projectPath, 'app/Http/Controllers'));
            await fs.writeFile(filepath, controllerContent);
            return { type: 'laravel', name: controllerName, path: filepath };
        } else {
            controllerContent = this.generateNodeController(controllerName, modelName, endpoints);
            const filepath = path.join(this.projectPath, 'controllers', `${controllerName.toLowerCase()}.js`);
            await fs.ensureDir(path.join(this.projectPath, 'controllers'));
            await fs.writeFile(filepath, controllerContent);
            return { type: 'node', name: controllerName, path: filepath };
        }
    }

    async generateRoutes(feature, endpoints) {
        console.log(`🛣️ Generating routes for: ${feature}`);

        const routeName = feature.toLowerCase();
        const controllerName = feature.charAt(0).toUpperCase() + feature.slice(1) + 'Controller';

        // Default CRUD routes if none specified
        if (endpoints.length === 0) {
            endpoints = ['index', 'show', 'store', 'update', 'destroy'];
        }

        let routesContent;
        if (this.config.framework === 'laravel') {
            routesContent = this.generateLaravelRoutes(routeName, controllerName, endpoints);
            const filepath = path.join(this.projectPath, 'routes', `api_${routeName}.php`);
            await fs.ensureDir(path.join(this.projectPath, 'routes'));
            await fs.writeFile(filepath, routesContent);
            return { type: 'laravel', name: `api_${routeName}`, path: filepath };
        } else {
            routesContent = this.generateNodeRoutes(routeName, controllerName, endpoints);
            const filepath = path.join(this.projectPath, 'routes', `${routeName}.js`);
            await fs.ensureDir(path.join(this.projectPath, 'routes'));
            await fs.writeFile(filepath, routesContent);
            return { type: 'node', name: routeName, path: filepath };
        }
    }

    async generateSwaggerDoc(feature, endpoints) {
        console.log(`📚 Generating Swagger documentation for: ${feature}`);

        const swaggerDoc = {
            openapi: '3.0.0',
            info: {
                title: `${feature} API`,
                version: this.config.version,
                description: `API documentation for ${feature} endpoints`
            },
            servers: [
                {
                    url: `http://localhost:8000/api/${this.config.version}`,
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
            },
            security: [
                {
                    bearerAuth: []
                }
            ]
        };

        // Add paths
        const basePath = `/${feature.toLowerCase()}`;
        swaggerDoc.paths = this.generateSwaggerPaths(basePath, feature, endpoints);
        
        // Add schemas
        swaggerDoc.components.schemas = this.generateSwaggerSchemas(feature);

        const filepath = path.join(this.projectPath, 'docs', 'swagger', `${feature.toLowerCase()}.json`);
        await fs.ensureDir(path.join(this.projectPath, 'docs', 'swagger'));
        await fs.writeJson(filepath, swaggerDoc, { spaces: 2 });

        return { path: filepath, spec: swaggerDoc };
    }

    async generateAPITests(feature, endpoints) {
        console.log(`🧪 Generating API tests for: ${feature}`);

        const tests = [];

        for (const endpoint of endpoints) {
            const testResult = await this.generateEndpointTest(feature, endpoint);
            tests.push(testResult);
        }

        return tests;
    }

    async generateValidationRules(feature) {
        console.log(`✅ Generating validation rules for: ${feature}`);

        const rules = {
            create: this.generateCreateRules(feature),
            update: this.generateUpdateRules(feature)
        };

        if (this.config.framework === 'laravel') {
            const rulesContent = this.generateLaravelValidationRules(feature, rules);
            const filepath = path.join(this.projectPath, 'app/Http/Requests', `${feature}Request.php`);
            await fs.ensureDir(path.join(this.projectPath, 'app/Http/Requests'));
            await fs.writeFile(filepath, rulesContent);
            return { type: 'laravel', path: filepath };
        }
    }

    // Laravel-specific generators
    generateLaravelModel(modelName, tableName) {
        return `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class ${modelName} extends Model
{
    use HasFactory;

    protected $table = '${tableName}';
    
    protected $fillable = [
        'name',
        'description',
        // Add other fillable fields
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}`;
    }

    generateLaravelController(controllerName, modelName, endpoints) {
        const methods = endpoints.map(endpoint => this.generateLaravelMethod(endpoint, modelName)).join('\n\n    ');

        return `<?php

namespace App\\Http\\Controllers;

use App\\Models\\${modelName};
use Illuminate\\Http\\Request;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Validation\\ValidationException;

class ${controllerName} extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    ${methods}
}`;
    }

    generateLaravelMethod(endpoint, modelName) {
        const methodTemplates = {
            index: `public function index(Request $request): JsonResponse
    {
        $query = ${modelName}::query();
        
        // Apply filters
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }
        
        // Apply sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);
        
        $perPage = $request->get('per_page', 15);
        $items = $query->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => $items,
            'message' => '${modelName} retrieved successfully'
        ]);
    }`,
            show: `public function show(${modelName} $${modelName.toLowerCase()}): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $${modelName.toLowerCase()},
            'message' => '${modelName} retrieved successfully'
        ]);
    }`,
            store: `public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                // Add other validation rules
            ]);
            
            $item = ${modelName}::create($validated);
            
            return response()->json([
                'success' => true,
                'data' => $item,
                'message' => '${modelName} created successfully'
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
    }`,
            update: `public function update(Request $request, ${modelName} $${modelName.toLowerCase()}): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                // Add other validation rules
            ]);
            
            $${modelName.toLowerCase()}->update($validated);
            
            return response()->json([
                'success' => true,
                'data' => $${modelName.toLowerCase()},
                'message' => '${modelName} updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'errors' => $e->errors(),
                'message' => 'Validation failed'
            ], 422);
        }
    }`,
            destroy: `public function destroy(${modelName} $${modelName.toLowerCase()}): JsonResponse
    {
        $${modelName.toLowerCase()}->delete();
        
        return response()->json([
            'success' => true,
            'message' => '${modelName} deleted successfully'
        ]);
    }`
        };

        return methodTemplates[endpoint] || '';
    }

    generateLaravelRoutes(routeName, controllerName, endpoints) {
        const routes = endpoints.map(endpoint => {
            const httpMethod = this.getHTTPMethod(endpoint);
            const routePath = endpoint === 'index' ? '' : (endpoint === 'show' ? '/{id}' : 
                           endpoint === 'store' ? '' : endpoint === 'update' ? '/{id}' : '/{id}');
            const routeNameFull = `${routeName}.${endpoint}`;
            
            return `Route::${httpMethod}('${routeName}${routePath}', [${controllerName}::class, '${endpoint}'])->name('${routeNameFull}');`;
        }).join('\n');

        return `<?php

use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\${controllerName};

/*
|--------------------------------------------------------------------------
| ${routeName.toUpperCase()} API Routes
|--------------------------------------------------------------------------
|
| Routes for ${routeName} CRUD operations
|
*/

${routes}`;
    }

    // Node.js specific generators
    generateNodeModel(modelName, tableName) {
        return `const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
${modelName}Schema.index({ name: 1 });
${modelName}Schema.index({ createdBy: 1 });
${modelName}Schema.index({ createdAt: -1 });

// Virtuals
${modelName}Schema.virtual('creator', {
    ref: 'User',
    localField: 'createdBy',
    foreignField: '_id',
    justOne: true
});

// Methods
${modelName}Schema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

// Statics
${modelName}Schema.statics.findActive = function() {
    return this.find({ isActive: true });
};

module.exports = mongoose.model('${modelName}', ${modelName}Schema);`;
    }

    generateNodeController(controllerName, modelName, endpoints) {
        const methods = endpoints.map(endpoint => 
            this.generateNodeMethod(endpoint, modelName)
        ).join('\n\n');

        return `const ${modelName} = require('../models/${modelName.toLowerCase()}');
const asyncHandler = require('express-async-handler');

class ${controllerName} {
    ${methods}
}

module.exports = new ${controllerName}();`;
    }

    generateNodeMethod(endpoint, modelName) {
        const methodTemplates = {
            index: `index = asyncHandler(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search;
        
        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        
        const options = {
            page,
            limit,
            sort: { createdAt: -1 },
            populate: 'creator'
        };
        
        const result = await ${modelName}.paginate(query, options);
        
        res.json({
            success: true,
            data: result.docs,
            pagination: {
                page: result.page,
                pages: result.totalPages,
                total: result.totalDocs,
                limit: result.limit
            }
        });
    });`,
            show: `show = asyncHandler(async (req, res) => {
        const item = await ${modelName}.findById(req.params.id).populate('creator');
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: '${modelName} not found'
            });
        }
        
        res.json({
            success: true,
            data: item
        });
    });`,
            store: `store = asyncHandler(async (req, res) => {
        const item = new ${modelName}({
            ...req.body,
            createdBy: req.user.id
        });
        
        await item.save();
        await item.populate('creator');
        
        res.status(201).json({
            success: true,
            data: item,
            message: '${modelName} created successfully'
        });
    });`,
            update: `update = asyncHandler(async (req, res) => {
        const item = await ${modelName}.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: '${modelName} not found'
            });
        }
        
        Object.assign(item, req.body);
        await item.save();
        await item.populate('creator');
        
        res.json({
            success: true,
            data: item,
            message: '${modelName} updated successfully'
        });
    });`,
            destroy: `destroy = asyncHandler(async (req, res) => {
        const item = await ${modelName}.findById(req.params.id);
        
        if (!item) {
            return res.status(404).json({
                success: false,
                message: '${modelName} not found'
            });
        }
        
        await item.remove();
        
        res.json({
            success: true,
            message: '${modelName} deleted successfully'
        });
    });`
        };

        return methodTemplates[endpoint] || '';
    }

    generateNodeRoutes(routeName, controllerName, endpoints) {
        const routes = endpoints.map(endpoint => {
            const httpMethod = this.getHTTPMethod(endpoint);
            const routePath = endpoint === 'index' ? '/' : endpoint === 'show' ? '/:id' : 
                           endpoint === 'store' ? '/' : endpoint === 'update' ? '/:id' : '/:id';
            
            return `router.${httpMethod}('${routePath}', controller.${endpoint});`;
        }).join('\n');

        return `const express = require('express');
const router = express.Router();
const controller = require('../controllers/${controllerName.toLowerCase()}');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

${routes}

module.exports = router;`;
    }

    // Swagger/OpenAPI generators
    generateSwaggerPaths(basePath, feature, endpoints) {
        const paths = {};

        endpoints.forEach(endpoint => {
            const pathKey = endpoint === 'index' ? basePath : 
                           endpoint === 'show' ? `${basePath}/{id}` :
                           endpoint === 'store' ? basePath :
                           endpoint === 'update' ? `${basePath}/{id}` : `${basePath}/{id}`;
            
            const method = this.getHTTPMethod(endpoint);
            
            paths[pathKey] = {
                [method]: {
                    tags: [feature],
                    summary: this.getEndpointSummary(endpoint, feature),
                    description: this.getEndpointDescription(endpoint, feature),
                    parameters: this.getEndpointParameters(endpoint),
                    requestBody: this.getRequestBody(endpoint),
                    responses: this.getEndpointResponses(endpoint),
                    security: [{ bearerAuth: [] }]
                }
            };
        });

        return paths;
    }

    generateSwaggerSchemas(feature) {
        const modelName = feature.charAt(0).toUpperCase() + feature.slice(1);
        
        return {
            [`${modelName}`]: {
                type: 'object',
                properties: {
                    id: { type: 'integer', example: 1 },
                    name: { type: 'string', example: 'Sample Name' },
                    description: { type: 'string', example: 'Sample description' },
                    isActive: { type: 'boolean', example: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            [`${modelName}Input`]: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', example: 'Sample Name' },
                    description: { type: 'string', example: 'Sample description' }
                }
            }
        };
    }

    // Helper methods
    detectFramework() {
        if (fs.existsSync(path.join(this.projectPath, 'artisan'))) return 'laravel';
        if (fs.existsSync(path.join(this.projectPath, 'package.json'))) return 'node';
        return 'node';
    }

    getHTTPMethod(endpoint) {
        const methods = {
            index: 'get',
            show: 'get',
            store: 'post',
            update: 'put',
            destroy: 'delete'
        };
        return methods[endpoint] || 'get';
    }

    getEndpointSummary(endpoint, feature) {
        const summaries = {
            index: `Get all ${feature}`,
            show: `Get ${feature} by ID`,
            store: `Create new ${feature}`,
            update: `Update ${feature}`,
            destroy: `Delete ${feature}`
        };
        return summaries[endpoint] || `Handle ${feature} ${endpoint}`;
    }

    getEndpointDescription(endpoint, feature) {
        const descriptions = {
            index: `Retrieve a paginated list of ${feature} with optional filtering and sorting`,
            show: `Retrieve a specific ${feature} by its ID`,
            store: `Create a new ${feature} with the provided data`,
            update: `Update an existing ${feature} with the provided data`,
            destroy: `Delete a ${feature} permanently`
        };
        return descriptions[endpoint] || `Handle ${feature} ${endpoint} operation`;
    }

    getEndpointParameters(endpoint) {
        const params = [];
        
        if (endpoint === 'show' || endpoint === 'update' || endpoint === 'destroy') {
            params.push({
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' },
                description: 'Resource ID'
            });
        }
        
        if (endpoint === 'index') {
            params.push(
                {
                    name: 'page',
                    in: 'query',
                    schema: { type: 'integer', default: 1 },
                    description: 'Page number'
                },
                {
                    name: 'limit',
                    in: 'query',
                    schema: { type: 'integer', default: 10 },
                    description: 'Items per page'
                },
                {
                    name: 'search',
                    in: 'query',
                    schema: { type: 'string' },
                    description: 'Search term'
                }
            );
        }
        
        return params;
    }

    getRequestBody(endpoint) {
        if (endpoint === 'store' || endpoint === 'update') {
            return {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/UserInput'
                        }
                    }
                }
            };
        }
        return undefined;
    }

    getEndpointResponses(endpoint) {
        const responses = {
            200: {
                description: 'Successful operation',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: true },
                                data: { $ref: '#/components/schemas/User' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            },
            201: {
                description: 'Resource created successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: true },
                                data: { $ref: '#/components/schemas/User' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            },
            404: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: false },
                                message: { type: 'string', example: 'Resource not found' }
                            }
                        }
                    }
                }
            },
            422: {
                description: 'Validation failed',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: { type: 'boolean', example: false },
                                errors: { type: 'object' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            }
        };

        switch (endpoint) {
            case 'store': return { 201: responses[201], 422: responses[422] };
            case 'show': return { 200: responses[200], 404: responses[404] };
            case 'update': return { 200: responses[200], 404: responses[404], 422: responses[422] };
            case 'destroy': return { 200: responses[200], 404: responses[404] };
            default: return { 200: responses[200] };
        }
    }

    async generateEndpointTest(feature, endpoint) {
        const testName = `${feature}_${endpoint}_test`;
        const testContent = `describe('${feature} API - ${endpoint}', () => {
    let authToken;
    let testResourceId;

    beforeAll(async () => {
        // Get authentication token
        authToken = await getAuthToken();
    });

    ${this.generateTestCases(endpoint, feature)}
});`;

        const filepath = path.join(this.projectPath, 'tests', 'api', `${testName}.test.js`);
        await fs.ensureDir(path.join(this.projectPath, 'tests', 'api'));
        await fs.writeFile(filepath, testContent);

        return { name: testName, path: filepath };
    }

    generateTestCases(endpoint, feature) {
        const testCases = {
            index: `test('should get all ${feature}', async () => {
        const response = await request(app)
            .get('/api/${feature}')
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle pagination', async () => {
        const response = await request(app)
            .get('/api/${feature}?page=1&limit=5')
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(5);
        expect(response.body.pagination).toBeDefined();
    });

    test('should handle search', async () => {
        const response = await request(app)
            .get('/api/${feature}?search=test')
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });`,
            show: `test('should get ${feature} by id', async () => {
        const response = await request(app)
            .get(\`/api/${feature}/\${testResourceId}\`)
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(testResourceId);
    });

    test('should return 404 for non-existent ${feature}', async () => {
        const response = await request(app)
            .get('/api/${feature}/99999')
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
    });`,
            store: `test('should create new ${feature}', async () => {
        const newData = {
            name: 'Test ${feature}',
            description: 'Test description'
        };

        const response = await request(app)
            .post('/api/${feature}')
            .set('Authorization', \`Bearer \${authToken}\`)
            .send(newData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(newData.name);
        
        testResourceId = response.body.data.id;
    });

    test('should validate required fields', async () => {
        const response = await request(app)
            .post('/api/${feature}')
            .set('Authorization', \`Bearer \${authToken}\`)
            .send({});

        expect(response.status).toBe(422);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
    });`,
            update: `test('should update ${feature}', async () => {
        const updateData = {
            name: 'Updated ${feature}',
            description: 'Updated description'
        };

        const response = await request(app)
            .put(\`/api/${feature}/\${testResourceId}\`)
            .set('Authorization', \`Bearer \${authToken}\`)
            .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(updateData.name);
    });`,
            destroy: `test('should delete ${feature}', async () => {
        const response = await request(app)
            .delete(\`/api/${feature}/\${testResourceId}\`)
            .set('Authorization', \`Bearer \${authToken}\`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });`
        };

        return testCases[endpoint] || '';
    }

    generateLaravelValidationRules(feature, rules) {
        return `<?php

namespace App\\Http\\Requests;

use Illuminate\\Foundation\\Http\\FormRequest;

class ${feature}Request extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \\Illuminate\\Contracts\\Validation\\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'unique:users,email,' . $this->route('user')],
            // Add more validation rules as needed
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The name field is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already taken.',
        ];
    }
}`;
    }

    generateCreateRules(feature) {
        return {
            name: 'required|string|max:255',
            description: 'nullable|string|max:1000'
        };
    }

    generateUpdateRules(feature) {
        return {
            name: 'sometimes|required|string|max:255',
            description: 'nullable|string|max:1000'
        };
    }
}

module.exports = APIGenerator;
