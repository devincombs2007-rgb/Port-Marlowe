// Story mode: chapters with title cards. Narration lines come from the
// historical event list; the story runs at 1x real time throughout.
import { T } from '../replay/history.js';

export const CHAPTERS = [
  { t: T(23, 38, 30), title: 'Right Ahead', sub: 'Sunday 14 April 1912 · 41°46′N 50°14′W' },
  { t: T(23, 40, 15), title: 'Six Compartments', sub: 'The damage is below the waterline' },
  { t: T(23, 59, 30), title: 'An Hour and a Half', sub: 'Thomas Andrews’ verdict' },
  { t: T(0, 38, 0), title: 'Women and Children First', sub: 'Boat 7 is lowered from the starboard side' },
  { t: T(0, 44, 0), title: 'Rockets in the Dark', sub: 'Eight white distress signals' },
  { t: T(1, 38, 0), title: 'The Last Boats', sub: 'The forecastle goes under' },
  { t: T(2, 4, 0), title: 'Every Man for Himself', sub: 'More than 1,500 remain aboard' },
  { t: T(2, 14, 0), title: 'The Break', sub: 'Between the third and fourth funnels' },
  { t: T(2, 19, 50), title: 'Into the Abyss', sub: '3,800 metres to the bottom' },
  { t: T(2, 23, 0), title: 'The Seabed', sub: 'Bow and stern come to rest 600 m apart' },
  { t: T(2, 39, 30), title: 'Silence', sub: 'Fifth Officer Lowe gathers the boats' },
  { t: T(3, 28, 0), title: 'Carpathia', sub: 'Rockets on the horizon' },
  { t: T(8, 29, 0), title: 'The Wreck Today', sub: '114 years at the bottom of the Atlantic' },
];

export function chapterAt(t) {
  let c = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (t >= CHAPTERS[i].t) c = i;
  return c;
}
