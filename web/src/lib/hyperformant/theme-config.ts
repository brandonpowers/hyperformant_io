// theme-config.ts
// Starter ThemeConfig with six themes prefilled

export type ThemeConfig = {
  id: string;
  name: string;
  encodings: {
    position: { x: string; y: string; z: string }; // composite index keys
    size: string; // metric key (supports fallbacks via '|')
    color: { mode: 'palette' | 'scale'; key: string }; // palette=profile.* ; scale=index.* | metric.* | signal.*
    glow: {
      key: string;
      polarity?: 'pos' | 'neg' | 'both';
      intensity: 'low' | 'med' | 'high';
    };
    drift: { key: string; windowDays: number }; // trend vector source
    labels: { strategy: 'topN' | 'focus' | 'none'; n?: number };
  };
  connections: {
    include: string[]; // connection subtypes to render
    thickness: { key: string; scale: 'linear' | 'log' };
    color: { by: 'type' | 'sentiment' | 'hybrid' };
    pattern: { rivalryDashed?: boolean };
    animation: { particles?: boolean; pulsesOnActive?: boolean };
  };
  background: {
    clustersBy?: 'industry' | 'market';
    halos: boolean;
    axes: boolean;
  };
};

// Helper: keys refer to your unified data domains
// profile.*          → Entity Profiles
// metric.*           → Performance Metrics (time-series)
// signal.*           → Signals (events) aggregated by window & sentiment
// index.*            → Composite Indices (proprietary blends)
// connection.*       → Connection attributes (strength, sentiment, type)

export const THEMES: ThemeConfig[] = [
  // 1) Market Landscape
  {
    id: 'market-landscape',
    name: 'Market Landscape',
    encodings: {
      position: {
        x: 'index.momentum',
        y: 'index.techVelocity',
        z: 'index.mindshare',
      },
      size: 'metric.marketCap|metric.revenue|metric.traffic',
      color: { mode: 'palette', key: 'profile.industry' },
      glow: { key: 'signal.positive', polarity: 'pos', intensity: 'low' },
      drift: {
        key: 'metric.marketCapGrowth|metric.trafficGrowth',
        windowDays: 60,
      },
      labels: { strategy: 'topN', n: 20 },
    },
    connections: {
      include: ['industryAdjacency', 'supplyChain', 'weakCompetitor'],
      thickness: { key: 'connection.strength', scale: 'linear' },
      color: { by: 'type' },
      pattern: {},
      animation: { particles: false, pulsesOnActive: false },
    },
    background: { clustersBy: 'industry', halos: true, axes: true },
  },

  // 2) Competitive Dynamics
  {
    id: 'competitive-dynamics',
    name: 'Competitive Dynamics',
    encodings: {
      position: {
        x: 'index.competitiveThreat',
        y: 'index.techVelocity',
        z: 'index.mindshare',
      },
      size: 'index.influence',
      color: { mode: 'scale', key: 'index.threatTier' }, // map to green→yellow→red in renderer
      glow: { key: 'signal.competitive', polarity: 'both', intensity: 'med' },
      drift: { key: 'index.rivalPull', windowDays: 30 },
      labels: { strategy: 'focus' },
    },
    connections: {
      include: ['competitor', 'partnership'],
      thickness: {
        key: 'connection.overlapScore|connection.depth',
        scale: 'linear',
      },
      color: { by: 'type' }, // orange/red for competitor, cyan/teal for partnership (renderer palette)
      pattern: { rivalryDashed: true },
      animation: { particles: false, pulsesOnActive: true },
    },
    background: { clustersBy: 'market', halos: true, axes: true },
  },

  // 3) Growth & Momentum
  {
    id: 'growth-momentum',
    name: 'Growth & Momentum',
    encodings: {
      position: {
        x: 'index.growth',
        y: 'metric.hiringVelocity',
        z: 'index.dealMomentum',
      },
      size: 'index.shortTermGrowth',
      color: { mode: 'scale', key: 'index.sentimentBlend' }, // warm=pos, cool=neg
      glow: { key: 'signal.positive', polarity: 'pos', intensity: 'high' },
      drift: { key: 'index.growthSlope', windowDays: 30 },
      labels: { strategy: 'topN', n: 16 },
    },
    connections: {
      include: ['strategicAlliance', 'mna', 'customerWin'],
      thickness: {
        key: 'connection.dealValue|connection.allianceDepth',
        scale: 'log',
      },
      color: { by: 'sentiment' }, // gold=positive, blue=negative, neutral=gray
      pattern: {},
      animation: { particles: true, pulsesOnActive: true },
    },
    background: { clustersBy: 'market', halos: false, axes: true },
  },

  // 4) Risk & Stability
  {
    id: 'risk-stability',
    name: 'Risk & Stability',
    encodings: {
      position: {
        x: 'index.complianceRisk',
        y: 'index.operationalStability',
        z: 'index.sentimentStability',
      },
      size: 'index.stability',
      color: { mode: 'scale', key: 'index.riskHeat' }, // green→amber→red mapping in renderer
      glow: { key: 'signal.negative', polarity: 'neg', intensity: 'med' },
      drift: { key: 'index.stabilityDelta', windowDays: 30 },
      labels: { strategy: 'topN', n: 12 },
    },
    connections: {
      include: ['legalDispute', 'regulatory', 'supplyChain'],
      thickness: {
        key: 'connection.severity|connection.criticality',
        scale: 'linear',
      },
      color: { by: 'type' }, // red for dispute, slate/blue regulatory, gray supply
      pattern: {},
      animation: { particles: false, pulsesOnActive: true },
    },
    background: { clustersBy: 'industry', halos: true, axes: true },
  },

  // 5) Innovation Velocity
  {
    id: 'innovation-velocity',
    name: 'Innovation Velocity',
    encodings: {
      position: {
        x: 'metric.rdIntensity|index.rdIndex',
        y: 'metric.releaseCadence',
        z: 'metric.communityMomentum|metric.ossMomentum',
      },
      size: 'index.innovationComposite',
      color: { mode: 'scale', key: 'index.innovationTier' }, // cool→hot ramp
      glow: { key: 'signal.product', polarity: 'pos', intensity: 'med' },
      drift: { key: 'metric.releaseCadenceDelta', windowDays: 60 },
      labels: { strategy: 'topN', n: 18 },
    },
    connections: {
      include: ['jointRD', 'coPatent', 'techAffinity'],
      thickness: {
        key: 'connection.collabDepth|connection.sharedModules',
        scale: 'linear',
      },
      color: { by: 'type' }, // cyan/teal for collab, violet for affinity
      pattern: {},
      animation: { particles: true, pulsesOnActive: true },
    },
    background: { clustersBy: 'industry', halos: false, axes: true },
  },

  // 6) Investor / M&A Lens
  {
    id: 'investor-ma',
    name: 'Investor / M&A',
    encodings: {
      position: {
        x: 'index.acquisitionReadiness',
        y: 'index.growthQuality',
        z: 'index.strategicFitToUser',
      },
      size: 'metric.valuationProxy|metric.marketCap|metric.revenue',
      color: { mode: 'scale', key: 'index.fitBand' }, // excellent→poor gradient
      glow: { key: 'signal.deal', polarity: 'both', intensity: 'high' },
      drift: { key: 'index.readinessTrajectory', windowDays: 90 },
      labels: { strategy: 'topN', n: 14 },
    },
    connections: {
      include: ['investorPortfolio', 'ownership', 'mna'],
      thickness: {
        key: 'connection.checkSize|connection.equityPct|connection.integrationDepth',
        scale: 'log',
      },
      color: { by: 'type' }, // gradient investor→startup; purple for ownership
      pattern: {},
      animation: { particles: true, pulsesOnActive: true },
    },
    background: { clustersBy: 'market', halos: true, axes: true },
  },
];
