// Minimal ambient declaration for the Pi host API.
//
// Pi provides `@earendil-works/pi-coding-agent` at runtime, but it is only a
// `peerDependency` here and is not installed during CI. This shim lets `tsc`
// type-check `extensions/` and `test/` without the real package present.
// Keep it in sync with the subset of the API this package actually uses.

declare module "@earendil-works/pi-coding-agent" {
  export interface ExtensionContext {
    cwd: string;
    ui: {
      notify(message: string, level: "info" | "success" | "warning" | "error"): void;
    };
  }

  export interface CommandDefinition {
    description?: string;
    handler: (args: string, ctx: ExtensionContext) => void | Promise<void>;
  }

  export interface ExtensionAPI {
    registerCommand(name: string, def: CommandDefinition): void;
    sendUserMessage(message: string): Promise<void>;
  }
}
