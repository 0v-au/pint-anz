import { EXIT_INTERNAL, runAction } from "./action.js";
import { annotate } from "./workflow.js";

runAction().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    annotate("error", `Internal pint-anz lint-action failure, please report it: ${detail}`, {
      title: "PINT A-NZ lint internal error",
    });
    process.exitCode = EXIT_INTERNAL;
  },
);
