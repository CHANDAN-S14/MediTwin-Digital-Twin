import { Router } from 'express';

import {
  listWaste,
  getWaste,
  createWaste,
  reclassifyWaste,
  deleteWaste,
  exportWaste,
} from '../controllers/wasteController.js';

import { requireRole } from '../middleware/auth.js';

const router = Router();

/*
 * ============================================================
 * DEMO MODE
 * ============================================================
 *
 * Waste Management is available without login for the SIH demo.
 *
 * IMPORTANT:
 * Delete remains admin-only.
 */

// GET all waste
router.get('/', listWaste);

// GET CSV export
router.get('/export', exportWaste);

// CREATE waste
router.post('/', createWaste);

// GET one waste record
router.get('/:id', getWaste);

// UPDATE category
router.patch('/:id/category', reclassifyWaste);

// DELETE remains protected
router.delete('/:id', requireRole('admin'), deleteWaste);

export default router;
