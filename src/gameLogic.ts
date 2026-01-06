
import { Piece, PieceType, Color, Position, GameState, Move } from './types';
// GRID_SIZE is defined in constants.tsx, not types.ts
import { GRID_SIZE } from './constants';

export const createEmptyBoard = (): (Piece | null)[][] => {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
};

export const isPosEqual = (p1: Position, p2: Position) => p1.r === p2.r && p1.c === p2.c;

export const serializeState = (
  board: (Piece | null)[][],
  hands: { white: PieceType[]; black: PieceType[] },
  currentPlayer: Color,
  pawnDirections: { white: number; black: number }
): string => {
  const boardStr = board.flat().map(p => p ? `${p.color}${p.type}` : '-').join(',');
  const handW = [...hands.white].sort().join('');
  const handB = [...hands.black].sort().join('');
  const pawnDir = `${pawnDirections.white},${pawnDirections.black}`;
  return `${boardStr}|${handW}|${handB}|${currentPlayer}|${pawnDir}`;
};

export const isValidMove = (
  gameState: GameState,
  piece: Piece,
  from: Position,
  to: Position
): { valid: boolean; message?: string } => {
  const { board, pawnDirections } = gameState;
  const dr = to.r - from.r;
  const dc = to.c - from.c;
  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  // Bounds check
  if (to.r < 0 || to.r >= GRID_SIZE || to.c < 0 || to.c >= GRID_SIZE) {
    return { valid: false, message: 'Move is out of bounds.' };
  }

  const targetPiece = board[to.r][to.c];
  if (targetPiece && targetPiece.color === piece.color) {
    return { valid: false, message: 'You cannot capture your own piece.' };
  }

  switch (piece.type) {
    case PieceType.ROOK:
      if (dr !== 0 && dc !== 0) return { valid: false, message: 'Rooks move straight.' };
      // Path check
      const rStep = dr === 0 ? 0 : dr > 0 ? 1 : -1;
      const cStep = dc === 0 ? 0 : dc > 0 ? 1 : -1;
      let currR = from.r + rStep;
      let currC = from.c + cStep;
      while (currR !== to.r || currC !== to.c) {
        if (board[currR][currC]) return { valid: false, message: 'The path is blocked.' };
        currR += rStep;
        currC += cStep;
      }
      return { valid: true };

    case PieceType.BISHOP:
      if (absDr !== absDc) return { valid: false, message: 'Bishops move diagonally.' };
      // Path check
      const brStep = dr > 0 ? 1 : -1;
      const bcStep = dc > 0 ? 1 : -1;
      let bR = from.r + brStep;
      let bC = from.c + bcStep;
      while (bR !== to.r || bC !== to.c) {
        if (board[bR][bC]) return { valid: false, message: 'The path is blocked.' };
        bR += brStep;
        bC += bcStep;
      }
      return { valid: true };

    case PieceType.KNIGHT:
      if (!((absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2))) {
        return { valid: false, message: 'Knights move in an L-shape.' };
      }
      return { valid: true };

    case PieceType.PAWN:
      const dir = piece.color === 'white' ? pawnDirections.white : pawnDirections.black;
      // Normal move
      if (dc === 0 && dr === dir) {
        if (targetPiece) return { valid: false, message: 'Pawns can only move forward into empty squares.' };
        return { valid: true };
      }
      // Capture
      if (absDc === 1 && dr === dir) {
        if (!targetPiece || targetPiece.color === piece.color) {
          return { valid: false, message: 'Pawns can only capture diagonally.' };
        }
        return { valid: true };
      }
      return { valid: false, message: 'Invalid pawn movement.' };

    default:
      return { valid: false, message: 'Unknown piece type.' };
  }
};

export const checkWin = (board: (Piece | null)[][], color: Color): Position[] | null => {
  const lines: Position[][] = [];

  // Rows
  for (let r = 0; r < GRID_SIZE; r++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, c) => ({ r, c })));
  }
  // Columns
  for (let c = 0; c < GRID_SIZE; c++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, r) => ({ r, c })));
  }
  // Diagonals
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: i })));
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: GRID_SIZE - 1 - i })));

  for (const line of lines) {
    if (line.every(pos => board[pos.r][pos.c]?.color === color)) {
      return line;
    }
  }
  return null;
};

export const getLegalMoves = (gameState: GameState, color: Color): Move[] => {
  const moves: Move[] = [];
  const { board, hands } = gameState;

  // Placement moves
  const colorHand = hands[color];
  const uniqueHandPieces = Array.from(new Set(colorHand));
  for (const pieceType of uniqueHandPieces) {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!board[r][c]) {
          moves.push({ type: 'place', pieceType, to: { r, c } });
        }
      }
    }
  }

  // Board moves
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        for (let tr = 0; tr < GRID_SIZE; tr++) {
          for (let tc = 0; tc < GRID_SIZE; tc++) {
            if (r === tr && c === tc) continue;
            const validation = isValidMove(gameState, piece, { r, c }, { r: tr, c: tc });
            if (validation.valid) {
              moves.push({
                type: 'move',
                pieceType: piece.type,
                from: { r, c },
                to: { r: tr, c: tc },
                captured: board[tr][tc] || undefined
              });
            }
          }
        }
      }
    }
  }

  return moves;
};
