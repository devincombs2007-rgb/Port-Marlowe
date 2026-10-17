import { chance, range, type Rng } from "../util/rng";

/**
 * The Mimic's tactical brain (pure). It is livestock until it is not.
 *
 *  disguise  grazes (barely); freezes whenever watched; imitates familiar sounds when you are near but not looking
 *  turn      watched too long: the head turns all the way round, then it ambles off and is gone
 *  reveal    approached, struck or lit up close: it unfolds (a fixed, readable 1.4 s tell)
 *  attack    only with the director's go-ahead, briefly, then it flees
 *  flee      skitters away and vanishes
 *
 * Fairness: the reveal always plays before any attack, attacks need director permission, hits are capped, and
 * light, distance or injury always end it.
 */
export type MState = "disguise" | "turn" | "reveal" | "attack" | "flee" | "gone";

export interface MCtx {
  dt: number;
  age: number;
  dist: number;
  seen: boolean;
  /** It was damaged since the last step. */
  struck: boolean;
  /** Player holds/stands near a light source. */
  playerLit: boolean;
  playerHealth: number;
  hpFrac: number;
  hits: number;
  requested: "observe" | "stalk" | "hunt";
  gentle: boolean;
}

export type MImitation = "moo" | "step" | "door" | "chest" | "voice";

export type MEvent =
  | { type: "group"; event: "dread:set_graze" | "dread:set_still" | "dread:set_reveal" | "dread:set_flee" | "dread:set_attack" }
  | { type: "imitate"; sound: MImitation }
  | { type: "action"; action: "head_turn" | "none" }
  | { type: "encounter"; kind: "mimic_revealed" | "mimic_turned" }
  | { type: "stress"; amount: number }
  | { type: "vanish"; outcome: string };

export const MTUNING = {
  maxLifetime: 360,
  revealDist: 6,
  litRevealDist: 9,
  watchToTurn: 5,
  revealTime: 1.4,
  attackMax: 20,
  hitsToFlee: 2,
};

export class MimicTactics {
  state: MState = "disguise";
  private stateAge = 0;
  private seenFor = 0;
  private unseenFor = 0;
  private stillWhileSeen = false;
  private nextImitation: number;
  private lastImitation: MImitation | undefined;
  private fleeFor = 0;
  private outcome = "fled";
  private forced: string | undefined;
  private pending: MEvent[] = [{ type: "group", event: "dread:set_graze" }];

  constructor(private readonly rng: Rng) {
    this.nextImitation = range(rng, 8, 20);
  }

  forceRetreat(reason: string): void {
    if (this.state !== "gone" && this.state !== "flee") this.forced = reason;
  }

  private flee(outcome: string, out: MEvent[]): void {
    this.state = "flee";
    this.stateAge = 0;
    this.outcome = outcome;
    this.fleeFor = range(this.rng, 5, 8);
    out.push({ type: "group", event: "dread:set_flee" });
  }

  private reveal(out: MEvent[]): void {
    this.state = "reveal";
    this.stateAge = 0;
    out.push({ type: "group", event: "dread:set_reveal" }, { type: "encounter", kind: "mimic_revealed" }, { type: "stress", amount: 8 });
  }

  step(c: MCtx): MEvent[] {
    const out: MEvent[] = this.pending.splice(0);
    if (this.state === "gone") return out;
    this.stateAge += c.dt;
    this.seenFor = c.seen ? this.seenFor + c.dt : 0;
    this.unseenFor = c.seen ? 0 : this.unseenFor + c.dt;

    if (this.forced) {
      const r = this.forced;
      this.forced = undefined;
      // a disguised Mimic just wanders off; a revealed one runs
      if (this.state === "disguise" || this.state === "turn") return this.vanishQuietly(r, out);
      this.flee(r, out);
      return out;
    }
    if (c.age > MTUNING.maxLifetime && this.state !== "flee") return this.vanishQuietly("lifetime", out);

    switch (this.state) {
      case "disguise": this.stepDisguise(c, out); break;
      case "turn":
        if (c.struck || c.dist < MTUNING.revealDist) this.reveal(out);
        else if (this.stateAge > 3.2 && this.unseenFor > 2) return this.vanishQuietly("turned", out);
        else if (this.stateAge > 20) return this.vanishQuietly("turned", out);
        break;
      case "reveal":
        if (this.stateAge >= MTUNING.revealTime) {
          if (c.requested === "hunt" && !c.playerLit && c.playerHealth > 6) {
            this.state = "attack";
            this.stateAge = 0;
            out.push({ type: "group", event: "dread:set_attack" });
          } else this.flee("revealed", out);
        }
        break;
      case "attack":
        if (c.hits >= (c.gentle ? 1 : MTUNING.hitsToFlee)) this.flee("satisfied", out);
        else if (c.hpFrac < 0.5) this.flee("injured", out);
        else if (c.playerLit) this.flee("light", out);
        else if (c.playerHealth <= 6) this.flee("player-hurt", out);
        else if (this.stateAge > MTUNING.attackMax) this.flee("timeout", out);
        break;
      case "flee":
        this.fleeFor -= c.dt;
        if (this.fleeFor <= 0 || c.dist > 40) {
          this.state = "gone";
          out.push({ type: "vanish", outcome: this.outcome });
        }
        break;
    }
    return out;
  }

  private vanishQuietly(outcome: string, out: MEvent[]): MEvent[] {
    this.state = "gone";
    out.push({ type: "vanish", outcome });
    return out;
  }

  private stepDisguise(c: MCtx, out: MEvent[]): void {
    if (c.struck || c.dist < MTUNING.revealDist || (c.playerLit && c.dist < MTUNING.litRevealDist)) return this.reveal(out);
    // never moves while watched: this is the tell
    if (c.seen && !this.stillWhileSeen) {
      this.stillWhileSeen = true;
      out.push({ type: "group", event: "dread:set_still" });
    } else if (!c.seen && this.stillWhileSeen && this.unseenFor > 1.5) {
      this.stillWhileSeen = false;
      out.push({ type: "group", event: "dread:set_graze" });
    }
    if (this.seenFor >= MTUNING.watchToTurn && c.dist < 40) {
      this.state = "turn";
      this.stateAge = 0;
      out.push({ type: "action", action: "head_turn" }, { type: "encounter", kind: "mimic_turned" }, { type: "stress", amount: 5 });
      return;
    }
    // imitations: only when you are close enough to hear and not looking at it
    this.nextImitation -= c.dt;
    if (this.nextImitation <= 0) {
      this.nextImitation = range(this.rng, 14, 34);
      if (!c.seen && c.dist >= 8 && c.dist <= 32) {
        const options: MImitation[] = ["moo", "step", "door", "chest", "voice"].filter((s) => s !== this.lastImitation) as MImitation[];
        const pick = options[Math.floor(this.rng.next() * options.length)] as MImitation;
        this.lastImitation = pick;
        out.push({ type: "imitate", sound: pick });
        if (chance(this.rng, 0.3)) out.push({ type: "stress", amount: 1 });
      }
    }
  }
}
