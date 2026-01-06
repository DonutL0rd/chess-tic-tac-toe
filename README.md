# Chess Tic-Tac-Toe (4x4)

A strategic 4x4 variant of Tic-Tac-Toe where players use chess pieces to control the board.

## 🎮 Game Rules

The goal is to get **4 pieces of your color in a row** (horizontally, vertically, or diagonally).

### Setup
*   The game is played on a 4x4 grid.
*   Each player starts with a hand of pieces:
    *   **2 Rooks**: Move any number of squares orthogonally (straight lines).
    *   **2 Bishops**: Move any number of squares diagonally.
    *   **2 Knights**: Move in an 'L' shape (2 squares one way, 1 square perpendicular).
    *   **2 Pawns**: Move 1 square forward. Capture diagonally forward. (Pawns change direction when they reach the end of the board).

### Gameplay
On your turn, you can either:
1.  **Place** a piece from your hand onto any empty square.
2.  **Move** a piece already on the board to a valid new square.

*   **Capturing**: You can capture opponent pieces by moving onto their square. Captured pieces are removed from the board and **added to your opponent's hand** (giving them more ammunition).
*   **Winning**: The first player to align 4 of their pieces wins.
*   **Draw**: If the same board state repeats 3 times, the game ends in a draw.

---

## 🚀 Features

*   **Solo Mode (vs CPU)**: Challenge an AI with 3 difficulty levels:
    *   *Easy*: Makes random moves.
    *   *Medium*: Blocks immediate threats and tries to win.
    *   *Hard*: Uses a Minimax algorithm with Alpha-Beta pruning to look several moves ahead.
*   **Local Multiplayer**: Play against a friend on the same device.
*   **Online Multiplayer**: Host or join a private room to play with a friend remotely (P2P).
*   **Visuals**: Smooth animations, particle effects, and multiple board themes (Classic, Slate, Emerald).

---

## 🛠 Technical Implementation

This project was built using **React** and **TypeScript** with **Vite** as the build tool.

### Core Technologies
*   **Frontend**: React 19, TypeScript
*   **Styling**: Tailwind CSS (for layout, animations, and themes)
*   **Build Tool**: Vite

### Key Systems

#### 1. Game Logic Engine (`gameLogic.ts`)
The core rules are strictly typed and separated from the UI.
*   **State Management**: The entire game state (board, hands, turn) is serializable.
*   **Validation**: Every move is validated against chess rules adapted for a 4x4 grid.
*   **Win Detection**: Efficiently checks lines after every move.

#### 2. AI Opponent (`cpuOpponent.ts`)
The CPU opponent is a custom implementation of the **Minimax algorithm**.
*   **Heuristics**: The AI evaluates board states based on material count, center control, and winning lines.
*   **Alpha-Beta Pruning**: Optimizes the search tree to allow deeper thinking (Depth 4+) in real-time.
*   **Simulation**: The AI simulates moves on a virtual board without affecting the React state until a decision is made.

#### 3. Peer-to-Peer Multiplayer (`App.tsx`)
Online play is powered by **PeerJS** (WebRTC).
*   **Direct Connection**: Players connect directly to each other using a generated "Friend Code" (Peer ID).
*   **State Sync**: Moves are serialized and sent as JSON messages. The game logic is deterministic, ensuring both players see the same board.

---

## 📦 Running Locally

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Start the development server:**
    ```bash
    npm run dev
    ```

3.  Open your browser to the local URL (usually `http://localhost:5173`).