'use client';

import React, { useEffect, useState } from 'react';
import ThemeScene, { VisualNode, VisualEdge, VisualBackground } from 'components/hyperformant/ThemeScene';
import { THEMES } from 'lib/hyperformant/theme-config';
import { applyTheme, defaultPalette, defaultNormalize, defaultGetCompound, defaultGetConnValue } from 'lib/hyperformant/theme-renderer';

import OverallRevenue from 'components/hyperformant/ThemeScene';
import YourCard from 'components/dashboard/dashboards/default/YourCard';

const Dashboard = () => {

  const [nodes, setNodes] = useState<VisualNode[]>([]);
  const [edges, setEdges] = useState<VisualEdge[]>([]);
  const [background, setBackground] = useState<VisualBackground>({ halos: true, axes: true });
  const [focusId, setFocusId] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function load() {
      try {
        // Use the actual companies API endpoint
        const companiesResponse = await fetch('/api/v1/companies');
        const companies = companiesResponse.ok ? await companiesResponse.json() : { data: [] };
        
        // Transform companies data to entities format for the visualization
        const entities = companies.data || [];
        
        // For now, use empty connections until we have a connections API
        const connections = [];

        const theme = THEMES[0]; // e.g., "Market Landscape"
        const out = applyTheme({
          theme,
          entities,
          connections,
          palette: defaultPalette,
          normalize: defaultNormalize,
          getCompound: defaultGetCompound,
          getConnValue: defaultGetConnValue
        });

        setNodes(out.nodes);
        setEdges(out.edges);
        setBackground(out.background);
        // Optionally center on "my company" if known:
        setFocusId(entities.find((e: any) => e.profile?.isUserCompany)?.id);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default empty state on error
        setNodes([]);
        setEdges([]);
      }
    }
    load();
  }, []);

  return (
    <div className="flex h-full flex-col gap-6 xl:flex-row">
      <div className="flex-1 rounded-[20px]">
        {/* left side */}
        <div className="col-span-9 h-full rounded-t-2xl xl:col-span-6">
          {/* overall & Balance */}
          <div className="mb-6 grid grid-cols-6 gap-6">
            <div className="col-span-6 h-full rounded-xl 3xl:col-span-4">
              
              <ThemeScene
                nodes={nodes}
                edges={edges}
                background={background}
                focusId={focusId}
                onNodeClick={(id) => setFocusId(id)}
                onEdgeClick={(e) => console.log('edge click', e)}
              />

            </div>
          </div>
        </div>
      </div>

      {/* line */}
      <div className="flex w-0 bg-gray-200 dark:bg-navy-700 xl:w-px" />

      {/* right section */}
      <div className="h-full xl:w-[400px] xl:min-w-[300px] 2xl:min-w-[400px] flex-shrink-0">
        <YourCard />
      </div>
    </div>
  );
};

export default Dashboard;
