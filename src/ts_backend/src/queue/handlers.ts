import { MessageQueueManager, QUEUES, ROUTING_KEYS } from './rabbitmq';
import { WebSocketManager } from '../websocket/manager';
import { pubsub, EVENTS } from '../graphql/resolvers';

export function setupQueueHandlers(
    queueManager: MessageQueueManager,
    wsManager?: WebSocketManager
) {
    // Oil Movement Handlers
    queueManager.subscribe(QUEUES.OIL_MOVEMENTS, async (message) => {
        console.log('Received oil movement event:', message);

        switch (message.event) {
            case 'created':
                // Publish to GraphQL subscriptions
                pubsub.publish(EVENTS.OIL_MOVEMENT_CREATED, {
                    oilMovementCreated: message.data,
                });

                // Broadcast via WebSocket
                wsManager?.broadcastToTopic('oil-movements', {
                    type: 'oil-movement-created',
                    data: message.data,
                    timestamp: new Date().toISOString(),
                });
                break;

            case 'updated':
                pubsub.publish(EVENTS.OIL_MOVEMENT_UPDATED, {
                    oilMovementUpdated: message.data,
                });

                wsManager?.broadcastToTopic('oil-movements', {
                    type: 'oil-movement-updated',
                    data: message.data,
                    timestamp: new Date().toISOString(),
                });
                break;

            case 'status_changed':
                pubsub.publish(EVENTS.OIL_MOVEMENT_STATUS_CHANGED, {
                    oilMovementStatusChanged: message.data,
                });

                wsManager?.broadcastToTopic('oil-movements', {
                    type: 'oil-movement-status-changed',
                    data: message.data,
                    timestamp: new Date().toISOString(),
                });
                break;
        }
    });

    // Subscription Handlers
    queueManager.subscribe(QUEUES.SUBSCRIPTIONS, async (message) => {
        console.log('Received subscription event:', message);

        if (message.event === 'expiring') {
            pubsub.publish(EVENTS.SUBSCRIPTION_EXPIRING, {
                subscriptionExpiring: {
                    subscription: message.data.subscription,
                    daysRemaining: message.data.daysRemaining,
                    message: `Subscription expires in ${message.data.daysRemaining} days`,
                },
            });

            wsManager?.broadcastToTopic('subscriptions', {
                type: 'subscription-expiring',
                data: message.data,
                timestamp: new Date().toISOString(),
            });
        }
    });

    // Blockchain Event Handlers
    queueManager.subscribe(QUEUES.BLOCKCHAIN_EVENTS, async (message) => {
        console.log('Received blockchain event:', message);

        // Broadcast blockchain events to interested clients
        wsManager?.broadcastToTopic('blockchain', {
            type: 'blockchain-event',
            data: message,
            timestamp: new Date().toISOString(),
        });
    });

    // Notification Handlers
    queueManager.subscribe(QUEUES.NOTIFICATIONS, async (message) => {
        console.log('Received notification:', message);

        // Send notifications via WebSocket to specific users or broadcast
        if (message.userId) {
            // Send to specific user (would need user-to-client mapping)
            wsManager?.broadcast({
                type: 'notification',
                data: message,
                timestamp: new Date().toISOString(),
            });
        } else {
            // Broadcast to all
            wsManager?.broadcast({
                type: 'notification',
                data: message,
                timestamp: new Date().toISOString(),
            });
        }
    });

    // Analytics Handlers
    queueManager.subscribe(QUEUES.ANALYTICS, async (message) => {
        console.log('Received analytics event:', message);

        // Process analytics events (e.g., update dashboards, trigger reports)
        wsManager?.broadcastToTopic('analytics', {
            type: 'analytics-update',
            data: message,
            timestamp: new Date().toISOString(),
        });
    });

    console.log('Message queue handlers configured');
}

// Helper functions for publishing events
export class QueuePublisher {
    constructor(private queueManager: MessageQueueManager) { }

    async publishOilMovementCreated(data: any) {
        await this.queueManager.publish(
            QUEUES.OIL_MOVEMENTS,
            {
                event: 'created',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.OIL_MOVEMENT_CREATED
        );
    }

    async publishOilMovementUpdated(data: any) {
        await this.queueManager.publish(
            QUEUES.OIL_MOVEMENTS,
            {
                event: 'updated',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.OIL_MOVEMENT_UPDATED
        );
    }

    async publishOilMovementApproved(data: any) {
        await this.queueManager.publish(
            QUEUES.OIL_MOVEMENTS,
            {
                event: 'approved',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.OIL_MOVEMENT_APPROVED
        );
    }

    async publishOilMovementRejected(data: any) {
        await this.queueManager.publish(
            QUEUES.OIL_MOVEMENTS,
            {
                event: 'rejected',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.OIL_MOVEMENT_REJECTED
        );
    }

    async publishSubscriptionExpiring(data: any) {
        await this.queueManager.publish(
            QUEUES.SUBSCRIPTIONS,
            {
                event: 'expiring',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.SUBSCRIPTION_EXPIRING
        );
    }

    async publishBlockchainEvent(data: any) {
        await this.queueManager.publish(
            QUEUES.BLOCKCHAIN_EVENTS,
            {
                event: 'new',
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.BLOCKCHAIN_EVENT
        );
    }

    async publishNotification(data: any) {
        await this.queueManager.publish(
            QUEUES.NOTIFICATIONS,
            {
                data,
                timestamp: new Date().toISOString(),
            },
            ROUTING_KEYS.NOTIFICATION_SEND
        );
    }
}
