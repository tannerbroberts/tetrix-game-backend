import { z } from 'zod';

// ============================================================================
// BASIC SCHEMAS
// ============================================================================

export const ColorNameSchema = z.enum([
  'white', 'grey', 'red', 'orange', 'yellow', 'green', 'blue', 'purple'
]);

export const LocationSchema = z.object({
  row: z.number().int().min(1).max(10),
  column: z.number().int().min(1).max(10),
});

export const BlockSchema = z.object({
  color: ColorNameSchema,
  isFilled: z.boolean(),
  customAttribute: z.string().optional(),
});

export const ShapeSchema = z.array(z.array(BlockSchema)).length(4).refine(
  (shape) => shape.every((row) => row.length === 4),
  { message: 'Shape must be a 4x4 grid' }
);

export const TileDataSchema = z.object({
  position: z.string().regex(/^R\d+C\d+$/),
  backgroundColor: ColorNameSchema.optional(),
  isFilled: z.boolean(),
  color: ColorNameSchema,
  activeAnimations: z.array(z.any()).optional(),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// GAME STATE SCHEMAS
// ============================================================================

export const PlaceShapeSchema = z.object({
  location: LocationSchema,
  shape: ShapeSchema,
  shapeIndex: z.number().int().min(0).max(3),
});

export const RotateShapeSchema = z.object({
  shapeIndex: z.number().int().min(0).max(3),
  clockwise: z.boolean(),
});

export const UnlockSlotSchema = z.object({
  slotNumber: z.number().int().min(2).max(4),
  cost: z.number().int().min(0),
});

export const ColorProbabilitySchema = z.object({
  color: ColorNameSchema,
  weight: z.number().positive(),
});

export const SerializedQueueItemSchema = z.union([
  z.object({
    type: z.literal('shape'),
    shape: ShapeSchema,
  }),
  z.object({
    type: z.literal('purchasable-slot'),
    cost: z.number(),
    slotNumber: z.number(),
  }),
]);

export const SaveGameStateSchema = z.object({
  score: z.number().int().nonnegative().optional(),
  tiles: z.array(TileDataSchema).optional(),
  nextQueue: z.array(SerializedQueueItemSchema).optional(),
  savedShape: ShapeSchema.nullable().optional(),
  totalLinesCleared: z.number().int().nonnegative().optional(),
  shapesUsed: z.number().int().nonnegative().optional(),
  hasPlacedFirstShape: z.boolean().optional(),
  stats: z.any().optional(), // Complex nested structure
  queueMode: z.enum(['infinite', 'finite']).optional(),
  queueColorProbabilities: z.array(ColorProbabilitySchema).optional(),
  queueHiddenShapes: z.array(ShapeSchema).optional(),
  queueSize: z.number().int().optional(),
  unlockedSlots: z.array(z.number().int()).optional(),
});

// ============================================================================
// SETTINGS SCHEMAS
// ============================================================================

export const UpdateSettingsSchema = z.object({
  music: z.object({
    isMuted: z.boolean(),
    volume: z.number().int().min(0).max(100),
    isEnabled: z.boolean(),
  }).optional(),
  soundEffects: z.object({
    isMuted: z.boolean(),
    volume: z.number().int().min(0).max(100),
    isEnabled: z.boolean(),
  }).optional(),
  theme: z.enum(['dark', 'light', 'block-blast']).optional(),
  blockTheme: z.enum(['gem', 'simple', 'pixel']).optional(),
  showBlockIcons: z.boolean().optional(),
  buttonSizeMultiplier: z.number().min(0.5).max(1.5).optional(),
  grandpaMode: z.boolean().optional(),
});
