import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:4000");

function App() {
  const [step, setStep] = useState("landing"); // landing | create | join | lobby | round | result | final
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);

  const [totalRounds, setTotalRounds] = useState(10);
  const [factor, setFactor] = useState(0.5);

  const [currentRound, setCurrentRound] = useState(0);
  const [totalRoundsState, setTotalRoundsState] = useState(10);

  const [choice, setChoice] = useState(50);
  const [submitted, setSubmitted] = useState(false);

  const [roundResult, setRoundResult] = useState(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  const [readyCount, setReadyCount] = useState(0);
  const [totalPlayersReady, setTotalPlayersReady] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    socket.on("roomUpdate", (roomData) => {
      setRoom({ ...roomData });
    });

    socket.on("gameStarted", (roomData) => {
      setRoom({ ...roomData });
      setStep("round");
      setSubmitted(false);
      setRoundResult(null);
      setIsReady(false);
      setReadyCount(0);
      setTotalPlayersReady(0);
    });

    socket.on("roundStarted", ({ currentRound, totalRounds }) => {
      setCurrentRound(currentRound);
      setTotalRoundsState(totalRounds);
      setStep("round");
      setSubmitted(false);
      setRoundResult(null);
      setIsReady(false);
      setReadyCount(0);
      setTotalPlayersReady(0);
    });

    socket.on("roundResult", (data) => {
      setRoundResult(data);
      setStep("result");
      setIsReady(false);
      setReadyCount(0);
      setTotalPlayersReady(
        data.playerBreakdown ? data.playerBreakdown.length : 0
      );
    });

    socket.on("readyUpdate", ({ readyCount, totalPlayers }) => {
      setReadyCount(readyCount);
      setTotalPlayersReady(totalPlayers);
    });

    socket.on("gameFinished", ({ leaderboard }) => {
      setFinalLeaderboard(leaderboard);
      setStep("final");
    });

    socket.on("roomClosed", () => {
      alert("Room closed");
      window.location.reload();
    });

    return () => {
      socket.off("roomUpdate");
      socket.off("gameStarted");
      socket.off("roundStarted");
      socket.off("roundResult");
      socket.off("readyUpdate");
      socket.off("gameFinished");
      socket.off("roomClosed");
    };
  }, []);

  const handleCreateRoom = () => {
    if (!name.trim()) return;
    socket.emit(
      "createRoom",
      { name, totalRounds: Number(totalRounds), factor: Number(factor) },
      ({ roomCode, isHost, room }) => {
        setRoomCode(roomCode);
        setIsHost(isHost);
        setRoom(room);
        setStep("lobby");
      }
    );
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !roomCode.trim()) return;
    socket.emit(
      "joinRoom",
      { name, roomCode: roomCode.toUpperCase() },
      (res) => {
        if (res.error) {
          alert(res.error);
          return;
        }
        setIsHost(res.isHost);
        setRoom(res.room);
        setRoomCode(roomCode.toUpperCase());
        setStep("lobby");
      }
    );
  };

  const handleStartGame = () => {
    socket.emit("startGame", { roomCode });
  };

  const handleSubmitNumber = () => {
    socket.emit("submitNumber", { roomCode, number: choice });
    setSubmitted(true);
  };

  const handleReadyNext = () => {
    if (isReady) return;
    socket.emit("playerReady", { roomCode });
    setIsReady(true);
  };

  const renderLanding = () => (
    <div className="card">
      <h1>Average Master</h1>
      <p className="small">
        Everyone starts with <span className="highlight">10 points</span>.  
        Each round, you pick a number between 0 and 100.  
        We take the average, multiply by a factor, and you lose points based on how far you are from the target.
      </p>

      <div className="label">Your name</div>
      <input
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={() => setStep("create")} disabled={!name.trim()}>
          Create Room
        </button>
        <button onClick={() => setStep("join")} disabled={!name.trim()}>
          Join Room
        </button>
      </div>
    </div>
  );

  const renderCreate = () => (
    <div className="card">
      <h2>Create Room</h2>
      <div className="label">Rounds</div>
      <input
        type="number"
        min="1"
        max="50"
        value={totalRounds}
        onChange={(e) => setTotalRounds(e.target.value)}
      />

      <div className="label">Multiplication factor</div>
      <input
        type="number"
        step="0.1"
        value={factor}
        onChange={(e) => setFactor(e.target.value)}
      />

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={() => setStep("landing")}>Back</button>
        <button onClick={handleCreateRoom}>Create</button>
      </div>
    </div>
  );

  const renderJoin = () => (
    <div className="card">
      <h2>Join Room</h2>
      <div className="label">Room code</div>
      <input
        placeholder="ABCDE"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
      />

      <div className="row" style={{ marginTop: 16 }}>
        <button onClick={() => setStep("landing")}>Back</button>
        <button onClick={handleJoinRoom}>Join</button>
      </div>
    </div>
  );

  const renderLobby = () => (
    <div className="card">
      <h2>Room {roomCode}</h2>
      <div className="badge">
        {isHost ? "You are the host" : "Waiting for host"}
      </div>

      <p className="small" style={{ marginTop: 12 }}>
        Share this code with friends so they can join.
      </p>

      <h3>Players</h3>
      {room && Object.values(room.players).length > 0 ? (
        Object.values(room.players).map((p, idx) => (
          <div key={idx} className="leaderboard-row">
            <span>{p.name}</span>
            <span className="small">{Number(p.score).toFixed(2)} pts</span>
          </div>
        ))
      ) : (
        <p className="small">Waiting for players…</p>
      )}

      {isHost && (
        <button
          style={{ marginTop: 16, width: "100%" }}
          onClick={handleStartGame}
          disabled={!room || Object.values(room.players).length < 2}
        >
          Start Game
        </button>
      )}

      {!isHost && (
        <p className="small" style={{ marginTop: 16 }}>
          Waiting for host to start the game…
        </p>
      )}
    </div>
  );

  const renderRound = () => (
    <div className="card">
      <div className="badge">
        Round {currentRound} of {totalRoundsState}
      </div>
      <h2>Choose your number</h2>
      <p className="small">
        Everyone still has some of their original 10 points.  
        The farther you are from the target, the more points you lose.
      </p>

      <div className="label">Your choice: {choice}</div>
      <div className="slider-row">
        <input
          type="range"
          min="0"
          max="100"
          value={choice}
          onChange={(e) => setChoice(Number(e.target.value))}
        />
        <input
          type="number"
          min="0"
          max="100"
          value={choice}
          onChange={(e) => {
            let v = Number(e.target.value);
            if (v < 0) v = 0;
            if (v > 100) v = 100;
            setChoice(v);
          }}
          style={{ width: 80 }}
        />
      </div>

      <button
        style={{ marginTop: 16, width: "100%" }}
        onClick={handleSubmitNumber}
        disabled={submitted}
      >
        {submitted ? "Waiting for others…" : "Submit"}
      </button>

      {room && (
        <div className="leaderboard">
          <div className="small">Current scores</div>
          {Object.values(room.players)
            .sort((a, b) => b.score - a.score)
            .map((p, idx) => (
              <div key={idx} className="leaderboard-row">
                <span>{p.name}</span>
                <span>{Number(p.score).toFixed(2)} pts</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderResult = () => {
    if (!roundResult) return null;
    const { avg, target, factor, winnerName, playerBreakdown } = roundResult;

    return (
      <div className="card">
        <div className="badge">Round {currentRound} result</div>
        <h2>Round Summary</h2>

        <p className="small">
          Average of all numbers:{" "}
          <span className="highlight">{Number(avg).toFixed(2)}</span>
          <br />
          Factor: <span className="highlight">{factor}</span>
          <br />
          Target (avg × factor):{" "}
          <span className="highlight">{Number(target).toFixed(2)}</span>
        </p>

        <p className="small">
          Winner:{" "}
          <span className="highlight">
            {winnerName ? winnerName : "No winner"}
          </span>
        </p>

        <div className="leaderboard">
          <div className="small">Players this round</div>
          {playerBreakdown.map((p, idx) => (
            <div key={p.id} className="leaderboard-row">
              <span>
                {idx + 1}. {p.name}
              </span>
              <span>
                chose {p.choice} | dist {p.distance.toFixed(2)} | loss {p.loss}
              </span>
              <span>{p.score.toFixed(2)} pts</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleReadyNext}
            disabled={isReady}
          >
            {isReady ? "Waiting for others…" : "Ready for next round"}
          </button>
          <p className="small center" style={{ marginTop: 8 }}>
            Ready: {readyCount} / {totalPlayersReady || playerBreakdown.length}
          </p>
        </div>
      </div>
    );
  };

  const renderFinal = () => {
    if (!finalLeaderboard || finalLeaderboard.length === 0) return null;
    const winner = finalLeaderboard[0];

    return (
      <div className="card">
        <h2>Game Over</h2>
        <p className="small">Final winner</p>
        <h1 className="highlight">{winner.name}</h1>
        <p className="small">{Number(winner.score).toFixed(2)} points left</p>

        <div className="leaderboard">
          <div className="small">Final leaderboard</div>
          {finalLeaderboard.map((p, idx) => (
            <div key={p.id} className="leaderboard-row">
              <span>
                {idx + 1}. {p.name}
              </span>
              <span>{Number(p.score).toFixed(2)} pts</span>
            </div>
          ))}
        </div>

        <button
          style={{ marginTop: 16, width: "100%" }}
          onClick={() => window.location.reload()}
        >
          Play Again
        </button>
      </div>
    );
  };

  let content;
  if (step === "landing") content = renderLanding();
  else if (step === "create") content = renderCreate();
  else if (step === "join") content = renderJoin();
  else if (step === "lobby") content = renderLobby();
  else if (step === "round") content = renderRound();
  else if (step === "result") content = renderResult();
  else if (step === "final") content = renderFinal();

  return <div className="app-root">{content}</div>;
}

export default App;
