import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

import socket, {
  connectDigitalTwin,
  disconnectDigitalTwin,
} from "../../services/socket";

function Wheel({ position }) {
  return (
    <mesh
      position={position}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    >
      <cylinderGeometry args={[0.35, 0.35, 0.22, 32]} />

      <meshStandardMaterial
        color="#1e293b"
        roughness={0.7}
      />
    </mesh>
  );
}

function RobotModel({ robotId = "MB-01" }) {
  const robotRef = useRef(null);
  const lightRef = useRef(null);

  // Target position received from backend
  const targetPosition = useRef({
    x: 0,
    y: 0,
    z: 0,
  });

  // ============================================================
  // SOCKET CONNECTION
  // ============================================================

  useEffect(() => {
    connectDigitalTwin();

    const handleRobotPosition = (data) => {
      console.log("Robot position received:", data);

      /*
       * Expected backend data:
       *
       * {
       *   robotId: "MB-01",
       *   position: {
       *     x: -2,
       *     y: 0,
       *     z: 1
       *   }
       * }
       */

      if (!data) return;

      // Ignore other robots
      if (
        data.robotId &&
        data.robotId !== robotId
      ) {
        return;
      }

      const position =
        data.position || data;

      if (
        typeof position.x !== "number" ||
        typeof position.z !== "number"
      ) {
        return;
      }

      targetPosition.current = {
        x: position.x,
        y: position.y ?? 0,
        z: position.z,
      };
    };

    socket.on(
      "robot:position",
      handleRobotPosition
    );

    return () => {
      socket.off(
        "robot:position",
        handleRobotPosition
      );

      disconnectDigitalTwin();
    };
  }, [robotId]);

  // ============================================================
  // ROBOT MOVEMENT
  // ============================================================

  useFrame((state, delta) => {
    const robot = robotRef.current;

    if (!robot) return;

    // ----------------------------------------------------------
    // Smooth movement
    // ----------------------------------------------------------

    const target = targetPosition.current;

    robot.position.x +=
      (target.x - robot.position.x) *
      Math.min(delta * 5, 1);

    robot.position.z +=
      (target.z - robot.position.z) *
      Math.min(delta * 5, 1);

    // Keep robot floating slightly above floor
    robot.position.y =
      0.8 +
      Math.sin(
        state.clock.getElapsedTime() * 1.5
      ) *
        0.03;

    // ----------------------------------------------------------
    // Rotate robot in movement direction
    // ----------------------------------------------------------

    const dx =
      target.x - robot.position.x;

    const dz =
      target.z - robot.position.z;

    const distance =
      Math.sqrt(dx * dx + dz * dz);

    if (distance > 0.05) {
      const targetRotation =
        Math.atan2(dx, dz);

      let rotationDifference =
        targetRotation -
        robot.rotation.y;

      // Keep rotation difference between -PI and PI
      rotationDifference =
        Math.atan2(
          Math.sin(rotationDifference),
          Math.cos(rotationDifference)
        );

      robot.rotation.y +=
        rotationDifference *
        Math.min(delta * 6, 1);
    }

    // ----------------------------------------------------------
    // Status light animation
    // ----------------------------------------------------------

    if (lightRef.current) {
      lightRef.current.intensity =
        2 +
        Math.sin(
          state.clock.getElapsedTime() * 5
        );
    }
  });

  // ============================================================
  // ROBOT MODEL
  // ============================================================

  return (
    <group
      ref={robotRef}
      position={[0, 0.8, 0]}
    >
      {/* ======================================================
          MAIN BODY
      ====================================================== */}

      <RoundedBox
        args={[3.2, 1.8, 2.2]}
        radius={0.25}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#e2e8f0"
          metalness={0.25}
          roughness={0.35}
        />
      </RoundedBox>

      {/* ======================================================
          TOP UNIT
      ====================================================== */}

      <RoundedBox
        args={[2.3, 0.55, 1.5]}
        radius={0.15}
        smoothness={4}
        position={[0, 1.15, 0]}
        castShadow
      >
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.15}
          roughness={0.3}
        />
      </RoundedBox>

      {/* ======================================================
          FRONT CAMERA
      ====================================================== */}

      <mesh
        position={[0, 1.15, 0.78]}
      >
        <cylinderGeometry
          args={[0.25, 0.25, 0.15, 32]}
        />

        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Camera lens */}

      <mesh
        position={[0, 1.15, 0.88]}
      >
        <sphereGeometry
          args={[0.12, 32, 32]}
        />

        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={2}
        />
      </mesh>

      {/* ======================================================
          STATUS LIGHT
      ====================================================== */}

      <pointLight
        ref={lightRef}
        position={[0, 1.65, 0]}
        color="#22c55e"
        intensity={3}
        distance={3}
      />

      <mesh
        position={[0, 1.65, 0]}
      >
        <sphereGeometry
          args={[0.09, 20, 20]}
        />

        <meshStandardMaterial
          color="#22c55e"
          emissive="#16a34a"
          emissiveIntensity={3}
        />
      </mesh>

      {/* ======================================================
          WASTE COMPARTMENTS
      ====================================================== */}

      <mesh
        position={[-0.85, 0.05, 1.12]}
      >
        <boxGeometry
          args={[1.2, 1.2, 0.12]}
        />

        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[0.85, 0.05, 1.12]}
      >
        <boxGeometry
          args={[1.2, 1.2, 0.12]}
        />

        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>

      {/* ======================================================
          WHEELS
      ====================================================== */}

      <Wheel
        position={[
          -1.25,
          -0.95,
          0.9,
        ]}
      />

      <Wheel
        position={[
          1.25,
          -0.95,
          0.9,
        ]}
      />

      <Wheel
        position={[
          -1.25,
          -0.95,
          -0.9,
        ]}
      />

      <Wheel
        position={[
          1.25,
          -0.95,
          -0.9,
        ]}
      />

      {/* ======================================================
          FRONT SENSOR
      ====================================================== */}

      <mesh
        position={[0, -0.25, 1.15]}
      >
        <boxGeometry
          args={[1.5, 0.25, 0.1]}
        />

        <meshStandardMaterial
          color="#334155"
          metalness={0.7}
        />
      </mesh>
    </group>
  );
}

export default RobotModel;
