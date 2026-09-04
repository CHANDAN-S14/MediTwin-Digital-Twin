import React, { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Grid,
  PerspectiveCamera,
} from "@react-three/drei";
import { useLocation, useNavigate } from "react-router-dom";

import RobotModel from "./Robotmodel";

const ROUTE = [
  {
    name: "Charging Station",
    position: { x: 0, y: 0.8, z: 0 },
    status: "READY",
  },
  {
    name: "Waste Pickup",
    position: { x: 5, y: 0.8, z: 0 },
    status: "MOVING_TO_PICKUP",
  },
  {
    name: "Waste Collected",
    position: { x: 5, y: 0.8, z: 4 },
    status: "COLLECTING",
  },
  {
    name: "Correct Waste Bin",
    position: { x: -5, y: 0.8, z: 4 },
    status: "MOVING_TO_BIN",
  },
  {
    name: "Waste Deposited",
    position: { x: -5, y: 0.8, z: -4 },
    status: "DEPOSITING",
  },
  {
    name: "Charging Station",
    position: { x: 0, y: 0.8, z: 0 },
    status: "RETURNING",
  },
];

function Ground() {
  return (
    <>
      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#cbd5e1"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#94a3b8"
        fadeDistance={35}
        fadeStrength={1}
        infiniteGrid
      />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.2, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </>
  );
}

function LocationMarker({ position, color = "#22c55e", label }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1}
        />
      </mesh>

      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[1.5, 0.3, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export default function DigitalTwin() {
  const location = useLocation();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);

  const [robotPosition, setRobotPosition] = useState({
    x: 0,
    y: 0.8,
    z: 0,
  });

  const [currentStep, setCurrentStep] = useState(0);

  const [simulationRunning, setSimulationRunning] = useState(false);

  const [status, setStatus] = useState("READY");

  const [completed, setCompleted] = useState(false);

  // ---------------------------------------------------------
  // LOAD TASK
  // ---------------------------------------------------------

  useEffect(() => {
    let loadedTask = location.state?.task;

    if (!loadedTask) {
      try {
        const savedTask = sessionStorage.getItem(
          "meditwin.digitalTwinTask"
        );

        if (savedTask) {
          loadedTask = JSON.parse(savedTask);
        }
      } catch (error) {
        console.error("Unable to load saved task:", error);
      }
    }

    if (loadedTask) {
      setTask(loadedTask);
    }
  }, [location.state]);

  // ---------------------------------------------------------
  // START SIMULATION
  // ---------------------------------------------------------

  const startSimulation = () => {
    if (simulationRunning) return;

    setSimulationRunning(true);
    setCompleted(false);
    setCurrentStep(0);
    setStatus("DISPATCHED");

    setRobotPosition({
      x: ROUTE[0].position.x,
      y: ROUTE[0].position.y,
      z: ROUTE[0].position.z,
    });
  };

  // ---------------------------------------------------------
  // MOVE ROBOT THROUGH ROUTE
  // ---------------------------------------------------------

  useEffect(() => {
    if (!simulationRunning) return;

    if (currentStep >= ROUTE.length - 1) {
      setStatus("COMPLETED");
      setCompleted(true);
      setSimulationRunning(false);
      return;
    }

    const timer = setTimeout(() => {
      const nextStep = currentStep + 1;

      setCurrentStep(nextStep);

      setRobotPosition({
        x: ROUTE[nextStep].position.x,
        y: ROUTE[nextStep].position.y,
        z: ROUTE[nextStep].position.z,
      });

      setStatus(ROUTE[nextStep].status);
    }, 3000);

    return () => clearTimeout(timer);
  }, [simulationRunning, currentStep]);

  // ---------------------------------------------------------
  // RESET
  // ---------------------------------------------------------

  const resetSimulation = () => {
    setSimulationRunning(false);
    setCompleted(false);
    setCurrentStep(0);
    setStatus("READY");

    setRobotPosition({
      x: ROUTE[0].position.x,
      y: ROUTE[0].position.y,
      z: ROUTE[0].position.z,
    });
  };

  // ---------------------------------------------------------
  // CURRENT ROUTE
  // ---------------------------------------------------------

  const currentLocation = ROUTE[currentStep];

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* HEADER */}

      <div className="border-b border-slate-800 bg-slate-900 px-6 py-5">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>
            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-2xl">
                🤖
              </div>

              <div>

                <h1 className="text-2xl font-bold">
                  MEDI-TWIN Digital Twin
                </h1>

                <p className="text-sm text-slate-400">
                  Biomedical Waste Robot Simulation
                </p>

              </div>

            </div>
          </div>

          <div className="flex gap-3">

            <button
              onClick={() => navigate("/scanner")}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              ← Scanner
            </button>

            <button
              onClick={resetSimulation}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            >
              Reset
            </button>

          </div>

        </div>

      </div>

      {/* MAIN */}

      <div className="mx-auto max-w-7xl p-6">

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* 3D VIEW */}

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

            <div className="border-b border-slate-800 px-5 py-4">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="font-bold">
                    Robot Simulation
                  </h2>

                  <p className="text-xs text-slate-400">
                    Click Start Collection to move the robot
                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <span
                    className={`h-3 w-3 rounded-full ${
                      simulationRunning
                        ? "animate-pulse bg-emerald-400"
                        : completed
                        ? "bg-blue-400"
                        : "bg-slate-500"
                    }`}
                  />

                  <span className="text-xs font-semibold">
                    {status}
                  </span>

                </div>

              </div>

            </div>

            <div className="h-[600px]">

              <Canvas shadows>

                <PerspectiveCamera
                  makeDefault
                  position={[12, 10, 14]}
                  fov={45}
                />

                <ambientLight intensity={1.5} />

                <directionalLight
                  position={[10, 15, 10]}
                  intensity={3}
                  castShadow
                />

                <Environment preset="city" />

                <Ground />

                {/* CHARGING STATION */}

                <LocationMarker
                  position={[0, 0, 0]}
                  color="#22c55e"
                  label="Charging"
                />

                {/* WASTE PICKUP */}

                <LocationMarker
                  position={[5, 0, 0]}
                  color="#f59e0b"
                  label="Waste"
                />

                {/* BIN */}

                <LocationMarker
                  position={[-5, 0, 4]}
                  color="#ef4444"
                  label="Bin"
                />

                {/* ROBOT */}

                <RobotModel
                  targetPosition={robotPosition}
                />

                <OrbitControls
                  enablePan
                  enableZoom
                  enableRotate
                  target={[0, 0, 0]}
                />

              </Canvas>

            </div>

          </div>

          {/* SIDE PANEL */}

          <div className="space-y-5">

            {/* TASK */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="mb-4 text-lg font-bold">
                Collection Task
              </h2>

              <div className="space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Robot
                  </span>

                  <span className="font-semibold">
                    {task?.robotId || "MEDI-001"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Department
                  </span>

                  <span className="font-semibold">
                    {task?.department || "OT"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Waste Category
                  </span>

                  <span className="font-semibold uppercase">
                    {task?.wasteCategory || "General"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Weight
                  </span>

                  <span className="font-semibold">
                    {task?.weight || 0} kg
                  </span>
                </div>

              </div>

            </div>

            {/* CURRENT LOCATION */}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">

              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Robot Location
              </p>

              <h3 className="mt-2 text-xl font-bold">
                {currentLocation.name}
              </h3>

              <p className="mt-1 text-sm text-slate-400">
                X: {robotPosition.x.toFixed(1)}
                {"  "}
                Z: {robotPosition.z.toFixed(1)}
              </p>

            </div>

            {/* PROGRESS */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="mb-4 font-bold">
                Collection Progress
              </h2>

              <div className="space-y-4">

                {ROUTE.map((step, index) => {

                  const isCurrent =
                    index === currentStep;

                  const isCompleted =
                    index < currentStep ||
                    completed;

                  return (
                    <div
                      key={`${step.name}-${index}`}
                      className="flex items-center gap-3"
                    >

                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isCurrent
                            ? "bg-blue-500 text-white"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        {isCompleted
                          ? "✓"
                          : index + 1}
                      </div>

                      <div>

                        <p
                          className={`text-sm font-semibold ${
                            isCurrent
                              ? "text-white"
                              : isCompleted
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }`}
                        >
                          {step.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {step.status}
                        </p>

                      </div>

                    </div>
                  );
                })}

              </div>

            </div>

            {/* START BUTTON */}

            {!completed ? (
              <button
                onClick={startSimulation}
                disabled={simulationRunning}
                className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-lg font-bold shadow-lg transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {simulationRunning
                  ? "🤖 Robot Collecting..."
                  : "🚀 Start Waste Collection"}
              </button>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">

                <div className="text-3xl">
                  ✅
                </div>

                <p className="mt-2 font-bold text-emerald-400">
                  Collection Completed
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Waste has been deposited in the correct bin.
                </p>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
