import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

import { FaInstagram, FaEnvelope, FaXTwitter } from "react-icons/fa6";

// Use env var in production, fallback to localhost for dev
const socket = io(
  process.env.REACT_APP_BACKEND_URL || "http://localhost:4000"
);

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

  // simple client-side history of rounds
  const [roundHistory, setRoundHistory] = useState([]);

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
      setRoundHistory([]);
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

      setRoundHistory((prev) => [
        ...prev,
        {
          round: currentRound,
          avg: data.avg,
          target: data.target,
          winnerName: data.winnerName,
        },
      ]);
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
  }, [currentRound]);

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
  const copyRoomCode = () => {
  if (roomCode) {
    navigator.clipboard.writeText(roomCode);
    alert("Room code copied!");
  }
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

  const getScoreColor = (score) => {
    if (score >= 7) return "score-bar-green";
    if (score >= 3) return "score-bar-yellow";
    return "score-bar-red";
  };

  const renderLanding = () => (
    <div className="auth-card">
      <h1 className="app-title">Average Master</h1>
      <p className="small">
        A strategic number game where you try to stay closest to the{" "}
        <span className="highlight">target average</span> and preserve your
        points.
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

        <div className="social-row">
        <a href="https://instagram.com/YOUR_USERNAME" target="_blank" className="social-emoji">
          <FaInstagram />
        </a>

        <a href="mailto:YOUR_EMAIL@gmail.com" className="social-emoji">
          <FaEnvelope />
        </a>

        <a href="https://twitter.com/YOUR_USERNAME" target="_blank" className="social-emoji">
          <FaXTwitter />
        </a>
       </div>
  


    </div>
    
  );

  const renderCreate = () => (
    <div className="auth-card">
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
    <div className="auth-card">
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
    <div className="dashboard-root">
      <div className="top-bar">
        <div className="top-left">
          <div className="top-title">Average Master</div>
          <div className="top-subtitle">Lobby</div>
        </div>
        <div className="top-right">
                      <div className="pill" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              Room: <span className="pill-strong">{roomCode}</span>

              <button
                onClick={copyRoomCode}
                style={{
                  padding: "2px 6px",
                  fontSize: "0.7rem",
                  borderRadius: "6px",
                  background: "#00b0ff",
                  border: "none",
                  color: "white",
                  cursor: "pointer"
                }}
              >
                Copy
              </button>
            </div>

          <div className="pill">
            You are{" "}
            <span className="pill-strong">
              {isHost ? "Host" : "Player"}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        <div className="panel panel-left">
          <h3 className="panel-title">Players</h3>
          {room && Object.values(room.players).length > 0 ? (
            Object.values(room.players)
              .sort((a, b) => b.score - a.score)
              .map((p, idx) => (
                <div key={idx} className="player-card">
                  <div className="player-header">
                    <span className="player-name">{p.name}</span>
                    <span className="player-score">
                      {Number(p.score).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`score-bar-fill ${getScoreColor(
                        Number(p.score)
                      )}`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (Number(p.score) / 10) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
          ) : (
            <p className="small">Waiting for players…</p>
          )}
        </div>

        <div className="panel panel-center">
          <h3 className="panel-title">Lobby Status</h3>
          <p className="small">
            Share the room code with your friends. Once everyone joins, the
            host can start the game.
          </p>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-label">Total Rounds</div>
              <div className="info-value">
                {room ? room.totalRounds : totalRounds}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Factor</div>
              <div className="info-value">
                {room ? room.factor : factor}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Players</div>
              <div className="info-value">
                {room ? Object.values(room.players).length : 0}
              </div>
            </div>
          </div>

          {isHost ? (
            <button
              className="primary-button"
              onClick={handleStartGame}
              disabled={!room || Object.values(room.players).length < 2}
            >
              Start Game
            </button>
          ) : (
            <p className="small" style={{ marginTop: 16 }}>
              Waiting for host to start the game…
            </p>
          )}
        </div>

        <div className="panel panel-right">
          <h3 className="panel-title">Host Controls</h3>
          <p className="small">
            Only visible to host. You can adjust settings before starting.
          </p>
          <div className="label">Rounds</div>
          <input
            type="number"
            min="1"
            max="50"
            value={totalRounds}
            onChange={(e) => setTotalRounds(e.target.value)}
            disabled={!isHost}
          />
          <div className="label">Factor</div>
          <input
            type="number"
            step="0.1"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            disabled={!isHost}
          />
        </div>
      </div>
    </div>
  );

  const renderRound = () => (
    <div className="dashboard-root">
      <div className="top-bar">
        <div className="top-left">
          <div className="top-title">Average Master</div>
          <div className="top-subtitle">
            Round {currentRound} of {totalRoundsState}
          </div>
        </div>
        <div className="top-right">
                    <div className="pill" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Room: <span className="pill-strong">{roomCode}</span>

            <button
              onClick={copyRoomCode}
              style={{
                padding: "2px 6px",
                fontSize: "0.7rem",
                borderRadius: "6px",
                background: "#00b0ff",
                border: "none",
                color: "white",
                cursor: "pointer"
              }}
            >
              Copy
            </button>
          </div>

          <div className="pill">
            Status:{" "}
            <span className="pill-strong">
              {submitted ? "Waiting for others" : "Your move"}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-layout">
        {/* Left: Players */}
        <div className="panel panel-left">
          <h3 className="panel-title">Players & Scores</h3>
          {room && Object.values(room.players).length > 0 ? (
            Object.values(room.players)
              .sort((a, b) => b.score - a.score)
              .map((p, idx) => (
                <div key={idx} className="player-card">
                  <div className="player-header">
                    <span className="player-name">
                      #{idx + 1} {p.name}
                    </span>
                    <span className="player-score">
                      {Number(p.score).toFixed(2)} pts
                    </span>
                  </div>
                  <div className="score-bar">
                    <div
                      className={`score-bar-fill ${getScoreColor(
                        Number(p.score)
                      )}`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (Number(p.score) / 10) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
          ) : (
            <p className="small">Waiting for players…</p>
          )}
        </div>

        {/* Center: Number selection */}
        <div className="panel panel-center">
          <h3 className="panel-title">Your Decision</h3>
          <p className="small">
            Choose a number between 0 and 100. The closer you are to the{" "}
            <span className="highlight">target (average × factor)</span>, the
            fewer points you lose.
          </p>

          <div className="number-display">
            <div className="number-label">Your choice</div>
            <div className="number-value">{choice}</div>
          </div>

          <div className="slider-row-vertical">
            <input
              type="range"
              min="0"
              max="100"
              value={choice}
              onChange={(e) => setChoice(Number(e.target.value))}
            />
          </div>

          <div className="number-input-row">
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
            />
            <button
              className="primary-button"
              onClick={handleSubmitNumber}
              disabled={submitted}
            >
              {submitted ? "Waiting for others…" : "Submit choice"}
            </button>
          </div>
        </div>

        {/* Right: Round info / history */}
        <div className="panel panel-right">
          <h3 className="panel-title">Round Overview</h3>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-label">Round</div>
              <div className="info-value">
                {currentRound} / {totalRoundsState}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Factor</div>
              <div className="info-value">
                {room ? room.factor : factor}
              </div>
            </div>
            <div className="info-card">
              <div className="info-label">Players</div>
              <div className="info-value">
                {room ? Object.values(room.players).length : 0}
              </div>
            </div>
          </div>

          <h4 className="panel-subtitle">Round History</h4>
          <div className="history-list">
            {roundHistory.length === 0 && (
              <p className="small">No completed rounds yet.</p>
            )}
            {roundHistory.map((r) => (
              <div key={r.round} className="history-item">
                <div className="history-main">
                  <span className="history-round">Round {r.round}</span>
                  <span className="history-winner">
                    {r.winnerName || "No winner"}
                  </span>
                </div>
                <div className="history-meta">
                  Avg {Number(r.avg).toFixed(1)} • Target{" "}
                  {Number(r.target).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!roundResult) return null;
    const { avg, target, factor, winnerName, playerBreakdown } = roundResult;

    const sortedPlayers = [...playerBreakdown].sort(
      (a, b) => a.distance - b.distance
    );
    const closest = sortedPlayers[0];
    const highestLoss = [...playerBreakdown].sort(
      (a, b) => b.loss - a.loss
    )[0];

    return (
      <div className="dashboard-root">
        <div className="top-bar">
          <div className="top-left">
            <div className="top-title">Average Master</div>
            <div className="top-subtitle">Round {currentRound} Summary</div>
          </div>
          <div className="top-right">
                    <div className="pill" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            Room: <span className="pill-strong">{roomCode}</span>

            <button
              onClick={copyRoomCode}
              style={{
                padding: "2px 6px",
                fontSize: "0.7rem",
                borderRadius: "6px",
                background: "#00b0ff",
                border: "none",
                color: "white",
                cursor: "pointer"
              }}
            >
              Copy
            </button>
          </div>
            <div className="pill">
              Ready:{" "}
              <span className="pill-strong">
                {readyCount} /{" "}
                {totalPlayersReady || playerBreakdown.length}
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-layout">
          {/* Left: Players this round */}
          <div className="panel panel-left">
            <h3 className="panel-title">Players This Round</h3>
            <div className="round-player-list">
              {playerBreakdown.map((p, idx) => (
                <div key={p.id} className="player-card">
                  <div className="player-header">
                    <span className="player-name">
                      #{idx + 1} {p.name}
                    </span>
                    <span className="player-score">
                      {p.score.toFixed(2)} pts
                    </span>
                  </div>
                <div className="player-meta-grid">
                <div className="meta-item">
                  <div className="meta-label">Choice</div>
                  <div className="meta-value">{p.choice}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Distance</div>
                  <div className="meta-value">{p.distance.toFixed(2)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Loss</div>
                  <div className="meta-value">{p.loss.toFixed(2)}</div>
                </div>
              </div>

                  <div className="score-bar">
                    <div
                      className={`score-bar-fill ${getScoreColor(
                        Number(p.score)
                      )}`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, (Number(p.score) / 10) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Analytics */}
          <div className="panel panel-center">
            <h3 className="panel-title">Round Analytics</h3>
            <div className="info-grid">
              <div className="info-card">
                <div className="info-label">Average</div>
                <div className="info-value">
                  {Number(avg).toFixed(2)}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">Factor</div>
                <div className="info-value">{factor}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Target</div>
                <div className="info-value">
                  {Number(target).toFixed(2)}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">Winner</div>
                <div className="info-value">
                  {winnerName || "No winner"}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">Closest Guess</div>
                <div className="info-value">
                  {closest
                    ? `${closest.name} (${closest.choice})`
                    : "-"}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">Highest Loss</div>
                <div className="info-value">
                  {highestLoss
                    ? `${highestLoss.name} (${highestLoss.loss.toFixed(
                        2
                      )})`
                    : "-"}
                </div>
              </div>
            </div>

            <div className="race-track-visual">
            <div className="race-track-line">
              <div className="race-target">🎯 {Number(target).toFixed(1)}</div>

              {playerBreakdown.map((p) => {
                const maxDist = Math.max(...playerBreakdown.map(x => Math.abs(x.choice - target)), 1);
                const distFromTarget = Math.abs(p.choice - target);
                const progress = 100 - (distFromTarget / maxDist) * 100;
                const shortName = p.name.slice(0, 3).toUpperCase();

                return (
                  <div key={p.id} className="race-runner" style={{ left: `${progress}%` }}>
                    <div className="runner-guess">{p.choice}</div>
                    <div className="runner-emoji">🏃‍➡️</div>
                    <div className="runner-name">{shortName}</div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
         

          

          {/* Right: Ready / next round */}
          <div className="panel panel-right">
            <h3 className="panel-title">Next Round</h3>
            <p className="small">
              Once everyone is ready, the next round will start
              automatically.
            </p>
            <button
              className="primary-button"
              onClick={handleReadyNext}
              disabled={isReady}
            >
              {isReady ? "Waiting for others…" : "Ready for next round"}
            </button>
            <p className="small center" style={{ marginTop: 8 }}>
              Ready: {readyCount} /{" "}
              {totalPlayersReady || playerBreakdown.length}
            </p>

            <h4 className="panel-subtitle" style={{ marginTop: 24 }}>
              Round History
            </h4>
            <div className="history-list">
              {roundHistory.length === 0 && (
                <p className="small">No previous rounds.</p>
              )}
              {roundHistory.map((r) => (
                <div key={r.round} className="history-item">
                  <div className="history-main">
                    <span className="history-round">
                      Round {r.round}
                    </span>
                    <span className="history-winner">
                      {r.winnerName || "No winner"}
                    </span>
                  </div>
                  <div className="history-meta">
                    Avg {Number(r.avg).toFixed(1)} • Target{" "}
                    {Number(r.target).toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinal = () => {
    if (!finalLeaderboard || finalLeaderboard.length === 0) return null;
    const winner = finalLeaderboard[0];

    return (
      <div className="dashboard-root">
        <div className="top-bar">
          <div className="top-left">
            <div className="top-title">Average Master</div>
            <div className="top-subtitle">Game Over</div>
          </div>
          <div className="top-right">
            <div className="pill">
              Room: <span className="pill-strong">{roomCode}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-layout">
          <div className="panel panel-center full-width-panel">
            <h2 className="panel-title center">Final Winner</h2>
            <div className="winner-display">
              <div className="winner-name">{winner.name}</div>
              <div className="winner-score">
                {Number(winner.score).toFixed(2)} points left
              </div>
            </div>

            <div className="leaderboard">
              <div className="leaderboard-header">
                <span>Rank</span>
                <span>Player</span>
                <span>Score</span>
              </div>
              {finalLeaderboard.map((p, idx) => (
                <div key={p.id} className="leaderboard-row">
                  <span>#{idx + 1}</span>
                  <span>{p.name}</span>
                  <span>{Number(p.score).toFixed(2)} pts</span>
                </div>
              ))}
            </div>

            <button
              className="primary-button"
              style={{ marginTop: 24 }}
              onClick={() => window.location.reload()}
            >
              Play Again
            </button>
          </div>
        </div>
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
