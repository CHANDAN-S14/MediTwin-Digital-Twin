import React from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Text,
  Float,
  
} from '@react-three/drei';

/* ============================================================
   DEPARTMENT CONFIG
============================================================ */

const DEPARTMENTS = [
  {
    name: 'OT',
    subtitle: 'Operation Theatre',
    position: [-7, 0, -5],
    color: '#3b82f6',
    icon: '⚕',
  },
  {
    name: 'ICU',
    subtitle: 'Intensive Care Unit',
    position: [-2.3, 0, -5],
    color: '#8b5cf6',
    icon: '♥',
  },
  {
    name: 'EMERGENCY',
    subtitle: 'Emergency Department',
    position: [2.3, 0, -5],
    color: '#ef4444',
    icon: '+',
  },
  {
    name: 'WARD',
    subtitle: 'Patient Ward',
    position: [7, 0, -5],
    color: '#f59e0b',
    icon: '▣',
  },
  {
    name: 'LABORATORY',
    subtitle: 'Diagnostic Laboratory',
    position: [-5.5, 0, 0],
    color: '#a855f7',
    icon: '⚗',
  },
  {
    name: 'PHARMACY',
    subtitle: 'Pharmacy',
    position: [0, 0, 0],
    color: '#06b6d4',
    icon: '✚',
  },
  {
    name: 'GENERAL',
    subtitle: 'General Services',
    position: [5.5, 0, 0],
    color: '#64748b',
    icon: '▦',
  },
];

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  floor: '#f8fafc',
  road: '#e2e8f0',
  roadLine: '#cbd5e1',
  wall: '#ffffff',
  roof: '#cbd5e1',
  glass: '#dbeafe',
};

/* ============================================================
   FLOOR
============================================================ */

function Floor() {
  return (
    <group>
      {/* Main floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        receiveShadow
      >
        <planeGeometry args={[25, 18]} />

        <meshStandardMaterial
          color={COLORS.floor}
          roughness={0.85}
        />
      </mesh>

      {/* Grid */}
      <Grid
        args={[25, 18]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.35}
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#94a3b8"
        cellColor="#dbeafe"
        fadeDistance={30}
        infiniteGrid={false}
      />

      {/* Main horizontal corridor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, -1.8]}
      >
        <planeGeometry args={[23, 2.4]} />

        <meshStandardMaterial
          color={COLORS.road}
          roughness={0.9}
        />
      </mesh>

      {/* Main vertical corridor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
      >
        <planeGeometry args={[2.4, 17]} />

        <meshStandardMaterial
          color={COLORS.road}
          roughness={0.9}
        />
      </mesh>

      {/* Horizontal corridor center line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.025, -1.8]}
      >
        <planeGeometry args={[21, 0.04]} />

        <meshStandardMaterial
          color={COLORS.roadLine}
        />
      </mesh>

      {/* Vertical corridor center line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
      >
        <planeGeometry args={[0.04, 15]} />

        <meshStandardMaterial
          color={COLORS.roadLine}
        />
      </mesh>
    </group>
  );
}

/* ============================================================
   DEPARTMENT BUILDING
============================================================ */

function Department({
  name,
  subtitle,
  position,
  color,
  icon,
}) {
  return (
    <group position={position}>
      {/* Floor marker */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 0]}
      >
        <planeGeometry args={[3.8, 3]} />

        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Main building */}
      <mesh
        position={[0, 1, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[3.5, 2, 2.7]} />

        <meshStandardMaterial
          color={COLORS.wall}
          roughness={0.7}
        />
      </mesh>

      {/* Colored front panel */}
      <mesh position={[0, 1, 1.37]}>
        <boxGeometry args={[3.15, 1.55, 0.08]} />

        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.16}
        />
      </mesh>

      {/* Roof */}
      <mesh
        position={[0, 2.08, 0]}
        castShadow
      >
        <boxGeometry args={[3.75, 0.18, 2.95]} />

        <meshStandardMaterial
          color={color}
          roughness={0.45}
        />
      </mesh>

      {/* Entrance */}
      <mesh position={[0, 0.62, 1.41]}>
        <boxGeometry args={[0.65, 1.15, 0.1]} />

        <meshStandardMaterial
          color="#334155"
        />
      </mesh>

      {/* Door glass */}
      <mesh position={[0, 0.7, 1.47]}>
        <boxGeometry args={[0.45, 0.85, 0.03]} />

        <meshStandardMaterial
          color={COLORS.glass}
          transparent
          opacity={0.8}
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>

      {/* Department icon */}
      <Float
        speed={2}
        rotationIntensity={0.05}
        floatIntensity={0.12}
      >
        <Text
          position={[0, 2.75, 0]}
          fontSize={0.55}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {icon}
        </Text>
      </Float>

      {/* Department name */}
      <Text
        position={[0, 3.25, 0]}
        fontSize={0.34}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        {name}
      </Text>

      {/* Subtitle */}
      <Text
        position={[0, 2.95, 0]}
        fontSize={0.17}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>

      {/* Status light */}
      <mesh position={[1.35, 2.35, 1.2]}>
        <sphereGeometry args={[0.09, 16, 16]} />

        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  );
}

/* ============================================================
   WASTE ROOM
============================================================ */

function WasteRoom() {
  return (
    <group position={[6.8, 0, 3.8]}>
      <mesh
        position={[0, 1, 0]}
        castShadow
      >
        <boxGeometry args={[4, 2, 2.8]} />

        <meshStandardMaterial
          color="#ecfdf5"
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, 2.08, 0]}>
        <boxGeometry args={[4.2, 0.18, 3]} />

        <meshStandardMaterial
          color="#10b981"
          roughness={0.4}
        />
      </mesh>

      <mesh position={[0, 0.65, 1.42]}>
        <boxGeometry args={[0.75, 1.25, 0.08]} />

        <meshStandardMaterial
          color="#334155"
        />
      </mesh>

      <Float
        speed={2}
        floatIntensity={0.12}
      >
        <Text
          position={[0, 2.8, 0]}
          fontSize={0.48}
          color="#059669"
          anchorX="center"
        >
          ♻
        </Text>
      </Float>

      <Text
        position={[0, 3.25, 0]}
        fontSize={0.36}
        color="#064e3b"
        anchorX="center"
      >
        WASTE ROOM
      </Text>

      <Text
        position={[0, 2.95, 0]}
        fontSize={0.18}
        color="#64748b"
        anchorX="center"
      >
        Waste Management
      </Text>
    </group>
  );
}

/* ============================================================
   CHARGING STATION
============================================================ */

function ChargingStation() {
  return (
    <group position={[0, 0, 6.5]}>
      {/* Platform */}
      <mesh
        position={[0, 0.15, 0]}
        castShadow
      >
        <boxGeometry args={[4.5, 0.3, 2.8]} />

        <meshStandardMaterial
          color="#334155"
          roughness={0.5}
        />
      </mesh>

      {/* Back wall */}
      <mesh
        position={[0, 1.7, -1]}
        castShadow
      >
        <boxGeometry args={[3.5, 3.4, 0.2]} />

        <meshStandardMaterial
          color="#64748b"
        />
      </mesh>

      {/* Charging panel */}
      <mesh position={[0, 1.8, -0.85]}>
        <boxGeometry args={[1.6, 1.2, 0.08]} />

        <meshStandardMaterial
          color="#0f172a"
        />
      </mesh>

      {/* Charging light */}
      <mesh position={[0, 2.2, -0.79]}>
        <sphereGeometry args={[0.14, 20, 20]} />

        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={2}
        />
      </mesh>

      <Float
        speed={2}
        floatIntensity={0.12}
      >
        <Text
          position={[0, 3.45, -0.7]}
          fontSize={0.42}
          color="#0f172a"
          anchorX="center"
        >
          ⚡ CHARGING STATION
        </Text>
      </Float>

      <Text
        position={[0, 3.05, -0.7]}
        fontSize={0.2}
        color="#64748b"
        anchorX="center"
      >
        Robot Home Base
      </Text>
    </group>
  );
}

/* ============================================================
   CENTRAL INFORMATION HUB
============================================================ */

function InformationHub() {
  return (
    <group position={[0, 0, -2]}>
      {/* Platform */}
      <mesh
        position={[0, 0.18, 0]}
        castShadow
      >
        <cylinderGeometry args={[1.5, 1.5, 0.35, 32]} />

        <meshStandardMaterial
          color="#1e293b"
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* Center pillar */}
      <mesh
        position={[0, 1.4, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.65, 0.8, 2.5, 32]} />

        <meshStandardMaterial
          color="#e2e8f0"
          roughness={0.4}
        />
      </mesh>

      {/* Top ring */}
      <mesh position={[0, 2.7, 0]}>
        <torusGeometry args={[0.55, 0.08, 16, 32]} />

        <meshStandardMaterial
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.8}
        />
      </mesh>

      <Text
        position={[0, 3.35, 0]}
        fontSize={0.3}
        color="#0f172a"
        anchorX="center"
      >
        HOSPITAL HUB
      </Text>
    </group>
  );
}

/* ============================================================
   DECORATIVE LIGHTS
============================================================ */

function AmbientMarkers() {
  const markers = [
    [-10, 0.15, -1.8],
    [10, 0.15, -1.8],
    [-3, 0.15, -1.8],
    [3, 0.15, -1.8],
  ];

  return (
    <>
      {markers.map((position, index) => (
        <Float
          key={index}
          speed={1.5 + index * 0.2}
          floatIntensity={0.08}
        >
          <mesh position={position}>
            <sphereGeometry args={[0.07, 12, 12]} />

            <meshStandardMaterial
              color="#38bdf8"
              emissive="#38bdf8"
              emissiveIntensity={1.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

/* ============================================================
   SCENE
============================================================ */

function HospitalScene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={2} />

      <directionalLight
        position={[8, 15, 10]}
        intensity={3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <directionalLight
        position={[-10, 8, -10]}
        intensity={1.2}
      />

      

      {/* Hospital floor */}
      <Floor />

      {/* Departments */}
      {DEPARTMENTS.map((department) => (
        <Department
          key={department.name}
          {...department}
        />
      ))}

      {/* Waste management */}
      <WasteRoom />

      {/* Robot charging area */}
      <ChargingStation />

      {/* Central hub */}
      <InformationHub />

      {/* Decorative elements */}
      <AmbientMarkers />

      {/* Camera */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={12}
        maxDistance={32}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </>
  );
}

/* ============================================================
   HOSPITAL MAP PAGE
============================================================ */

export default function HospitalMap() {
  return (
    <div className="w-full h-screen bg-slate-950 relative overflow-hidden">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="absolute z-20 top-0 left-0 right-0 px-8 py-5 bg-white/95 backdrop-blur-md border-b border-slate-200">

        <div className="flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hospital Map
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              3D hospital layout, departments and facilities
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">

            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />

            <span className="text-sm font-semibold text-emerald-700">
              MAP LIVE
            </span>

            <span className="text-slate-400">
              ◉
            </span>

          </div>

        </div>
      </div>

      {/* ======================================================
          INFORMATION CARD
      ====================================================== */}

      <div className="absolute z-20 left-6 bottom-6">

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 px-5 py-4">

          <h2 className="font-bold text-slate-900">
            Hospital Facilities
          </h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs text-slate-600">

            <div>
              🏥 7 Departments
            </div>

            <div>
              ♻ Waste Room
            </div>

            <div>
              ⚡ Charging Station
            </div>

            <div>
              ◉ Central Hub
            </div>

          </div>

          <p className="text-[11px] text-slate-400 mt-3">
            Drag to rotate • Scroll to zoom • Right click to pan
          </p>

        </div>
      </div>

      {/* ======================================================
          3D CANVAS
      ====================================================== */}

      <Canvas
        shadows
        camera={{
          position: [18, 17, 20],
          fov: 48,
        }}
        gl={{
          antialias: true,
        }}
      >
        <HospitalScene />
      </Canvas>

    </div>
  );
}
