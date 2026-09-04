import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Text,
  Float,
} from '@react-three/drei';

import socket, {
  connectDigitalTwin,
} from '../services/socket.js';

const ROBOT_ID = 'MEDI-001';

const BIN_CONFIG = {
  yellow: {
    label: 'YELLOW',
    position: [-7, 0.75, -7],
  },

  red: {
    label: 'RED',
    position: [0, 0.75, -7],
  },

  blue: {
    label: 'BLUE',
    position: [7, 0.75, -7],
  },

  general: {
    label: 'GENERAL',
    position: [7, 0.75, 7],
  },
};

const ROBOT_COLORS = {
  IDLE: '#22c55e',
  DISPATCHED: '#3b82f6',
  MOVING_TO_PICKUP: '#3b82f6',
  ARRIVED_AT_PICKUP: '#f59e0b',
  COLLECTING: '#eab308',
  MOVING_TO_BIN: '#a855f7',
  DEPOSITING: '#ef4444',
  RETURNING: '#06b6d4',
  STOPPED: '#dc2626',
};

function Floor() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.05, 0]}
      >
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>

      <Grid
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.4}
        sectionSize={4}
        sectionThickness={1}
        fadeDistance={30}
        infiniteGrid={false}
      />
    </group>
  );
}

function ChargingStation() {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[3, 0.3, 2.5]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      <mesh position={[0, 1.5, -1]}>
        <boxGeometry args={[2.5, 3, 0.2]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>

      <Text
        position={[0, 3.3, -1]}
        fontSize={0.45}
        color="#111827"
        anchorX="center"
      >
        CHARGING
      </Text>
    </group>
  );
}

function Bin({ category, position }) {
  const color =
    category === 'yellow'
      ? '#eab308'
      : category === 'red'
        ? '#ef4444'
        : category === 'blue'
          ? '#3b82f6'
          : '#6b7280';

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2.15, 0.15, 2.15]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <Text
        position={[0, 1.8, 0]}
        fontSize={0.38}
        color="#111827"
        anchorX="center"
      >
        {BIN_CONFIG[category].label}
      </Text>
    </group>
  );
}

function Department({ name, position }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[2.8, 1.8, 2]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>

      <Text
        position={[0, 1.25, 1.05]}
        fontSize={0.35}
        color="#111827"
        anchorX="center"
      >
        {name}
      </Text>
    </group>
  );
}

function WasteObject({ visible, position }) {
  if (!visible) return null;

  return (
    <Float
      speed={3}
      rotationIntensity={0.3}
    >
      <mesh position={position}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>
    </Float>
  );
}

function Robot({ position, status }) {
  const color =
    ROBOT_COLORS[status] ||
    ROBOT_COLORS.IDLE;

  return (
    <group
      position={[
        Number(position?.x) || 0,
        0.6,
        Number(position?.z) || 0,
      ]}
    >
      {/* ROBOT BODY */}
      <mesh>
        <boxGeometry args={[1.2, 0.7, 1.4]} />

        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      {/* TOP UNIT */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry
          args={[0.4, 0.4, 0.25, 24]}
        />

        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* LEFT WHEEL */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[-0.65, -0.3, 0]}
      >
        <cylinderGeometry
          args={[0.25, 0.25, 0.25, 20]}
        />

        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* RIGHT WHEEL */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0.65, -0.3, 0]}
      >
        <cylinderGeometry
          args={[0.25, 0.25, 0.25, 20]}
        />

        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* ROBOT ID */}
      <Text
        position={[0, 1.25, 0]}
        fontSize={0.35}
        color="#111827"
        anchorX="center"
      >
        {ROBOT_ID}
      </Text>
    </group>
  );
}

function Scene({
  robot,
  wasteVisible,
  wastePosition,
}) {
  return (
    <>
      <ambientLight intensity={1.5} />

      <directionalLight
        position={[10, 15, 10]}
        intensity={2}
      />

      <Floor />

      <ChargingStation />

      {/* DEPARTMENTS */}

      <Department
        name="OT"
        position={[-7, 0.9, 3]}
      />

      <Department
        name="ICU"
        position={[-6, 0.9, -4]}
      />

      <Department
        name="WARD"
        position={[7, 0.9, -3]}
      />

      <Department
        name="GENERAL"
        position={[0, 0.9, 7]}
      />

      {/* WASTE BINS */}

      <Bin
        category="yellow"
        position={BIN_CONFIG.yellow.position}
      />

      <Bin
        category="red"
        position={BIN_CONFIG.red.position}
      />

      <Bin
        category="blue"
        position={BIN_CONFIG.blue.position}
      />

      <Bin
        category="general"
        position={BIN_CONFIG.general.position}
      />

      {/* WASTE */}

      <WasteObject
        visible={wasteVisible}
        position={wastePosition}
      />

      {/* ROBOT */}

      <Robot
        position={robot.position}
        status={robot.status}
      />

      <OrbitControls />
    </>
  );
}

export default function DigitalTwin() {
  const [robot, setRobot] = useState({
    robotId: ROBOT_ID,

    status: 'IDLE',

    position: {
      x: 0,
      y: 0,
      z: 0,
    },

    currentLocation: 'Charging Station',

    targetLocation: null,

    targetBin: null,

    lastActivity: 'Waiting for task',
  });

  const [waste, setWaste] = useState({
    visible: false,

    category: 'general',

    position: {
      x: 0,
      y: 0.5,
      z: 0,
    },
  });

  /*
   * ============================================================
   * SOCKET CONNECTION
   * ============================================================
   */

 useEffect(() => {
  console.log("🌐 Digital Twin component mounted");

  const handleStatus = (data) => {
    console.log(
      "🤖 ROBOT STATUS:",
      data
    );

    if (data?.robotId !== ROBOT_ID) {
      return;
    }

    setRobot((previous) => ({
      ...previous,
      ...data,
      robotId: ROBOT_ID,
    }));

    if (
      data.status === "ARRIVED_AT_PICKUP"
    ) {
      setWaste((previous) => ({
        ...previous,
        visible: true,
      }));
    }

    if (
      data.status === "COLLECTING"
    ) {
      setWaste((previous) => ({
        ...previous,
        visible: false,
      }));
    }
  };

  const handlePosition = (data) => {
    console.log(
      "📍 ROBOT POSITION:",
      data
    );

    if (data?.robotId !== ROBOT_ID) {
      return;
    }

    if (!data?.position) {
      return;
    }

    setRobot((previous) => ({
      ...previous,

      position: {
        x: Number(data.position.x) || 0,
        y: Number(data.position.y) || 0,
        z: Number(data.position.z) || 0,
      },
    }));
  };

  const handleWasteCollected = (data) => {
    console.log(
      "♻️ WASTE COLLECTED:",
      data
    );

    if (data?.robotId !== ROBOT_ID) {
      return;
    }

    setWaste((previous) => ({
      ...previous,
      visible: false,
    }));
  };

  const handleWasteDeposited = (data) => {
    console.log(
      "🗑️ WASTE DEPOSITED:",
      data
    );

    if (data?.robotId !== ROBOT_ID) {
      return;
    }

    setWaste((previous) => ({
      ...previous,
      visible: false,
    }));
  };

  // REGISTER LISTENERS FIRST

  socket.on(
    "robot:status",
    handleStatus
  );

  socket.on(
    "robot:position",
    handlePosition
  );

  socket.on(
    "waste:collected",
    handleWasteCollected
  );

  socket.on(
    "waste:deposited",
    handleWasteDeposited
  );

  // CONNECT AFTER LISTENERS ARE READY

  connectDigitalTwin();

  return () => {
    console.log(
      "🔌 Cleaning Digital Twin socket listeners"
    );

    socket.off(
      "robot:status",
      handleStatus
    );

    socket.off(
      "robot:position",
      handlePosition
    );

    socket.off(
      "waste:collected",
      handleWasteCollected
    );

    socket.off(
      "waste:deposited",
      handleWasteDeposited
    );
  };
}, []);

  /*
   * ============================================================
   * WASTE POSITION
   * ============================================================
   */

  const wastePosition = useMemo(() => {
    const target =
      robot.targetLocation;

    /*
     * Backend may return:
     * "OT"
     * "ICU"
     * "WARD"
     * "GENERAL"
     */

    if (
      target === 'OT' ||
      target === 'Moving to OT'
    ) {
      return [-7, 0.6, 3];
    }

    if (
      target === 'ICU' ||
      target === 'Moving to ICU'
    ) {
      return [-6, 0.6, -4];
    }

    if (
      target === 'WARD' ||
      target === 'Moving to WARD'
    ) {
      return [7, 0.6, -3];
    }

    return [0, 0.6, 7];
  }, [
    robot.targetLocation,
  ]);

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="w-full h-screen bg-slate-950 text-white">

      {/* TOP INFORMATION */}

      <div
        className="
          absolute
          z-10
          top-[100px]
          left-4
          right-4
          gap-6
          flex
          justify-center
          pointer-events-none
        "
      >

        {/* ROBOT STATUS */}

        <div
          className="
            bg-white/95
            text-slate-900
            rounded-xl
            px-5
            py-4
            shadow-xl
            pointer-events-auto
          "
        >

          <h1 className="text-xl font-bold">
            MediTwin Digital Twin
          </h1>

          <p className="text-sm mt-1">
            Robot:{' '}
            <b>
              {robot.robotId}
            </b>
          </p>

          <p className="text-sm">
            Status:{' '}

            <b
              style={{
                color:
                  ROBOT_COLORS[
                    robot.status
                  ] ||
                  '#111827',
              }}
            >
              {robot.status}
            </b>
          </p>

          <p className="text-sm">
            Activity:{' '}
            {robot.lastActivity ||
              'Waiting for task'}
          </p>

          {robot.targetLocation && (
            <p className="text-sm">
              Target:{' '}
              <b>
                {robot.targetLocation}
              </b>
            </p>
          )}

          {robot.targetBin && (
            <p className="text-sm">
              Target bin:{' '}

              <b>
                {String(
                  robot.targetBin
                ).toUpperCase()}
              </b>
            </p>
          )}
        </div>

        {/* ROBOT STATES */}

        <div
          className="
            bg-white/95
            text-slate-900
            rounded-xl
            px-5
            py-4
            shadow-xl
            pointer-events-auto
          "
        >
          <p className="font-semibold mb-2">
            Robot states
          </p>

          <div
            className="
              grid
              grid-cols-2
              gap-x-4
              gap-y-1
              text-xs
            "
          >
            <span>
              🟢 IDLE
            </span>

            <span>
              🔵 MOVING
            </span>

            <span>
              🟡 COLLECTING
            </span>

            <span>
              🟣 TO BIN
            </span>

            <span>
              🔴 DEPOSITING
            </span>

            <span>
              🔷 RETURNING
            </span>
          </div>
        </div>
      </div>

      {/* THREE.JS */}

      <Canvas
        camera={{
          position: [
            16,
            14,
            16,
          ],

          fov: 45,
        }}
      >
        <Scene
          robot={robot}
          wasteVisible={
            waste.visible
          }
          wastePosition={
            wastePosition
          }
        />
      </Canvas>
    </div>
  );
}
