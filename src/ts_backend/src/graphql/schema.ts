import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type Query {
    # Oil Movement Queries
    getOilMovement(id: String!): OilMovement
    listOilMovements(
      limit: Int = 10
      offset: Int = 0
      status: String
    ): OilMovementList!
    
    # Subscription Queries
    getSubscription(id: String!): Subscription
    listSubscriptions(
      limit: Int = 10
      offset: Int = 0
      isActive: Boolean
    ): SubscriptionList!
    
    # Analytics Queries
    getStats: Stats!
    getMovementsByDateRange(startDate: String!, endDate: String!): [OilMovement!]!
    
    # Health Check
    health: HealthCheck!
  }

  type Mutation {
    # Oil Movement Mutations
    createOilMovement(input: CreateOilMovementInput!): OilMovement!
    updateOilMovement(id: String!, input: UpdateOilMovementInput!): OilMovement!
    approveOilMovement(id: String!): OilMovement!
    rejectOilMovement(id: String!, reason: String!): OilMovement!
    
    # Subscription Mutations
    createSubscription(input: CreateSubscriptionInput!): Subscription!
    cancelSubscription(id: String!): Subscription!
    renewSubscription(id: String!): Subscription!
  }

  type Subscription {
    # Real-time subscriptions
    oilMovementCreated: OilMovement!
    oilMovementUpdated(id: String): OilMovement!
    oilMovementStatusChanged(status: String): OilMovement!
    subscriptionExpiring(daysUntilExpiry: Int): SubscriptionAlert!
  }

  # Types
  type OilMovement {
    id: String!
    source: String!
    destination: String!
    quantity: Float!
    movementType: String!
    status: String!
    timestamp: String!
    approver: String
    txHash: String
    metadata: MovementMetadata
  }

  type MovementMetadata {
    vehicleId: String
    driverId: String
    temperature: Float
    pressure: Float
    notes: String
  }

  type OilMovementList {
    items: [OilMovement!]!
    total: Int!
    hasMore: Boolean!
  }

  type Subscription {
    id: String!
    userId: String!
    planType: String!
    startDate: String!
    endDate: String!
    isActive: Boolean!
    autoRenew: Boolean!
    price: Float!
    features: [String!]!
  }

  type SubscriptionList {
    items: [Subscription!]!
    total: Int!
    hasMore: Boolean!
  }

  type SubscriptionAlert {
    subscription: Subscription!
    daysRemaining: Int!
    message: String!
  }

  type Stats {
    totalMovements: Int!
    pendingMovements: Int!
    approvedMovements: Int!
    rejectedMovements: Int!
    totalQuantity: Float!
    activeSubscriptions: Int!
    expiringSubscriptions: Int!
  }

  type HealthCheck {
    status: String!
    timestamp: String!
    uptime: Float!
    version: String!
  }

  # Input Types
  input CreateOilMovementInput {
    source: String!
    destination: String!
    quantity: Float!
    movementType: String!
    metadata: MovementMetadataInput
  }

  input UpdateOilMovementInput {
    source: String
    destination: String
    quantity: Float
    movementType: String
    status: String
    metadata: MovementMetadataInput
  }

  input MovementMetadataInput {
    vehicleId: String
    driverId: String
    temperature: Float
    pressure: Float
    notes: String
  }

  input CreateSubscriptionInput {
    userId: String!
    planType: String!
    duration: Int!
    autoRenew: Boolean = false
  }
`;
