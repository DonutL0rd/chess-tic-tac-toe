
import React from 'react';
import { PieceType, Color } from './types';

export const GRID_SIZE = 4;

export const PIECE_ICONS: Record<PieceType, (color: Color) => React.ReactNode> = {
  [PieceType.PAWN]: (color) => (
    <div className={`flex items-center justify-center rounded-2xl w-12 h-12 md:w-14 md:h-14 shadow-xl transition-all duration-300 transform group-hover:scale-110 ${color === 'black' ? 'bg-gradient-to-br from-neutral-100 to-neutral-300 shadow-neutral-900/40' : 'bg-gradient-to-br from-neutral-700 to-neutral-900 border border-blue-500/40 shadow-blue-900/40'}`}>
      <i className={`fa-solid fa-chess-pawn text-2xl md:text-3xl ${color === 'white' ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(191,219,254,0.6)]' : 'text-neutral-800'}`} />
    </div>
  ),
  [PieceType.ROOK]: (color) => (
    <div className={`flex items-center justify-center rounded-2xl w-12 h-12 md:w-14 md:h-14 shadow-xl transition-all duration-300 transform group-hover:scale-110 ${color === 'black' ? 'bg-gradient-to-br from-neutral-100 to-neutral-300 shadow-neutral-900/40' : 'bg-gradient-to-br from-neutral-700 to-neutral-900 border border-blue-500/40 shadow-blue-900/40'}`}>
      <i className={`fa-solid fa-chess-rook text-2xl md:text-3xl ${color === 'white' ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(191,219,254,0.6)]' : 'text-neutral-800'}`} />
    </div>
  ),
  [PieceType.KNIGHT]: (color) => (
    <div className={`flex items-center justify-center rounded-2xl w-12 h-12 md:w-14 md:h-14 shadow-xl transition-all duration-300 transform group-hover:scale-110 ${color === 'black' ? 'bg-gradient-to-br from-neutral-100 to-neutral-300 shadow-neutral-900/40' : 'bg-gradient-to-br from-neutral-700 to-neutral-900 border border-blue-500/40 shadow-blue-900/40'}`}>
      <i className={`fa-solid fa-chess-knight text-2xl md:text-3xl ${color === 'white' ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(191,219,254,0.6)]' : 'text-neutral-800'}`} />
    </div>
  ),
  [PieceType.BISHOP]: (color) => (
    <div className={`flex items-center justify-center rounded-2xl w-12 h-12 md:w-14 md:h-14 shadow-xl transition-all duration-300 transform group-hover:scale-110 ${color === 'black' ? 'bg-gradient-to-br from-neutral-100 to-neutral-300 shadow-neutral-900/40' : 'bg-gradient-to-br from-neutral-700 to-neutral-900 border border-blue-500/40 shadow-blue-900/40'}`}>
      <i className={`fa-solid fa-chess-bishop text-2xl md:text-3xl ${color === 'white' ? 'text-blue-100 drop-shadow-[0_0_10px_rgba(191,219,254,0.6)]' : 'text-neutral-800'}`} />
    </div>
  ),
};

export const INITIAL_HAND: PieceType[] = [
  PieceType.PAWN,
  PieceType.ROOK,
  PieceType.KNIGHT,
  PieceType.BISHOP
];
