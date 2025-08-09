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

        if (result.success && result.data) {
          const frameData = result.data.data; // ApiResponse.success wraps data

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
      <div className="flex-1 rounded-[20px] bg-white shadow-sm dark:bg-gray-900">
        <div className="h-full p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400">
                  Loading visualization data...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="mb-4 text-red-600 dark:text-red-400">
                  Failed to load visualization
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl bg-gray-50 dark:bg-gray-800">
              <ThemeScene
                nodes={nodes}
                edges={edges}
                background={background}
                focusId={focusId}
                onNodeClick={(id) => setFocusId(id)}
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
