import { LiveCursorSdkAdapter } from "./live-adapter";
import type { CursorSdkPort } from "./port";
import { StubCursorSdkAdapter } from "./stub-adapter";

export { LiveCursorSdkAdapter } from "./live-adapter";
export type {
  CursorRunFailure,
  CursorRunInput,
  CursorRunResult,
  CursorRunSuccess,
  CursorSdkPort,
} from "./port";
export {
  StubCursorSdkAdapter,
  type StubCursorSdkOptions,
} from "./stub-adapter";

let adapterOverride: CursorSdkPort | undefined;

export function setCursorSdkAdapterForTests(
  adapter: CursorSdkPort | undefined,
): void {
  adapterOverride = adapter;
}

export function createCursorSdkAdapter(): CursorSdkPort {
  if (adapterOverride) {
    return adapterOverride;
  }

  if (process.env.E2E_LIVE_SDK === "1" && process.env.CURSOR_API_KEY) {
    return new LiveCursorSdkAdapter();
  }

  return new StubCursorSdkAdapter();
}
