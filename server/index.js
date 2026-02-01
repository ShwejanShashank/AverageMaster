import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
const app = express();
app.use(cors());
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 4000;

// Room structure:
// rooms[roomCode] = {
//   hostId,
//   factor,
//   totalRounds,
//   currentRound,
//   players: { socketId: { name, score, lastChoice } },
//   roundChoices: { socketId: number },
//   readyPlayers: { socketId: true },
//   status: "waiting" | "in-progress" | "finished"
// };

const rooms = {};

function createRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // CREATE ROOM
  socket.on("createRoom", ({ name, totalRounds, factor }, callback) => {
    const roomCode = createRoomCode();

    rooms[roomCode] = {
      hostId: socket.id,
      factor: factor ?? 0.5,
      totalRounds: totalRounds ?? 10,
      currentRound: 0,
      players: {},
      roundChoices: {},
      readyPlayers: {},
      status: "waiting"
    };

    rooms[roomCode].players[socket.id] = {
      name,
      score: 10, // everyone starts with 10 points TOTAL
      lastChoice: null
    };

    socket.join(roomCode);
    callback({ roomCode, isHost: true, room: rooms[roomCode] });
    io.to(roomCode).emit("roomUpdate", rooms[roomCode]);
  });

  // JOIN ROOM
  socket.on("joinRoom", ({ name, roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) {
      callback({ error: "Room not found" });
      return;
    }

    room.players[socket.id] = {
      name,
      score: 10, // start with 10 points
      lastChoice: null
    };

    socket.join(roomCode);
    callback({ roomCode, isHost: room.hostId === socket.id, room });
    io.to(roomCode).emit("roomUpdate", room);
  });

  // START GAME
  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.hostId !== socket.id) return;

    room.status = "in-progress";
    room.currentRound = 1;
    room.roundChoices = {};
    room.readyPlayers = {};

    io.to(roomCode).emit("gameStarted", room);
    io.to(roomCode).emit("roundStarted", {
      currentRound: room.currentRound,
      totalRounds: room.totalRounds
    });
  });

  // SUBMIT NUMBER
  socket.on("submitNumber", ({ roomCode, number }) => {
    const room = rooms[roomCode];
    if (!room || room.status !== "in-progress") return;

    room.roundChoices[socket.id] = Number(number);
    room.players[socket.id].lastChoice = Number(number);

    const totalPlayers = Object.keys(room.players).length;
    const submitted = Object.keys(room.roundChoices).length;

    io.to(roomCode).emit("roomUpdate", room);

    // If all players submitted → calculate results
    if (submitted === totalPlayers) {
      const numbers = Object.values(room.roundChoices);
      const avg =
        numbers.reduce((sum, n) => sum + n, 0) / numbers.length || 0;
      const target = avg * room.factor;

      let winnerId = null;
      let closestDistance = Infinity;

      // SCORING: players lose a small amount based on distance
      // loss = distance / 10 (balanced so players don't hit zero immediately)
      Object.entries(room.players).forEach(([id, player]) => {
        const choice = room.roundChoices[id];
        const distance = Math.abs(choice - target);

        const loss = distance / 10; // balanced loss
        player.score -= loss;

        // prevent negative score
        if (player.score < 0) player.score = 0;

        if (distance < closestDistance) {
          closestDistance = distance;
          winnerId = id;
        }
      });

      // Build breakdown for UI (include loss per player)
      const playerBreakdown = Object.entries(room.players).map(
        ([id, p]) => {
          const choice = room.roundChoices[id];
          const distance = Math.abs(choice - target);
          const loss = Number((distance / 10).toFixed(2));
          return {
            id,
            name: p.name,
            choice,
            distance: Number(distance.toFixed(2)),
            loss,
            score: Number(p.score.toFixed(2))
          };
        }
      );

      io.to(roomCode).emit("roundResult", {
        avg,
        target,
        factor: room.factor,
        winnerId,
        winnerName: winnerId ? room.players[winnerId].name : null,
        playerBreakdown
      });

      // Reset ready list for next round
      room.readyPlayers = {};
    }
  });

  // PLAYER READY FOR NEXT ROUND
  socket.on("playerReady", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.readyPlayers[socket.id] = true;

    const totalPlayers = Object.keys(room.players).length;
    const readyCount = Object.keys(room.readyPlayers).length;

    io.to(roomCode).emit("readyUpdate", {
      readyCount,
      totalPlayers
    });

    // If all ready → next round or finish
    if (readyCount === totalPlayers) {
      // If last round → finish game
      if (room.currentRound >= room.totalRounds) {
        room.status = "finished";

        const finalLeaderboard = Object.entries(room.players)
          .map(([id, p]) => ({
            id,
            name: p.name,
            score: Number(p.score.toFixed(2))
          }))
          .sort((a, b) => b.score - a.score);

        io.to(roomCode).emit("gameFinished", {
          leaderboard: finalLeaderboard
        });
        return;
      }

      // Otherwise start next round
      room.currentRound += 1;
      room.roundChoices = {};
      room.readyPlayers = {};

      io.to(roomCode).emit("roundStarted", {
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
      });
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    for (const [roomCode, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];

        // If host left or no players left, close room
        if (
          room.hostId === socket.id ||
          Object.keys(room.players).length === 0
        ) {
          delete rooms[roomCode];
          io.to(roomCode).emit("roomClosed");
        } else {
          io.to(roomCode).emit("roomUpdate", room);
        }
      }
    }
  });
});

app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"));
});
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
