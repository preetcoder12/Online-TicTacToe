import React, { useState, useEffect, useRef } from "react";
import { Copy, Users, Zap, Trophy, Sparkles, Gamepad2 } from "lucide-react";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("");
  const [inputGameId, setInputGameId] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [winningLine, setWinningLine] = useState([]);
  const [moveCount, setMoveCount] = useState(0);

  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("wss://online-tictactoe-backend.onrender.com");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setStatus("Connected to server");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("WebSocket error");
    };

    ws.onclose = () => {
      console.warn("❌ WebSocket closed");
      setStatus("Connection closed");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Message from server:", data);

      switch (data.type) {
        case "game_created":
          setGameId(data.gameId);
          setPlayer("X");
          setBoard(Array(9).fill(null));
          setTurn("X");
          setGameStarted(false);
          setMoveCount(0);
          setWinningLine([]);
          setStatus("Waiting for opponent to join...");
          break;

        case "game_joined":
          setPlayer(data.mark);
          setGameId(data.gameId);
          setGameStarted(true);
          setBoard(data.board || Array(9).fill(null));
          setTurn(data.current_turn || "X");
          setMoveCount(data.board ? data.board.filter(cell => cell !== null).length : 0);
          setStatus(
            `Game started! You are ${data.mark}. ${
              data.current_turn === data.mark ? "Your turn!" : "Opponent's turn"
            }`
          );
          break;

        case "opponent_joined":
          setGameStarted(true);
          setBoard(data.board || Array(9).fill(null));
          setTurn(data.current_turn || "X");
          setMoveCount(data.board ? data.board.filter(cell => cell !== null).length : 0);
          setStatus(
            `Opponent joined! You are ${player}. ${
              data.current_turn === player ? "Your turn!" : "Opponent's turn"
            }`
          );
          break;

        case "move_made":
          setBoard([...data.board]);
          setTurn(data.next_turn);
          setMoveCount(data.board.filter(cell => cell !== null).length);
          setStatus(
            data.next_turn === player ? "Your turn!" : "Opponent's turn"
          );
          break;

        case "game_over":
          setBoard([...data.board]);
          setGameStarted(false);
          setMoveCount(data.board.filter(cell => cell !== null).length);
          
          // Calculate winning line for visual effect
          if (data.winner !== "draw") {
            const lines = [
              [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
              [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
              [0, 4, 8], [2, 4, 6] // diagonals
            ];
            
            for (let line of lines) {
              const [a, b, c] = line;
              if (data.board[a] && data.board[a] === data.board[b] && data.board[a] === data.board[c]) {
                setWinningLine(line);
                break;
              }
            }
          }
          
          if (data.winner === "draw") {
            setStatus("Epic draw! 🤝");
          } else if (data.winner === player) {
            setStatus("🎉 VICTORY! You dominated!");
          } else {
            setStatus("💔 Defeat... but you fought well!");
          }
          break;

        case "info":
          setStatus(data.message);
          if (data.message.includes("disconnected")) {
            setGameStarted(false);
          }
          break;

        case "error":
          setStatus(`Error: ${data.message}`);
          break;

        default:
          console.warn("Unhandled message type:", data);
      }
    };

    wsRef.current = ws;
    setSocket(ws);

    return () => ws.close();
  }, []);

  const createGame = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "create" }));
      setStatus("Creating game...");
    }
  };

  const joinGame = () => {
    if (!inputGameId.trim() || wsRef.current?.readyState !== WebSocket.OPEN)
      return;
    wsRef.current.send(
      JSON.stringify({ action: "join", gameId: inputGameId.trim() })
    );
    setStatus("Joining game...");
  };

  const handleClick = (index) => {
    if (
      !gameStarted ||
      board[index] !== null ||
      turn !== player ||
      wsRef.current?.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        action: "move",
        gameId,
        cell: index,
      })
    );
  };

  const resetGame = () => {
    setGameId("");
    setPlayer(null);
    setBoard(Array(9).fill(null));
    setTurn("X");
    setGameStarted(false);
    setMoveCount(0);
    setWinningLine([]);
    setStatus("Ready to start new game");
    setInputGameId("");
  };

  const copyGameId = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusIcon = () => {
    if (status.includes("Victory") || status.includes("won")) return "🏆";
    if (status.includes("Defeat") || status.includes("lost")) return "💔";
    if (status.includes("draw")) return "🤝";
    if (status.includes("Your turn")) return "⚡";
    if (status.includes("Waiting")) return "⏳";
    return "🎮";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-pink-500 to-violet-500 rounded-2xl shadow-lg">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              TIC TAC TOE
            </h1>
            <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-300 text-lg font-medium">Epic battles await</p>
        </div>

        {/* Game Setup */}
        {!player && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Choose Your Destiny</h2>
              <p className="text-gray-300">Create a new game or join an existing battle</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={createGame}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3 group"
              >
                <Zap className="w-6 h-6 group-hover:animate-bounce" />
                CREATE EPIC GAME
                <Zap className="w-6 h-6 group-hover:animate-bounce" />
              </button>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Enter Game ID..."
                  value={inputGameId}
                  onChange={(e) => setInputGameId(e.target.value)}
                  className="flex-1 bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/50 focus:border-blue-400 transition-all duration-300"
                />
                <button
                  onClick={joinGame}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  JOIN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Info */}
        {gameId && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 mb-8 border border-white/20 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Game ID</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-black/30 text-cyan-400 px-3 py-1 rounded-lg font-mono text-sm">
                      {gameId}
                    </code>
                    <button
                      onClick={copyGameId}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300 group"
                    >
                      <Copy className={`w-4 h-4 transition-colors duration-300 ${copied ? 'text-green-400' : 'text-gray-400 group-hover:text-white'}`} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">You are</span>
                  <div className={`px-4 py-2 rounded-full font-bold text-lg ${
                    player === 'X' 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  }`}>
                    {player}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Turn</span>
                  <div className={`px-4 py-2 rounded-full font-bold text-lg ${
                    turn === 'X'
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  } ${turn === player ? 'animate-pulse' : ''}`}>
                    {turn}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-medium">Moves</span>
                  <div className="px-4 py-2 bg-white/10 rounded-full font-bold text-white">
                    {moveCount}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status */}
            <div className="mt-6 p-4 bg-black/20 rounded-2xl">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl animate-bounce">{getStatusIcon()}</span>
                <span className="text-white font-bold text-lg">{status}</span>
                <span className="text-2xl animate-bounce">{getStatusIcon()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Game Board */}
        {gameId && (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
              {board.map((cell, index) => (
                <div
                  key={index}
                  onClick={() => handleClick(index)}
                  className={`
                    aspect-square bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-6xl font-black
                    border-2 transition-all duration-300 transform hover:scale-105 select-none
                    ${cell || turn !== player || !gameStarted 
                      ? 'cursor-not-allowed border-white/20' 
                      : 'cursor-pointer border-white/40 hover:border-white/60 hover:bg-white/20 hover:shadow-lg'
                    }
                    ${winningLine.includes(index) ? 'bg-gradient-to-br from-yellow-400/30 to-orange-500/30 border-yellow-400 animate-pulse' : ''}
                  `}
                >
                  {cell && (
                    <span className={`
                      transition-all duration-500 transform
                      ${cell === 'X' 
                        ? 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]' 
                        : 'text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]'
                      }
                      ${winningLine.includes(index) ? 'animate-bounce text-yellow-300' : ''}
                    `}>
                      {cell}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={resetGame}
                className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-3 mx-auto group"
              >
                <Trophy className="w-6 h-6 group-hover:animate-spin" />
                NEW BATTLE
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Share the Game ID with friends to start an epic battle! 🔥
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
