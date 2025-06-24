const WebSocket = require("ws");
const http = require("http");

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*",
  });
  res.end("Tic Tac Toe game server running!");
});

const wss = new WebSocket.Server({ server });
const games = {};

function generateGameId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function createGame(ws) {
  const gameId = generateGameId();
  games[gameId] = {
    players: { X: ws },
    board: Array(9).fill(null),
    turn: "X",
    status: "waiting",
  };

  ws.player = "X";
  ws.gameId = gameId;

  console.log(`🎮 Game created: ${gameId} by player X`);
  ws.send(
    JSON.stringify({
      type: "game_created",
      gameId,
      mark: "X",
    })
  );
}

function joinGame(ws, gameId) {
  const game = games[gameId];

  if (!game) {
    console.log(`❌ Game not found: ${gameId}`);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game not found",
      })
    );
    return;
  }

  if (game.players.O) {
    console.log(`❌ Game is full: ${gameId}`);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game is full",
      })
    );
    return;
  }

  if (game.status !== "waiting") {
    console.log(`❌ Game already in progress: ${gameId}`);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game already in progress",
      })
    );
    return;
  }

  // Add player O to the game
  game.players.O = ws;
  game.status = "playing";
  ws.player = "O";
  ws.gameId = gameId;

  console.log(`🎮 Player O joined game: ${gameId}`);
  console.log(`📋 Current board state:`, game.board);

  // Notify both players about the game start
  const gameState = {
    type: "game_joined",
    mark: "O",
    gameId: gameId,
    current_turn: game.turn,
    board: [...game.board],
  };

  // Send to joining player (O)
  ws.send(JSON.stringify(gameState));

  // Send to existing player (X)
  if (game.players.X && game.players.X.readyState === WebSocket.OPEN) {
    game.players.X.send(
      JSON.stringify({
        type: "opponent_joined",
        mark: "X",
        current_turn: game.turn,
        board: [...game.board],
      })
    );
  }
}

function handleMove(ws, cell, gameId) {
  const game = games[gameId];

  if (!game) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game not found",
      })
    );
    return;
  }

  if (game.status !== "playing") {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game not in progress",
      })
    );
    return;
  }

  const { board, turn } = game;

  // Validate move
  if (ws.player !== turn) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Not your turn",
      })
    );
    return;
  }

  if (cell < 0 || cell > 8 || board[cell] !== null) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid move",
      })
    );
    return;
  }

  // Make the move
  board[cell] = turn;
  game.turn = turn === "X" ? "O" : "X";

  // Check for game end
  const winner = checkWinner(board);
  if (winner) {
    game.status = "ended";
    broadcast(game, {
      type: "game_over",
      winner,
      board: [...board],
    });
    setTimeout(() => delete games[gameId], 30000);
  } else if (board.every((cell) => cell !== null)) {
    game.status = "ended";
    broadcast(game, {
      type: "game_over",
      winner: "draw",
      board: [...board],
    });
    setTimeout(() => delete games[gameId], 30000);
  } else {
    broadcast(game, {
      type: "move_made",
      board: [...board],
      next_turn: game.turn,
    });
  }
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function broadcast(game, message) {
  const msg = JSON.stringify(message);
  if (game.players.X && game.players.X.readyState === WebSocket.OPEN) {
    game.players.X.send(msg);
  }
  if (game.players.O && game.players.O.readyState === WebSocket.OPEN) {
    game.players.O.send(msg);
  }
}

function cleanupPlayerFromGame(ws) {
  if (ws.gameId && games[ws.gameId]) {
    const game = games[ws.gameId];
    const remainingPlayer = ws.player === "X" ? game.players.O : game.players.X;
    if (remainingPlayer && remainingPlayer.readyState === WebSocket.OPEN) {
      remainingPlayer.send(
        JSON.stringify({
          type: "info",
          message: "Opponent disconnected. Game ended.",
        })
      );
    }
    delete games[ws.gameId];
  }
}

wss.on("connection", (ws) => {
  console.log("🔌 New client connected");

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📩 Received from ${ws.player || "unknown"}:`, data);

      switch (data.action) {
        case "create":
          createGame(ws);
          break;
        case "join":
          joinGame(ws, data.gameId);
          break;
        case "move":
          handleMove(ws, data.cell, data.gameId);
          break;
        default:
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Unknown action",
            })
          );
      }
    } catch (err) {
      console.error("❌ Error parsing message:", err.message);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid message format",
        })
      );
    }
  });

  ws.on("close", () => {
    console.log(`❎ Client disconnected (was ${ws.player || "unknown"})`);
    cleanupPlayerFromGame(ws);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
    cleanupPlayerFromGame(ws);
  });
});

setInterval(() => {
  const gameIds = Object.keys(games);
  gameIds.forEach((gameId) => {
    const game = games[gameId];
    const hasActivePlayers = Object.values(game.players).some(
      (ws) => ws && ws.readyState === WebSocket.OPEN
    );
    if (!hasActivePlayers || game.status === "ended") {
      delete games[gameId];
    }
  });
}, 60000);

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});