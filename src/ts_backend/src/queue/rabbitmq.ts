import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

export interface QueueConfig {
    url: string;
    exchange?: string;
    queues: string[];
    reconnectInterval?: number;
}

export interface MessageHandler {
    (message: any, originalMessage: ConsumeMessage): Promise<void>;
}

export class MessageQueueManager {
    private connection: Connection | null = null;
    private channel: Channel | null = null;
    private config: QueueConfig;
    private handlers: Map<string, MessageHandler[]> = new Map();
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting: boolean = false;

    constructor(config: QueueConfig) {
        this.config = {
            reconnectInterval: 5000,
            exchange: 'oil-tracker-exchange',
            ...config,
        };
    }

    async connect(): Promise<void> {
        if (this.isConnecting || this.connection) {
            return;
        }

        this.isConnecting = true;

        try {
            console.log('Connecting to RabbitMQ...');
            this.connection = await amqp.connect(this.config.url);

            this.connection.on('error', (error) => {
                console.error('RabbitMQ connection error:', error);
                this.handleDisconnect();
            });

            this.connection.on('close', () => {
                console.log('RabbitMQ connection closed');
                this.handleDisconnect();
            });

            this.channel = await this.connection.createChannel();

            // Assert exchange
            if (this.config.exchange) {
                await this.channel.assertExchange(this.config.exchange, 'topic', { durable: true });
            }

            // Assert queues
            for (const queue of this.config.queues) {
                await this.channel.assertQueue(queue, { durable: true });
                if (this.config.exchange) {
                    await this.channel.bindQueue(queue, this.config.exchange, `${queue}.#`);
                }
            }

            console.log('Connected to RabbitMQ successfully');
            this.isConnecting = false;

            // Re-subscribe handlers
            this.resubscribeHandlers();
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    private handleDisconnect(): void {
        this.connection = null;
        this.channel = null;
        this.scheduleReconnect();
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect to RabbitMQ...');
            this.connect();
        }, this.config.reconnectInterval);
    }

    private resubscribeHandlers(): void {
        this.handlers.forEach((handlers, queue) => {
            handlers.forEach((handler) => {
                this.subscribeInternal(queue, handler);
            });
        });
    }

    async publish(queue: string, message: any, routingKey?: string): Promise<boolean> {
        if (!this.channel) {
            console.error('Cannot publish: Not connected to RabbitMQ');
            return false;
        }

        try {
            const content = Buffer.from(JSON.stringify(message));

            if (this.config.exchange && routingKey) {
                return this.channel.publish(this.config.exchange, routingKey, content, {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now(),
                });
            } else {
                return this.channel.sendToQueue(queue, content, {
                    persistent: true,
                    contentType: 'application/json',
                    timestamp: Date.now(),
                });
            }
        } catch (error) {
            console.error('Failed to publish message:', error);
            return false;
        }
    }

    async subscribe(queue: string, handler: MessageHandler): Promise<void> {
        if (!this.handlers.has(queue)) {
            this.handlers.set(queue, []);
        }
        this.handlers.get(queue)!.push(handler);

        if (this.channel) {
            await this.subscribeInternal(queue, handler);
        }
    }

    private async subscribeInternal(queue: string, handler: MessageHandler): Promise<void> {
        if (!this.channel) {
            return;
        }

        try {
            await this.channel.consume(
                queue,
                async (msg) => {
                    if (!msg) return;

                    try {
                        const content = JSON.parse(msg.content.toString());
                        await handler(content, msg);
                        this.channel?.ack(msg);
                    } catch (error) {
                        console.error(`Error processing message from queue ${queue}:`, error);
                        // Reject and requeue the message
                        this.channel?.nack(msg, false, true);
                    }
                },
                { noAck: false }
            );

            console.log(`Subscribed to queue: ${queue}`);
        } catch (error) {
            console.error(`Failed to subscribe to queue ${queue}:`, error);
        }
    }

    async close(): Promise<void> {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        if (this.channel) {
            await this.channel.close();
        }

        if (this.connection) {
            await this.connection.close();
        }

        this.connection = null;
        this.channel = null;
        console.log('RabbitMQ connection closed');
    }

    isConnected(): boolean {
        return this.connection !== null && this.channel !== null;
    }
}

// Predefined queue names
export const QUEUES = {
    OIL_MOVEMENTS: 'oil-movements',
    SUBSCRIPTIONS: 'subscriptions',
    NOTIFICATIONS: 'notifications',
    BLOCKCHAIN_EVENTS: 'blockchain-events',
    ANALYTICS: 'analytics',
};

// Routing keys for topic exchange
export const ROUTING_KEYS = {
    OIL_MOVEMENT_CREATED: 'oil-movements.created',
    OIL_MOVEMENT_UPDATED: 'oil-movements.updated',
    OIL_MOVEMENT_APPROVED: 'oil-movements.approved',
    OIL_MOVEMENT_REJECTED: 'oil-movements.rejected',
    SUBSCRIPTION_CREATED: 'subscriptions.created',
    SUBSCRIPTION_EXPIRING: 'subscriptions.expiring',
    SUBSCRIPTION_RENEWED: 'subscriptions.renewed',
    BLOCKCHAIN_EVENT: 'blockchain-events.new',
    NOTIFICATION_SEND: 'notifications.send',
};
