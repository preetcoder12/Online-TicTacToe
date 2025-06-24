import React, { useState, useEffect, useRef } from "react";

const App = () => {
  const [socket, setSocket] = useState(null);
  const [gameId, setGameId] = useState("");
  const [player, setPlayer] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("");
  const [inputGameId, setInputGameId] = useState("");
  const [gameStarted, setGameStarted] = useState(false);

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
          setStatus("Waiting for opponent to join...");
          break;

        case "game_joined":
          setPlayer(data.mark);
          setGameId(data.gameId);
          setGameStarted(true);
          setBoard(data.board || Array(9).fill(null));
          setTurn(data.current_turn || "X");
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
          setStatus(
            `Opponent joined! You are ${player}. ${
              data.current_turn === player ? "Your turn!" : "Opponent's turn"
            }`
          );
          break;

        case "move_made":
          setBoard([...data.board]);
          setTurn(data.next_turn);
          setStatus(
            data.next_turn === player ? "Your turn!" : "Opponent's turn"
          );
          break;

        case "game_over":
          setBoard([...data.board]);
          setGameStarted(false);
          if (data.winner === "draw") {
            setStatus("Game ended in a draw!");
          } else if (data.winner === player) {
            setStatus("🎉 You won!");
          } else {
            setStatus("💔 You lost!");
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
    setStatus("Ready to start new game");
    setInputGameId("");
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "Arial, sans-serif",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <h1>🎮 Online Tic Tac Toe</h1>

      {!player && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={createGame}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              marginRight: "10px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Create Game
          </button>
          <div style={{ marginTop: 10 }}>
            <input
              type="text"
              placeholder="Enter Game ID"
              value={inputGameId}
              onChange={(e) => setInputGameId(e.target.value)}
              style={{
                padding: "10px",
                fontSize: "16px",
                marginRight: "10px",
                border: "2px solid #ddd",
                borderRadius: "5px",
              }}
            />
            <button
              onClick={joinGame}
              style={{
                padding: "10px 20px",
                fontSize: "16px",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Join Game
            </button>
          </div>
        </div>
      )}

      {gameId && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              marginBottom: "20px",
            }}
          >
            <p>
              <strong>Game ID:</strong>{" "}
              <code
                style={{
                  backgroundColor: "#e0e0e0",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                {gameId}
              </code>
            </p>
            <p>
              <strong>You are:</strong>{" "}
              <span style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                {player}
              </span>
            </p>
            <p>
              <strong>Current Turn:</strong>{" "}
              <span style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                {turn}
              </span>
            </p>
            <p>
              <strong>Status:</strong> {status}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 100px)",
              gap: "5px",
              justifyContent: "center",
              marginBottom: "20px",
            }}
          >
            {board.map((cell, index) => (
              <div
                key={index}
                onClick={() => handleClick(index)}
                style={{
                  width: "100px",
                  height: "100px",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  lineHeight: "100px",
                  border: "3px solid #333",
                  cursor:
                    cell || turn !== player || !gameStarted
                      ? "not-allowed"
                      : "pointer",
                  backgroundColor: cell ? "#e8f5e8" : "#f9f9f9",
                  color: cell === "X" ? "#ff4444" : "#4444ff",
                  userSelect: "none",
                  transition: "all 0.2s ease",
                  borderRadius: "8px",
                }}
              >
                {cell || ""}
              </div>
            ))}
          </div>

          <button
            onClick={resetGame}
            style={{
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: "#ff6b6b",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
