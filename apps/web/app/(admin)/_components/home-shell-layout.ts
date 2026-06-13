export const HOME_SHELL_COLUMN_WIDTHS_KEY = "home-shell-column-widths";

export const DEFAULT_TASK_LIST_WIDTH = 256;
export const DEFAULT_COMMANDER_WIDTH = 384;

export const MIN_TASK_LIST_WIDTH = 180;
export const MAX_TASK_LIST_WIDTH = 480;
export const MIN_COMMANDER_WIDTH = 280;
export const MAX_COMMANDER_WIDTH = 640;
export const MIN_DETAIL_WIDTH = 240;

export type HomeShellColumnWidths = {
  taskList: number;
  commander: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getStoredColumnWidths(): HomeShellColumnWidths {
  if (typeof window === "undefined") {
    return {
      taskList: DEFAULT_TASK_LIST_WIDTH,
      commander: DEFAULT_COMMANDER_WIDTH,
    };
  }

  try {
    const raw = localStorage.getItem(HOME_SHELL_COLUMN_WIDTHS_KEY);
    if (!raw) {
      return {
        taskList: DEFAULT_TASK_LIST_WIDTH,
        commander: DEFAULT_COMMANDER_WIDTH,
      };
    }

    const parsed = JSON.parse(raw) as Partial<HomeShellColumnWidths>;
    return {
      taskList: clamp(
        typeof parsed.taskList === "number"
          ? parsed.taskList
          : DEFAULT_TASK_LIST_WIDTH,
        MIN_TASK_LIST_WIDTH,
        MAX_TASK_LIST_WIDTH,
      ),
      commander: clamp(
        typeof parsed.commander === "number"
          ? parsed.commander
          : DEFAULT_COMMANDER_WIDTH,
        MIN_COMMANDER_WIDTH,
        MAX_COMMANDER_WIDTH,
      ),
    };
  } catch {
    return {
      taskList: DEFAULT_TASK_LIST_WIDTH,
      commander: DEFAULT_COMMANDER_WIDTH,
    };
  }
}

export function setStoredColumnWidths(widths: HomeShellColumnWidths): void {
  localStorage.setItem(HOME_SHELL_COLUMN_WIDTHS_KEY, JSON.stringify(widths));
}

export function clampColumnWidths(
  widths: HomeShellColumnWidths,
  containerWidth: number,
): HomeShellColumnWidths {
  const maxTaskList = Math.min(
    MAX_TASK_LIST_WIDTH,
    containerWidth - MIN_DETAIL_WIDTH - MIN_COMMANDER_WIDTH,
  );
  const maxCommander = Math.min(
    MAX_COMMANDER_WIDTH,
    containerWidth - MIN_DETAIL_WIDTH - MIN_TASK_LIST_WIDTH,
  );

  return {
    taskList: clamp(
      widths.taskList,
      MIN_TASK_LIST_WIDTH,
      Math.max(MIN_TASK_LIST_WIDTH, maxTaskList),
    ),
    commander: clamp(
      widths.commander,
      MIN_COMMANDER_WIDTH,
      Math.max(MIN_COMMANDER_WIDTH, maxCommander),
    ),
  };
}
