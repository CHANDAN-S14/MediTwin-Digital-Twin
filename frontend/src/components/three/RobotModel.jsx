import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { useFrame } from "@react-three/fiber";

import { RoundedBox } from "@react-three/drei";

import socket, {
  connectDigitalTwin,
  disconnectDigitalTwin,
} from "../../services/socket";


// ============================================================
// DEFAULT ROBOT
// ============================================================

const DEFAULT_ROBOT_ID = "MEDI-001";


// ============================================================
// WHEEL
// ============================================================

function Wheel({ position }) {
  const wheelRef = useRef(null);

  useFrame((_, delta) => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z -= delta * 8;
    }
  });

  return (
    <mesh
      ref={wheelRef}
      position={position}
      rotation={[
        Math.PI / 2,
        0,
        0,
      ]}
      castShadow
    >
      <cylinderGeometry
        args={[
          0.35,
          0.35,
          0.22,
          32,
        ]}
      />

      <meshStandardMaterial
        color="#1e293b"
        roughness={0.7}
      />
    </mesh>
  );
}


// ============================================================
// ROBOT MODEL
// ============================================================

function RobotModel({
  robotId = DEFAULT_ROBOT_ID,
  autoMove = true,
}) {
  const robotRef = useRef(null);

  const lightRef = useRef(null);

  const movementRef = useRef({
    active: false,
    startTime: 0,
  });

  const [targetPosition, setTargetPosition] =
    useState({
      x: 0,
      y: 0.8,
      z: 0,
    });


  // ==========================================================
  // ROBOT ROUTE
  // ==========================================================

  /*
   * Demo route:
   *
   * Station
   *    ↓
   * Pickup location
   *    ↓
   * Correct waste bin
   *    ↓
   * Return to station
   *
   * You can change these coordinates according
   * to your Digital Twin scene.
   */

  const route = [
    {
      x: 0,
      y: 0.8,
      z: 0,
    },

    {
      x: 5,
      y: 0.8,
      z: 0,
    },

    {
      x: 5,
      y: 0.8,
      z: 5,
    },

    {
      x: -4,
      y: 0.8,
      z: 5,
    },

    {
      x: -4,
      y: 0.8,
      z: 0,
    },

    {
      x: 0,
      y: 0.8,
      z: 0,
    },
  ];


  // ==========================================================
  // SOCKET CONNECTION
  // ==========================================================

  useEffect(() => {
    connectDigitalTwin();

    // --------------------------------------------------------
    // RECEIVE ROBOT POSITION
    // --------------------------------------------------------

    const handlePosition = (data) => {
      console.log(
        "📍 ROBOT POSITION EVENT:",
        data
      );

      /*
       * Accept the configured robot ID.
       *
       * If backend doesn't send robotId,
       * still accept the position event.
       */

      if (
        data?.robotId &&
        String(data.robotId) !== String(robotId)
      ) {
        return;
      }

      if (!data?.position) {
        return;
      }

      const x = Number(data.position.x);
      const y = Number(data.position.y);
      const z = Number(data.position.z);

      if (
        !Number.isFinite(x) ||
        !Number.isFinite(z)
      ) {
        return;
      }

      setTargetPosition({
        x,
        y: Number.isFinite(y) ? y : 0.8,
        z,
      });

      // Backend is controlling movement
      movementRef.current.active = false;
    };


    // --------------------------------------------------------
    // COMMON ROBOT EVENTS
    // --------------------------------------------------------

    const handleRobotUpdate = (data) => {
      console.log(
        "🤖 ROBOT UPDATE:",
        data
      );

      if (
        data?.robotId &&
        String(data.robotId) !== String(robotId)
      ) {
        return;
      }

      if (data?.position) {
        handlePosition(data);
      }
    };


    socket.on(
      "robot:position",
      handlePosition
    );

    socket.on(
      "robot-position",
      handlePosition
    );

    socket.on(
      "robot:position:update",
      handlePosition
    );

    socket.on(
      "robot:update",
      handleRobotUpdate
    );

    socket.on(
      "robot:status",
      handleRobotUpdate
    );


    // --------------------------------------------------------
    // START AUTO DEMO MOVEMENT
    // --------------------------------------------------------

    if (autoMove) {
      movementRef.current.active = true;
      movementRef.current.startTime =
        performance.now();
    }


    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      socket.off(
        "robot:position",
        handlePosition
      );

      socket.off(
        "robot-position",
        handlePosition
      );

      socket.off(
        "robot:position:update",
        handlePosition
      );

      socket.off(
        "robot:update",
        handleRobotUpdate
      );

      socket.off(
        "robot:status",
        handleRobotUpdate
      );

      disconnectDigitalTwin();
    };
  }, [robotId, autoMove]);


  // ==========================================================
  // MOVEMENT
  // ==========================================================

  useFrame((state, delta) => {
    if (!robotRef.current) {
      return;
    }

    const robot = robotRef.current;


    // ========================================================
    // AUTO DEMO MOVEMENT
    // ========================================================

    if (
      autoMove &&
      movementRef.current.active
    ) {
      const elapsed =
        (performance.now() -
          movementRef.current.startTime) /
        1000;


      /*
       * Time spent at each route point.
       *
       * Increase this value for slower movement.
       */

      const segmentDuration = 3;


      const totalSegments =
        route.length - 1;


      const totalDuration =
        totalSegments *
        segmentDuration;


      /*
       * Loop the route continuously.
       */

      const currentTime =
        elapsed % totalDuration;


      const segmentFloat =
        currentTime /
        segmentDuration;


      const segmentIndex =
        Math.floor(segmentFloat);


      const progress =
        segmentFloat -
        segmentIndex;


      const start =
        route[segmentIndex];


      const end =
        route[
          Math.min(
            segmentIndex + 1,
            route.length - 1
          )
        ];


      // ------------------------------------------------------
      // INTERPOLATE X
      // ------------------------------------------------------

      const x =
        start.x +
        (end.x - start.x) *
          progress;


      // ------------------------------------------------------
      // INTERPOLATE Z
      // ------------------------------------------------------

      const z =
        start.z +
        (end.z - start.z) *
          progress;


      // ------------------------------------------------------
      // UPDATE TARGET
      // ------------------------------------------------------

      setTargetPosition({
        x,
        y: 0.8,
        z,
      });
    }


    // ========================================================
    // SMOOTH MOVEMENT
    // ========================================================

    const movementSpeed =
      Math.min(
        delta * 4,
        1
      );


    robot.position.x +=
      (
        targetPosition.x -
        robot.position.x
      ) *
      movementSpeed;


    robot.position.z +=
      (
        targetPosition.z -
        robot.position.z
      ) *
      movementSpeed;


    // ========================================================
    // FLOATING EFFECT
    // ========================================================

    robot.position.y =
      targetPosition.y +
      Math.sin(
        state.clock.getElapsedTime() *
          2
      ) *
      0.03;


    // ========================================================
    // ROBOT ROTATION
    // ========================================================

    const dx =
      targetPosition.x -
      robot.position.x;

    const dz =
      targetPosition.z -
      robot.position.z;


    if (
      Math.abs(dx) +
        Math.abs(dz) >
      0.01
    ) {
      const targetRotation =
        Math.atan2(
          dx,
          dz
        );


      let rotationDifference =
        targetRotation -
        robot.rotation.y;


      while (
        rotationDifference >
        Math.PI
      ) {
        rotationDifference -=
          Math.PI * 2;
      }


      while (
        rotationDifference <
        -Math.PI
      ) {
        rotationDifference +=
          Math.PI * 2;
      }


      robot.rotation.y +=
        rotationDifference *
        Math.min(
          delta * 5,
          1
        );
    }


    // ========================================================
    // STATUS LIGHT
    // ========================================================

    if (lightRef.current) {
      lightRef.current.intensity =
        2 +
        Math.sin(
          state.clock.getElapsedTime() *
            5
        );
    }
  });


  // ==========================================================
  // ROBOT UI
  // ==========================================================

  return (
    <group
      ref={robotRef}
      position={[
        0,
        0.8,
        0,
      ]}
    >

      {/* ====================================================
          MAIN BODY
      ==================================================== */}

      <RoundedBox
        args={[
          3.2,
          1.8,
          2.2,
        ]}
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


      {/* ====================================================
          TOP UNIT
      ==================================================== */}

      <RoundedBox
        args={[
          2.3,
          0.55,
          1.5,
        ]}
        radius={0.15}
        smoothness={4}
        position={[
          0,
          1.15,
          0,
        ]}
        castShadow
      >
        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.15}
          roughness={0.3}
        />
      </RoundedBox>


      {/* ====================================================
          CAMERA
      ==================================================== */}

      <mesh
        position={[
          0,
          1.15,
          0.78,
        ]}
      >
        <cylinderGeometry
          args={[
            0.25,
            0.25,
            0.15,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>


      <mesh
        position={[
          0,
          1.15,
          0.88,
        ]}
      >
        <sphereGeometry
          args={[
            0.12,
            32,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={2}
        />
      </mesh>


      {/* ====================================================
          STATUS LIGHT
      ==================================================== */}

      <pointLight
        ref={lightRef}
        position={[
          0,
          1.65,
          0,
        ]}
        color="#22c55e"
        intensity={3}
        distance={3}
      />


      <mesh
        position={[
          0,
          1.65,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            0.09,
            20,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#22c55e"
          emissive="#16a34a"
          emissiveIntensity={3}
        />
      </mesh>


      {/* ====================================================
          WASTE COMPARTMENTS
      ==================================================== */}

      <mesh
        position={[
          -0.85,
          0.05,
          1.12,
        ]}
      >
        <boxGeometry
          args={[
            1.2,
            1.2,
            0.12,
          ]}
        />

        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>


      <mesh
        position={[
          0.85,
          0.05,
          1.12,
        ]}
      >
        <boxGeometry
          args={[
            1.2,
            1.2,
            0.12,
          ]}
        />

        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.3}
          roughness={0.3}
        />
      </mesh>


      {/* ====================================================
          WHEELS
      ==================================================== */}

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


      {/* ====================================================
          FRONT SENSOR
      ==================================================== */}

      <mesh
        position={[
          0,
          -0.25,
          1.15,
        ]}
      >
        <boxGeometry
          args={[
            1.5,
            0.25,
            0.1,
          ]}
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
