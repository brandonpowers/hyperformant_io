/**
 * Apollo.io Integration
 * 
 * Handles Apollo.io API integration for CRM data, contact enrichment,
 * and real-time webhook processing.
 */

import { SignalGenerator, SignalGenerationParams } from './index';
import type { PrismaClient } from '@prisma/client';

// Apollo.io API types
export interface ApolloContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  organization_id: string;
  organization_name: string;
  linkedin_url?: string;
  phone_numbers?: Array<{ number: string; type: string }>;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url?: string;
  founded_year?: number;
  num_employees?: number;
  estimated_num_employees?: number;
  retail_location_count?: number;
  raw_address?: string;
  industry?: string;
  keywords?: string[];
  publicly_traded?: boolean;
  annual_revenue?: number;
  technology_names?: string[];
}

export interface ApolloSequenceReply {
  contact_id: string;
  sequence_id: string;
  step_id: string;
  email_thread_id: string;
  reply_body: string;
  replied_at: string;
}

export interface ApolloWebhookEvent {
  type: 'contact.replied' | 'contact.opened' | 'contact.clicked' | 'contact.bounced' | 'sequence.finished';
  data: {
    contact: ApolloContact;
    organization?: ApolloOrganization;
    sequence?: { id: string; name: string };
    reply?: ApolloSequenceReply;
    timestamp: string;
  };
}

// Apollo.io API client
export class ApolloClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.apollo.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Apollo API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Search for organizations by domain or name
   */
  async searchOrganizations(query: {
    q?: string;
    domain?: string;
    num_employees_ranges?: string[];
    page?: number;
  }): Promise<{ organizations: ApolloOrganization[]; pagination: any }> {
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    if (query.domain) params.append('organization_domains', query.domain);
    if (query.num_employees_ranges) {
      query.num_employees_ranges.forEach(range => params.append('organization_num_employees_ranges[]', range));
    }
    params.append('page', (query.page || 1).toString());
    params.append('per_page', '25');

    return await this.request(`/mixed_companies/search?${params}`);
  }

  /**
   * Get organization details by ID
   */
  async getOrganization(organizationId: string): Promise<ApolloOrganization> {
    return await this.request(`/organizations/${organizationId}`);
  }

  /**
   * Search for contacts within an organization
   */
  async searchContacts(organizationId: string, options: {
    titles?: string[];
    seniorities?: string[];
    page?: number;
  } = {}): Promise<{ contacts: ApolloContact[]; pagination: any }> {
    const params = new URLSearchParams();
    params.append('organization_ids[]', organizationId);
    if (options.titles) {
      options.titles.forEach(title => params.append('person_titles[]', title));
    }
    if (options.seniorities) {
      options.seniorities.forEach(seniority => params.append('person_seniorities[]', seniority));
    }
    params.append('page', (options.page || 1).toString());
    params.append('per_page', '25');

    return await this.request(`/mixed_people/search?${params}`);
  }

  /**
   * Get contact details by ID
   */
  async getContact(contactId: string): Promise<ApolloContact> {
    return await this.request(`/contacts/${contactId}`);
  }

  /**
   * Get sequence analytics
   */
  async getSequenceStats(sequenceId: string): Promise<{
    sequence_id: string;
    num_contacted: number;
    num_replied: number;
    num_bounced: number;
    reply_rate: number;
    bounce_rate: number;
  }> {
    return await this.request(`/sequences/${sequenceId}/stats`);
  }
}

// Apollo.io data processor
export class ApolloDataProcessor {
  private signalGenerator: SignalGenerator;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.signalGenerator = new SignalGenerator(prisma);
  }

  /**
   * Process Apollo organization data and create/update entity
   */
  async processOrganization(apolloOrg: ApolloOrganization): Promise<string> {
    // Find or create entity
    let entity = await this.prisma.entity.findFirst({
      where: {
        OR: [
          { domain: apolloOrg.website_url },
          { name: apolloOrg.name },
          { 
            externalIds: { 
              path: ['apollo_id'], 
              equals: apolloOrg.id 
            } 
          }
        ]
      }
    });

    if (!entity) {
      entity = await this.prisma.entity.create({
        data: {
          type: 'COMPANY',
          name: apolloOrg.name,
          domain: apolloOrg.website_url,
          foundedAt: apolloOrg.founded_year ? new Date(apolloOrg.founded_year, 0, 1) : null,
          employees: apolloOrg.estimated_num_employees || apolloOrg.num_employees,
          description: apolloOrg.keywords?.join(', '),
          externalIds: {
            apollo_id: apolloOrg.id,
            apollo_organization: apolloOrg
          }
        }
      });

      // Generate discovery signal
      await this.signalGenerator.generateSignal({
        entityId: entity.id,
        signalType: 'MARKET_ENTRY',
        category: 'MARKET',
        magnitude: 0.3,
        summary: `Discovered new entity: ${apolloOrg.name}`,
        source: 'Apollo.io CRM',
        details: {
          apollo_id: apolloOrg.id,
          industry: apolloOrg.industry,
          employees: apolloOrg.estimated_num_employees,
          revenue: apolloOrg.annual_revenue,
          technology_stack: apolloOrg.technology_names
        }
      });
    } else if (entity.externalIds && !entity.externalIds['apollo_id']) {
      // Update with Apollo ID if missing
      await this.prisma.entity.update({
        where: { id: entity.id },
        data: {
          externalIds: {
            ...entity.externalIds,
            apollo_id: apolloOrg.id,
            apollo_organization: apolloOrg
          }
        }
      });
    }

    return entity.id;
  }

  /**
   * Process webhook events from Apollo.io
   */
  async processWebhookEvent(event: ApolloWebhookEvent): Promise<void> {
    console.log(`📨 Processing Apollo webhook: ${event.type}`);

    // Ensure we have the organization entity
    let entityId: string | null = null;
    if (event.data.organization) {
      entityId = await this.processOrganization(event.data.organization);
    }

    if (!entityId) {
      console.warn('⚠️ No entity found for Apollo webhook event');
      return;
    }

    // Generate signals based on event type
    const signalParams: SignalGenerationParams[] = [];

    switch (event.type) {
      case 'contact.replied':
        signalParams.push({
          entityId,
          signalType: 'CUSTOMER_WIN',
          category: 'DEAL',
          magnitude: 0.7,
          sentimentScore: 0.5,
          sentimentLabel: 'POSITIVE',
          summary: `Contact ${event.data.contact.first_name} ${event.data.contact.last_name} replied to sequence`,
          source: 'Apollo.io Webhook',
          details: {
            contact_id: event.data.contact.id,
            contact_email: event.data.contact.email,
            contact_title: event.data.contact.title,
            sequence_id: event.data.sequence?.id,
            sequence_name: event.data.sequence?.name,
            reply_body: event.data.reply?.reply_body
          }
        });
        break;

      case 'contact.opened':
        signalParams.push({
          entityId,
          signalType: 'SOCIAL_POST',
          category: 'ENGAGEMENT',
          magnitude: 0.3,
          sentimentScore: 0.2,
          sentimentLabel: 'NEUTRAL',
          summary: `Contact ${event.data.contact.first_name} ${event.data.contact.last_name} opened email`,
          source: 'Apollo.io Webhook',
          details: {
            contact_id: event.data.contact.id,
            contact_email: event.data.contact.email,
            sequence_id: event.data.sequence?.id
          }
        });
        break;

      case 'contact.clicked':
        signalParams.push({
          entityId,
          signalType: 'SOCIAL_POST',
          category: 'ENGAGEMENT',
          magnitude: 0.5,
          sentimentScore: 0.3,
          sentimentLabel: 'POSITIVE',
          summary: `Contact ${event.data.contact.first_name} ${event.data.contact.last_name} clicked email link`,
          source: 'Apollo.io Webhook',
          details: {
            contact_id: event.data.contact.id,
            contact_email: event.data.contact.email,
            sequence_id: event.data.sequence?.id
          }
        });
        break;

      case 'contact.bounced':
        signalParams.push({
          entityId,
          signalType: 'CUSTOMER_LOSS',
          category: 'RISK',
          magnitude: 0.4,
          sentimentScore: -0.3,
          sentimentLabel: 'NEGATIVE',
          summary: `Email bounced for ${event.data.contact.first_name} ${event.data.contact.last_name}`,
          source: 'Apollo.io Webhook',
          details: {
            contact_id: event.data.contact.id,
            contact_email: event.data.contact.email,
            bounce_reason: 'Email delivery failed'
          }
        });
        break;

      case 'sequence.finished':
        signalParams.push({
          entityId,
          signalType: 'SOCIAL_POST',
          category: 'ENGAGEMENT',
          magnitude: 0.2,
          sentimentScore: 0.0,
          sentimentLabel: 'NEUTRAL',
          summary: `Sequence completed for contact at ${event.data.organization?.name}`,
          source: 'Apollo.io Webhook',
          details: {
            contact_id: event.data.contact.id,
            sequence_id: event.data.sequence?.id,
            sequence_name: event.data.sequence?.name
          }
        });
        break;
    }

    // Generate all signals
    if (signalParams.length > 0) {
      await this.signalGenerator.bulkGenerateSignals(signalParams);
    }

    console.log(`✅ Processed Apollo webhook: ${event.type} for entity ${entityId}`);
  }

  /**
   * Sync sequence performance data
   */
  async syncSequenceMetrics(apolloClient: ApolloClient, sequenceId: string): Promise<void> {
    try {
      const stats = await apolloClient.getSequenceStats(sequenceId);
      
      // Find Apollo sequence record
      const sequence = await this.prisma.apolloSequence.findUnique({
        where: { apolloId: sequenceId }
      });

      if (sequence) {
        // Update metrics
        await this.prisma.apolloSequence.update({
          where: { id: sequence.id },
          data: {
            replyRate: stats.reply_rate,
            openRate: stats.bounce_rate < 1 ? (1 - stats.bounce_rate) : 0, // Estimate
            updatedAt: new Date()
          }
        });

        console.log(`📊 Updated sequence metrics: ${sequenceId} (${stats.reply_rate}% reply rate)`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync sequence metrics: ${sequenceId}`, error);
    }
  }

  /**
   * Discovery sync - find new organizations matching target criteria
   */
  async discoverTargetCompanies(apolloClient: ApolloClient, criteria: {
    industries?: string[];
    employeeRanges?: string[];
    keywords?: string[];
    limit?: number;
  }): Promise<string[]> {
    const entityIds: string[] = [];
    let page = 1;
    const limit = criteria.limit || 100;
    let processed = 0;

    while (processed < limit) {
      try {
        const result = await apolloClient.searchOrganizations({
          q: criteria.keywords?.join(' OR '),
          num_employees_ranges: criteria.employeeRanges,
          page
        });

        if (!result.organizations || result.organizations.length === 0) {
          break;
        }

        for (const org of result.organizations) {
          if (processed >= limit) break;
          
          const entityId = await this.processOrganization(org);
          entityIds.push(entityId);
          processed++;
        }

        page++;
      } catch (error) {
        console.error(`❌ Failed to discover companies on page ${page}:`, error);
        break;
      }
    }

    console.log(`🔍 Discovered ${entityIds.length} target companies via Apollo.io`);
    return entityIds;
  }
}

// Export utilities
export const createApolloClient = (apiKey: string) => new ApolloClient(apiKey);
export const createApolloDataProcessor = (prisma: PrismaClient) => new ApolloDataProcessor(prisma);