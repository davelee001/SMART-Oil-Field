import { createClient, RedisClientType } from 'redis';

export interface CacheConfig {
    url: string;
    defaultTTL?: number;
    keyPrefix?: string;
}

export class CacheManager {
    private client: RedisClientType;
    private config: CacheConfig;
    private isConnected: boolean = false;

    constructor(config: CacheConfig) {
        this.config = {
            defaultTTL: 3600, // 1 hour default
            keyPrefix: 'oil-tracker:',
            ...config,
        };

        this.client = createClient({
            url: this.config.url,
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers() {
        this.client.on('error', (error) => {
            console.error('Redis error:', error);
            this.isConnected = false;
        });

        this.client.on('connect', () => {
            console.log('Redis connecting...');
        });

        this.client.on('ready', () => {
            console.log('Redis ready');
            this.isConnected = true;
        });

        this.client.on('end', () => {
            console.log('Redis connection ended');
            this.isConnected = false;
        });
    }

    async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.quit();
        }
    }

    private getKey(key: string): string {
        return `${this.config.keyPrefix}${key}`;
    }

    // Basic cache operations
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(this.getKey(key));
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, ttl?: number): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            const options = ttl ? { EX: ttl } : { EX: this.config.defaultTTL };
            await this.client.set(this.getKey(key), serialized, options);
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async delete(key: string): Promise<boolean> {
        try {
            await this.client.del(this.getKey(key));
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(this.getKey(key));
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }

    // Pattern-based deletion
    async deletePattern(pattern: string): Promise<number> {
        try {
            const keys = await this.client.keys(this.getKey(pattern));
            if (keys.length === 0) return 0;
            return await this.client.del(keys);
        } catch (error) {
            console.error('Cache deletePattern error:', error);
            return 0;
        }
    }

    // Cache invalidation strategies
    async invalidateOilMovement(id: string): Promise<void> {
        await this.delete(`oil-movement:${id}`);
        await this.deletePattern('oil-movements:*');
        await this.deletePattern('stats:*');
    }

    async invalidateOilMovements(): Promise<void> {
        await this.deletePattern('oil-movement:*');
        await this.deletePattern('oil-movements:*');
        await this.deletePattern('stats:*');
    }

    async invalidateSubscription(id: string): Promise<void> {
        await this.delete(`subscription:${id}`);
        await this.deletePattern('subscriptions:*');
        await this.deletePattern('stats:*');
    }

    async invalidateSubscriptions(): Promise<void> {
        await this.deletePattern('subscription:*');
        await this.deletePattern('subscriptions:*');
        await this.deletePattern('stats:*');
    }

    async invalidateStats(): Promise<void> {
        await this.deletePattern('stats:*');
    }

    async invalidateAll(): Promise<void> {
        try {
            const keys = await this.client.keys(this.getKey('*'));
            if (keys.length > 0) {
                await this.client.del(keys);
            }
        } catch (error) {
            console.error('Cache invalidateAll error:', error);
        }
    }

    // TTL management
    async getTTL(key: string): Promise<number> {
        try {
            return await this.client.ttl(this.getKey(key));
        } catch (error) {
            console.error('Cache getTTL error:', error);
            return -1;
        }
    }

    async setTTL(key: string, ttl: number): Promise<boolean> {
        try {
            await this.client.expire(this.getKey(key), ttl);
            return true;
        } catch (error) {
            console.error('Cache setTTL error:', error);
            return false;
        }
    }

    // Cache warming
    async warmCache(key: string, fetcher: () => Promise<any>, ttl?: number): Promise<any> {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetcher();
        await this.set(key, value, ttl);
        return value;
    }

    // Stats
    async getStats(): Promise<any> {
        try {
            const info = await this.client.info('stats');
            const dbSize = await this.client.dbSize();
            return {
                connected: this.isConnected,
                dbSize,
                info: this.parseRedisInfo(info),
            };
        } catch (error) {
            console.error('Cache getStats error:', error);
            return { connected: this.isConnected };
        }
    }

    private parseRedisInfo(info: string): Record<string, string> {
        const lines = info.split('\r\n');
        const result: Record<string, string> = {};

        for (const line of lines) {
            if (line && !line.startsWith('#')) {
                const [key, value] = line.split(':');
                if (key && value) {
                    result[key] = value;
                }
            }
        }

        return result;
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }
}

// Middleware for Express to add caching
export function cacheMiddleware(cacheManager: CacheManager, ttl?: number) {
    return async (req: any, res: any, next: any) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `http:${req.originalUrl}`;

        try {
            const cachedResponse = await cacheManager.get(cacheKey);

            if (cachedResponse) {
                console.log(`Cache hit: ${cacheKey}`);
                return res.json(cachedResponse);
            }

            // Store original json method
            const originalJson = res.json.bind(res);

            // Override json method to cache response
            res.json = (body: any) => {
                cacheManager.set(cacheKey, body, ttl);
                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
}
