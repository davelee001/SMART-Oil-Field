import axios from 'axios';
import { QueuePublisher } from '../queue/handlers';

export interface BlockchainConfig {
  rpcUrl: string;
  moduleAddress: string;
  pollInterval?: number;
}

export interface AptosEvent {
  version: string;
  guid: {
    creation_number: string;
    account_address: string;
  };
  sequence_number: string;
  type: string;
  data: any;
}

export class AptosEventListener {
  private config: BlockchainConfig;
  private queuePublisher: QueuePublisher;
  private isRunning: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSequenceNumber: Map<string, string> = new Map();

  constructor(config: BlockchainConfig, queuePublisher: QueuePublisher) {
    this.config = {
      pollInterval: 10000, // 10 seconds default
      ...config,
    };
    this.queuePublisher = queuePublisher;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Blockchain event listener is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting Aptos blockchain event listener...');

    // Start polling for events
    this.pollInterval = setInterval(() => {
      this.pollEvents();
    }, this.config.pollInterval);

    // Initial poll
    await this.pollEvents();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('Stopped Aptos blockchain event listener');
  }

  private async pollEvents(): Promise<void> {
    try {
      // Poll for different event types
      await this.pollOilMovementEvents();
      await this.pollSubscriptionEvents();
    } catch (error) {
      console.error('Error polling blockchain events:', error);
    }
  }

  private async pollOilMovementEvents(): Promise<void> {
    try {
      const eventType = `${this.config.moduleAddress}::oil_tracker::OilMovementEvent`;
      const events = await this.getEvents(eventType);

      for (const event of events) {
        await this.processOilMovementEvent(event);
      }
    } catch (error) {
      console.error('Error polling oil movement events:', error);
    }
  }

  private async pollSubscriptionEvents(): Promise<void> {
    try {
      const eventType = `${this.config.moduleAddress}::subscription::SubscriptionEvent`;
      const events = await this.getEvents(eventType);

      for (const event of events) {
        await this.processSubscriptionEvent(event);
      }
    } catch (error) {
      console.error('Error polling subscription events:', error);
    }
  }

  private async getEvents(eventType: string, limit: number = 25): Promise<AptosEvent[]> {
    try {
      // Get account events from Aptos
      const response = await axios.get(
        `${this.config.rpcUrl}/accounts/${this.config.moduleAddress}/events/${eventType}`,
        {
          params: { limit },
          timeout: 5000,
        }
      );

      const events: AptosEvent[] = response.data;

      // Filter out events we've already processed
      const lastSeq = this.lastSequenceNumber.get(eventType) || '0';
      const newEvents = events.filter((event) => {
        return BigInt(event.sequence_number) > BigInt(lastSeq);
      });

      // Update last sequence number
      if (newEvents.length > 0) {
        const maxSeq = newEvents.reduce((max, event) => {
          return BigInt(event.sequence_number) > BigInt(max) ? event.sequence_number : max;
        }, '0');
        this.lastSequenceNumber.set(eventType, maxSeq);
      }

      return newEvents;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Event handle doesn't exist yet
        return [];
      }
      throw error;
    }
  }

  private async processOilMovementEvent(event: AptosEvent): Promise<void> {
    console.log('Processing oil movement event:', event);

    const eventData = {
      blockchainEvent: {
        version: event.version,
        sequenceNumber: event.sequence_number,
        type: event.type,
      },
      oilMovement: {
        id: event.data.id || event.data.movement_id,
        source: event.data.source,
        destination: event.data.destination,
        quantity: event.data.quantity,
        movementType: event.data.movement_type || event.data.type,
        status: event.data.status,
        timestamp: event.data.timestamp,
        txHash: event.version, // Using version as transaction hash
      },
    };

    // Publish to message queue
    await this.queuePublisher.publishBlockchainEvent(eventData);

    console.log(`✅ Processed oil movement event: ${eventData.oilMovement.id}`);
  }

  private async processSubscriptionEvent(event: AptosEvent): Promise<void> {
    console.log('Processing subscription event:', event);

    const eventData = {
      blockchainEvent: {
        version: event.version,
        sequenceNumber: event.sequence_number,
        type: event.type,
      },
      subscription: {
        id: event.data.id || event.data.subscription_id,
        userId: event.data.user_id || event.data.subscriber,
        planType: event.data.plan_type,
        startDate: event.data.start_date,
        endDate: event.data.end_date,
        isActive: event.data.is_active,
        txHash: event.version,
      },
    };

    // Publish to message queue
    await this.queuePublisher.publishBlockchainEvent(eventData);

    console.log(`✅ Processed subscription event: ${eventData.subscription.id}`);
  }

  // Get listener stats
  getStats() {
    return {
      isRunning: this.isRunning,
      moduleAddress: this.config.moduleAddress,
      rpcUrl: this.config.rpcUrl,
      pollInterval: this.config.pollInterval,
      lastSequenceNumbers: Object.fromEntries(this.lastSequenceNumber),
    };
  }
}

// Helper function to get transaction details
export async function getTransaction(rpcUrl: string, version: string) {
  try {
    const response = await axios.get(`${rpcUrl}/transactions/by_version/${version}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
}

// Helper function to get account resource
export async function getAccountResource(
  rpcUrl: string,
  accountAddress: string,
  resourceType: string
) {
  try {
    const response = await axios.get(
      `${rpcUrl}/accounts/${accountAddress}/resource/${resourceType}`
    );
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
