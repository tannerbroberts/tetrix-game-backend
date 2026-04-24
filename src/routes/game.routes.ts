import { Router } from 'express';
import * as gameController from '../controllers/game.controller';
import { validateBody } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import {
  PlaceShapeSchema,
  PlaceShapeRequestSchema,
  RotateShapeSchema,
  UnlockSlotSchema,
  SaveGameStateSchema,
} from '../utils/schemas';

const router = Router();

// All game routes require authentication
router.use(requireAuth);

// GET /api/game/state
router.get('/state', gameController.getGameState);

// POST /api/game/state
router.post('/state', validateBody(SaveGameStateSchema), gameController.saveGameState);

// POST /api/game/place-shape (old client-side logic)
router.post('/place-shape', validateBody(PlaceShapeSchema), gameController.placeShape);

// POST /api/game/place-shape-v2 (new server-authoritative)
router.post('/place-shape-v2', validateBody(PlaceShapeRequestSchema), gameController.placeShapeV2);

// POST /api/game/rotate-shape
router.post('/rotate-shape', validateBody(RotateShapeSchema), gameController.rotateShape);

// POST /api/game/unlock-slot
router.post('/unlock-slot', validateBody(UnlockSlotSchema), gameController.unlockSlot);

// POST /api/game/reset
router.post('/reset', gameController.resetGame);

export default router;
