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
|--------------------------------------------------------------------------
| DEMO MODE
|--------------------------------------------------------------------------
|
| No login required for:
|
| GET    /waste
| POST   /waste
| GET    /waste/:id
| PATCH  /waste/:id/category
| GET    /waste/export
|
*/


router.get(
  '/export',
  exportWaste
);


router.get(
  '/',
  listWaste
);


router.post(
  '/',
  createWaste
);


router.get(
  '/:id',
  getWaste
);


router.patch(
  '/:id/category',
  reclassifyWaste
);


/*
 * Keep deletion protected.
 */

router.delete(
  '/:id',
  requireRole('admin'),
  deleteWaste
);


export default router;
