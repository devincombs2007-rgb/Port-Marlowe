import { chance, range, type Rng } from "../util/rng";

/**
 * The Gaunt's tactical brain (pure). It does not watch; it follows. The adapter keeps a trail of where the player
 * has walked and an invisible scent marker the Gaunt walks toward; this decides when to advance the marker, when to
 * pause and taste the air, when to search, when to commit to a chase, and when to sink back into the ground.
 *
 *  track    advance along the trail in stop-start bursts
 *  sizeup   it has seen you but may not hunt: freezes, breathes, then leaves
 *  roar     it has seen you and may hunt: rears up and screams, then pursues
 *  search   lost the trail or lost sight of you: sniffs around the last known spot
 *  pursue   full chase; ends on hits, injury, a hurt player, timeout, or losing you
 *  burrow   sinking into the ground (its only exit)
 *
 * Counterplay (all real): water and campfires break the trail; sneaking leaves almost none; breaking line of sight
 * during a chase sends it to search; doors stop it; it flees at half health.
 */
export type GState = "track" | "sizeup" | "roar" | "search" | "pursue" | "burrow" | "gone";

export interface GCtx {
  dt: number;
  age: number;
  dist: number;
  /** Creature has line of sight to the player within its sight range. */
  sees: boolean;
  playerInWater: boolean;
  playerHealth: number;
  hpFrac: number;
  hits: number;
  requested: "observe" | "stalk" | "hunt";
  gentle: boolean;
  /** Distance from the Gaunt to its scent marker (Infinity if none). */
  markerDist: number;
  /** Trail points between the marker and the player's newest scent. */
  trailLeft: number;
  /** The trail was broken (water, campfire smoke) after the marker. */
  trailBroken: boolean;
}

export type GEvent =
  | { type: "group"; event: "dread:set_track" | "dread:set_pause" | "dread:set_search" | "dread:set_pursue" | "dread:set_retreat" }
  | { type: "marker"; op: "next" | "lastSeen" }
  | { type: "sound"; id: string; volume: number; near: boolean }
  | { type: "action"; action: "roar" | "burrow" }
  | { type: "encounter"; kind: "gaunt_seen" }
  | { type: "stress"; amount: number }
  | { type: "vanish"; outcome: string };

export const GTUNING = {
  maxLifetime: 480,
  pursueMax: 60,
  hitsToSatisfy: 2,
  lostSightSearch: 6,
  fleeHealth: 0.5,
  playerHealthAbort: 6,
  burrowTime: 1.6,
};

export class GauntTactics {
  state: GState = "track";
  private stateAge = 0;
  private moving = false;
  private phaseLeft = 0;
  private searchFor = 0;
  private unseenFor = 0;
  private lastMarkerDist = Infinity;
  private stallFor = 0;
  private stalls = 0;
  private roarLeft = 0;
  private sizeupLeft = 0;
  private burrowLeft = 0;
  private outcome = "retreat";
  private forced: string | undefined;
  private announced = false;
  private nextSniff: number;

  constructor(private readonly rng: Rng, initial: "stalk" | "hunt" | "observe" = "stalk") {
    this.nextSniff = range(rng, 3, 6);
    // Initial component group is emitted on the first step so the adapter never has to special-case spawning.
    if (initial === "hunt") this.to("search", this.pending); // starts searching and commits when it finds you
    else this.pending.push({ type: "group", event: "dread:set_pause" });
  }

  private pending: GEvent[] = [];

  forceRetreat(reason: string): void {
    if (this.state !== "gone" && this.state !== "burrow") this.forced = reason;
  }

  private to(next: GState, out: GEvent[]): void {
    this.state = next;
    this.stateAge = 0;
    switch (next) {
      case "track":
        this.moving = false;
        this.phaseLeft = 0;
        break;
      case "search":
        this.searchFor = range(this.rng, 8, 16);
        out.push({ type: "group", event: "dread:set_search" });
        break;
      case "pursue":
        this.unseenFor = 0;
        out.push({ type: "group", event: "dread:set_pursue" });
        break;
      case "roar":
        this.roarLeft = 1.8;
        out.push({ type: "group", event: "dread:set_pause" }, { type: "action", action: "roar" }, { type: "stress", amount: 6 });
        break;
      case "sizeup":
        this.sizeupLeft = range(this.rng, 2, 3.5);
        out.push({ type: "group", event: "dread:set_pause" }, { type: "sound", id: "breath", volume: 0.9, near: true }, { type: "stress", amount: 4 });
        break;
      case "burrow":
        this.burrowLeft = GTUNING.burrowTime;
        out.push({ type: "group", event: "dread:set_retreat" }, { type: "action", action: "burrow" });
        break;
      default:
        break;
    }
  }

  private leave(outcome: string, out: GEvent[]): void {
    this.outcome = outcome;
    this.to("burrow", out);
  }

  private seen(c: GCtx, out: GEvent[]): boolean {
    if (!c.sees) return false;
    if (!this.announced) {
      this.announced = true;
      out.push({ type: "encounter", kind: "gaunt_seen" });
    }
    this.to(c.requested === "hunt" ? "roar" : "sizeup", out);
    return true;
  }

  step(c: GCtx): GEvent[] {
    const out: GEvent[] = this.pending.splice(0);
    if (this.state === "gone") return out;
    this.stateAge += c.dt;
    if (this.forced && this.state !== "burrow") {
      const r = this.forced;
      this.forced = undefined;
      this.leave(r, out);
      return out;
    }
    if (c.age > GTUNING.maxLifetime && this.state !== "burrow") {
      this.leave("lifetime", out);
      return out;
    }
    switch (this.state) {
      case "track": this.stepTrack(c, out); break;
      case "sizeup":
        this.sizeupLeft -= c.dt;
        if (c.requested === "hunt") this.to("roar", out);
        else if (this.sizeupLeft <= 0) this.leave("sized-up", out);
        break;
      case "roar":
        this.roarLeft -= c.dt;
        if (this.roarLeft <= 0) this.to("pursue", out);
        break;
      case "search": this.stepSearch(c, out); break;
      case "pursue": this.stepPursue(c, out); break;
      case "burrow":
        this.burrowLeft -= c.dt;
        if (this.burrowLeft <= 0) {
          this.state = "gone";
          out.push({ type: "vanish", outcome: this.outcome });
        }
        break;
    }
    return out;
  }

  private stepTrack(c: GCtx, out: GEvent[]): void {
    if (this.seen(c, out)) return;
    if (c.trailBroken && c.trailLeft === 0) return this.to("search", out);
    // stop-start rhythm
    this.phaseLeft -= c.dt;
    if (this.phaseLeft <= 0) {
      this.moving = !this.moving;
      this.phaseLeft = this.moving ? range(this.rng, 2, 5) : range(this.rng, 1, 3);
      out.push({ type: "group", event: this.moving ? "dread:set_track" : "dread:set_pause" });
      if (!this.moving && chance(this.rng, 0.6)) out.push({ type: "sound", id: "sniff", volume: 0.9, near: false });
      // note: stall time deliberately accumulates across moving phases (pauses do not count)
    }
    if (this.moving) {
      if (c.markerDist < 2.2) {
        if (c.trailLeft > 0) out.push({ type: "marker", op: "next" });
        else return this.to("search", out); // reached the freshest scent and you are not here
        this.stallFor = 0;
        this.lastMarkerDist = Infinity;
      } else if (c.markerDist < this.lastMarkerDist - 0.4) {
        this.lastMarkerDist = c.markerDist;
        this.stallFor = 0;
      } else {
        this.stallFor += c.dt;
        if (this.stallFor > 6) {
          this.stalls++;
          this.stallFor = 0;
          if (this.stalls >= 3) return this.leave("stuck", out);
          if (c.trailLeft > 0) out.push({ type: "marker", op: "next" }); // skip an unreachable point
        }
      }
    }
  }

  private stepSearch(c: GCtx, out: GEvent[]): void {
    if (this.seen(c, out)) return;
    this.nextSniff -= c.dt;
    if (this.nextSniff <= 0) {
      this.nextSniff = range(this.rng, 3, 6);
      out.push({ type: "sound", id: "sniff", volume: 1.0, near: false });
    }
    if (this.stateAge >= this.searchFor) {
      if (c.trailLeft > 0 && !c.trailBroken) this.to("track", out);
      else this.leave("lost-scent", out);
    }
  }

  private stepPursue(c: GCtx, out: GEvent[]): void {
    const cap = c.gentle ? GTUNING.pursueMax * 0.6 : GTUNING.pursueMax;
    if (c.playerHealth <= GTUNING.playerHealthAbort) return this.leave("player-hurt", out);
    if (c.hits >= (c.gentle ? 1 : GTUNING.hitsToSatisfy)) return this.leave("satisfied", out);
    if (c.hpFrac < GTUNING.fleeHealth) return this.leave("injured", out);
    if (this.stateAge > cap) return this.leave("timeout", out);
    if (c.dist > 64) return this.leave("lost", out);
    if (c.playerInWater) {
      out.push({ type: "marker", op: "lastSeen" });
      return this.to("search", out);
    }
    this.unseenFor = c.sees ? 0 : this.unseenFor + c.dt;
    if (this.unseenFor >= GTUNING.lostSightSearch) {
      out.push({ type: "marker", op: "lastSeen" });
      this.to("search", out);
    }
  }
}
