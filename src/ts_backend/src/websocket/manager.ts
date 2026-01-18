import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { pubsub, EVENTS } from './graphql/resolvers';

interface Client {
    id: string;
    ws: WebSocket;
    subscriptions: Set<string>;
    metadata: {
        connectedAt: Date;
        lastPing: Date;
        userAgent?: string;
    };
}

export class WebSocketManager {
    private wss: WebSocketServer;
    private clients: Map<string, Client> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(wss: WebSocketServer) {
        this.wss = wss;
        this.initialize();
    }

    private initialize() {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req);
        });

        // Start heartbeat mechanism
        this.startHeartbeat();

        // Subscribe to GraphQL pubsub events
        this.subscribeToEvents();
    }

    private handleConnection(ws: WebSocket, req: IncomingMessage) {
        const clientId = uuidv4();
        const client: Client = {
            id: clientId,
            ws,
            subscriptions: new Set(),
            metadata: {
                connectedAt: new Date(),
                lastPing: new Date(),
                userAgent: req.headers['user-agent'],
            },
        };

        this.clients.set(clientId, client);

        console.log(`WebSocket client connected: ${clientId}`);

        // Send welcome message
        this.sendToClient(clientId, {
            type: 'connection',
            data: {
                clientId,
                message: 'Connected to Oil Tracker WebSocket server',
                timestamp: new Date().toISOString(),
            },
        });

        // Handle messages from client
        ws.on('message', (message: string) => {
            this.handleMessage(clientId, message);
        });

        // Handle client disconnect
        ws.on('close', () => {
            this.handleDisconnect(clientId);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error(`WebSocket error for client ${clientId}:`, error);
        });

        // Handle pong responses
        ws.on('pong', () => {
            const client = this.clients.get(clientId);
            if (client) {
                client.metadata.lastPing = new Date();
            }
        });
    }

    private handleMessage(clientId: string, message: string) {
        try {
            const data = JSON.parse(message.toString());
            const client = this.clients.get(clientId);

            if (!client) return;

            switch (data.type) {
                case 'subscribe':
                    this.handleSubscribe(clientId, data.topic);
                    break;

                case 'unsubscribe':
                    this.handleUnsubscribe(clientId, data.topic);
                    break;

                case 'ping':
                    this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
                    break;

                case 'request':
                    // Handle custom request types
                    this.handleCustomRequest(clientId, data);
                    break;

                default:
                    this.sendToClient(clientId, {
                        type: 'error',
                        data: { message: 'Unknown message type' },
                    });
            }
        } catch (error) {
            console.error(`Error parsing message from client ${clientId}:`, error);
            this.sendToClient(clientId, {
                type: 'error',
                data: { message: 'Invalid message format' },
            });
        }
    }

    private handleSubscribe(clientId: string, topic: string) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.add(topic);
        console.log(`Client ${clientId} subscribed to ${topic}`);

        this.sendToClient(clientId, {
            type: 'subscribed',
            data: { topic, message: `Subscribed to ${topic}` },
        });
    }

    private handleUnsubscribe(clientId: string, topic: string) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.subscriptions.delete(topic);
        console.log(`Client ${clientId} unsubscribed from ${topic}`);

        this.sendToClient(clientId, {
            type: 'unsubscribed',
            data: { topic, message: `Unsubscribed from ${topic}` },
        });
    }

    private handleCustomRequest(clientId: string, data: any) {
        // Handle custom request logic here
        // For example, getting client stats, list of subscriptions, etc.
        if (data.action === 'getSubscriptions') {
            const client = this.clients.get(clientId);
            if (client) {
                this.sendToClient(clientId, {
                    type: 'response',
                    data: {
                        subscriptions: Array.from(client.subscriptions),
                    },
                });
            }
        }
    }

    private handleDisconnect(clientId: string) {
        this.clients.delete(clientId);
        console.log(`WebSocket client disconnected: ${clientId}`);
    }

    private startHeartbeat() {
        // Send ping to all clients every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            this.clients.forEach((client, clientId) => {
                // Check if client is still alive (responded to ping in last 60 seconds)
                const timeSinceLastPing = now.getTime() - client.metadata.lastPing.getTime();
                if (timeSinceLastPing > 60000) {
                    console.log(`Terminating inactive client: ${clientId}`);
                    client.ws.terminate();
                    this.clients.delete(clientId);
                } else if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.ping();
                }
            });
        }, 30000);
    }

    private subscribeToEvents() {
        // Subscribe to oil movement events
        pubsub.asyncIterator([EVENTS.OIL_MOVEMENT_CREATED]).next().then(() => {
            // This is a simplified example - in production, use proper async iteration
        });

        // Note: For proper GraphQL subscription support with WebSocket,
        // consider using graphql-ws or subscriptions-transport-ws libraries
    }

    // Public methods for broadcasting
    public broadcast(message: any) {
        const payload = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
            }
        });
    }

    public broadcastToTopic(topic: string, message: any) {
        const payload = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.subscriptions.has(topic) && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
            }
        });
    }

    public sendToClient(clientId: string, message: any) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    public getStats() {
        return {
            totalConnections: this.clients.size,
            clients: Array.from(this.clients.entries()).map(([id, client]) => ({
                id,
                subscriptions: Array.from(client.subscriptions),
                connectedAt: client.metadata.connectedAt,
                lastPing: client.metadata.lastPing,
            })),
        };
    }

    public cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.clients.forEach((client) => {
            client.ws.close();
        });
        this.clients.clear();
    }
}

// Event handlers for broadcasting
export function setupWebSocketEventHandlers(wsManager: WebSocketManager) {
    // Oil Movement Events
    pubsub.subscribe(EVENTS.OIL_MOVEMENT_CREATED, (payload) => {
        wsManager.broadcastToTopic('oil-movements', {
            type: 'oil-movement-created',
            data: payload.oilMovementCreated,
            timestamp: new Date().toISOString(),
        });
    });

    pubsub.subscribe(EVENTS.OIL_MOVEMENT_UPDATED, (payload) => {
        wsManager.broadcastToTopic('oil-movements', {
            type: 'oil-movement-updated',
            data: payload.oilMovementUpdated,
            timestamp: new Date().toISOString(),
        });
    });

    pubsub.subscribe(EVENTS.OIL_MOVEMENT_STATUS_CHANGED, (payload) => {
        wsManager.broadcastToTopic('oil-movements', {
            type: 'oil-movement-status-changed',
            data: payload.oilMovementStatusChanged,
            timestamp: new Date().toISOString(),
        });
    });

    // Subscription Events
    pubsub.subscribe(EVENTS.SUBSCRIPTION_EXPIRING, (payload) => {
        wsManager.broadcastToTopic('subscriptions', {
            type: 'subscription-expiring',
            data: payload.subscriptionExpiring,
            timestamp: new Date().toISOString(),
        });
    });

    console.log('WebSocket event handlers configured');
}
