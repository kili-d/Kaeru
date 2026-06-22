const now = Date.now();

export function createInitialBoard() {
  return {
    title: "Still pond",
    projects: [
      { id: "project-kaeru", name: "Kaeru", color: "#91aa86" },
      { id: "project-home", name: "Home", color: "#d99b83" }
    ],
    columns: [
      { id: "todo", title: "To do", accent: "#7fa77d" },
      { id: "doing", title: "Doing", accent: "#d28a6b" },
      { id: "done", title: "Done", accent: "#5f6f64" }
    ],
    cards: [
      {
        id: "card-setup",
        title: "Write the next step",
        description: "Keep it small enough to move today.",
        status: "todo",
        projectId: "project-kaeru",
        pomodorosEstimated: 2,
        pomodorosCompleted: 0,
        createdAt: now - 1000 * 60 * 60 * 6,
        order: 1
      },
      {
        id: "card-localhost",
        title: "Shape the board",
        description: "Make the surface quiet, useful, and clear.",
        status: "doing",
        projectId: "project-kaeru",
        pomodorosEstimated: 1,
        pomodorosCompleted: 0,
        createdAt: now - 1000 * 60 * 60 * 3,
        order: 1
      },
      {
        id: "card-drag",
        title: "Release finished work",
        description: "",
        status: "done",
        projectId: "project-home",
        pomodorosEstimated: 1,
        pomodorosCompleted: 1,
        createdAt: now - 1000 * 60 * 40,
        order: 1
      }
    ],
    archivedCards: []
  };
}
