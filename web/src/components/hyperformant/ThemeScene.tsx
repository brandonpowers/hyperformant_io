'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import * as d3 from 'd3-force';

export type Vec3 = { x: number; y: number; z: number };

export type VisualNode = {
  id: string;
  name: string;
  position: Vec3; // normalized [-0.5..0.5]
  size: number; // 0..1 (we scale to world units)
  color: number; // 0xRRGGBB
  glow: number; // 0..1 pulse intensity
  drift: Vec3; // small vector for micro-movement
  meta?: any;
};

export type VisualEdge = {
  source: string;
  target: string;
  thickness: number; // 0..1 (see note re: line width below)
  color: number; // 0xRRGGBB
  dashed: boolean;
  particles: boolean;
  pulsesOnActive: boolean;
  meta?: any;
};

export type VisualBackground = {
  clustersBy?: 'industry' | 'market';
  halos: boolean;
  axes: boolean;
};

export type ThemeSceneProps = {
  nodes: VisualNode[];
  edges: VisualEdge[];
  background: VisualBackground;
  focusId?: string; // center on a node if provided
  showLabels?: boolean;
  onNodeClick?: (id: string) => void;
  onEdgeClick?: (e: VisualEdge) => void;
};

export default function ThemeScene(props: ThemeSceneProps) {
  const {
    nodes,
    edges,
    background,
    focusId,
    showLabels = true,
    onNodeClick,
    onEdgeClick,
  } = props;

  return (
    <div className="h-[80vh] w-full rounded-2xl overflow-hidden border border-white/10">
      <Canvas camera={{ fov: 75 }}>
        {/* Background & mood */}
        <color attach="background" args={['#0a0f1c']} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.0} color="#ffffff" />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#ffffff" />

        {/* Force-directed layout nodes and edges */}
        <ForceLayout 
          nodes={nodes} 
          edges={edges} 
          focusId={focusId} 
          onClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          showLabels={showLabels}
        />
      </Canvas>
    </div>
  );
}

/* ===================== Camera Controller ===================== */

function CameraController({ forceNodes }: { forceNodes: ForceNode[] }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>();

  useEffect(() => {
    if (forceNodes.length === 0) return;

    // Find the largest entity (highest market cap)
    const largestNode = forceNodes.reduce((max, node) => 
      node.marketCap > max.marketCap ? node : max
    );

    // Calculate bounds of all nodes
    const positions = forceNodes.map(node => ({
      x: node.x || 0,
      y: node.y || 0,
      z: node.z || 0,
      radius: node.radius
    }));

    const minX = Math.min(...positions.map(p => p.x - p.radius));
    const maxX = Math.max(...positions.map(p => p.x + p.radius));
    const minY = Math.min(...positions.map(p => p.y - p.radius));
    const maxY = Math.max(...positions.map(p => p.y + p.radius));
    const minZ = Math.min(...positions.map(p => p.z - p.radius));
    const maxZ = Math.max(...positions.map(p => p.z + p.radius));

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const rangeZ = maxZ - minZ;
    const maxRange = Math.max(rangeX, rangeY, rangeZ);

    // Set camera target to largest entity position
    const targetX = largestNode.x || 0;
    const targetY = largestNode.y || 0;
    const targetZ = largestNode.z || 0;

    // Position camera to see entire cluster with some padding
    const distance = maxRange * 1.5; // 50% padding
    const cameraX = targetX + distance * 0.7;
    const cameraY = targetY + distance * 0.5;
    const cameraZ = targetZ + distance * 0.7;

    // Update camera position and controls target
    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(targetX, targetY, targetZ);

    if (controlsRef.current) {
      controlsRef.current.target.set(targetX, targetY, targetZ);
      controlsRef.current.update();
    }
  }, [forceNodes, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      makeDefault
      minDistance={1}
      maxDistance={200}
    />
  );
}

/* ===================== Force Layout Component ===================== */

interface ForceNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  color: number;
  size: number;
  marketCap: number;
  radius: number; // Calculated sphere radius
  originalNode: VisualNode;
  vz?: number; // z-axis velocity for custom 3D force
}

interface ForceLink extends d3.SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
  originalEdge: VisualEdge;
}

function ForceLayout({
  nodes,
  edges,
  focusId,
  onClick,
  onEdgeClick,
  showLabels,
}: {
  nodes: VisualNode[];
  edges: VisualEdge[];
  focusId?: string;
  onClick?: (id: string) => void;
  onEdgeClick?: (e: VisualEdge) => void;
  showLabels?: boolean;
}) {
  const [forceNodes, setForceNodes] = useState<ForceNode[]>([]);
  const [forceLinks, setForceLinks] = useState<ForceLink[]>([]);
  const simulationRef = useRef<d3.Simulation<ForceNode, ForceLink> | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Initialize force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    // Extract market cap from node meta and calculate sphere scaling
    const marketCaps = nodes.map(node => 
      node.meta?.metric?.marketCap || node.meta?.metric?.revenue * 8 || 10000000
    );
    const minMarketCap = Math.min(...marketCaps);
    const maxMarketCap = Math.max(...marketCaps);
    
    // Create force nodes with market cap-based scaling
    const newForceNodes: ForceNode[] = nodes.map((node) => {
      const marketCap = node.meta?.metric?.marketCap || node.meta?.metric?.revenue * 8 || 10000000;
      
      // Logarithmic scaling for market cap (handles wide range better)
      const logMin = Math.log10(minMarketCap);
      const logMax = Math.log10(maxMarketCap);
      const logCurrent = Math.log10(marketCap);
      const normalizedMarketCap = (logCurrent - logMin) / (logMax - logMin);
      
      // Calculate sphere radius: smaller range for better visibility (0.8-2.0)
      const radius = 0.8 + normalizedMarketCap * 1.2;
      
      return {
        id: node.id,
        name: node.name,
        color: node.color,
        size: node.size,
        marketCap: marketCap,
        radius: radius,
        originalNode: node,
        x: (Math.random() - 0.5) * 5, // Much closer initial positions
        y: (Math.random() - 0.5) * 3,
        z: (Math.random() - 0.5) * 5,
      };
    });

    // Create force links
    const newForceLinks: ForceLink[] = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      originalEdge: edge,
    }));

    setForceNodes(newForceNodes);
    setForceLinks(newForceLinks);

    // Set up D3 force simulation with extremely tight clustering
    const simulation = d3
      .forceSimulation<ForceNode>(newForceNodes)
      .force('link', d3.forceLink<ForceNode, ForceLink>(newForceLinks).id(d => d.id).distance(0.5).strength(1.0))
      .force('charge', d3.forceManyBody().strength(-10).distanceMax(10))
      .force('center', d3.forceCenter(0, 0).strength(0.5)) // Stronger center pull
      .force('collision', d3.forceCollide().radius(d => d.radius * 1.01)) // Almost touching
      .force('x', d3.forceX(0).strength(0.1)) // Pull toward x=0
      .force('y', d3.forceY(0).strength(0.1)) // Pull toward y=0
      .alphaDecay(0.03) // Even faster settling
      .velocityDecay(0.6); // More damping for stability

    // Add market cap-based center force - much gentler pull
    simulation.force('marketCapCenter', () => {
      newForceNodes.forEach(node => {
        if (node.x != null && node.y != null) {
          // Much gentler center pull for larger companies
          const centerPullStrength = (node.marketCap / maxMarketCap) * 20;
          const dx = 0 - node.x;
          const dy = 0 - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = centerPullStrength / distance;
            node.vx = (node.vx || 0) + dx * force * 0.002;
            node.vy = (node.vy || 0) + dy * force * 0.002;
          }
        }
      });
    });

    // Add 3D positioning (z-coordinate) - custom z-centering force
    simulation.force('z', () => {
      newForceNodes.forEach(node => {
        if (node.z == null) node.z = 0;
        // Strong force toward z=0 plane
        const targetZ = 0;
        const force = (targetZ - node.z) * 0.1;
        node.vz = (node.vz || 0) + force;
        node.z += node.vz || 0;
        // Apply damping to z velocity
        if (node.vz) node.vz *= 0.6;
      });
    });

    // Add bounding force to keep outliers from drifting too far
    simulation.force('bounds', () => {
      const maxDistance = 8; // Maximum distance from center
      newForceNodes.forEach(node => {
        if (node.x != null && node.y != null && node.z != null) {
          const distance = Math.sqrt(node.x * node.x + node.y * node.y + node.z * node.z);
          if (distance > maxDistance) {
            const scale = maxDistance / distance;
            node.x *= scale;
            node.y *= scale;
            node.z *= scale;
          }
        }
      });
    });

    simulationRef.current = simulation;

    // Update positions on each tick
    simulation.on('tick', () => {
      setForceNodes([...newForceNodes]);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges]);

  // Handle dragging
  const handlePointerDown = useCallback((nodeId: string, event: any) => {
    event.stopPropagation();
    setDraggedNode(nodeId);
    if (simulationRef.current) {
      // Restart simulation when dragging
      simulationRef.current.alphaTarget(0.3).restart();
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    setDraggedNode(null);
    if (simulationRef.current) {
      // Let simulation settle
      simulationRef.current.alphaTarget(0);
    }
  }, []);

  // Update simulation during render loop
  useFrame(() => {
    if (simulationRef.current && simulationRef.current.alpha() > 0.005) {
      simulationRef.current.tick();
    }
  });

  // Build line positions for edges
  const linePositions = useMemo(() => {
    const points: number[] = [];
    const colors: number[] = [];
    
    // Debug logging
    console.log('Building lines for', forceLinks.length, 'links');
    
    forceLinks.forEach((link) => {
      const source = typeof link.source === 'string' ? 
        forceNodes.find(n => n.id === link.source) : link.source;
      const target = typeof link.target === 'string' ? 
        forceNodes.find(n => n.id === link.target) : link.target;
      
      if (source && target && source.x != null && source.y != null && target.x != null && target.y != null) {
        points.push(source.x, source.y || 0, source.z || 0);
        points.push(target.x, target.y || 0, target.z || 0);
        
        // Use bright cyan color for all lines to make them very visible
        colors.push(0, 1, 1); // Bright cyan
        colors.push(0, 1, 1); // Bright cyan
      }
    });
    
    console.log('Created', points.length / 6, 'line segments');
    
    return {
      positions: new Float32Array(points),
      colors: new Float32Array(colors),
    };
  }, [forceNodes, forceLinks]);

  return (
    <>
      {/* Camera control - center on largest entity */}
      <CameraController forceNodes={forceNodes} />
      
      {/* Render nodes */}
      {forceNodes.map((node) => {
        const color = new THREE.Color(node.color || 0x4488ff);
        
        return (
          <mesh
            key={node.id}
            position={[node.x || 0, node.y || 0, node.z || 0]}
            onPointerDown={(e) => handlePointerDown(node.id, e)}
            onPointerUp={handlePointerUp}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(node.id);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'default';
            }}
          >
            <sphereGeometry args={[node.radius, 32, 32]} />
            <meshStandardMaterial 
              color={color}
              metalness={0.3}
              roughness={0.4}
              emissive={color}
              emissiveIntensity={draggedNode === node.id ? 0.4 : 0.2}
            />
          </mesh>
        );
      })}

      {/* Render edges as individual Line components for proper thickness */}
      {forceLinks.map((link, idx) => {
        const source = typeof link.source === 'string' ? 
          forceNodes.find(n => n.id === link.source) : link.source;
        const target = typeof link.target === 'string' ? 
          forceNodes.find(n => n.id === link.target) : link.target;
        
        if (!source || !target || source.x == null || target.x == null) return null;
        
        const points: [number, number, number][] = [
          [source.x, source.y || 0, source.z || 0],
          [target.x, target.y || 0, target.z || 0]
        ];
        
        return (
          <Line
            key={`edge-${idx}`}
            points={points}
            color="#00ffff"  // Bright cyan
            lineWidth={3}
            opacity={0.8}
            transparent
          />
        );
      })}

      {/* Render labels */}
      {showLabels && forceNodes.map((node) => (
        <Html
          key={`lbl-${node.id}`}
          position={[node.x || 0, (node.y || 0) + node.radius + 0.5, node.z || 0]}
          center
        >
          <div 
            className="px-2 py-1 text-xs rounded bg-black/80 text-white border border-white/20 whitespace-nowrap"
            style={{ 
              fontSize: Math.max(10, Math.min(14, node.radius * 6)) + 'px' // Scale font with sphere size
            }}
          >
            {node.name}
          </div>
        </Html>
      ))}
    </>
  );
}

