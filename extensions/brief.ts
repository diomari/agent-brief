import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { COMMAND_DESCRIPTION, brief, parseArgs, tokenize } from "../src/core.ts";

// Pi adapter: thin wrapper around the host-agnostic core in src/core.ts.
export default function (pi: ExtensionAPI) {
  pi.registerCommand("brief", {
    description: COMMAND_DESCRIPTION,
    handler: async (args, ctx) => {
      try {
        const options = parseArgs(tokenize(args || ""));
        const result = await brief(ctx.cwd, options);
        ctx.ui.notify(result.notice.message, result.notice.level);
        await pi.sendUserMessage(result.kickoff);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`/brief failed: ${message}`, "error");
      }
    },
  });
}
