import express from 'express';
import axios, { AxiosRequestConfig } from 'axios';
import { CacheManager } from '../cache/redis';

export interface ProxyConfig {
    target: string;
    pathRewrite?: Record<string, string>;
    changeOrigin?: boolean;
    timeout?: number;
    retries?: number;
    cache?: {
        enabled: boolean;
        ttl?: number;
    };
}

export class APIGateway {
    private app: express.Application;
    private routes: Map<string, ProxyConfig> = new Map();
    private cacheManager?: CacheManager;

    constructor(app: express.Application, cacheManager?: CacheManager) {
        this.app = app;
        this.cacheManager = cacheManager;
    }

    // Register a route to be proxied
    register(path: string, config: ProxyConfig) {
        this.routes.set(path, config);

        // Create Express route with wildcard to catch all sub-paths
        this.app.all(`${path}*`, async (req, res) => {
            await this.handleProxy(req, res, path, config);
        });

        console.log(`Registered proxy route: ${path} -> ${config.target}`);
    }

    private async handleProxy(
        req: express.Request,
        res: express.Response,
        basePath: string,
        config: ProxyConfig
    ) {
        try {
            // Build target URL
            let targetPath = req.originalUrl.replace(basePath, '');

            // Apply path rewrites if configured
            if (config.pathRewrite) {
                for (const [pattern, replacement] of Object.entries(config.pathRewrite)) {
                    targetPath = targetPath.replace(new RegExp(pattern), replacement);
                }
            }

            const targetUrl = `${config.target}${targetPath}`;

            // Check cache for GET requests
            if (req.method === 'GET' && config.cache?.enabled && this.cacheManager) {
                const cacheKey = `proxy:${targetUrl}:${JSON.stringify(req.query)}`;
                const cached = await this.cacheManager.get(cacheKey);

                if (cached) {
                    console.log(`Cache hit for proxy: ${targetUrl}`);
                    return res.json(cached);
                }
            }

            // Prepare request config
            const axiosConfig: AxiosRequestConfig = {
                method: req.method as any,
                url: targetUrl,
                headers: this.prepareHeaders(req, config),
                timeout: config.timeout || 30000,
                validateStatus: () => true, // Don't throw on any status code
            };

            // Add body for non-GET requests
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                axiosConfig.data = req.body;
            }

            // Add query parameters
            if (Object.keys(req.query).length > 0) {
                axiosConfig.params = req.query;
            }

            // Make request with retries
            const response = await this.makeRequestWithRetries(
                axiosConfig,
                config.retries || 1
            );

            // Cache successful GET responses
            if (
                req.method === 'GET' &&
                config.cache?.enabled &&
                this.cacheManager &&
                response.status >= 200 &&
                response.status < 300
            ) {
                const cacheKey = `proxy:${targetUrl}:${JSON.stringify(req.query)}`;
                await this.cacheManager.set(cacheKey, response.data, config.cache.ttl || 300);
            }

            // Forward response
            res.status(response.status);

            // Forward headers
            const headersToForward = ['content-type', 'cache-control', 'etag', 'last-modified'];
            headersToForward.forEach((header) => {
                if (response.headers[header]) {
                    res.setHeader(header, response.headers[header]);
                }
            });

            res.send(response.data);
        } catch (error: any) {
            console.error(`Proxy error for ${basePath}:`, error.message);

            res.status(error.response?.status || 500).json({
                error: 'Proxy Error',
                message: error.message,
                target: config.target,
            });
        }
    }

    private prepareHeaders(req: express.Request, config: ProxyConfig): Record<string, string> {
        const headers: Record<string, string> = {};

        // Forward common headers
        const headersToForward = [
            'authorization',
            'content-type',
            'accept',
            'user-agent',
            'accept-encoding',
            'accept-language',
        ];

        headersToForward.forEach((header) => {
            const value = req.get(header);
            if (value) {
                headers[header] = value;
            }
        });

        // Set host header if changeOrigin is true
        if (config.changeOrigin) {
            const url = new URL(config.target);
            headers['host'] = url.host;
        }

        // Add custom headers
        headers['X-Forwarded-For'] = req.ip || req.socket.remoteAddress || '';
        headers['X-Forwarded-Proto'] = req.protocol;
        headers['X-Forwarded-Host'] = req.get('host') || '';

        return headers;
    }

    private async makeRequestWithRetries(
        config: AxiosRequestConfig,
        retries: number
    ): Promise<any> {
        let lastError: any;

        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await axios(config);
                return response;
            } catch (error: any) {
                lastError = error;

                // Don't retry on client errors (4xx)
                if (error.response?.status >= 400 && error.response?.status < 500) {
                    throw error;
                }

                // Wait before retry (exponential backoff)
                if (attempt < retries - 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    // Get gateway stats
    getStats() {
        return {
            totalRoutes: this.routes.size,
            routes: Array.from(this.routes.entries()).map(([path, config]) => ({
                path,
                target: config.target,
                cacheEnabled: config.cache?.enabled || false,
            })),
        };
    }
}

// Rate limiting for specific routes
export function createRouteRateLimiter(windowMs: number, max: number) {
    const { rateLimit } = require('express-rate-limit');

    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'Too Many Requests',
            message: 'You have exceeded the rate limit for this endpoint',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
}

// Circuit breaker pattern for service health
export class CircuitBreaker {
    private failures: number = 0;
    private lastFailureTime: number = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private threshold: number = 5,
        private timeout: number = 60000 // 1 minute
    ) { }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }

    private onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
            console.warn('Circuit breaker opened due to repeated failures');
        }
    }

    getState() {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime,
        };
    }
}
