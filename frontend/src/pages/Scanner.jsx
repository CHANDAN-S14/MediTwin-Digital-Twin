import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ai, robots, waste } from "../services/api";

const ROBOT_MIN_BATTERY = 15;

function Scanner() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ---------------------------------------------------------
  // IMAGE / SCAN STATE
  // ---------------------------------------------------------

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // ---------------------------------------------------------
  // HUMAN CONFIRMATION
  // ---------------------------------------------------------

  const [humanConfirmed, setHumanConfirmed] = useState(false);

  // ---------------------------------------------------------
  // WASTE SAVE STATE
  // ---------------------------------------------------------

  const [savingWaste, setSavingWaste] = useState(false);
  const [savedWaste, setSavedWaste] = useState(null);

  // ---------------------------------------------------------
  // ROBOT DISPATCH STATE
  // ---------------------------------------------------------

  const [dispatching, setDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState("");
  const [dispatchError, setDispatchError] = useState("");

  // ---------------------------------------------------------
  // FORM STATE
  // ---------------------------------------------------------

  const [department, setDepartment] = useState("OT");
  const [weight, setWeight] = useState("");

  // ---------------------------------------------------------
  // FILE SELECT
  // ---------------------------------------------------------

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setDispatchError("Please select an image file.");
      return;
    }

    // Release old preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setScanResult(null);
    setSavedWaste(null);
    setHumanConfirmed(false);
    setDispatchStatus("");
    setDispatchError("");

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // ---------------------------------------------------------
  // OPEN FILE SELECTOR
  // ---------------------------------------------------------

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // ---------------------------------------------------------
  // SCAN IMAGE
  // ---------------------------------------------------------

  const analyze = async () => {
    setDispatchError("");
    setDispatchStatus("");
    setSavedWaste(null);

    if (!selectedFile) {
      setDispatchError('Attach an image in the "image" field.');
      return;
    }

    if (!department) {
      setDispatchError("Please select a source department.");
      return;
    }

    try {
      setScanning(true);

      console.log("Sending AI scan:", {
        file: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        department,
        weight,
      });

      /*
       * IMPORTANT:
       *
       * persist=false
       *
       * We do NOT save the waste yet.
       *
       * First:
       * AI → Human Review → Confirm
       *
       * Then:
       * POST /waste
       */

      const result = await ai.classify({
        file: selectedFile,
        department,
        weight,
        persist: false,
        dispatch: false,
      });

      console.log("AI classification result:", result);

      // -----------------------------------------------------
      // CATEGORY
      // -----------------------------------------------------

      const category =
        result?.category ||
        result?.predictedCategory ||
        result?.prediction?.category ||
        result?.classification?.category ||
        result?.data?.category ||
        "general";

      // -----------------------------------------------------
      // CONFIDENCE
      // -----------------------------------------------------

      const confidence =
        Number(
          result?.confidence ??
            result?.prediction?.confidence ??
            result?.classification?.confidence ??
            result?.data?.confidence ??
            0
        ) || 0;

      const normalizedCategory = String(category)
        .toLowerCase()
        .trim();

      const finalCategory = [
        "yellow",
        "red",
        "blue",
        "general",
      ].includes(normalizedCategory)
        ? normalizedCategory
        : "general";

      // -----------------------------------------------------
      // NORMALIZED RESULT
      // -----------------------------------------------------

      const normalizedResult = {
        ...result,

        category: finalCategory,

        confidence,

        department,

        weight,

        imageName: selectedFile.name,
      };

      console.log(
        "Normalized AI result:",
        normalizedResult
      );

      setScanResult(normalizedResult);

      // Human must explicitly confirm
      setHumanConfirmed(false);

      setDispatchStatus(
        "AI classification completed. Please review and confirm the result."
      );
    } catch (error) {
      console.error("AI Scanner error:", error);

      setDispatchError(
        error?.message ||
          "The image could not be classified. Make sure the AI service is running."
      );

      setScanResult(null);
    } finally {
      setScanning(false);
    }
  };

  // ---------------------------------------------------------
  // HUMAN CONFIRMATION
  // ---------------------------------------------------------

  const confirmClassification = () => {
    if (!scanResult) {
      setDispatchError(
        "Please scan and classify the waste first."
      );
      return;
    }

    setHumanConfirmed(true);
    setDispatchError("");

    setDispatchStatus(
      `Classification confirmed: ${scanResult.category.toUpperCase()} waste.`
    );
  };

  // ---------------------------------------------------------
  // SAVE WASTE RECORD
  // ---------------------------------------------------------

  const saveWasteRecord = async () => {
    if (!scanResult) {
      throw new Error(
        "No AI classification result is available."
      );
    }

    /*
     * Prevent duplicate waste records.
     *
     * If the waste was already saved, return it.
     */

    if (savedWaste) {
      return savedWaste;
    }

    setSavingWaste(true);

    try {
      const payload = {
        name:
          scanResult?.name ||
          scanResult?.itemName ||
          "Biomedical Waste",

        category:
          scanResult.category || "general",

        department,

        confidence:
          Number(scanResult.confidence || 0),

        weight:
          weight !== ""
            ? Number(weight)
            : 0,

        imageName:
          selectedFile?.name || null,

        status: "CONFIRMED",
      };

      console.log(
        "Creating waste record:",
        payload
      );

      /*
       * POST
       *
       * /api/v1/waste
       */

      const response = await waste.create(payload);

      console.log(
        "Waste record created:",
        response
      );

      /*
       * api.js unwraps:
       *
       * {
       *   success: true,
       *   data: {...}
       * }
       *
       * into:
       *
       * {...}
       */

      const createdWaste =
        response?.data &&
        !response?._id &&
        !response?.id
          ? response.data
          : response;

      setSavedWaste(createdWaste);

      return createdWaste;
    } catch (error) {
      console.error(
        "Unable to create waste record:",
        error
      );

      throw new Error(
        error?.message ||
          "Unable to save the waste record."
      );
    } finally {
      setSavingWaste(false);
    }
  };

  // ---------------------------------------------------------
  // FIND AVAILABLE ROBOT
  // ---------------------------------------------------------

  const findAvailableRobot = async () => {
    const result = await robots.list();

    /*
     * api.js unwraps:
     *
     * {
     *   success: true,
     *   data: [...]
     * }
     *
     * into:
     *
     * [...]
     */

    const robotList = Array.isArray(result)
      ? result
      : Array.isArray(result?.data)
      ? result.data
      : [];

    console.log(
      "Available robots:",
      robotList
    );

    const availableRobot =
      robotList.find((robot) => {
        const status = String(
          robot.status || ""
        ).toUpperCase();

        const battery = Number(
          robot.battery ?? 0
        );

        return (
          status === "IDLE" &&
          battery > ROBOT_MIN_BATTERY
        );
      });

    return availableRobot;
  };

  // ---------------------------------------------------------
  // DISPATCH ROBOT
  // ---------------------------------------------------------

  const dispatchRobot = async () => {
    setDispatchError("");

    if (!scanResult) {
      setDispatchError(
        "Please scan and classify the waste first."
      );
      return;
    }

    if (!humanConfirmed) {
      setDispatchError(
        "Please confirm the AI classification before collecting waste."
      );
      return;
    }

    if (!department) {
      setDispatchError(
        "Please select the source department."
      );
      return;
    }

    try {
      setDispatching(true);

      // =====================================================
      // STEP 1 — SAVE WASTE RECORD
      // =====================================================

      setDispatchStatus(
        "Saving confirmed waste record..."
      );

      const wasteRecord =
        await saveWasteRecord();

      console.log(
        "Confirmed waste record:",
        wasteRecord
      );

      // -----------------------------------------------------
      // GET WASTE ID
      // -----------------------------------------------------

      const wasteId =
        wasteRecord?.wasteId ||
        wasteRecord?._id ||
        wasteRecord?.id ||
        null;

      console.log(
        "Created Waste ID:",
        wasteId
      );

      if (!wasteId) {
        throw new Error(
          "Waste was created but the backend did not return a valid waste ID."
        );
      }

      setDispatchStatus(
        `Waste record created successfully. ID: ${wasteId}. Searching for an available robot...`
      );

      // =====================================================
      // STEP 2 — FIND ROBOT
      // =====================================================

      const robot =
        await findAvailableRobot();

      if (!robot) {
        throw new Error(
          "Waste was saved successfully, but no available robot was found. Make sure at least one robot is IDLE and has enough battery."
        );
      }

      console.log(
        "Selected robot:",
        robot
      );

      const robotId =
        robot.robotId ||
        robot.id ||
        robot._id;

      if (!robotId) {
        throw new Error(
          "The available robot does not have a valid robot ID."
        );
      }

      // =====================================================
      // STEP 3 — CATEGORY
      // =====================================================

      const expectedCategory =
        scanResult.category ||
        "general";

      // =====================================================
      // STEP 4 — DISPATCH ROBOT
      // =====================================================

      setDispatchStatus(
        `${robotId} selected. Dispatching robot to ${department}...`
      );

      const dispatchPayload = {
        department,

        expectedCategory,

        confidence:
          Number(
            scanResult.confidence || 0
          ),

        /*
         * IMPORTANT:
         *
         * This is now the actual database
         * waste record ID.
         */

        wasteId,
      };

      console.log(
        "Dispatch payload:",
        dispatchPayload
      );

      const response =
        await robots.dispatch(
          robotId,
          dispatchPayload
        );

      console.log(
        "Robot dispatch response:",
        response
      );

      // =====================================================
      // STEP 5 — TASK ID
      // =====================================================

      const task =
        response?.task ||
        response?.data?.task ||
        response;

      const taskId =
        task?.taskId ||
        task?._id ||
        task?.id ||
        response?.taskId ||
        response?.data?.taskId ||
        null;

      // =====================================================
      // STEP 6 — DIGITAL TWIN PAYLOAD
      // =====================================================

      const digitalTwinTask = {
        taskId,

        wasteId,

        robotId,

        department,

        wasteCategory:
          expectedCategory,

        category:
          expectedCategory,

        confidence:
          Number(
            scanResult.confidence || 0
          ),

        weight:
          weight !== ""
            ? Number(weight)
            : 0,

        source:
          department,

        targetBin:
          expectedCategory,

        status:
          "DISPATCHED",

        startedAt:
          new Date().toISOString(),

        imageName:
          selectedFile?.name || null,
      };

      console.log(
        "Digital Twin task:",
        digitalTwinTask
      );

      // =====================================================
      // STEP 7 — SAVE DIGITAL TWIN TASK
      // =====================================================

      try {
        sessionStorage.setItem(
          "meditwin.digitalTwinTask",
          JSON.stringify(
            digitalTwinTask
          )
        );
      } catch (storageError) {
        console.warn(
          "Unable to save Digital Twin task:",
          storageError
        );
      }

      // =====================================================
      // STEP 8 — SUCCESS
      // =====================================================

      setDispatchStatus(
        `${robotId} dispatched successfully. Opening Digital Twin...`
      );

      // =====================================================
      // STEP 9 — OPEN DIGITAL TWIN
      // =====================================================

      setTimeout(() => {
        navigate("/twin", {
          state: {
            task: digitalTwinTask,

            robot,

            scanResult,

            waste: wasteRecord,
          },
        });
      }, 700);
    } catch (error) {
      console.error(
        "Robot dispatch error:",
        error
      );

      setDispatchError(
        error?.message ||
          "Unable to process waste collection."
      );

      /*
       * Do NOT remove savedWaste here.
       *
       * If robot dispatch fails after waste creation,
       * the waste record remains in the database.
       */

      setDispatchStatus("");
    } finally {
      setDispatching(false);
    }
  };

  // ---------------------------------------------------------
  // RESET
  // ---------------------------------------------------------

  const resetScanner = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setScanResult(null);
    setSavedWaste(null);
    setHumanConfirmed(false);
    setDispatching(false);
    setSavingWaste(false);
    setScanning(false);
    setDispatchStatus("");
    setDispatchError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ---------------------------------------------------------
  // FORMAT CONFIDENCE
  // ---------------------------------------------------------

  const formatConfidence = (value) => {
    const number = Number(
      value || 0
    );

    if (number <= 1) {
      return `${(
        number * 100
      ).toFixed(1)}%`;
    }

    return `${number.toFixed(1)}%`;
  };

  // ---------------------------------------------------------
  // BIN COLOR
  // ---------------------------------------------------------

  const getBinColor = (category) => {
    switch (category) {
      case "yellow":
        return "bg-yellow-400";

      case "red":
        return "bg-red-500";

      case "blue":
        return "bg-blue-500";

      case "general":
      default:
        return "bg-gray-500";
    }
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">

        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900">
            Biomedical Waste Scanner
          </h1>

          <p className="mt-2 text-slate-500">
            Scan waste, review the AI classification,
            confirm it manually, save the record, and
            dispatch a robot for collection.
          </p>
        </div>

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {dispatchError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="font-semibold">
              ⚠ Error
            </div>

            <div className="mt-1 text-sm">
              {dispatchError}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* STATUS */}
        {/* ================================================= */}

        {dispatchStatus && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-700">
            <div className="font-semibold">
              Scanner / Robot Status
            </div>

            <div className="mt-1 text-sm">
              {dispatchStatus}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* SAVED WASTE */}
        {/* ================================================= */}

        {savedWaste && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="font-semibold">
              ✅ Waste Record Saved
            </div>

            <div className="mt-1 text-sm">
              Waste ID:{" "}
              <span className="font-bold">
                {savedWaste?.wasteId ||
                  savedWaste?._id ||
                  savedWaste?.id ||
                  "Created"}
              </span>
            </div>

            <div className="mt-1 text-sm">
              Category:{" "}
              <span className="font-semibold">
                {savedWaste?.category ||
                  scanResult?.category}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ================================================= */}
          {/* LEFT - SCANNER */}
          {/* ================================================= */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-slate-900">
              1. Scan Waste
            </h2>

            {/* FILE INPUT */}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* IMAGE AREA */}

            <button
              type="button"
              onClick={openFileSelector}
              className="flex min-h-[280px] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-blue-400 hover:bg-blue-50"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected waste"
                  className="max-h-[280px] w-full object-contain"
                />
              ) : (
                <div className="text-center">

                  <div className="mb-3 text-5xl">
                    📷
                  </div>

                  <div className="font-semibold text-slate-700">
                    Click to upload waste image
                  </div>

                  <div className="mt-1 text-sm text-slate-400">
                    JPG, PNG, WEBP
                  </div>

                </div>
              )}
            </button>

            {/* FILE NAME */}

            {selectedFile && (
              <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm">
                <span className="font-medium">
                  Selected:
                </span>{" "}
                {selectedFile.name}
              </div>
            )}

            {/* DEPARTMENT */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Source Department
              </label>

              <select
                value={department}
                onChange={(e) =>
                  setDepartment(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="OT">
                  OT
                </option>

                <option value="ICU">
                  ICU
                </option>

                <option value="Ward">
                  Ward
                </option>

                <option value="General">
                  General
                </option>
              </select>

            </div>

            {/* WEIGHT */}

            <div className="mt-4">

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Weight (optional)
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={weight}
                onChange={(e) =>
                  setWeight(
                    e.target.value
                  )
                }
                placeholder="Weight in kg"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />

            </div>

            {/* SCAN BUTTON */}

            <button
              type="button"
              disabled={
                scanning ||
                dispatching ||
                savingWaste ||
                !selectedFile
              }
              onClick={analyze}
              className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning
                ? "🔄 Classifying..."
                : "🤖 Scan & Classify"}
            </button>

            {/* RESET */}

            {selectedFile && (
              <button
                type="button"
                onClick={resetScanner}
                disabled={
                  scanning ||
                  dispatching ||
                  savingWaste
                }
                className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Clear Scan
              </button>
            )}

          </div>

          {/* ================================================= */}
          {/* RIGHT - RESULT */}
          {/* ================================================= */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="mb-5 text-xl font-bold text-slate-900">
              2. AI Result & Human Confirmation
            </h2>

            {!scanResult ? (
              <div className="flex min-h-[350px] items-center justify-center rounded-2xl bg-slate-50 text-center">

                <div>

                  <div className="text-5xl">
                    🧪
                  </div>

                  <p className="mt-4 font-medium text-slate-600">
                    No classification yet
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Upload an image and scan it first.
                  </p>

                </div>

              </div>
            ) : (
              <div>

                {/* ================================================= */}
                {/* CATEGORY */}
                {/* ================================================= */}

                <div className="rounded-2xl border border-slate-200 p-5">

                  <div className="text-sm text-slate-500">
                    AI Classification
                  </div>

                  <div className="mt-2 flex items-center gap-3">

                    <div
                      className={`h-5 w-5 rounded-full ${getBinColor(
                        scanResult.category
                      )}`}
                    />

                    <div className="text-3xl font-bold uppercase text-slate-900">
                      {scanResult.category}
                    </div>

                  </div>

                  <div className="mt-3 text-sm text-slate-500">
                    Confidence:{" "}
                    <span className="font-semibold text-slate-800">
                      {formatConfidence(
                        scanResult.confidence
                      )}
                    </span>
                  </div>

                  <div className="mt-2 text-sm text-slate-500">
                    Department:{" "}
                    <span className="font-semibold text-slate-800">
                      {department}
                    </span>
                  </div>

                  {weight && (
                    <div className="mt-2 text-sm text-slate-500">
                      Weight:{" "}
                      <span className="font-semibold text-slate-800">
                        {weight} kg
                      </span>
                    </div>
                  )}

                </div>

                {/* ================================================= */}
                {/* HUMAN CONFIRMATION */}
                {/* ================================================= */}

                <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">

                  <div className="font-bold text-orange-900">
                    Manual Review Required
                  </div>

                  <p className="mt-2 text-sm text-orange-800">
                    Verify that the AI classification is
                    correct before saving the waste record
                    and sending the robot.
                  </p>

                  <label className="mt-4 flex cursor-pointer items-start gap-3">

                    <input
                      type="checkbox"
                      checked={
                        humanConfirmed
                      }
                      onChange={(e) => {
                        const checked =
                          e.target.checked;

                        setHumanConfirmed(
                          checked
                        );

                        if (checked) {
                          confirmClassification();
                        } else {
                          setDispatchStatus("");
                        }
                      }}
                      className="mt-1 h-5 w-5"
                    />

                    <span className="text-sm font-medium text-orange-900">
                      I confirm that this waste category
                      is correct and approve robot
                      collection.
                    </span>

                  </label>

                </div>

                {/* ================================================= */}
                {/* SAVE + DISPATCH */}
                {/* ================================================= */}

                <button
                  type="button"
                  onClick={dispatchRobot}
                  disabled={
                    dispatching ||
                    scanning ||
                    savingWaste ||
                    !humanConfirmed
                  }
                  className="mt-5 w-full rounded-xl bg-emerald-600 px-5 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingWaste ? (
                    "💾 Saving Waste Record..."
                  ) : dispatching ? (
                    "🤖 Processing Robot..."
                  ) : savedWaste ? (
                    "🚀 Dispatch Robot"
                  ) : (
                    "🚀 Confirm & Collect Waste"
                  )}
                </button>

                {!humanConfirmed && (
                  <p className="mt-3 text-center text-sm text-slate-400">
                    Confirm the classification above to
                    enable waste registration and robot
                    collection.
                  </p>
                )}

              </div>
            )}

          </div>

        </div>

        {/* ================================================= */}
        {/* WORKFLOW */}
        {/* ================================================= */}

        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Collection Workflow
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">

            {[
              [
                "1",
                "Scan",
                "Upload waste image",
              ],
              [
                "2",
                "AI",
                "Classify waste",
              ],
              [
                "3",
                "Review",
                "Human confirmation",
              ],
              [
                "4",
                "Register",
                "Save waste record",
              ],
              [
                "5",
                "Robot",
                "Dispatch & Digital Twin",
              ],
            ].map(
              ([
                number,
                title,
                description,
              ]) => (
                <div
                  key={number}
                  className="rounded-xl border border-slate-200 p-4"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                      {number}
                    </div>

                    <div className="font-bold text-slate-800">
                      {title}
                    </div>

                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {description}
                  </p>

                </div>
              )
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

export default Scanner;
