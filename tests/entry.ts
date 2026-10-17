// Test entry point: same wiring as src/main.ts but with a deterministic seed.
import { registerCommands } from "../src/core/commands";
import { initDirector } from "../src/game/director";

registerCommands();
initDirector(12345);
import { initJournal } from "../src/journal/journal";
initJournal();
