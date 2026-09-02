import { Router } from "express";

import {
  listWaste,
  getWaste,
  createWaste,
  reclassifyWaste,
  deleteWaste,
  exportWaste,
} from "../controllers/wasteController.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| DEMO MODE
|--------------------------------------------------------------------------
| Waste Management is intentionally available without login.
|
| This allows:
|
| Scanner
|   ↓
| AI Classification
|   ↓
| Human Confirmation
|   ↓
| Robot Dispatch
|   ↓
| Waste Management
|
| No authentication is required for this demo workflow.
|--------------------------------------------------------------------------
*/

/*
 * GET /api/v1/waste/export
 */
router.get("/export", exportWaste);

/*
 * GET /api/v1/waste
 */
router.get("/", listWaste);

/*
 * POST /api/v1/waste
 */
router.post("/", createWaste);

/*
 * GET /api/v1/waste/:id
 */
router.get("/:id", getWaste);

/*
 * PATCH /api/v1/waste/:id/category
 */
router.patch("/:id/category", reclassifyWaste);

/*
 * DELETE /api/v1/waste/:id
 *
 * In demo mode deletion is allowed without authentication.
 * If you later enable authentication, protect this route.
 */
router.delete("/:id", deleteWaste);

export default router;
