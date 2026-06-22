import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { COMMAND_DESCRIPTION, onboard, parseArgs, tokenize } from "../src/core.ts";

// Pi adapter: thin wrapper around the host-agnostic core in src/core.ts.
export default function (pi: ExtensionAPI) {
  pi.registerCommand("onboard", {
    description: COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      try {
        const options = parseArgs(tokenize(args || ""));
        const result = await onboard(ctx.cwd, options);
        ctx.ui.notify(result.notice.message, result.notice.level);
        await pi.sendUserMessage(result.kickoff);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`/onboard failed: ${message}`, "error");
      }
    },
  });
}
