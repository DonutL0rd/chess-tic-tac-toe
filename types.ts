
export type Color = 'white' | 'black';

export enum PieceType {
  PAWN = 'P',
  ROOK = 'R',
  KNIGHT = 'N',
  BISHOP = 'B'
}

export type GameMode = 'ai' | 'local' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Piece {
  type: PieceType;
  color: Color;
  id: string; // unique ID for React keys
  pawnDirection?: number; // 1 for down, -1 for up
}

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  type: 'place' | 'move';
  pieceType: PieceType;
  from?: Position;
  to: Position;
  captured?: Piece;
  pieceId?: string; // Transmitted in online play to keep IDs in sync
  logicFeedback?: string; // AI logic explanation
}

export interface GameState {
  board: (Piece | null)[][];
  hands: {
    white: PieceType[];
    black: PieceType[];
  };
  pawnDirections: {
    white: number; // -1 (up) or 1 (down)
    black: number; // 1 (down) or -1 (up)
  };
  currentPlayer: Color;
  winner: Color | 'draw' | null;
  winningLine: Position[] | null;
  history: Move[];
  statusMessage: string;
  gameMode: GameMode;
  difficulty: Difficulty;
  positionCounts: Record<string, number>;
}
