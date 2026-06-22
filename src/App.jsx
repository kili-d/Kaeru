import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { AuthScreen } from "./components/AuthScreen";
import { CardEditor } from "./components/CardEditor";
import { EmptyState } from "./components/EmptyState";
import { KanbanBoard } from "./components/KanbanBoard";
import { VerifyEmailScreen } from "./components/VerifyEmailScreen";
import { useAuth } from "./hooks/useAuth";
import { usePersistentBoard } from "./hooks/usePersistentBoard";
import { createId } from "./utils/createId";
import { DEFAULT_POMODORO_SECONDS, getRemainingPomodoros, toPomodoroCount } from "./utils/pomodoro";

const COLUMN_ACCENTS = ["#7fa77d", "#d28a6b", "#78909b", "#d6bf8f", "#91aa86"];

export default function App() {
  const { auth, confirmEmail, error, isLoading, login, logout, register, resetVerification, setup, verification } =
    useAuth();
  const [authMode, setAuthMode] = useState("login");

  if (isLoading) {
    return (
      <main className="auth-shell">
        <div className="auth-panel is-loading">
          <p className="auth-loading">Loading Kaeru</p>
        </div>
      </main>
    );
  }

  if (auth.setupRequired) {
    return (
      <AuthScreen
        error={error}
        isLoading={isLoading}
        mode="setup"
        onLogin={login}
        onSetup={setup}
        setupTokenRequired={auth.setupTokenRequired}
      />
    );
  }

  if (auth.verificationRequired || verification) {
    return (
      <VerifyEmailScreen
        email={verification?.email || ""}
        error={error}
        isLoading={isLoading}
        onConfirm={() => confirmEmail()}
        onReset={resetVerification}
        verification={verification}
      />
    );
  }

  if (!auth.user) {
    return (
      <AuthScreen
        allowRegistration={auth.allowRegistration}
        error={error}
        isLoading={isLoading}
        mode={auth.allowRegistration ? authMode : "login"}
        onLogin={login}
        onRegister={register}
        onSetup={setup}
        onToggleMode={() => setAuthMode((current) => (current === "login" ? "register" : "login"))}
      />
    );
  }

  return <BoardApp onLogout={logout} />;
}

function BoardApp({ onLogout }) {
  const { board, dispatch } = usePersistentBoard({ onUnauthorized: onLogout });
  const [editingCardId, setEditingCardId] = useState(null);
  const [doneReaction, setDoneReaction] = useState(null);
  const [isPomodoroMode, setIsPomodoroMode] = useState(false);
  const [activePomodoroCardId, setActivePomodoroCardId] = useState(null);
  const [pomodoroSecondsRemaining, setPomodoroSecondsRemaining] = useState(DEFAULT_POMODORO_SECONDS);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [isPomodoroAlertPlaying, setIsPomodoroAlertPlaying] = useState(false);
  const [pomodoroAlertVersion, setPomodoroAlertVersion] = useState(0);
  const [isColumnComposerOpen, setIsColumnComposerOpen] = useState(false);
  const [columnTitleDraft, setColumnTitleDraft] = useState("");
  const pomodoroAudioContextRef = useRef(null);
  const pomodoroAudioBufferRef = useRef(null);
  const pomodoroAudioSourceRef = useRef(null);

  const doneColumnId = board.columns[board.columns.length - 1]?.id;
  const editingCard = board.cards.find((card) => card.id === editingCardId);
  const archivedCards = useMemo(() => board.archivedCards || [], [board.archivedCards]);
  const openCards = useMemo(
    () => board.cards.filter((card) => card.status !== doneColumnId),
    [board.cards, doneColumnId]
  );
  const totalRemainingPomodoros = useMemo(
    () => openCards.reduce((total, card) => total + getRemainingPomodoros(card), 0),
    [openCards]
  );
  const activePomodoroCard = board.cards.find((card) => card.id === activePomodoroCardId);
  const activePomodoroRemaining = getRemainingPomodoros(activePomodoroCard);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const context = new AudioContextClass();
    pomodoroAudioContextRef.current = context;

    let cancelled = false;

    async function loadPomodoroSound() {
      try {
        const response = await fetch("/assets/kaeru-timer.wav");
        const bytes = await response.arrayBuffer();
        const decoded = await context.decodeAudioData(bytes.slice(0));
        if (!cancelled) {
          pomodoroAudioBufferRef.current = decoded;
        }
      } catch {
        pomodoroAudioBufferRef.current = null;
      }
    }

    loadPomodoroSound();

    return () => {
      cancelled = true;
      if (pomodoroAudioSourceRef.current) {
        pomodoroAudioSourceRef.current.stop();
        pomodoroAudioSourceRef.current.disconnect();
        pomodoroAudioSourceRef.current = null;
      }
      pomodoroAudioBufferRef.current = null;
      pomodoroAudioContextRef.current = null;
      context.close().catch(() => {});
    };
  }, []);

  const stopPomodoroAlert = useCallback(() => {
    const source = pomodoroAudioSourceRef.current;
    if (source) {
      source.stop();
      source.disconnect();
      pomodoroAudioSourceRef.current = null;
    }
    setIsPomodoroAlertPlaying(false);
  }, []);

  const primePomodoroAudio = useCallback(() => {
    pomodoroAudioContextRef.current?.resume().catch(() => {});
  }, []);

  useEffect(() => {
    if (!doneReaction) return undefined;

    const timeout = window.setTimeout(() => {
      setDoneReaction(null);
    }, 1900);

    return () => window.clearTimeout(timeout);
  }, [doneReaction]);

  useEffect(() => {
    if (!isPomodoroRunning) return undefined;

    const interval = window.setInterval(() => {
      setPomodoroSecondsRemaining((current) => {
        if (current <= 1) {
          setIsPomodoroRunning(false);
          setPomodoroAlertVersion((value) => value + 1);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPomodoroRunning]);

  useEffect(() => {
    if (!pomodoroAlertVersion) return;

    const context = pomodoroAudioContextRef.current;
    const buffer = pomodoroAudioBufferRef.current;
    if (!context || !buffer) return;

    stopPomodoroAlert();
    context.resume().catch(() => {});

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(context.destination);
    source.onended = () => {
      if (pomodoroAudioSourceRef.current === source) {
        pomodoroAudioSourceRef.current = null;
        setIsPomodoroAlertPlaying(false);
      }
    };

    source.start(0);
    pomodoroAudioSourceRef.current = source;
    setIsPomodoroAlertPlaying(true);
  }, [pomodoroAlertVersion, stopPomodoroAlert]);

  useEffect(() => {
    if (!activePomodoroCardId) return;

    const activeCardIsUnavailable =
      !activePomodoroCard ||
      activePomodoroCard.status === doneColumnId ||
      toPomodoroCount(activePomodoroCard.pomodorosEstimated) <= 0;

    if (activeCardIsUnavailable) {
      stopPomodoroAlert();
      setActivePomodoroCardId(null);
      setIsPomodoroRunning(false);
      setPomodoroSecondsRemaining(DEFAULT_POMODORO_SECONDS);
    }
  }, [activePomodoroCard, activePomodoroCardId, doneColumnId, stopPomodoroAlert]);

  useEffect(() => {
    if (editingCardId && !board.cards.some((card) => card.id === editingCardId)) {
      setEditingCardId(null);
    }
  }, [board.cards, editingCardId]);

  const triggerDoneReaction = useCallback(() => {
    setDoneReaction({ id: createId("reaction") });
  }, []);

  const togglePomodoroMode = useCallback(() => {
    stopPomodoroAlert();
    setIsPomodoroMode((current) => !current);
    setIsPomodoroRunning(false);
  }, [stopPomodoroAlert]);

  const startPomodoro = useCallback(() => {
    if (!activePomodoroCard || activePomodoroCard.status === doneColumnId || activePomodoroRemaining <= 0) return;
    stopPomodoroAlert();
    primePomodoroAudio();
    if (pomodoroSecondsRemaining <= 0) setPomodoroSecondsRemaining(DEFAULT_POMODORO_SECONDS);
    setIsPomodoroRunning(true);
  }, [
    activePomodoroCard,
    activePomodoroRemaining,
    doneColumnId,
    pomodoroSecondsRemaining,
    primePomodoroAudio,
    stopPomodoroAlert
  ]);

  const pausePomodoro = useCallback(() => {
    setIsPomodoroRunning(false);
  }, []);

  const resetPomodoro = useCallback(() => {
    stopPomodoroAlert();
    setIsPomodoroRunning(false);
    setPomodoroSecondsRemaining(DEFAULT_POMODORO_SECONDS);
  }, [stopPomodoroAlert]);

  const completePomodoro = useCallback(() => {
    if (!activePomodoroCard || activePomodoroCard.status === doneColumnId) return;

    const estimated = toPomodoroCount(activePomodoroCard.pomodorosEstimated);
    const completed = toPomodoroCount(activePomodoroCard.pomodorosCompleted);
    if (estimated <= 0 || completed >= estimated) return;

    dispatch({
      type: "card/update",
      payload: {
        cardId: activePomodoroCard.id,
        patch: {
          pomodorosCompleted: Math.min(estimated, completed + 1)
        }
      }
    });
    stopPomodoroAlert();
    setIsPomodoroRunning(false);
    setPomodoroSecondsRemaining(DEFAULT_POMODORO_SECONDS);
  }, [activePomodoroCard, dispatch, doneColumnId, stopPomodoroAlert]);

  const openColumnComposer = useCallback(() => {
    setIsColumnComposerOpen(true);
  }, []);

  const addColumn = useCallback(
    (event) => {
      event?.preventDefault?.();
      const title = columnTitleDraft.trim();
      if (!title) return;

      dispatch({
        type: "column/add",
        payload: {
          column: {
            id: createId("column"),
            title,
            accent: COLUMN_ACCENTS[board.columns.length % COLUMN_ACCENTS.length]
          }
        }
      });
      setColumnTitleDraft("");
      setIsColumnComposerOpen(false);
    },
    [board.columns.length, columnTitleDraft, dispatch]
  );

  function addStarterCard() {
    dispatch({
      type: "card/add",
      payload: {
        id: createId("card"),
        title: "New card",
        columnId: board.columns[0].id
      }
    });
  }

  return (
    <main className="app-shell">
      <AppHeader
        doneReaction={doneReaction}
        archivedCards={archivedCards}
        projects={board.projects}
        onLogout={onLogout}
        onAddColumn={openColumnComposer}
        onResetBoard={() => {
          if (window.confirm("Reset this board?")) {
            stopPomodoroAlert();
            dispatch({ type: "board/reset" });
            setEditingCardId(null);
            setActivePomodoroCardId(null);
            setIsPomodoroMode(false);
            setIsPomodoroRunning(false);
            setPomodoroSecondsRemaining(DEFAULT_POMODORO_SECONDS);
          }
        }}
        onArchiveCards={() => dispatch({ type: "cards/archiveAll" })}
        onClearAllCards={() => dispatch({ type: "cards/clearAll" })}
        onRestoreArchivedCard={(cardId) =>
          dispatch({
            type: "archive/restoreCard",
            payload: { cardId }
          })
        }
      />

      <section className="board-stage">
        {isColumnComposerOpen && (
          <form className="column-create" onSubmit={addColumn}>
            <input
              className="form-field"
              value={columnTitleDraft}
              onChange={(event) => setColumnTitleDraft(event.target.value)}
              placeholder="New column title"
              autoFocus
            />
            <div className="column-create-actions">
              <button className="text-button primary" type="submit">
                Add column
              </button>
              <button
                className="icon-button subtle"
                type="button"
                title="Cancel"
                onClick={() => {
                  setIsColumnComposerOpen(false);
                  setColumnTitleDraft("");
                }}
              >
                <span aria-hidden="true">x</span>
              </button>
            </div>
          </form>
        )}
        {board.cards.length === 0 ? (
          <EmptyState title="No cards yet" onAddCard={addStarterCard} />
        ) : (
          <KanbanBoard
            columns={board.columns}
            cards={board.cards}
            projects={board.projects}
            defaultProjectId=""
            activePomodoroCard={activePomodoroCard}
            activePomodoroCardId={activePomodoroCardId}
            activePomodoroRemaining={activePomodoroRemaining}
            isPomodoroAlertPlaying={isPomodoroAlertPlaying}
            isPomodoroMode={isPomodoroMode}
            isPomodoroRunning={isPomodoroRunning}
            pomodoroSecondsRemaining={pomodoroSecondsRemaining}
            totalRemainingPomodoros={totalRemainingPomodoros}
            onCardOpen={setEditingCardId}
            onCardCompleted={triggerDoneReaction}
            onPomodoroCardSelect={setActivePomodoroCardId}
            onPomodoroComplete={completePomodoro}
            onPomodoroPause={pausePomodoro}
            onPomodoroReset={resetPomodoro}
            onPomodoroStart={startPomodoro}
            onPomodoroStopAlert={stopPomodoroAlert}
            onPomodoroToggle={togglePomodoroMode}
            dispatch={dispatch}
          />
        )}
      </section>

      {editingCard && (
        <CardEditor
          card={editingCard}
          projects={board.projects}
          dispatch={dispatch}
          onClose={() => setEditingCardId(null)}
        />
      )}
    </main>
  );
}
