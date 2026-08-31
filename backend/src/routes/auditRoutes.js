import { Router } from 'express';
import { listAuditLog } from '../controllers/auditController.js';
import { requireAuth, requireRole, requireHospital } from '../middleware/auth.js';

const router = Router();

/**
 * The audit trail names individuals and what they did. That is exactly the kind
 * of record that should not be browsable by everyone who can sign in, so it is
 * limited to admins — the people already accountable for the waste register.
 */
router.get('/', requireAuth, requireHospital, requireRole('admin'), listAuditLog);

export default router;
