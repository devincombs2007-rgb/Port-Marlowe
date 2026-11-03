// Historical record used by the replay. Times are ship's time (apparent time
// aboard, the clock survivors and the inquiries used), as seconds relative to
// 23:40:00 on Sunday 14 April 1912.
//
// Sources: British Wreck Commissioner's Inquiry (1912), US Senate Inquiry
// (1912), Wormstedt/Fitch/Behe and S. Halpern lifeboat-launch reconstructions
// (Encyclopedia Titanica), Halpern's trim analysis (break began at ~11-12 deg
// bow-down trim, ~02:15-02:17), Ballard (1985) wreck survey, Vasa Museum /
// Titanic Facts impact-speed estimates (bow ~40-56 km/h, stern faster).

export const T = (h, m, s = 0) => (h < 12 ? h + 24 : h) * 3600 + m * 60 + s - (23 * 3600 + 40 * 60);

export const START = T(23, 39, 0);
export const END = T(8, 30, 0);

// Trim (deg, bow down) and depth of the keel amidships (m, negative = below
// sea level). 02:15: crow's nest at the waterline ~10.5 deg; 02:16: propellers
// clearing the water at ~11-12 deg; forecastle deck awash at ~01:40.
export const TRIM = [
  [T(23, 39, 0), 0.0, -10.0],
  [T(23, 40, 0), 0.0, -10.0],
  [T(0, 0, 0), 0.9, -10.6],
  [T(0, 20, 0), 1.9, -11.2],
  [T(0, 45, 0), 2.9, -11.9],
  [T(1, 15, 0), 3.9, -12.8],
  [T(1, 40, 0), 5.0, -14.2],
  [T(1, 55, 0), 6.0, -15.6],
  [T(2, 5, 0), 7.5, -17.2],
  [T(2, 10, 0), 8.8, -19.0],
  [T(2, 15, 0), 10.5, -21.8],
  [T(2, 16, 30), 12.0, -24.0],
];

export const BREAK_START = T(2, 16, 30);   // girder failure starts at the top of the hull
export const BREAK_DONE = T(2, 17, 30);    // keel parts, bow section free
export const LIGHTS_OUT = T(2, 17, 30);
export const STERN_GONE = T(2, 20, 0);
export const BOW_IMPACT_TARGET = T(2, 23, 20);   // ~5.8 min descent, ~42 km/h average
export const STERN_IMPACT_TARGET = T(2, 24, 40); // ~4.7 min, faster, tumbling
export const FUNNEL_FALLS = [T(2, 14, 40), T(2, 17, 0), T(2, 17, 40), null];

// Lifeboats. side 's' = starboard (facing the viewer), 'p' = port (far side).
// launched = time the boat reached the water; n = approx. people aboard.
export const BOATS = [
  { id: '7', side: 's', at: T(0, 40), n: 28, xb: 87.5, by: 'First Officer Murdoch', note: 'the first boat away' },
  { id: '5', side: 's', at: T(0, 43), n: 36, xb: 79.5, by: 'Third Officer Pitman' },
  { id: '3', side: 's', at: T(0, 55), n: 32, xb: 72.5, by: 'Murdoch' },
  { id: '8', side: 'p', at: T(1, 0), n: 28, xb: 79.5, by: 'Captain Smith & Second Officer Lightoller', note: 'the Countess of Rothes takes the tiller' },
  { id: '1', side: 's', at: T(1, 5), n: 12, xb: 64.0, by: 'Murdoch', note: 'an emergency cutter with 40 places' },
  { id: '6', side: 'p', at: T(1, 10), n: 24, xb: 72.5, by: 'Lightoller', note: 'Margaret Brown and Quartermaster Hichens aboard' },
  { id: '16', side: 'p', at: T(1, 20), n: 40, xb: 207.0, by: 'Sixth Officer Moody' },
  { id: '14', side: 'p', at: T(1, 25), n: 45, xb: 199.5, by: 'Fifth Officer Lowe', note: 'later returns for survivors' },
  { id: '12', side: 'p', at: T(1, 30), n: 30, xb: 192.0, by: 'Lightoller' },
  { id: '9', side: 's', at: T(1, 30), n: 40, xb: 184.5, by: 'Murdoch & Moody' },
  { id: '11', side: 's', at: T(1, 35), n: 50, xb: 192.0, by: 'Murdoch' },
  { id: '13', side: 's', at: T(1, 40), n: 55, xb: 199.5, by: 'Murdoch' },
  { id: 'C', side: 's', at: T(1, 40), n: 39, xb: 66.0, by: 'Murdoch', note: 'J. Bruce Ismay steps in' },
  { id: '15', side: 's', at: T(1, 41), n: 50, xb: 207.0, by: 'Murdoch' },
  { id: '2', side: 'p', at: T(1, 45), n: 18, xb: 64.0, by: 'Lightoller', note: 'Fourth Officer Boxhall in charge' },
  { id: '10', side: 'p', at: T(1, 50), n: 35, xb: 184.5, by: 'Murdoch' },
  { id: '4', side: 'p', at: T(1, 50), n: 30, xb: 87.5, by: 'Lightoller', note: 'Madeleine Astor aboard; John Jacob Astor stays behind' },
  { id: 'D', side: 'p', at: T(2, 5), n: 20, xb: 66.0, by: 'Lightoller', note: 'the last boat lowered' },
  { id: 'A', side: 's', at: T(2, 15), n: 13, xb: 70.0, float: true, note: 'floats off the officers’ quarters, swamped' },
  { id: 'B', side: 'p', at: T(2, 15), n: 30, xb: 70.0, float: true, flip: true, note: 'washes off upside down; men climb onto her hull' },
];
// Carpathia picks up the boats from 04:10 (boat 2) to 08:30 (boat 12).
export const PICKUP_ORDER = ['2', '1', '5', '7', '9', '13', '15', '3', '8', '6', '16', '14', 'C', '10', '11', '4', 'D', '12'];

export const ROCKETS = [T(0, 45), T(0, 52), T(0, 59), T(1, 6), T(1, 13), T(1, 20), T(1, 28), T(1, 40)];

export const STEAM = [T(23, 45), T(0, 35)];      // safety valves lifting: roaring steam

// Narrative events (the replay also logs lifeboats, rockets and impacts).
export const EVENTS = [
  [T(23, 39, 0), 'Sunday 14 April 1912, 41°46′N 50°14′W. RMS Titanic steams west at 22½ knots. Moonless, flat calm, air −1 °C, sea −2 °C. 2,208 people aboard.'],
  [T(23, 39, 30), 'Lookout Frederick Fleet strikes the crow’s-nest bell three times and telephones the bridge: “Iceberg, right ahead!”', 'bell'],
  [T(23, 39, 33), 'First Officer William Murdoch orders “Hard a-starboard” and rings the engines to stop. The bow begins to swing to port.'],
  [T(23, 39, 40), 'The iceberg strikes the starboard bow. For about 10 seconds it scrapes along 90 m of hull below the waterline, opening seams and popping rivets.', 'scrape'],
  [T(23, 39, 52), 'Ice tumbles onto the forward well deck. Six compartments are open to the sea: the fore peak, holds 1–3, and boiler rooms 6 and 5.'],
  [T(23, 40, 20), 'Murdoch closes the watertight doors from the bridge. Captain Edward Smith arrives: “What have we struck?”'],
  [T(23, 45, 0), 'With the engines stopped, the boiler safety valves lift. Steam roars from the funnels, drowning out conversation on deck.', 'steam'],
  [T(23, 50, 0), 'Boiler room 6 floods 14 ft deep within ten minutes. Leading stoker Fred Barrett escapes through the closing watertight door.'],
  [T(0, 0, 0), 'Shipbuilder Thomas Andrews tells Captain Smith the ship cannot be saved: she has “an hour and a half, possibly two”.'],
  [T(0, 5, 0), 'Smith orders the lifeboats uncovered and passengers mustered. There are 20 boats with room for 1,178 people.'],
  [T(0, 15, 0), 'Wireless operator Jack Phillips sends the first distress call: “CQD MGY 41.44 N 50.24 W”.'],
  [T(0, 25, 0), 'RMS Carpathia, 58 nautical miles away, answers “Coming hard”. Captain Rostron turns north at full speed.'],
  [T(0, 45, 0), 'The lights of a ship are seen on the horizon, perhaps 10 miles off. She never comes.'],
  [T(1, 15, 0), 'Water reaches the name TITANIC on the bow. The list to port grows; passengers are now taking the boats seriously.'],
  [T(1, 40, 0), 'The forecastle deck goes awash. The last distress rocket is fired.'],
  [T(2, 5, 0), 'Collapsible D, the last boat lowered, pulls away. More than 1,500 people remain aboard.'],
  [T(2, 10, 0), 'Captain Smith releases the wireless operators and crew: “It’s every man for himself.” The band plays on.'],
  [T(2, 15, 0), 'The bridge goes under. A wave sweeps aft along the boat deck; collapsibles A and B float off.'],
  [T(2, 15, 10), 'The forward funnel’s stays snap and it falls into the sea, crushing swimmers around it.', 'crack'],
  [T(2, 16, 10), 'The stern lifts high enough to expose the propellers. Hundreds of people crowd toward the poop deck.'],
  [T(2, 16, 30), 'Hull girder failure begins: the strength deck tears open between the third and fourth funnels.', 'crack'],
  [T(2, 17, 30), 'The lights flicker red and go out. The keel parts and the bow section breaks free.', 'crack'],
  [T(2, 18, 0), 'The bow section dives. The stern settles back almost level, then begins to flood through the open break.'],
  [T(2, 19, 0), 'The flooding stern rises until it stands nearly vertical against the stars.'],
  [T(2, 20, 0), 'The stern slips beneath the surface. Titanic has sunk, 2 hours 40 minutes after the collision. About 1,500 people are in water at −2 °C.', 'boom'],
  [T(2, 20, 40), 'At a few hundred metres depth, trapped air in the stern section implodes, tearing open decks and plating.', 'boom'],
  [T(2, 40, 0), 'Fifth Officer Lowe gathers boats 10, 12, 4 and D, transfers passengers, and prepares boat 14 to return.'],
  [T(3, 0, 0), 'Lowe takes boat 14 back into the wreckage. Of those in the water, he finds only four alive; one later dies.'],
  [T(3, 30, 0), 'Carpathia’s rockets are seen from the lifeboats.'],
  [T(4, 10, 0), 'Carpathia stops among the ice and picks up boat 2, the first boat recovered.'],
  [T(6, 0, 0), 'Lightoller brings boat 12 alongside with 70 aboard, including men from overturned collapsible B.'],
  [T(8, 30, 0), 'The last boat is recovered. 712 survived; about 1,500 died. Carpathia sets course for New York.'],
];

// 1 September 1985: Ballard & Michel find the wreck at 3,784 m.
export const EPILOGUE = [
  [1985.67, 'Robert Ballard and Jean-Louis Michel find the wreck at 3,784 m. The bow and stern lie about 600 m apart, facing opposite ways.'],
  [1996, 'A 15-ton section of the hull, the “Big Piece”, is raised from the debris field.'],
  [2010, 'Bacteria later named Halomonas titanicae are identified in the rusticles consuming the hull.'],
  [2019, 'Dives find the captain’s quarters and the officers’ deckhouse collapsing.'],
  [2023, 'A full photogrammetry scan maps the whole wreck in 3D for the first time.'],
];
