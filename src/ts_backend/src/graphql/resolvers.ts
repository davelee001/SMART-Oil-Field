import axios from 'axios';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

// Event topics
const EVENTS = {
    OIL_MOVEMENT_CREATED: 'OIL_MOVEMENT_CREATED',
    OIL_MOVEMENT_UPDATED: 'OIL_MOVEMENT_UPDATED',
    OIL_MOVEMENT_STATUS_CHANGED: 'OIL_MOVEMENT_STATUS_CHANGED',
    SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
};

export const resolvers = {
    Query: {
        // Oil Movement Queries
        getOilMovement: async (_: any, { id }: { id: string }) => {
            try {
                const response = await axios.get(`${PYTHON_API}/api/oil-movements/${id}`);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to fetch oil movement: ${error.message}`);
            }
        },

        listOilMovements: async (
            _: any,
            { limit = 10, offset = 0, status }: { limit?: number; offset?: number; status?: string }
        ) => {
            try {
                const params: any = { limit, offset };
                if (status) params.status = status;

                const response = await axios.get(`${PYTHON_API}/api/oil-movements`, { params });
                return {
                    items: response.data.items || response.data,
                    total: response.data.total || response.data.length,
                    hasMore: response.data.hasMore || (offset + limit < (response.data.total || response.data.length)),
                };
            } catch (error: any) {
                throw new Error(`Failed to fetch oil movements: ${error.message}`);
            }
        },

        // Subscription Queries
        getSubscription: async (_: any, { id }: { id: string }) => {
            try {
                const response = await axios.get(`${PYTHON_API}/api/subscriptions/${id}`);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to fetch subscription: ${error.message}`);
            }
        },

        listSubscriptions: async (
            _: any,
            { limit = 10, offset = 0, isActive }: { limit?: number; offset?: number; isActive?: boolean }
        ) => {
            try {
                const params: any = { limit, offset };
                if (isActive !== undefined) params.isActive = isActive;

                const response = await axios.get(`${PYTHON_API}/api/subscriptions`, { params });
                return {
                    items: response.data.items || response.data,
                    total: response.data.total || response.data.length,
                    hasMore: response.data.hasMore || (offset + limit < (response.data.total || response.data.length)),
                };
            } catch (error: any) {
                throw new Error(`Failed to fetch subscriptions: ${error.message}`);
            }
        },

        // Analytics Queries
        getStats: async () => {
            try {
                const response = await axios.get(`${PYTHON_API}/api/stats`);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to fetch stats: ${error.message}`);
            }
        },

        getMovementsByDateRange: async (
            _: any,
            { startDate, endDate }: { startDate: string; endDate: string }
        ) => {
            try {
                const response = await axios.get(`${PYTHON_API}/api/oil-movements/range`, {
                    params: { startDate, endDate },
                });
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to fetch movements by date range: ${error.message}`);
            }
        },

        // Health Check
        health: async () => {
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
            };
        },
    },

    Mutation: {
        // Oil Movement Mutations
        createOilMovement: async (_: any, { input }: { input: any }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/oil-movements`, input);
                const movement = response.data;

                // Publish event for real-time subscribers
                pubsub.publish(EVENTS.OIL_MOVEMENT_CREATED, { oilMovementCreated: movement });
                pubsub.publish(EVENTS.OIL_MOVEMENT_UPDATED, { oilMovementUpdated: movement });

                return movement;
            } catch (error: any) {
                throw new Error(`Failed to create oil movement: ${error.message}`);
            }
        },

        updateOilMovement: async (_: any, { id, input }: { id: string; input: any }) => {
            try {
                const response = await axios.put(`${PYTHON_API}/api/oil-movements/${id}`, input);
                const movement = response.data;

                // Publish event for real-time subscribers
                pubsub.publish(EVENTS.OIL_MOVEMENT_UPDATED, { oilMovementUpdated: movement });

                return movement;
            } catch (error: any) {
                throw new Error(`Failed to update oil movement: ${error.message}`);
            }
        },

        approveOilMovement: async (_: any, { id }: { id: string }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/oil-movements/${id}/approve`);
                const movement = response.data;

                // Publish status change event
                pubsub.publish(EVENTS.OIL_MOVEMENT_STATUS_CHANGED, { oilMovementStatusChanged: movement });
                pubsub.publish(EVENTS.OIL_MOVEMENT_UPDATED, { oilMovementUpdated: movement });

                return movement;
            } catch (error: any) {
                throw new Error(`Failed to approve oil movement: ${error.message}`);
            }
        },

        rejectOilMovement: async (_: any, { id, reason }: { id: string; reason: string }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/oil-movements/${id}/reject`, { reason });
                const movement = response.data;

                // Publish status change event
                pubsub.publish(EVENTS.OIL_MOVEMENT_STATUS_CHANGED, { oilMovementStatusChanged: movement });
                pubsub.publish(EVENTS.OIL_MOVEMENT_UPDATED, { oilMovementUpdated: movement });

                return movement;
            } catch (error: any) {
                throw new Error(`Failed to reject oil movement: ${error.message}`);
            }
        },

        // Subscription Mutations
        createSubscription: async (_: any, { input }: { input: any }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/subscriptions`, input);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to create subscription: ${error.message}`);
            }
        },

        cancelSubscription: async (_: any, { id }: { id: string }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/subscriptions/${id}/cancel`);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to cancel subscription: ${error.message}`);
            }
        },

        renewSubscription: async (_: any, { id }: { id: string }) => {
            try {
                const response = await axios.post(`${PYTHON_API}/api/subscriptions/${id}/renew`);
                return response.data;
            } catch (error: any) {
                throw new Error(`Failed to renew subscription: ${error.message}`);
            }
        },
    },

    Subscription: {
        oilMovementCreated: {
            subscribe: () => pubsub.asyncIterator([EVENTS.OIL_MOVEMENT_CREATED]),
        },

        oilMovementUpdated: {
            subscribe: (_: any, { id }: { id?: string }) => {
                // If ID is provided, filter by it (implement filtering logic as needed)
                return pubsub.asyncIterator([EVENTS.OIL_MOVEMENT_UPDATED]);
            },
        },

        oilMovementStatusChanged: {
            subscribe: (_: any, { status }: { status?: string }) => {
                // If status is provided, filter by it (implement filtering logic as needed)
                return pubsub.asyncIterator([EVENTS.OIL_MOVEMENT_STATUS_CHANGED]);
            },
        },

        subscriptionExpiring: {
            subscribe: (_: any, { daysUntilExpiry }: { daysUntilExpiry?: number }) => {
                return pubsub.asyncIterator([EVENTS.SUBSCRIPTION_EXPIRING]);
            },
        },
    },
};

// Export pubsub for use in other modules
export { pubsub, EVENTS };
