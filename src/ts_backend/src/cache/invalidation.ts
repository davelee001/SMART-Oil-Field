import { CacheManager } from './redis';
import { MessageQueueManager, QUEUES } from '../queue/rabbitmq';

export function setupCacheInvalidationHandlers(
    cacheManager: CacheManager,
    queueManager: MessageQueueManager
) {
    // Oil Movement Cache Invalidation
    queueManager.subscribe(QUEUES.OIL_MOVEMENTS, async (message) => {
        console.log('Cache invalidation for oil movement event:', message.event);

        switch (message.event) {
            case 'created':
            case 'updated':
            case 'approved':
            case 'rejected':
                // Invalidate specific movement and list caches
                if (message.data?.id) {
                    await cacheManager.invalidateOilMovement(message.data.id);
                } else {
                    await cacheManager.invalidateOilMovements();
                }
                break;

            case 'deleted':
                if (message.data?.id) {
                    await cacheManager.invalidateOilMovement(message.data.id);
                }
                break;
        }
    });

    // Subscription Cache Invalidation
    queueManager.subscribe(QUEUES.SUBSCRIPTIONS, async (message) => {
        console.log('Cache invalidation for subscription event:', message.event);

        switch (message.event) {
            case 'created':
            case 'updated':
            case 'renewed':
            case 'cancelled':
            case 'expiring':
                if (message.data?.id || message.data?.subscription?.id) {
                    const id = message.data.id || message.data.subscription.id;
                    await cacheManager.invalidateSubscription(id);
                } else {
                    await cacheManager.invalidateSubscriptions();
                }
                break;
        }
    });

    // Blockchain Event Cache Invalidation
    queueManager.subscribe(QUEUES.BLOCKCHAIN_EVENTS, async (message) => {
        console.log('Cache invalidation for blockchain event');

        // Invalidate related caches based on blockchain event
        if (message.oilMovement) {
            await cacheManager.invalidateOilMovements();
        }

        if (message.subscription) {
            await cacheManager.invalidateSubscriptions();
        }

        // Always invalidate stats when blockchain events occur
        await cacheManager.invalidateStats();
    });

    console.log('Cache invalidation handlers configured');
}

// Helper class for manual cache operations
export class CacheInvalidator {
    constructor(private cacheManager: CacheManager) { }

    async invalidateOilMovement(id: string) {
        await this.cacheManager.invalidateOilMovement(id);
        console.log(`Invalidated cache for oil movement: ${id}`);
    }

    async invalidateAllOilMovements() {
        await this.cacheManager.invalidateOilMovements();
        console.log('Invalidated all oil movement caches');
    }

    async invalidateSubscription(id: string) {
        await this.cacheManager.invalidateSubscription(id);
        console.log(`Invalidated cache for subscription: ${id}`);
    }

    async invalidateAllSubscriptions() {
        await this.cacheManager.invalidateSubscriptions();
        console.log('Invalidated all subscription caches');
    }

    async invalidateStats() {
        await this.cacheManager.invalidateStats();
        console.log('Invalidated stats caches');
    }

    async invalidateAll() {
        await this.cacheManager.invalidateAll();
        console.log('Invalidated all caches');
    }
}
