# Port-Marlowe

A fan-made countdown site for **Grand Theft Auto VI**, launching Thursday, November 19, 2026 on PlayStation 5 and Xbox Series X|S.

The site is two static pages with no build step and no dependencies apart from Google Fonts:

- `index.html`: the live countdown
- `everything.html`: **Everything We Know About GTA 6**, a field guide that examines all four official videos and covers the cast, an interactive Leonida map, confirmed gameplay, radio stations, editions, easter eggs, a timeline, a filterable glossary and the open questions. Every fact is tagged Official, Seen, Reported, Rumor or Unanswered, and sources are listed at the bottom. Trailers 1 and 2 embed from Rockstar's YouTube channel. The stickers and map are original artwork, and the icons are from [Lucide](https://lucide.dev) (ISC).

## What's on the page

- A live days / hours / minutes / seconds clock over an animated dusk scene of the bay, with the skyline, sun and palms drawn on a canvas
- A toggle between **your local midnight** and **midnight Eastern**, saved in the browser
- A progress bar drawn to a date scale, running from Rockstar's February 2022 confirmation to launch
- Quick facts (days since GTA V, days since Trailer 1) and a dated history of trailers and delays
- A post-launch state: when the date passes, the clock counts up from launch

The animation respects `prefers-reduced-motion` and pauses while the scene is off screen.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

To host it on GitHub Pages, go to **Settings → Pages**, choose **Deploy from a branch**, then pick `main` and `/ (root)`.

## Changing the date

If the date moves, edit `LAUNCH_LOCAL` and `LAUNCH_ET` near the top of the script, plus the date text in the hero and timeline.

---

Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.
