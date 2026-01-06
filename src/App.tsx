
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Piece, PieceType, Color, Position, GameState, Move, GameMode, Difficulty
} from './types';
import { 
  createEmptyBoard, checkWin, getLegalMoves, isPosEqual, 
  isValidMove, serializeState
} from './gameLogic';
import { getCpuMove } from './cpuOpponent';
import { PIECE_ICONS, INITIAL_HAND, GRID_SIZE } from './constants';
import { sounds } from './sounds';
import Peer, { DataConnection } from 'peerjs';

const App: React.FC = () => {
  const [screen, setScreen] = useState<'menu' | 'difficulty' | 'game' | 'settings' | 'lobby'>('menu');
  const [boardTheme, setBoardTheme] = useState<'classic' | 'slate' | 'emerald'>('classic');
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    hands: {
      white: [...INITIAL_HAND],
      black: [...INITIAL_HAND]
    },
    pawnDirections: {
      white: -1,
      black: 1
    },
    currentPlayer: 'white',
    winner: null,
    winningLine: null,
    history: [],
    statusMessage: "White's turn to place or move.",
    gameMode: 'ai',
    difficulty: 'medium',
    positionCounts: {}
  });

  // Online Play State
  const [peerId, setPeerId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [myColor, setMyColor] = useState<Color | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  const [selectedPiece, setSelectedPiece] = useState<{ type: PieceType; from?: Position } | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Initialize Peer
  useEffect(() => {
    const peer = new Peer(Math.random().toString(36).substring(2, 8).toUpperCase());
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
    });

    peer.on('connection', (connection) => {
      connRef.current = connection;
      setMyColor('white');
      setupConnection(connection);
      resetGame('online', 'medium', 'white');
      setScreen('game');
    });

    return () => {
      peer.destroy();
    };
  }, []);

  const setupConnection = (connection: DataConnection) => {
    connection.on('data', (data: any) => {
      if (data.type === 'MOVE') {
        executeMove(data.move, true);
      }
    });
    connection.on('close', () => {
      setGameState(prev => ({ ...prev, statusMessage: "Opponent left the match." }));
    });
  };

  const connectToPeer = () => {
    if (!targetId || !peerRef.current) return;
    setIsConnecting(true);
    const connection = peerRef.current.connect(targetId);
    connRef.current = connection;
    
    connection.on('open', () => {
      setMyColor('black');
      setupConnection(connection);
      resetGame('online', 'medium', 'white');
      setScreen('game');
      setIsConnecting(false);
    });

    connection.on('error', () => {
      setIsConnecting(false);
      alert("Room not found.");
    });
  };

  const resetGame = (mode: GameMode, difficulty: Difficulty, firstPlayer: Color) => {
    const emptyBoard = createEmptyBoard();
    const initialHands = { white: [...INITIAL_HAND], black: [...INITIAL_HAND] };
    const initialPawnDirs = { white: -1, black: 1 };
    
    // Initial position count for the starting state
    const initialHash = serializeState(emptyBoard, initialHands, firstPlayer, initialPawnDirs);

    setGameState({
      board: emptyBoard,
      hands: initialHands,
      pawnDirections: initialPawnDirs,
      currentPlayer: firstPlayer,
      winner: null,
      winningLine: null,
      history: [],
      statusMessage: mode === 'online' ? "Waiting for players..." : `${firstPlayer.charAt(0).toUpperCase() + firstPlayer.slice(1)}'s turn.`,
      gameMode: mode,
      difficulty: difficulty,
      positionCounts: { [initialHash]: 1 }
    });
    setSelectedPiece(null);
  };

  const startGame = (mode: GameMode) => {
    if (mode === 'online') {
      setScreen('lobby');
      return;
    }
    if (mode === 'ai') {
        setScreen('difficulty');
        return;
    }
    setMyColor(null);
    resetGame(mode, 'medium', 'white');
    setScreen('game');
  };

  const executeMove = useCallback((move: Move, isRemote: boolean = false) => {
    setGameState(prev => {
      if (prev.winner) return prev;

      const newBoard = prev.board.map(row => [...row]);
      const newHands = { white: [...prev.hands.white], black: [...prev.hands.black] };
      const newPawnDirs = { ...prev.pawnDirections };
      const player = prev.currentPlayer;
      const opponent = player === 'white' ? 'black' : 'white';

      let activePiece: Piece;

      if (move.type === 'place') {
        const handIdx = newHands[player].indexOf(move.pieceType);
        if (handIdx === -1) return prev;
        newHands[player].splice(handIdx, 1);
        activePiece = { 
          type: move.pieceType, 
          color: player, 
          id: move.pieceId || `${player}-${move.pieceType}-${Date.now()}` 
        };
        sounds.playPlace();
      } else {
        const fromPiece = newBoard[move.from!.r][move.from!.c];
        if (!fromPiece) return prev;
        newBoard[move.from!.r][move.from!.c] = null;
        activePiece = fromPiece;
        sounds.playMove();
      }

      const targetCell = newBoard[move.to.r][move.to.c];
      if (targetCell) {
        newHands[opponent].push(targetCell.type);
        sounds.playCapture();
      }

      newBoard[move.to.r][move.to.c] = activePiece;

      if (activePiece.type === PieceType.PAWN) {
        if (move.to.r === 0) newPawnDirs[player] = 1;
        if (move.to.r === GRID_SIZE - 1) newPawnDirs[player] = -1;
      }

      const winningLine = checkWin(newBoard, player);
      let winner: Color | 'draw' | null = winningLine ? player : null;
      
      const nextPlayer = winner ? player : opponent;

      // Repetition Check (Only if no winner yet)
      const newPositionCounts = { ...prev.positionCounts };
      if (!winner) {
        const hash = serializeState(newBoard, newHands, nextPlayer, newPawnDirs);
        newPositionCounts[hash] = (newPositionCounts[hash] || 0) + 1;
        if (newPositionCounts[hash] >= 3) {
          winner = 'draw';
        }
      }

      if (winner === player) sounds.playWin();
      else if (winner === 'draw') sounds.playSelect(); // Or a draw sound if added

      let msg = move.logicFeedback || "";
      if (winner === 'draw') {
        msg = "DRAW: 3-FOLD REPETITION";
      } else if (winner) {
        msg = `${winner.toUpperCase()} WINS!`;
      } else {
        if (!msg) {
            if (prev.gameMode === 'online') {
                msg = (myColor === nextPlayer) ? "Your Turn" : "Opponent's Turn";
            } else if (prev.gameMode === 'ai') {
                msg = (nextPlayer === 'white') ? "Your Turn" : `CPU Thinking (${prev.difficulty})...`;
            } else {
                msg = `${nextPlayer.charAt(0).toUpperCase() + nextPlayer.slice(1)}'s Turn`;
            }
        }
      }

      if (!isRemote && prev.gameMode === 'online' && connRef.current?.open) {
        connRef.current.send({ type: 'MOVE', move: { ...move, pieceId: activePiece.id } });
      }

      return {
        ...prev,
        board: newBoard,
        hands: newHands,
        pawnDirections: newPawnDirs,
        currentPlayer: nextPlayer,
        winner,
        winningLine,
        history: [...prev.history, move],
        statusMessage: msg,
        positionCounts: newPositionCounts
      };
    });
    setSelectedPiece(null);
  }, [myColor]);

  // CPU Opponent Logic
  useEffect(() => {
    if (gameState.currentPlayer === 'black' && gameState.gameMode === 'ai' && !gameState.winner && !isAiThinking) {
      const runCpu = async () => {
        setIsAiThinking(true);
        const move = await getCpuMove(gameState);
        if (move) executeMove(move);
        setIsAiThinking(false);
      };
      runCpu();
    }
  }, [gameState.currentPlayer, gameState.gameMode, gameState.winner, gameState, executeMove, isAiThinking]);

  // Handle Cell Click
  const handleCellClick = (r: number, c: number) => {
    if (gameState.winner) return;
    if (gameState.gameMode === 'ai' && gameState.currentPlayer === 'black') return;
    if (gameState.gameMode === 'online' && gameState.currentPlayer !== myColor) return;

    const clickedPiece = gameState.board[r][c];

    if (selectedPiece) {
      if (selectedPiece.from && isPosEqual(selectedPiece.from, { r, c })) {
        setSelectedPiece(null);
        sounds.playSelect();
        return;
      }
      if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        setSelectedPiece({ type: clickedPiece.type, from: { r, c } });
        sounds.playSelect();
        return;
      }
      const move: Move = {
        type: selectedPiece.from ? 'move' : 'place',
        pieceType: selectedPiece.type,
        from: selectedPiece.from,
        to: { r, c }
      };
      if (move.type === 'place') {
        if (clickedPiece) return;
        executeMove(move);
      } else {
        const boardPiece = gameState.board[move.from!.r][move.from!.c];
        if (boardPiece) {
          const validation = isValidMove(gameState, boardPiece, move.from!, move.to);
          if (validation.valid) {
            executeMove(move);
          } else {
            sounds.playSelect();
          }
        }
      }
    } else {
      if (clickedPiece && clickedPiece.color === gameState.currentPlayer) {
        setSelectedPiece({ type: clickedPiece.type, from: { r, c } });
        sounds.playSelect();
      }
    }
  };

  const handleHandClick = (type: PieceType, color: Color) => {
    if (gameState.winner) return;
    if (gameState.gameMode === 'ai' && color === 'black') return;
    if (gameState.gameMode === 'online' && color !== myColor) return;
    if (gameState.currentPlayer !== color) return;

    sounds.playSelect();
    if (selectedPiece && !selectedPiece.from && selectedPiece.type === type) {
      setSelectedPiece(null);
    } else {
      setSelectedPiece({ type });
    }
  };

  const boardColors = getBoardColors(boardTheme);

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-200 flex flex-col items-center p-4 overflow-x-hidden relative select-none">
      {/* Animated Background Particles/Blobs */}
      <div className="fixed inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 rounded-full blur-[150px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[150px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[150px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-10 pt-4 relative z-10">
        <button onClick={() => { sounds.playSelect(); setScreen('menu'); }} className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:bg-neutral-800 hover:scale-110 active:scale-95 transition-all shadow-xl backdrop-blur-md group">
          <i className="fa-solid fa-home text-xl text-neutral-400 group-hover:text-blue-400 transition-colors"></i>
        </button>
        <div className="text-center group">
          <h1 className="text-3xl md:text-5xl font-serif font-black text-blue-400 tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform cursor-default uppercase">Chess Tic-Tac-Toe</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
             <div className="h-0.5 w-6 bg-gradient-to-r from-transparent to-blue-500/50"></div>
             <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-black">{gameState.gameMode} | {gameState.difficulty}</p>
             <div className="h-0.5 w-6 bg-gradient-to-l from-transparent to-blue-500/50"></div>
          </div>
        </div>
        <button onClick={() => { sounds.playSelect(); setScreen('settings'); }} className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 hover:bg-neutral-800 hover:scale-110 active:scale-95 transition-all shadow-xl backdrop-blur-md group">
          <i className="fa-solid fa-palette text-xl text-neutral-400 group-hover:text-blue-400 transition-colors"></i>
        </button>
      </header>

      <main className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-center w-full max-w-6xl relative z-10">
        {/* Hand Area - Black */}
        <HandView 
          color="black" 
          gameState={gameState} 
          selectedPiece={selectedPiece} 
          onHandClick={handleHandClick}
          isMyTurn={gameState.currentPlayer === 'black'}
          isAiThinking={isAiThinking}
          myColor={myColor}
        />

        {/* Board View */}
        <section className="flex flex-col items-center gap-8">
          <div className={`p-5 rounded-[3.5rem] bg-neutral-900/40 backdrop-blur-sm shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] border-[12px] ${boardColors.border} relative transition-all duration-500 hover:scale-[1.01]`}>
            <div className={`grid grid-cols-4 border-4 ${boardColors.border} rounded-3xl overflow-hidden shadow-2xl`}>
              {gameState.board.map((row, r) => row.map((piece, c) => (
                <BoardCell 
                  key={`${r}-${c}`}
                  r={r} 
                  c={c}
                  piece={piece}
                  isSelected={selectedPiece?.from && isPosEqual(selectedPiece.from, { r, c })}
                  isWinning={gameState.winningLine?.some(pos => isPosEqual(pos, { r, c }))}
                  isValidTarget={getValidHint(gameState, selectedPiece, { r, c })}
                  theme={boardColors}
                  onClick={() => handleCellClick(r, c)}
                  pawnDirs={gameState.pawnDirections}
                />
              )))}
            </div>
          </div>

          {/* Status HUD */}
          <div className={`px-12 py-6 rounded-3xl w-full max-w-md text-center font-black text-xl tracking-tight transition-all duration-500 border-2 shadow-2xl ${gameState.winner ? 'bg-gradient-to-r from-blue-600 to-blue-800 border-blue-400 text-white scale-110 rotate-1 animate-winner-pop' : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 backdrop-blur-md'}`}>
            <div className="text-xs uppercase text-neutral-500 mb-1 opacity-60">Status</div>
            {gameState.statusMessage}
          </div>

          {gameState.winner && (
            <button 
              onClick={() => { sounds.playSelect(); resetGame(gameState.gameMode, gameState.difficulty, 'white'); }}
              className="px-14 py-4 bg-white text-black rounded-full font-black text-xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse"
            >
              REMATCH
            </button>
          )}
        </section>

        {/* Hand Area - White */}
        <HandView 
          color="white" 
          gameState={gameState} 
          selectedPiece={selectedPiece} 
          onHandClick={handleHandClick}
          isMyTurn={gameState.currentPlayer === 'white'}
          myColor={myColor}
        />
      </main>

      {/* Overlays */}
      {screen === 'menu' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-xl animate-overlay-fade-in">
          <div className="text-center mb-16 animate-menu-pop">
            <h1 className="text-8xl md:text-9xl font-serif font-black text-blue-400 mb-2 italic drop-shadow-[0_0_40px_rgba(59,130,246,0.5)]">CHESS</h1>
            <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-8 tracking-tighter opacity-90">TIC-TAC-TOE</h2>
            <div className="h-1.5 w-48 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 mx-auto rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse"></div>
          </div>
          <div className="flex flex-col gap-5 w-full max-sm:w-full max-w-sm">
            <MenuButton label="Solo vs CPU" icon="fa-microchip" color="bg-blue-600/20 border-blue-500/50 text-blue-400" onClick={() => startGame('ai')} />
            <MenuButton label="Arena (Online)" icon="fa-satellite-dish" color="bg-purple-600/20 border-purple-500/50 text-purple-400" onClick={() => startGame('online')} />
            <MenuButton label="Local Duels" icon="fa-user-group" color="bg-emerald-600/20 border-emerald-500/50 text-emerald-400" onClick={() => startGame('local')} />
          </div>
        </div>
      )}

      {screen === 'difficulty' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-2xl animate-overlay-fade-in">
           <div className="bg-neutral-900 p-10 rounded-[3rem] border border-neutral-800 w-full max-w-md shadow-2xl animate-zoom-in">
            <h2 className="text-3xl font-serif font-black text-white mb-2 text-center uppercase">Difficulty</h2>
            <p className="text-center text-neutral-500 mb-10 text-xs tracking-widest uppercase">Select your challenge</p>
            <div className="flex flex-col gap-4">
              <DifficultyButton label="Easy" desc="Random moves, good for practice." color="border-emerald-500/50 text-emerald-400" onClick={() => { resetGame('ai', 'easy', 'white'); setScreen('game'); }} />
              <DifficultyButton label="Medium" desc="Looks 1 step ahead. Captures and blocks." color="border-yellow-500/50 text-yellow-400" onClick={() => { resetGame('ai', 'medium', 'white'); setScreen('game'); }} />
              <DifficultyButton label="Hard" desc="Minimax Depth 4+. Tactical placements." color="border-red-500/50 text-red-400" onClick={() => { resetGame('ai', 'hard', 'white'); setScreen('game'); }} />
            </div>
            <div className="mt-8 pt-8 border-t border-neutral-800 flex justify-center gap-4">
                <button onClick={() => { sounds.playSelect(); resetGame('ai', 'hard', 'black'); setScreen('game'); }} className="text-xs font-black text-blue-400 hover:text-white transition-colors tracking-widest uppercase">CPU GOES FIRST</button>
            </div>
          </div>
        </div>
      )}

      {screen === 'lobby' && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-2xl animate-overlay-fade-in">
          <div className="bg-neutral-900 p-10 rounded-[3rem] border border-neutral-800 w-full max-w-md text-center shadow-2xl animate-zoom-in">
            <h2 className="text-4xl font-serif font-black text-white mb-10">ARENA LOBBY</h2>
            <div className="mb-10 p-8 bg-neutral-950 rounded-[2rem] border border-neutral-800 shadow-inner group">
              <span className="text-xs uppercase font-black text-neutral-500 block mb-3 tracking-[0.2em]">SHARE THIS CODE</span>
              <div className="text-6xl font-mono font-black text-blue-400 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all group-hover:scale-110">{peerId || '...'}</div>
            </div>
            <div className="space-y-5">
              <input 
                type="text" 
                placeholder="ENTER FRIEND CODE"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value.toUpperCase())}
                className="w-full bg-neutral-950 border-2 border-neutral-800 rounded-2xl px-6 py-5 text-center font-mono text-2xl text-white outline-none focus:border-blue-500 transition-all shadow-inner placeholder:opacity-30"
              />
              <button 
                onClick={connectToPeer}
                disabled={isConnecting || !targetId}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xl shadow-lg transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
              >
                {isConnecting ? 'CONNECTING...' : 'JOIN ARENA'}
              </button>
            </div>
            <button onClick={() => { sounds.playSelect(); setScreen('menu'); }} className="mt-10 text-neutral-500 font-black hover:text-white transition-colors tracking-widest text-xs uppercase underline underline-offset-8">Cancel</button>
          </div>
        </div>
      )}

      {screen === 'settings' && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl animate-overlay-fade-in">
          <div className="bg-neutral-900 p-12 rounded-[3.5rem] border border-neutral-800 w-full max-w-md shadow-2xl animate-zoom-in">
            <h2 className="text-3xl font-serif font-black text-white mb-10 text-center tracking-tight uppercase">Board Style</h2>
            <div className="grid grid-cols-1 gap-4">
              {(['classic', 'slate', 'emerald'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => { sounds.playSelect(); setBoardTheme(t); setScreen('game'); }}
                  className={`py-5 px-8 rounded-2xl border-2 transition-all capitalize font-black text-xl flex justify-between items-center ${boardTheme === t ? 'bg-blue-600/10 border-blue-400 text-blue-400' : 'bg-neutral-950 border-neutral-800 text-neutral-600 hover:border-neutral-500'}`}
                >
                  {t}
                  {boardTheme === t && <i className="fa-solid fa-check animate-bounce"></i>}
                </button>
              ))}
            </div>
            <button onClick={() => { sounds.playSelect(); setScreen('game'); }} className="mt-12 w-full py-4 bg-neutral-800 text-white rounded-2xl font-black transition-all hover:bg-neutral-700 active:scale-95">CLOSE</button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite alternate;
        }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }

        @keyframes pop {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-menu-pop { animation: pop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-zoom-in { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
        
        @keyframes overlay-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-overlay-fade-in { animation: overlay-fade 0.3s ease-out; }

        @keyframes winner-pop {
          0%, 100% { transform: scale(1.1) rotate(1deg); }
          50% { transform: scale(1.15) rotate(-1deg); }
        }
        .animate-winner-pop { animation: winner-pop 1s infinite alternate; }

        .piece-enter {
          animation: piece-drop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes piece-drop {
          from { transform: translateY(-20px) scale(0); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .selected-ring {
           animation: pulse-ring 1.5s infinite;
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}} />
    </div>
  );
};

// Difficulty Button Sub-component
const DifficultyButton = ({ label, desc, color, onClick }: any) => (
  <button 
    onClick={() => { sounds.playSelect(); onClick(); }}
    className={`w-full p-6 bg-neutral-950/50 border-2 ${color} rounded-2xl transition-all hover:scale-[1.02] active:scale-95 text-left group`}
  >
    <div className="font-black text-xl mb-1 uppercase tracking-tight">{label}</div>
    <div className="text-xs text-neutral-500 opacity-80 group-hover:text-neutral-300 transition-colors">{desc}</div>
  </button>
);

// Hand View Sub-component
const HandView = ({ color, gameState, selectedPiece, onHandClick, isMyTurn, isAiThinking, myColor }: any) => {
  const isOnlineSelf = gameState.gameMode === 'online' && myColor === color;
  const isOnlineOpp = gameState.gameMode === 'online' && myColor !== color;

  return (
    <div className={`flex flex-col items-center p-8 rounded-[3rem] border-2 transition-all duration-700 relative backdrop-blur-md ${isMyTurn ? 'bg-neutral-900/60 border-blue-500/50 shadow-[0_0_50px_rgba(59,130,246,0.15)] scale-105' : 'bg-neutral-900/20 border-transparent scale-95 opacity-60'}`}>
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-6 px-4 py-1.5 rounded-full shadow-lg transition-all ${isMyTurn ? 'bg-blue-600 text-white animate-pulse' : 'bg-neutral-800 text-neutral-500'}`}>
        {color === 'white' ? 'White Commander' : 'Black Commander'} {isOnlineSelf ? '(YOU)' : isOnlineOpp ? '(OPP)' : ''}
      </span>
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-6">
        {INITIAL_HAND.map((type, i) => {
          const count = gameState.hands[color].filter((t: any) => t === type).length;
          const isSelected = selectedPiece && !selectedPiece.from && selectedPiece.type === type && gameState.currentPlayer === color;
          return (
            <div key={i} className="group relative">
              <button
                onClick={() => onHandClick(type, color)}
                disabled={count === 0 || !isMyTurn || (gameState.gameMode === 'online' && !isOnlineSelf)}
                className={`
                  relative p-1 rounded-2xl transition-all duration-500 transform
                  ${count > 0 ? 'hover:scale-115 active:scale-90 hover:rotate-3' : 'opacity-20 scale-90 grayscale cursor-not-allowed'}
                  ${isSelected ? 'scale-115 z-10' : ''}
                `}
              >
                {PIECE_ICONS[type](color)}
                {isSelected && <div className="absolute inset-0 rounded-2xl ring-4 ring-blue-500/80 animate-pulse selected-ring"></div>}
                {count > 0 && <span className="absolute -top-3 -right-3 bg-blue-500 text-[11px] px-2.5 py-1 rounded-full font-black text-white ring-4 ring-neutral-900 shadow-xl transition-transform group-hover:scale-125">{count}</span>}
              </button>
            </div>
          );
        })}
      </div>
      {isAiThinking && color === 'black' && (
        <div className="mt-8 flex flex-col items-center gap-2 animate-bounce">
           <div className="flex gap-1.5">
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
           </div>
           <span className="text-[9px] font-black text-blue-500 tracking-[0.3em] opacity-80 uppercase">AI Analyzing...</span>
        </div>
      )}
    </div>
  );
};

// Board Cell Sub-component
const BoardCell = ({ r, c, piece, isSelected, isWinning, isValidTarget, theme, onClick, pawnDirs }: any) => {
  const isDark = (r + c) % 2 === 1;
  return (
    <div
      onClick={onClick}
      className={`
        w-16 h-16 md:w-24 md:h-24 flex items-center justify-center relative cursor-pointer transition-all duration-300 overflow-hidden group
        ${isDark ? theme.dark : theme.light}
        ${isWinning ? `${theme.win} animate-pulse z-10 scale-105 shadow-2xl ring-4 ring-white/50` : ''}
        ${isSelected ? 'brightness-125 z-20 scale-105 shadow-2xl' : 'hover:brightness-110 active:scale-95'}
      `}
    >
      {/* Selection Glow */}
      {isSelected && <div className="absolute inset-0 border-[6px] border-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.6)] animate-pulse pointer-events-none"></div>}
      
      {/* Target Hint Glow */}
      {isValidTarget && (
        <div className="absolute inset-0 bg-blue-500/15 flex items-center justify-center animate-overlay-fade-in">
          <div className="w-5 h-5 md:w-8 md:h-8 rounded-full bg-blue-400/30 blur-sm animate-pulse"></div>
        </div>
      )}
      
      {/* Piece Render */}
      {piece && (
        <div className={`transform transition-all duration-500 ${piece ? 'scale-100 piece-enter' : 'scale-0'} group-hover:scale-110`}>
          {PIECE_ICONS[piece.type](piece.color)}
        </div>
      )}
      
      {/* Pawn Info Badge */}
      {piece?.type === PieceType.PAWN && (
        <div className="absolute bottom-2 right-2 text-[10px] md:text-xs font-black opacity-40 select-none mix-blend-overlay group-hover:scale-125 transition-transform">
          {piece.color === 'white' ? (pawnDirs.white === -1 ? '↑' : '↓') : (pawnDirs.black === 1 ? '↓' : '↑')}
        </div>
      )}

      {/* Grid Textures */}
      <div className={`absolute top-1 left-1 w-1 h-1 rounded-full opacity-10 ${isDark ? 'bg-white' : 'bg-black'} group-hover:scale-150 transition-transform`}></div>
    </div>
  );
};

// Menu Button Sub-component
const MenuButton = ({ label, icon, color, onClick }: any) => (
  <button 
    onClick={() => { sounds.playSelect(); onClick(); }}
    className={`flex items-center justify-between gap-6 px-10 py-6 ${color} border-2 rounded-[2rem] font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 group relative overflow-hidden`}
  >
    <div className="flex items-center gap-5 relative z-10">
      <i className={`fa-solid ${icon} text-2xl transition-transform group-hover:rotate-12`}></i>
      <span className="tracking-tight uppercase">{label}</span>
    </div>
    <i className="fa-solid fa-chevron-right text-sm opacity-50 group-hover:translate-x-2 transition-transform"></i>
    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
  </button>
);

const getValidHint = (gameState: GameState, selected: any, to: Position) => {
  if (!selected || !selected.from) return false;
  const piece = gameState.board[selected.from.r][selected.from.c];
  if (!piece) return false;
  return isValidMove(gameState, piece, selected.from, to).valid;
};

const getBoardColors = (theme: string) => {
  switch(theme) {
    case 'emerald': return { light: 'bg-emerald-100', dark: 'bg-emerald-800', border: 'border-emerald-950', win: 'bg-emerald-400' };
    case 'slate': return { light: 'bg-slate-300', dark: 'bg-slate-700', border: 'border-slate-900', win: 'bg-slate-400' };
    default: return { light: 'bg-neutral-300', dark: 'bg-neutral-700', border: 'border-neutral-900', win: 'bg-blue-500' };
  }
};

export default App;
