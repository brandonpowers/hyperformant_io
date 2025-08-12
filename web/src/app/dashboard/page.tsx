'use client';

import React, { useEffect, useState } from 'react';
import ThemeScene, {
  VisualNode,
  VisualEdge,
  VisualBackground,
} from 'components/hyperformant/ThemeScene';
import { THEMES } from 'lib/hyperformant/theme-config';

const Dashboard = () => {
  const [nodes, setNodes] = useState<VisualNode[]>([]);
  const [edges, setEdges] = useState<VisualEdge[]>([]);
  const [background, setBackground] = useState<VisualBackground>({
    halos: true,
    axes: true,
  });
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState('market-landscape');
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    async function loadVisualizationData() {
      setLoading(true);
      setError(null);

      try {
        // Use the optimized visualization endpoints
        const frameResponse = await fetch(
          `/api/v1/viz/frame?themeId=${currentTheme}&timeRange=${timeRange}`,
          {
            credentials: 'include', // Include cookies for authentication
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          },
        );

        if (!frameResponse.ok) {
          throw new Error(
            `Failed to fetch visualization data: ${frameResponse.status}`,
          );
        }

        const result = await frameResponse.json();

        // ApiResponse.success returns { data: result, meta: {...} }
        if (result.data) {
          // The visualization frame data is directly in result.data
          const vizResponse = result.data;
          const frameData = vizResponse.data; // This contains nodes, edges, background

          // Debug logging to understand the data structure
          console.log('Full API Response:', result);
          console.log('Viz Response:', vizResponse);
          console.log('Frame Data:', frameData);
          console.log('Nodes:', frameData.nodes);
          console.log('First node:', frameData.nodes?.[0]);

          setNodes(frameData.nodes || []);
          setEdges(frameData.edges || []);
          setBackground(frameData.background || { halos: true, axes: true });

          // Focus on user's company if available
          const userCompanyNode = frameData.nodes?.find(
            (node: any) => node.isUserCompany,
          );
          setFocusId(userCompanyNode?.id);

          console.log(
            `Loaded ${frameData.nodes?.length || 0} nodes and ${frameData.edges?.length || 0} edges for theme "${currentTheme}"`,
          );
        } else {
          throw new Error('Invalid response format from visualization API');
        }
      } catch (error) {
        console.error('Error loading visualization data:', error);
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to load visualization data',
        );

        // Set empty state on error
        setNodes([]);
        setEdges([]);
        setBackground({ halos: true, axes: true });
      } finally {
        setLoading(false);
      }
    }

    loadVisualizationData();
  }, [currentTheme, timeRange]);

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
  };

  const handleTimeRangeChange = (range: number) => {
    setTimeRange(range);
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Market Intelligence Visualization
          </h1>
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Selector */}
          <select
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(parseInt(e.target.value))}
            disabled={loading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
            <option value={365}>1 Year</option>
          </select>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${loading ? 'bg-yellow-400' : error ? 'bg-red-400' : 'bg-green-400'}`}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {loading
                ? 'Loading...'
                : error
                  ? 'Error'
                  : `${nodes.length} entities`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 rounded-[20px] bg-gradient-to-br from-gray-900 via-gray-950 to-black shadow-xl border border-white/5">
        <div className="h-full p-2">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="relative mb-6">
                  <div className="h-16 w-16 animate-spin rounded-full border-t-2 border-r-2 border-blue-500 mx-auto"></div>
                  <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-b-2 border-l-2 border-purple-500 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="text-blue-300 font-medium animate-pulse">
                  Initializing market intelligence...
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Analyzing {nodes.length || '...'} entities
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center p-8 rounded-xl bg-red-900/20 border border-red-500/30">
                <div className="text-red-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="mb-4 text-red-300 font-medium">
                  Visualization unavailable
                </p>
                <p className="text-gray-400 text-sm mb-4">
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2 text-sm text-white hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                  Reload Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl overflow-hidden relative">
              {/* Visualization stats overlay */}
              <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-gray-300">{nodes.length} entities</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span className="text-gray-300">{edges.length} connections</span>
                  </div>
                </div>
              </div>
              
              {/* Reset view button */}
              <button
                onClick={() => setFocusId(undefined)}
                className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10 text-xs text-gray-300 hover:bg-black/80 transition-all"
              >
                Reset View
              </button>

              <ThemeScene
                nodes={nodes}
                edges={edges}
                background={background}
                focusId={focusId}
                onNodeClick={(id) => {
                  setFocusId(id);
                  const node = nodes.find(n => n.id === id);
                  if (node) {
                    console.log('Selected entity:', node.name, node);
                  }
                }}
                onEdgeClick={(e) => console.log('edge click', e)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
