// Central identifiers so behavior JSON, resource JSON and scripts stay in sync.
// tools/validate.py cross-checks every id listed here against the packs.

export const NS = "hollow";

export const ENT = {
  watcher: "hollow:watcher",
  borrowed: "hollow:borrowed",
  hollowed: "hollow:hollowed",
  knocker: "hollow:knocker",
  mirebound: "hollow:mirebound",
  heart: "hollow:heart_below",
  vein: "hollow:heart_vein",
  rootSpike: "hollow:root_spike",
  lure: "hollow:lure",
} as const;

export const ITEM = {
  journal: "hollow:field_journal",
  page: "hollow:torn_page",
  paleResin: "hollow:pale_resin",
  borrowedHide: "hollow:borrowed_hide",
  hollowFang: "hollow:hollow_fang",
  knockerNail: "hollow:knocker_nail",
  mirePearl: "hollow:mire_pearl",
  lens: "hollow:hollow_lens",
  heartseeker: "hollow:heartseeker",
  offering: "hollow:offering_of_silence",
  stilledHeart: "hollow:stilled_heart",
  chime: "hollow:hollow_chime",
  ward: "hollow:rowan_ward",
  lantern: "hollow:heartwood_lantern",
} as const;

export const BLOCK = {
  chime: "hollow:hollow_chime",
  ward: "hollow:rowan_ward",
  lantern: "hollow:heartwood_lantern",
  altar: "hollow:heart_altar",
  roots: "hollow:hollow_roots",
  tracks: "hollow:tracks",
} as const;

export const FAMILY = {
  any: "hollow",
  creature: "hollow_creature",
  temp: "hollow_temp",
} as const;

export const PROP = {
  state: "hollow:state",
  revealed: "hollow:revealed",
  phase: "hollow:phase",
  shielded: "hollow:shielded",
  variant: "hollow:variant",
} as const;

export const SND = {
  watcherSeen: "hollow.watcher.seen",
  watcherRetreat: "hollow.watcher.retreat",
  watcherLunge: "hollow.watcher.lunge",
  windGust: "hollow.amb.forest.wind",
  farCall: "hollow.amb.forest.far_call",
  branchSnap: "hollow.amb.forest.branch_snap",
  farSteps: "hollow.amb.forest.footsteps",
  hush: "hollow.amb.forest.hush",
  caveDrip: "hollow.amb.cave.drip",
  caveShift: "hollow.amb.cave.shift",
  caveBreath: "hollow.amb.cave.breath",
  swampGurgle: "hollow.amb.swamp.gurgle",
  swampCreak: "hollow.amb.swamp.creak",
  bedtimeKnock: "hollow.amb.bedtime_knock",
  stingerLow: "hollow.stinger.low",
  musicNight: ["hollow.music.night_1", "hollow.music.night_2", "hollow.music.night_3"],
  musicCave: "hollow.music.cave",
  musicShrine: "hollow.music.shrine",
  musicBoss: "hollow.music.boss",
  musicDawn: "hollow.music.dawn",
  stingerDistant: "hollow.stinger.distant",
  journalOpen: "hollow.journal.open",
  journalEntry: "hollow.journal.entry",
  chime: "hollow.chime.ring",
  wardRepel: "hollow.ward.repel",
  wardPlace: "hollow.ward.place",
  wardSpent: "hollow.ward.spent",
  lens: "hollow.lens.use",
  heartseeker: "hollow.heartseeker.pulse",
  altar: "hollow.altar.insert",
  borrowedReveal: "hollow.borrowed.reveal",
  borrowedWrong: "hollow.borrowed.baa_wrong",
  hollowedClick: "hollow.hollowed.click",
  hollowedAlert: "hollow.hollowed.alert",
  hollowedSniff: "hollow.hollowed.sniff",
  knock: "hollow.knocker.knock",
  scratch: "hollow.knocker.scratch",
  knockerBreath: "hollow.knocker.breath",
  knockerLeave: "hollow.knocker.leave",
  knockerLunge: "hollow.knocker.lunge",
  mireBubble: "hollow.mirebound.bubble",
  mireGurgle: "hollow.mirebound.gurgle",
  mireErupt: "hollow.mirebound.erupt",
  mireGrab: "hollow.mirebound.grab",
  mireRelease: "hollow.mirebound.release",
  heartBeat: "hollow.heart.beat",
  heartBeatFast: "hollow.heart.beat_fast",
  heartAwaken: "hollow.heart.awaken",
  heartDrone: "hollow.heart.drone",
  heartRootWarn: "hollow.heart.root_warn",
  heartRootStrike: "hollow.heart.root_strike",
  heartPulse: "hollow.heart.pulse",
  heartPhase: "hollow.heart.phase",
  heartVeinBreak: "hollow.heart.vein_break",
  heartSpawn: "hollow.heart.spawn",
  heartDeath: "hollow.heart.death",
} as const;

export const PARTICLE = {
  shed: "hollow:watcher_shed",
  resinGlint: "hollow:resin_glint",
  wardGlow: "hollow:ward_glow",
  chimeRing: "hollow:chime_ring",
  bubbles: "hollow:mire_bubbles",
  spores: "hollow:heart_spores",
  rootWarn: "hollow:root_warning",
  pulseRing: "hollow:pulse_ring",
  lensReveal: "hollow:lens_reveal",
  tracks: "hollow:pale_tracks",
  veinMote: "hollow:vein_mote",
} as const;

export const FOG = {
  watched: "hollow:fog_watched",
  heart: "hollow:fog_heart",
  mire: "hollow:fog_mire",
} as const;

export const DP = {
  // world
  settings: "hollow:settings",
  startDay: "hollow:start_day",
  sites: "hollow:sites",
  chimes: "hollow:chimes",
  wards: "hollow:wards",
  boss: "hollow:boss",
  knocker: "hollow:knocker",
  version: "hollow:data_version",
  // player
  journal: "hollow:journal",
  prefs: "hollow:prefs",
  stats: "hollow:stats",
  firstJoin: "hollow:first_join",
  playTicks: "hollow:play_ticks",
  daily: "hollow:daily",
  tracks: "hollow:track_list",
  // entity
  owner: "hollow:owner",
  fight: "hollow:fight",
  born: "hollow:born",
} as const;
