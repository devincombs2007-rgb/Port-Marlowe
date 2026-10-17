import { chance, clamp, range, type Rng } from "../util/rng";

/**
 * The Lurker's tactical brain (pure). The Director decides *whether* a Lurker may be bolder; this decides
 * *how* it behaves moment to moment, and guarantees it always has an exit.
 *
 *  observe  stand far away, face the player, vanish when noticed, sometimes reposition
 *  notice   frozen, staring back for a beat (the "it knows you saw it" moment)
 *  stalk    close the distance slowly while unseen; back off if watched; one close-range "moment"
 *  hunt     sprint and strike; ends on light, injury, three hits, a timeout or distance
 *  retreat  flee, then vanish
 */
export type LState = "observe" | "notice" | "stalk" | "hunt" | "retreat" | "gone";
export type Requested = "observe" | "stalk" | "hunt";

export interface LCtx {
  dt: number;
  /** Seconds since this Lurker spawned. */
  age: number;
  dist: number;
  /** Player has it in view with line of sight. */
  seen: boolean;
  /** Player is near or holding a real light source. */
  playerLit: boolean;
  playerHealth: number;
  lurkerHealthFrac: number;
  hitsLanded: number;
  requested: Requested;
  /** Gentle mode halves scare pressure (fewer close moments, shorter hunts). */
  gentle: boolean;
}

export type LEvent =
  | { type: "group"; event: "dread:set_observe" | "dread:set_stalk" | "dread:set_hunt" | "dread:set_retreat" }
  | { type: "sound"; id: string; volume: number; near: boolean }
  | { type: "action"; action: "notice" }
  | { type: "reposition" }
  | { type: "noticed" }
  | { type: "stress"; amount: number }
  | { type: "vanish"; outcome: string };

export const LTUNING = {
  maxLifetime: 420, // hard safety cap, any state
  huntMax: 70,
  huntHitsToSatisfy: 3,
  huntHealthAbort: 6,
  huntLightHold: 5,
  observeSpookDist: 13,
  stalkCloseDist: 7,
  maxRepositions: 3,
};

export class LurkerTactics {
  state: LState = "observe";
  private stateAge = 0;
  private seenFor = 0;
  private lightHold = 0;
  private repositions = 0;
  private noticeNeeded: number;
  private observeLimit: number;
  private noticeTimer = 0;
  private retreatReason = "retreat";
  private retreatTimer = 0;
  private closeMomentDone = false;
  private unseenFor = 0;
  private nextVocalIn: number;
  private huntAge = 0;
  private afterNotice: "retreat" | "vanish" = "vanish";
  /** Events produced before the first step (initial component group), flushed by step(). */
  private pending: LEvent[] = [];

  constructor(private readonly rng: Rng, initial: Requested = "observe") {
    this.noticeNeeded = range(rng, 0.8, 1.8);
    this.observeLimit = range(rng, 50, 120);
    this.nextVocalIn = range(rng, 8, 16);
    this.switchTo(initial === "observe" ? "observe" : initial === "stalk" ? "stalk" : "hunt", this.pending);
  }

  private switchTo(next: LState, out: LEvent[]): void {
    this.state = next;
    this.stateAge = 0;
    this.unseenFor = 0;
    if (next === "observe") out.push({ type: "group", event: "dread:set_observe" });
    if (next === "stalk") out.push({ type: "group", event: "dread:set_stalk" });
    if (next === "hunt") {
      this.huntAge = 0;
      this.nextVocalIn = range(this.rng, 1, 3);
      out.push({ type: "group", event: "dread:set_hunt" });
    }
    if (next === "retreat") {
      this.retreatTimer = range(this.rng, 6, 10);
      out.push({ type: "group", event: "dread:set_retreat" });
    }
  }

  /** Director/safety override: abandon whatever is happening and leave. Emits events on the next step. */
  forceRetreat(reason: string): void {
    if (this.state === "gone" || this.state === "retreat") return;
    this.forced = reason;
  }

  private forced: string | undefined;

  private retreat(reason: string, out: LEvent[]): void {
    this.retreatReason = reason;
    this.switchTo("retreat", out);
  }

  private vanish(outcome: string, out: LEvent[]): void {
    this.state = "gone";
    out.push({ type: "vanish", outcome });
  }

  step(c: LCtx): LEvent[] {
    const out: LEvent[] = this.pending.splice(0);
    if (this.state === "gone") return out;
    this.stateAge += c.dt;

    // light / gaze trackers
    this.lightHold = c.playerLit ? this.lightHold + c.dt : Math.max(0, this.lightHold - c.dt * 0.5);
    this.seenFor = c.seen ? this.seenFor + c.dt : Math.max(0, this.seenFor - c.dt * 0.5);
    this.unseenFor = c.seen ? 0 : this.unseenFor + c.dt;

    if (this.forced) {
      const reason = this.forced;
      this.forced = undefined;
      this.retreat(reason, out);
      return out;
    }
    if (c.age > LTUNING.maxLifetime) {
      this.vanish("lifetime", out);
      return out;
    }

    switch (this.state) {
      case "observe": this.stepObserve(c, out); break;
      case "notice": this.stepNotice(c, out); break;
      case "stalk": this.stepStalk(c, out); break;
      case "hunt": this.stepHunt(c, out); break;
      case "retreat": this.stepRetreat(c, out); break;
    }
    return out;
  }

  private maybeFollowDirector(c: LCtx, out: LEvent[]): boolean {
    if (c.requested === "stalk" && (this.state === "observe")) { this.switchTo("stalk", out); return true; }
    if (c.requested === "hunt" && (this.state === "observe" || this.state === "stalk")) { this.switchTo("hunt", out); return true; }
    return false;
  }

  private stepObserve(c: LCtx, out: LEvent[]): void {
    if (this.maybeFollowDirector(c, out)) return;
    if (this.lightHold >= 1.5) return this.retreat("light", out);
    if (this.seenFor >= this.noticeNeeded) return this.beginNotice("noticed", out);
    if (c.dist < LTUNING.observeSpookDist) return this.beginNotice("spooked", out);
    if (this.stateAge > this.observeLimit && !c.seen) {
      if (this.repositions < LTUNING.maxRepositions && chance(this.rng, 0.6)) {
        this.repositions++;
        this.stateAge = 0;
        this.observeLimit = range(this.rng, 50, 120);
        out.push({ type: "reposition" });
      } else this.vanish("timeout", out);
    }
  }

  private beginNotice(why: string, out: LEvent[]): void {
    this.state = "notice";
    this.stateAge = 0;
    this.noticeTimer = range(this.rng, 1.0, 1.6);
    this.retreatReason = why;
    out.push({ type: "group", event: "dread:set_observe" }); // freeze in place
    out.push({ type: "action", action: "notice" });
    out.push({ type: "stress", amount: 4 });
    this.afterNotice = this.afterNoticeFrom();
  }

  private afterNoticeFrom(): "retreat" | "vanish" {
    return "vanish";
  }

  private stepNotice(c: LCtx, out: LEvent[]): void {
    this.noticeTimer -= c.dt;
    if (this.noticeTimer > 0) return;
    out.push({ type: "noticed" });
    if (this.afterNotice === "vanish") this.vanish(this.retreatReason, out);
    else this.retreat(this.retreatReason, out);
  }

  private stepStalk(c: LCtx, out: LEvent[]): void {
    if (this.maybeFollowDirector(c, out)) return;
    if (this.lightHold >= 1.5) return this.retreat("light", out);
    if (this.seenFor >= 0.7 + (c.gentle ? 0.5 : 0)) {
      // watched while closing in: it stops, stares, then slips away
      this.state = "notice";
      this.stateAge = 0;
      this.noticeTimer = 0.9;
      this.retreatReason = "noticed";
      this.afterNotice = "retreat";
      out.push({ type: "group", event: "dread:set_observe" });
      out.push({ type: "action", action: "notice" });
      out.push({ type: "stress", amount: 3 });
      return;
    }
    // the close moment: it is right behind you and you did not turn around
    if (!this.closeMomentDone && !c.gentle && c.dist < LTUNING.stalkCloseDist && this.unseenFor > 4) {
      this.closeMomentDone = true;
      out.push({ type: "sound", id: "breath_alert", volume: 0.9, near: true });
      out.push({ type: "stress", amount: 6 });
      this.retreat("close-moment", out);
      return;
    }
    if (this.stateAge > 240) this.retreat("timeout", out);
  }

  private stepHunt(c: LCtx, out: LEvent[]): void {
    this.huntAge += c.dt;
    const cap = c.gentle ? LTUNING.huntMax * 0.6 : LTUNING.huntMax;
    if (c.playerHealth <= LTUNING.huntHealthAbort) return this.retreat("player-hurt", out);
    if (c.hitsLanded >= (c.gentle ? 2 : LTUNING.huntHitsToSatisfy)) return this.retreat("satisfied", out);
    if (c.lurkerHealthFrac < 0.4) return this.retreat("injured", out);
    if (this.lightHold >= LTUNING.huntLightHold) return this.retreat("light", out);
    if (this.huntAge > cap) return this.retreat("timeout", out);
    if (c.dist > 60) return this.vanish("lost", out);
    this.nextVocalIn -= c.dt;
    if (this.nextVocalIn <= 0) {
      this.nextVocalIn = range(this.rng, 12, 22);
      out.push({ type: "sound", id: "chase_vocal", volume: 1.0, near: true });
    }
  }

  private stepRetreat(c: LCtx, out: LEvent[]): void {
    this.retreatTimer -= c.dt;
    if (this.retreatTimer <= 0 || c.dist > 30) this.vanish(this.retreatReason, out);
  }
}

export const lurkerGentle = (intensity: number): boolean => clamp(intensity, 0, 100) < 35;
