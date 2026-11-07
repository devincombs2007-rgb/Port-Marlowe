# Play Port Marlowe on your Xbox (in the browser)

This uses the Xbox's **Microsoft Edge** browser. You do not need Dev Mode, a PC or an install. The
game is a Unity Web build of the same project, published as a web page.

> **Status:** nothing is playable yet. The first browser build runs after step 1. Nobody has played
> it on an Xbox, so speed and memory there are unknown.

## Step 1: free Unity licence, once (phone only, about 20 minutes)

Unity only creates its free licence inside the Unity Hub app. This step runs Unity Hub on a
temporary cloud computer that you open in your phone's browser. It uses GitHub Codespaces' free
monthly hours.

1. On your phone, open
   https://github.com/devincombs2007-rgb/Port-Marlowe
   1. Tap the green **Code** button, then the **Codespaces** tab.
   2. Tap **⋯ ▸ New with options**.
   3. Set **Branch** to `claude/m1-foundation` and **Dev container configuration** to *Unity licence
      helper*.
   4. Tap **Create codespace**.

   Setup takes about 5 minutes. If the Code button is hidden, use the browser's "desktop site" mode.
2. When it is ready, open the **Ports** tab.
   1. Find **6080 – Desktop (Unity Hub)** and tap the globe icon.
   2. On the page that opens, tap **vnc.html ▸ Connect** and enter the password `vscode`.
3. On that desktop, double-click **Unity Hub (licence helper)**.
   1. **Sign in.** A browser opens inside the desktop; allow it to open Unity Hub when asked.
   2. Go to **Preferences ▸ Licenses ▸ Add ▸ Get a free personal license**.
4. Go back to the codespace's editor tab. In the **Terminal**, run:
   ```
   bash Tools/Licence/save-github-secrets.sh
   ```
   1. It shows a one-time code. Open https://github.com/login/device and enter it.
   2. Type your Unity email and password when asked. The password stays hidden.
   3. The script saves the three secrets and starts the build. Nothing secret is shown or shared.
5. Delete the codespace at https://github.com/codespaces. It still holds your Unity sign-in.

If you can borrow any computer for 10 minutes, `BuildAndDeploy.md` §6 is quicker.

## Step 2: wait for the build

Open https://github.com/devincombs2007-rgb/Port-Marlowe/actions and wait for the **ci** run to
finish. The job you need is "Unity Web (browser) build". The first run can take 30–60 minutes. If it
fails, I fix it from the log.

## Step 3: turn on the web page, once (phone)

1. Open https://github.com/devincombs2007-rgb/Port-Marlowe/settings/pages.
2. Set **Source** to **Deploy from a branch** and choose **`gh-pages`** with **/ (root)**.
3. Tap **Save**, then give it a minute.

## Step 4: play on the Xbox

1. Open **Microsoft Edge** on the Xbox.
2. Go to **devincombs2007-rgb.github.io/Port-Marlowe**. Add it to your favourites for next time.
3. Wait for the loading bar, then press **A**. The game goes fullscreen.

Controls are the normal Xbox controller layout (see the in-game **Controls** page).

If the browser's controls get in the way:

- **Menu button doesn't pause:** press **D‑pad left** instead.
- **The stick moves a mouse pointer instead of your character:** press A on the game screen to give
  it focus. Holding the Menu button may also switch Edge's controller mode (reported by users, not
  confirmed).
- **Accidental "back":** the page blocks the B button's back action, so it should not leave the game.

## Good to know

- **Saves:** stored in Edge's site data on the Xbox. Clearing Edge's browsing data deletes them.
- **Graphics:** the browser version uses the lighter Performance settings (1K textures, no ambient
  occlusion). It will look and run worse than a native Xbox build would.
- **Same link, other devices:** it also works on a phone (on-screen touch controls) and on a computer.
