import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  PerspectiveCamera,
} from '@react-three/drei';

import RobotModel from './RobotModel';

function Viewport() {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-slate-950">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[6, 4, 7]}
          fov={45}
        />

        {/* Lighting */}
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[5, 8, 5]}
          intensity={3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <pointLight
          position={[-5, 3, -5]}
          intensity={2}
        />

        {/* Floor Grid */}
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={2}
          sectionThickness={1}
          sectionColor="#64748b"
          fadeDistance={20}
          infiniteGrid
        />

        {/* Robot */}
        <RobotModel />

        {/* Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={15}
          target={[0, 1, 0]}
        />
      </Canvas>
    </div>
  );
}

export default Viewport;
