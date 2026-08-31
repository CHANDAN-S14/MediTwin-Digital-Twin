import React, {
  useRef,
} from 'react';

import {
  useFrame,
} from '@react-three/fiber';

import {
  RoundedBox,
} from '@react-three/drei';


function Wheel({ position }) {
  return (
    <mesh
      position={position}
      rotation={[Math.PI / 2, 0, 0]}
      castShadow
    >
      <cylinderGeometry
        args={[0.35, 0.35, 0.22, 32]}
      />

      <meshStandardMaterial
        color="#1e293b"
        roughness={0.7}
      />
    </mesh>
  );
}


function RobotModel() {

  const robotRef =
    useRef(null);

  const lightRef =
    useRef(null);


  useFrame((state) => {

    const time =
      state.clock.getElapsedTime();

    if (robotRef.current) {

      robotRef.current.position.y =
        Math.sin(time * 1.5) * 0.03;
    }

    if (lightRef.current) {

      lightRef.current.intensity =
        2 +
        Math.sin(time * 5) * 1;
    }

  });


  return (

    <group
      ref={robotRef}
      position={[0, 0.8, 0]}
    >

      {/* ========================= */}
      {/* MAIN ROBOT BODY */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* TOP UNIT */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* FRONT CAMERA */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* STATUS LIGHT */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* WASTE COMPARTMENTS */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* LEFT WHEELS */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* RIGHT WHEELS */}
      {/* ========================= */}

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


      {/* ========================= */}
      {/* FRONT SENSOR */}
      {/* ========================= */}

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