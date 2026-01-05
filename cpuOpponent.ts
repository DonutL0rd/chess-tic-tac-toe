
import { GameState, Move, Color, PieceType, Position, Piece, Difficulty } from "./types";
import { getLegalMoves, checkWin, isPosEqual } from "./gameLogic";
import { GRID_SIZE } from "./constants";

/**
 * Enhanced CPU Opponent for Chess Tic-Tac-Toe
 * Supports Easy, Medium, and Hard modes.
 */

const SCORES = {
  WIN: 100000,
  THREE_IN_ROW: 1000,
  TWO_IN_ROW: 100,
  CENTER: 80,
  PIECE_ON_BOARD: 50,
  PIECE_IN_HAND: 30, // Retention value
};

const CENTER_SQUARES = [
  { r: 1, c: 1 }, { r: 1, c: 2 },
  { r: 2, c: 1 }, { r: 2, c: 2 }
];

const evaluateBoard = (board: (Piece | null)[][], hands: { white: PieceType[], black: PieceType[] }, aiColor: Color): number => {
  const opponent: Color = aiColor === 'white' ? 'black' : 'white';
  
  const aiWin = checkWin(board, aiColor);
  if (aiWin) return SCORES.WIN;
  
  const oppWin = checkWin(board, opponent);
  if (oppWin) return -SCORES.WIN;

  let score = 0;

  // Evaluate lines
  const lines: Position[][] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    lines.push(Array.from({ length: GRID_SIZE }, (_, j) => ({ r: i, c: j }))); // Rows
    lines.push(Array.from({ length: GRID_SIZE }, (_, j) => ({ r: j, c: i }))); // Cols
  }
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: i }))); // D1
  lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: GRID_SIZE - 1 - i }))); // D2

  for (const line of lines) {
    let mine = 0;
    let theirs = 0;
    for (const pos of line) {
      const p = board[pos.r][pos.c];
      if (p?.color === aiColor) mine++;
      else if (p?.color === opponent) theirs++;
    }

    if (theirs === 0) {
      if (mine === 3) score += SCORES.THREE_IN_ROW;
      else if (mine === 2) score += SCORES.TWO_IN_ROW;
    }
    if (mine === 0) {
      if (theirs === 3) score -= SCORES.THREE_IN_ROW * 1.5; // Weight blocking higher
      else if (theirs === 2) score -= SCORES.TWO_IN_ROW;
    }
  }

  // Board control & Hand retention
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const p = board[r][c];
      if (!p) continue;
      
      let val = SCORES.PIECE_ON_BOARD;
      if (CENTER_SQUARES.some(cs => cs.r === r && cs.c === c)) val += SCORES.CENTER;
      
      if (p.color === aiColor) score += val;
      else score -= val;
    }
  }

  // Piece retention heuristic (Hard Mode)
  score += hands[aiColor].length * SCORES.PIECE_IN_HAND;
  score -= hands[opponent].length * SCORES.PIECE_IN_HAND;

  return score;
};

const simulateMove = (gameState: GameState, move: Move): GameState => {
  const newBoard = gameState.board.map(row => [...row]);
  const newHands = { white: [...gameState.hands.white], black: [...gameState.hands.black] };
  const player = gameState.currentPlayer;
  const opponent = player === 'white' ? 'black' : 'white';

  if (move.type === 'place') {
    const idx = newHands[player].indexOf(move.pieceType);
    if (idx !== -1) newHands[player].splice(idx, 1);
    newBoard[move.to.r][move.to.c] = { type: move.pieceType, color: player, id: 'sim' };
  } else {
    const p = newBoard[move.from!.r][move.from!.c];
    newBoard[move.from!.r][move.from!.c] = null;
    const target = newBoard[move.to.r][move.to.c];
    if (target) newHands[opponent].push(target.type);
    newBoard[move.to.r][move.to.c] = p;
  }

  return {
    ...gameState,
    board: newBoard,
    hands: newHands,
    currentPlayer: opponent,
  };
};

const minimax = (gameState: GameState, depth: number, alpha: number, beta: number, isMaximizing: boolean, aiColor: Color): number => {
  const winState = checkWin(gameState.board, 'white') || checkWin(gameState.board, 'black');
  if (depth === 0 || winState) {
    return evaluateBoard(gameState.board, gameState.hands, aiColor);
  }

  const moves = getLegalMoves(gameState, gameState.currentPlayer);
  if (moves.length === 0) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const evalScore = minimax(simulateMove(gameState, move), depth - 1, alpha, beta, false, aiColor);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const evalScore = minimax(simulateMove(gameState, move), depth - 1, alpha, beta, true, aiColor);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

export const getCpuMove = async (gameState: GameState): Promise<Move | null> => {
  const moves = getLegalMoves(gameState, gameState.currentPlayer);
  if (moves.length === 0) return null;

  const player = gameState.currentPlayer;
  const opponent = player === 'white' ? 'black' : 'white';

  if (gameState.difficulty === 'easy') {
    const move = moves[Math.floor(Math.random() * moves.length)];
    return { ...move, logicFeedback: "CPU (Easy): Choosing a move at random." };
  }

  if (gameState.difficulty === 'medium') {
    // 1. Win
    for (const move of moves) {
      const sim = simulateMove(gameState, move);
      if (checkWin(sim.board, player)) return { ...move, logicFeedback: "CPU (Medium): Finishing the line for a win!" };
    }
    // 2. Block
    for (const move of moves) {
      const sim = simulateMove(gameState, move);
      const opponentWins = getLegalMoves(sim, opponent).some(om => checkWin(simulateMove(sim, om).board, opponent));
      if (!opponentWins) {
          // This move at least doesn't let opponent win immediately
      } else {
          // If we find a move that prevents opponent win, prioritize it later
      }
    }
    // Medium block logic: Check if opponent has 3 in a row
    const lines = getLines();
    for(const line of lines) {
        let oppCount = 0;
        let emptyPos: Position | null = null;
        for(const pos of line) {
            const p = gameState.board[pos.r][pos.c];
            if(p?.color === opponent) oppCount++;
            else if(!p) emptyPos = pos;
        }
        if(oppCount === 3 && emptyPos) {
            // Found a threat. Find a move to this position
            const blockMove = moves.find(m => m.to.r === emptyPos!.r && m.to.c === emptyPos!.c);
            if(blockMove) return { ...blockMove, logicFeedback: `CPU (Medium): Blocking threat at ${String.fromCharCode(65 + emptyPos.c)}${emptyPos.r + 1}` };
        }
    }

    // 3. Captures
    const captureMoves = moves.filter(m => m.type === 'move' && gameState.board[m.to.r][m.to.c]);
    if (captureMoves.length > 0) return { ...captureMoves[0], logicFeedback: "CPU (Medium): Prioritizing piece capture." };

    return { ...moves[Math.floor(Math.random() * moves.length)], logicFeedback: "CPU (Medium): No immediate threats, moving strategically." };
  }

  // Hard Mode: Minimax Depth 4
  await new Promise(resolve => setTimeout(resolve, 800)); // Immersion delay
  let bestMove = moves[0];
  let bestValue = -Infinity;

  for (const move of moves) {
    const boardValue = minimax(simulateMove(gameState, move), 3, -Infinity, Infinity, false, player);
    if (boardValue > bestValue) {
      bestValue = boardValue;
      bestMove = move;
    }
  }

  const isCenter = CENTER_SQUARES.some(cs => cs.r === bestMove.to.r && cs.c === bestMove.to.c);
  const feedback = bestMove.type === 'place' 
    ? `CPU (Hard): Tactical drop to ${String.fromCharCode(65 + bestMove.to.c)}${bestMove.to.r + 1}.`
    : `CPU (Hard): Calculated move to ${isCenter ? 'Center' : 'strategic square'}.`;

  return { ...bestMove, logicFeedback: feedback };
};

function getLines() {
    const lines: Position[][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      lines.push(Array.from({ length: GRID_SIZE }, (_, j) => ({ r: i, c: j })));
      lines.push(Array.from({ length: GRID_SIZE }, (_, j) => ({ r: j, c: i })));
    }
    lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: i })));
    lines.push(Array.from({ length: GRID_SIZE }, (_, i) => ({ r: i, c: GRID_SIZE - 1 - i })));
    return lines;
}
