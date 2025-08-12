'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

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

  const focusPos = useMemo(() => {
    if (!focusId) return new THREE.Vector3(0, 0, 0);
    const n = nodes.find((n) => n.id === focusId);
    return new THREE.Vector3(
      n?.position.x ?? 0,
      n?.position.y ?? 0,
      n?.position.z ?? 0,
    );
  }, [focusId, nodes]);

  return (
    <div className="h-[80vh] w-full rounded-2xl overflow-hidden border border-white/10">
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 50 }}>
        {/* Background & mood */}
        <color attach="background" args={['#0a0f1c']} />
        <fog attach="fog" args={['#0a0f1c', 3, 12]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#4a9eff" />
        <pointLight position={[-3, 3, -3]} intensity={0.8} color="#ff6b4a" />

        {/* Optional axes */}
        {background.axes && <Axes />}

        {/* Stars / nodes */}
        <Nodes nodes={nodes} focusId={focusId} onClick={onNodeClick} />

        {/* Edges */}
        <Edges nodes={nodes} edges={edges} onEdgeClick={onEdgeClick} />

        {/* Cluster halos (subtle volumetric spheres) */}
        {background.halos && <Halos nodes={nodes} />}

        {/* Labels (budget: top 250 in viewport) */}
        {showLabels && <Labels nodes={nodes} max={250} />}

        {/* Camera control */}
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          target={focusPos}
          makeDefault
        />
      </Canvas>
    </div>
  );
}

/* ===================== Nodes ===================== */

function Nodes({
  nodes,
  focusId,
  onClick,
}: {
  nodes: VisualNode[];
  focusId?: string;
  onClick?: (id: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length],
  );
  const glowArray = useMemo(
    () => new Float32Array(nodes.length),
    [nodes.length],
  );

  // Init transforms & colors
  useEffect(() => {
    if (!meshRef.current) return;
    nodes.forEach((n, i) => {
      const p = n.position;
      const baseSize = 0.06 + (n.size ?? 0) * 0.22; // world size scaling
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.set(baseSize, baseSize, baseSize);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      const col = new THREE.Color(n.color);
      colorArray.set([col.r, col.g, col.b], i * 3);
      glowArray[i] = n.glow ?? 0;
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      (meshRef.current.instanceColor as any).needsUpdate = true;
    }
  }, [nodes, colorArray, glowArray, dummy]);

  // Animate pulses & micro-drift
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    nodes.forEach((n, i) => {
      const p = n.position;
      const drift = n.drift ?? { x: 0, y: 0, z: 0 };
      const pulse = (n.glow ?? 0) * 0.18 * Math.sin(t * 2.2 + i * 0.37);
      const base = 0.06 + (n.size ?? 0) * 0.22;
      dummy.position.set(
        p.x + drift.x * Math.sin(t * 0.8),
        p.y + drift.y,
        p.z + drift.z * Math.cos(t * 0.8),
      );
      dummy.scale.setScalar(base + pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Raycast → which instance index?
  const onPointerDown = (e: any) => {
    e.stopPropagation();
    if (!onClick) return;
    const instanceId: number = e.instanceId;
    if (instanceId == null) return;
    onClick(nodes[instanceId].id);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onPointerDown={onPointerDown}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshPhongMaterial 
        vertexColors 
        toneMapped={false}
        emissive={0x223344}
        emissiveIntensity={0.2}
        shininess={100}
        specular={0x4488ff}
      />
    </instancedMesh>
  );
}

/* ===================== Edges ===================== */

function Edges({
  nodes,
  edges,
  onEdgeClick,
}: {
  nodes: VisualNode[];
  edges: VisualEdge[];
  onEdgeClick?: (e: VisualEdge) => void;
}) {
  const ref = useRef<THREE.LineSegments>(null!);

  // Map nodeId → index + position
  const posIndex = useMemo(
    () => new Map(nodes.map((n, i) => [n.id, { i, p: n.position }])),
    [nodes],
  );

  // Build position & color buffers
  const { positions, colors, alphas, dashArray } = useMemo(() => {
    const pos: number[] = [];
    const cols: number[] = [];
    const alphas: number[] = []; // use per-vertex alpha via shaderMaterial later if desired
    const dash: number[] = []; // store dash flags per segment (0/1)
    edges.forEach((e) => {
      const A = posIndex.get(e.source);
      const B = posIndex.get(e.target);
      if (!A || !B) return;
      pos.push(A.p.x, A.p.y, A.p.z, B.p.x, B.p.y, B.p.z);
      const c = new THREE.Color(e.color);
      // encode color twice (both vertices)
      cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
      // approximate thickness by opacity (browser lineWidth is limited)
      const opacity = THREE.MathUtils.clamp(
        0.25 + (e.thickness ?? 0) * 0.75,
        0.25,
        1.0,
      );
      alphas.push(opacity, opacity);
      dash.push(e.dashed ? 1 : 0, e.dashed ? 1 : 0);
    });
    return {
      positions: new Float32Array(pos),
      colors: new Float32Array(cols),
      alphas: new Float32Array(alphas),
      dashArray: new Float32Array(dash),
    };
  }, [edges, posIndex]);

  // Click handling via raycast → find segment index, map back to edge
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (!onEdgeClick || edges.length === 0) return;
    const segIndex = Math.floor(e.index! / 2); // two vertices per segment
    const edge = edges[segIndex];
    if (edge) onEdgeClick(edge);
  };

  // Simple dashed effect via shaderless trick: animate opacity flicker for dashed edges
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const mat = ref.current.material as THREE.LineBasicMaterial;
    // global flicker subtly indicates activity
    mat.opacity = 1.0;
    mat.needsUpdate = true;
  });

  return (
    <>
      <lineSegments ref={ref} onPointerDown={handlePointerDown}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        {/* NOTE: WebGL line width is effectively 1px in most browsers. We encode "thickness" as per-segment opacity + color emphasis.
                 For true thick lines, upgrade later to Line2 from three-stdlib or tubes. */}
        <lineBasicMaterial vertexColors transparent opacity={0.95} />
      </lineSegments>

      {/* Edge particles for directional/active edges */}
      <EdgeParticles nodes={nodes} edges={edges.filter((e) => e.particles)} />
    </>
  );
}

/* ===================== Edge Particles ===================== */

function EdgeParticles({
  nodes,
  edges,
}: {
  nodes: VisualNode[];
  edges: VisualEdge[];
}) {
  const posIndex = useMemo(
    () => new Map(nodes.map((n) => [n.id, n.position])),
    [nodes],
  );

  // Build a particle per edge (you can scale this up if needed)
  const particles = useMemo(() => {
    return edges
      .map((e, i) => {
        const a = posIndex.get(e.source);
        const b = posIndex.get(e.target);
        if (!a || !b) return null;
        return {
          start: new THREE.Vector3(a.x, a.y, a.z),
          end: new THREE.Vector3(b.x, b.y, b.z),
          color: new THREE.Color(e.color),
          speed: 0.25 + 0.75 * (e.thickness ?? 0), // thicker = faster
          id: i,
        };
      })
      .filter(Boolean) as {
      start: THREE.Vector3;
      end: THREE.Vector3;
      color: THREE.Color;
      speed: number;
      id: number;
    }[];
  }, [edges, posIndex]);

  const geomRef = useRef<THREE.BufferGeometry>(null!);
  const matRef = useRef<THREE.PointsMaterial>(null!);
  const positions = useMemo(
    () => new Float32Array((particles.length || 0) * 3),
    [particles.length],
  );
  const colors = useMemo(
    () => new Float32Array((particles.length || 0) * 3),
    [particles.length],
  );

  useEffect(() => {
    particles.forEach((p, i) => {
      positions.set([p.start.x, p.start.y, p.start.z], i * 3);
      colors.set([p.color.r, p.color.g, p.color.b], i * 3);
    });
    if (geomRef.current) {
      geomRef.current.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3),
      );
      geomRef.current.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3),
      );
    }
  }, [particles, positions, colors]);

  useFrame(({ clock }) => {
    if (!geomRef.current) return;

    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      // ping-pong along the edge
      const u = 0.5 * (1 + Math.sin(t * p.speed + i * 0.6));
      const x = THREE.MathUtils.lerp(p.start.x, p.end.x, u);
      const y = THREE.MathUtils.lerp(p.start.y, p.end.y, u);
      const z = THREE.MathUtils.lerp(p.start.z, p.end.z, u);
      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    });

    const positionAttribute = geomRef.current.getAttribute('position');
    if (positionAttribute) {
      (positionAttribute as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  if (particles.length === 0) return null;

  return (
    <points>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial
        ref={matRef}
        size={0.025}
        vertexColors
        depthWrite={false}
        transparent
        opacity={0.9}
      />
    </points>
  );
}

/* ===================== Halos & Labels & Axes ===================== */

function Halos({ nodes }: { nodes: VisualNode[] }) {
  // Create glowing halos around important nodes
  const ref = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={ref}>
      {nodes.slice(0, 30).map((n, i) => {
        const scale = 0.5 + (n.size ?? 0) * 1.2;
        const pulseOffset = i * 0.3;
        
        return (
          <group key={`halo-${n.id}`}>
            <mesh
              position={[n.position.x, n.position.y, n.position.z]}
              scale={[scale, scale, scale]}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial 
                color={n.color} 
                transparent 
                opacity={0.08}
                depthWrite={false}
              />
            </mesh>
            {/* Secondary glow ring */}
            {n.size > 0.5 && (
              <mesh
                position={[n.position.x, n.position.y, n.position.z]}
                scale={[scale * 1.3, scale * 1.3, scale * 1.3]}
              >
                <ringGeometry args={[0.8, 1, 32]} />
                <meshBasicMaterial 
                  color={n.color} 
                  transparent 
                  opacity={0.15}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Labels({ nodes, max = 200 }: { nodes: VisualNode[]; max?: number }) {
  const sorted = useMemo(
    () =>
      [...nodes].sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).slice(0, max),
    [nodes, max],
  );
  return (
    <>
      {sorted.map((n) => (
        <Html
          key={`lbl-${n.id}`}
          position={[
            n.position.x,
            n.position.y + (0.09 + n.size * 0.22),
            n.position.z,
          ]}
          center
          occlude
          transform
        >
          <div className="px-1.5 py-0.5 text-[10px] rounded bg-black/60 text-white border border-white/10 backdrop-blur">
            {n.name}
          </div>
        </Html>
      ))}
    </>
  );
}

function Axes() {
  return (
    <group>
      {/* X axis - red/orange gradient */}
      <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.003, 0.003, 1, 8]} />
        <meshBasicMaterial color={0xff4444} opacity={0.6} transparent />
      </mesh>
      <mesh position={[1, 0, 0]}>
        <coneGeometry args={[0.015, 0.05, 8]} />
        <meshBasicMaterial color={0xff6666} />
      </mesh>
      
      {/* Y axis - green/lime gradient */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 1, 8]} />
        <meshBasicMaterial color={0x44ff44} opacity={0.6} transparent />
      </mesh>
      <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.015, 0.05, 8]} />
        <meshBasicMaterial color={0x66ff66} />
      </mesh>
      
      {/* Z axis - blue/cyan gradient */}
      <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 1, 8]} />
        <meshBasicMaterial color={0x4444ff} opacity={0.6} transparent />
      </mesh>
      <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.015, 0.05, 8]} />
        <meshBasicMaterial color={0x6666ff} />
      </mesh>

      {/* Grid planes for reference */}
      <gridHelper args={[2, 20, 0x223344, 0x112233]} position={[0, -0.5, 0]} />
    </group>
  );
}
