/**
 * Backend types for Tetrix Game API
 * Subset of frontend types needed for persistence and validation
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type ColorName = 'white' | 'grey' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export type Block = {
  color: ColorName;
  isFilled: boolean;
  customAttribute?: string;
};

export type Shape = Block[][]; // 4x4 grid

export type Location = { row: number; column: number };

// ============================================================================
// PERSISTENCE TYPES
// ============================================================================

export type TileData = {
  position: string; // "R1C1" format
  backgroundColor?: ColorName;
  isFilled: boolean;
  color: ColorName;
  activeAnimations?: TileAnimation[];
};

export type TileAnimation = {
  id: string;
  type: 'row-cw' | 'row-double' | 'row-triple' | 'row-quad' |
        'column-ccw' | 'column-double' | 'column-triple' | 'column-quad' |
        'full-board-columns' | 'full-board-rows';
  startTime: number;
  duration: number;
  beatCount?: number;
  finishDuration?: number;
  color?: string;
};

export type SerializedQueueItem =
  | { type: 'shape'; shape: Shape }
  | { type: 'purchasable-slot'; cost: number; slotNumber: number };

export type ColorProbability = {
  color: ColorName;
  weight: number;
};

// ============================================================================
// GAME STATE PERSISTENCE
// ============================================================================

export type QueueMode = 'infinite' | 'finite';

export type SavedGameState = {
  version: string;
  score: number;
  tiles: TileData[];
  nextQueue: SerializedQueueItem[];
  savedShape: Shape | null;
  totalLinesCleared: number;
  shapesUsed: number;
  hasPlacedFirstShape: boolean;
  stats: StatsPersistenceData;
  queueMode?: QueueMode;
  queueColorProbabilities?: ColorProbability[];
  queueHiddenShapes?: Shape[];
  queueSize?: number;
  unlockedSlots?: number[];
  lastUpdated: number;
};

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export type StatValue = {
  total: number;
  colors: Record<ColorName, number>;
};

export type GameStats = {
  shapesPlaced: StatValue;
  linesCleared: StatValue;
  rowsCleared: StatValue;
  columnsCleared: StatValue;
  boardClears: StatValue;
  doubles: StatValue;
  triples: StatValue;
  quads: StatValue;
  points: StatValue;
};

export type StatsPersistenceData = {
  allTime: GameStats;
  highScore: GameStats;
  current: GameStats;
  noTurnStreak: {
    current: number;
    bestInGame: number;
    allTimeBest: number;
  };
  lastUpdated: number;
};

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type User = {
  id: string;
  username: string;
  email: string;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  last_active: Date | null;
};

export type UserSettings = {
  musicIsMuted: boolean;
  musicVolume: number;
  musicIsEnabled: boolean;
  soundEffectsIsMuted: boolean;
  soundEffectsVolume: number;
  soundEffectsIsEnabled: boolean;
  theme: 'dark' | 'light' | 'block-blast';
  blockTheme: 'gem' | 'simple' | 'pixel';
  showBlockIcons: boolean;
  buttonSizeMultiplier: number;
  grandpaMode: boolean;
  debugUnlocked: boolean;
};

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type PlaceShapeRequest = {
  location: Location;
  shape: Shape;
  shapeIndex: number;
};

export type PlaceShapeResponse = {
  valid: boolean;
  reason?: string;
  newScore?: number;
  linesCleared?: number;
  updatedTiles?: TileData[];
  nextQueue?: SerializedQueueItem[];
};

export type RotateShapeRequest = {
  shapeIndex: number;
  clockwise: boolean;
};

export type UnlockSlotRequest = {
  slotNumber: number;
  cost: number;
};

// ============================================================================
// SESSION TYPES
// ============================================================================

// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

export type PasswordResetToken = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  used_at: Date | null;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export type LeaderboardEntry = {
  username: string;
  score: number;
  rank: number;
};

export type PublicLeaderboardResponse = {
  topPlayers: LeaderboardEntry[];
  totalActivePlayers: number;
};

export type UserLeaderboardResponse = {
  topPlayers: LeaderboardEntry[];
  totalActivePlayers: number;
  userRank: number;
  userScore: number;
  pointsToNextMilestone: {
    milestone: string;
    pointsNeeded: number;
  } | null;
};

// ============================================================================
// SESSION TYPES
// ============================================================================

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}
