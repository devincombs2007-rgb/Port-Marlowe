using System;
using System.Collections;
using System.Globalization;
using PortMarlowe.Core;
using PortMarlowe.Core.Police;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Rendering;
using PortMarlowe.Game.SaveSystem;
using PortMarlowe.Game.Testing;
using PortMarlowe.Game.UI;
using UnityEngine;

namespace PortMarlowe.Game
{
    public enum StartMode
    {
        /// <summary>Do nothing on Start (tests drive the flow).</summary>
        None,
        Title,
        NewGame,
        Continue,
    }

    /// <summary>
    /// The single scene object. Owns the session lifecycle (title, new game, load, quit to title),
    /// ticks the engine-independent authorities in a fixed order, and handles flow events that
    /// cut across systems: arrest, controller disconnect and application suspend.
    ///
    /// Command line (desktop and CI players):
    ///   -pmNewGame            skip the title and start a new game
    ///   -pmContinue           load the most recent save
    ///   -pmSeed &lt;n&gt;           session seed (population variation)
    ///   -pmAutotest &lt;path&gt;    run the automated smoke scenario, write results to path, quit
    /// </summary>
    public sealed class GameBootstrap : MonoBehaviour, IGameFlow
    {
        public StartMode Mode = StartMode.Title;

        private GameWorld.Handles _handles;
        private float _pruneTimer;
        private float _titleAngle;
        private bool _transitioning;
        private ulong? _seedOverride;

        public static GameBootstrap Instance { get; private set; }
        public GameSession Session { get; private set; }
        public bool InSession { get; private set; }
        public bool Transitioning => _transitioning;
        public int SessionsStarted { get; private set; }

        public bool CanQuitApplication => !(Application.platform == RuntimePlatform.WSAPlayerX64 && SystemInfo.deviceType == DeviceType.Console);

        private void Awake()
        {
            Instance = this;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            Application.runInBackground = false;
            GameLayers.ConfigureCollisionMatrix();
            GameSettings.Load();
            RenderBackends.Current.ApplyQuality(GameSettings.Quality);
            ParseCommandLine();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }

            GameWorld.Teardown(Session, _handles);
            Session = null;
            _handles = null;
            Time.timeScale = 1f;
            AudioListener.pause = false;
        }

        private void ParseCommandLine()
        {
            string[] args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "-pmNewGame":
                        Mode = StartMode.NewGame;
                        break;
                    case "-pmContinue":
                        Mode = StartMode.Continue;
                        break;
                    case "-pmSeed" when i + 1 < args.Length && ulong.TryParse(args[i + 1], NumberStyles.Integer, CultureInfo.InvariantCulture, out ulong seed):
                        _seedOverride = seed;
                        break;
                    case "-pmAutotest" when i + 1 < args.Length:
                        Mode = StartMode.None;
                        gameObject.AddComponent<AutoTestRunner>().Configure(this, args[i + 1]);
                        break;
                }
            }
        }

        private void Start()
        {
            switch (Mode)
            {
                case StartMode.Title:
                    EnterTitle();
                    break;
                case StartMode.NewGame:
                    NewGame();
                    break;
                case StartMode.Continue:
                    EnterTitle();
                    LoadSlot(LatestValidSlot());
                    break;
            }
        }

        private ulong NextSeed() => _seedOverride ?? (ulong)DateTime.UtcNow.Ticks;

        // ------------------------------------------------------------------------------------
        // IGameFlow
        // ------------------------------------------------------------------------------------

        public bool HasSave(string slot)
        {
            var info = Session?.Save?.Inspect(slot);
            return info != null && info.Valid;
        }

        public void NewGame()
        {
            if (_transitioning)
            {
                return;
            }

            StartCoroutine(Transition(() =>
            {
                Rebuild(NextSeed());
                GameWorld.PopulateNewGame(Session);
                return true;
            }, "new game"));
        }

        public void LoadSlot(string slot)
        {
            if (_transitioning)
            {
                return;
            }

            // Read and validate with the current session's service before tearing anything down,
            // so a corrupt or missing save leaves the player where they were.
            var result = Session?.Save?.Load(slot);
            if (result == null || !result.Success)
            {
                Session?.Notify("Could not load: " + (result?.Error ?? "no save"), 4f);
                return;
            }

            if (result.Warnings.Count > 0)
            {
                Debug.LogWarning("[PM] Load warnings: " + string.Join("; ", result.Warnings));
            }

            var game = result.Game;
            StartCoroutine(Transition(() =>
            {
                Rebuild(game.WorldSeed);
                GameWorld.ApplySave(Session, game);
                if (result.Source != "main")
                {
                    Session.Notify("Recovered from backup save.", 4f);
                }

                return true;
            }, "load " + slot));
        }

        public void SaveSlot(string slot)
        {
            if (Session?.Save != null && InSession)
            {
                Session.Save.RequestSave(slot, "manual");
            }
        }

        public void QuitToTitle()
        {
            if (_transitioning)
            {
                return;
            }

            StartCoroutine(Transition(() =>
            {
                EnterTitle();
                return false;
            }, "quit to title"));
        }

        public void QuitApplication()
        {
            if (CanQuitApplication)
            {
                Application.Quit();
            }
        }

        public void WriteDiagnosticsReport()
        {
            if (Session?.Diagnostics == null)
            {
                return;
            }

            string path = Session.Diagnostics.WriteReport("manual");
            Session.Notify("Diagnostics written: " + System.IO.Path.GetFileName(path), 4f);
        }

        public string LatestValidSlot()
        {
            var manual = Session?.Save?.Inspect(SaveService.ManualSlot);
            var auto = Session?.Save?.Inspect(SaveService.AutosaveSlot);
            bool m = manual != null && manual.Valid;
            bool a = auto != null && auto.Valid;
            if (m && a)
            {
                return string.CompareOrdinal(manual.SavedAtUtc, auto.SavedAtUtc) >= 0 ? SaveService.ManualSlot : SaveService.AutosaveSlot;
            }

            return a ? SaveService.AutosaveSlot : SaveService.ManualSlot;
        }

        // ------------------------------------------------------------------------------------
        // Lifecycle
        // ------------------------------------------------------------------------------------

        private void EnterTitle()
        {
            Rebuild(NextSeed());
            InSession = false;
            // Late afternoon light for the title backdrop; the clock does not run on the title.
            Session.Clock.Restore(0, 0, 18.4);
            Session.Hud.Menus.OpenTitle();
            Session.Hud.SetFade(1f);
            Session.Hud.FadeTo(0f);
        }

        private void Rebuild(ulong seed)
        {
            GameWorld.Teardown(Session, _handles);
            Session = null;
            Time.timeScale = 1f;
            AudioListener.pause = false;
            Session = GameWorld.Build(transform, seed, out _handles);
            Session.Hud.Menus.Flow = this;
            Session.Input.GamepadConnectionChanged += OnGamepadConnectionChanged;
            Session.Police.Arrested += OnArrested;
            Session.Input.SetGameplayEnabled(false);
            SessionsStarted++;
        }

        /// <summary>Fade out, rebuild, fade in. The build callback returns whether a game is now running.</summary>
        private IEnumerator Transition(Func<bool> build, string label)
        {
            _transitioning = true;
            if (Session?.Hud != null)
            {
                Session.Hud.Menus.CloseAll();
                Session.Input.SetGameplayEnabled(false);
                Session.Hud.FadeTo(1f);
                yield return new WaitForSecondsRealtime(0.65f);
            }

            bool inGame;
            try
            {
                InSession = false;
                inGame = build();
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                Debug.LogError("[PM] Session transition failed: " + label);
                _transitioning = false;
                if (Session == null)
                {
                    EnterTitle();
                }

                Session?.Notify("Something went wrong (" + label + "). Diagnostics written.", 5f);
                Session?.Diagnostics?.WriteReport("transition_failure");
                yield break;
            }

            InSession = inGame;
            if (inGame)
            {
                Session.Hud.SetFade(1f);
                Session.Input.SetGameplayEnabled(true);
                Time.timeScale = 1f;
                // Let physics settle one frame before fading in, so the first visible frame is final.
                yield return null;
                Session.Hud.FadeTo(0f);
            }

            _transitioning = false;
        }

        private void Update()
        {
            var s = Session;
            if (s == null)
            {
                return;
            }

            if (InSession)
            {
                s.Clock.Advance(Time.deltaTime);
                double now = s.Now;
                s.Incidents.Tick(now);
                s.Dispatch.Tick(now);
                s.Seats.ExpireReservations(now);
                s.Save.Tick();

                _pruneTimer -= Time.unscaledDeltaTime;
                if (_pruneTimer <= 0f)
                {
                    _pruneTimer = 30f;
                    s.Incidents.Prune(now, 900);
                    s.Dispatch.PruneClosed();
                }

                var focus = s.Controlled != null ? s.Controlled.transform : s.MainCamera.transform;
                s.Lighting.SetFocus(focus);
            }
            else
            {
                s.Lighting.SetFocus(s.MainCamera.transform);
            }

            RenderBackends.Current.SetNightFactor(s.Lighting.NightFactor);
        }

        private void LateUpdate()
        {
            if (Session == null || InSession)
            {
                return;
            }

            // Title backdrop: slow orbit over the district.
            var b = Session.District.PlayableBounds;
            _titleAngle += Time.unscaledDeltaTime * 2.5f;
            float rad = _titleAngle * Mathf.Deg2Rad;
            Vector3 center = b.center;
            Vector3 pos = center + new Vector3(Mathf.Sin(rad), 0f, Mathf.Cos(rad)) * (b.extents.magnitude * 0.55f) + Vector3.up * 48f;
            var cam = Session.MainCamera.transform;
            cam.position = pos;
            cam.rotation = Quaternion.LookRotation((center + Vector3.up * 6f) - pos);
        }

        // ------------------------------------------------------------------------------------
        // Cross-system events
        // ------------------------------------------------------------------------------------

        private void OnGamepadConnectionChanged(bool connected)
        {
            if (Session == null)
            {
                return;
            }

            if (!connected)
            {
                Session.Notify("Controller disconnected. Reconnect to continue.", 5f);
                if (InSession && !Session.Hud.MenuOpen)
                {
                    Session.Hud.OpenPauseMenu();
                }
            }
            else
            {
                Session.Notify("Controller connected.", 2f);
            }
        }

        private void OnApplicationPause(bool paused) => OnSuspendOrFocusLoss(paused);

        private void OnApplicationFocus(bool focused) => OnSuspendOrFocusLoss(!focused);

        /// <summary>
        /// Suspend (Xbox: Home button, Quick Resume) or focus loss: pause the game and autosave when
        /// it is safe to, because a suspended title can be terminated without further notice.
        /// </summary>
        private void OnSuspendOrFocusLoss(bool lost)
        {
            if (!lost || Session == null || !InSession || _transitioning || Application.isBatchMode)
            {
                return;
            }

            if (!Session.Hud.MenuOpen)
            {
                Session.Hud.OpenPauseMenu();
            }

            if (Session.Save.CanSave(out _))
            {
                Session.Save.RequestSave(SaveService.AutosaveSlot, "suspend");
            }
        }

        private void OnArrested(Protagonist p, int severity)
        {
            StartCoroutine(ArrestSequence(p, severity));
        }

        private IEnumerator ArrestSequence(Protagonist p, int severity)
        {
            var s = Session;
            p.SetDetained(true);
            if (p.IsPlayerControlled)
            {
                s.Hud.CenterMessage("ARRESTED", 3f);
                s.Input.Rumble(0.4f, 0.6f, 0.5f);
            }

            yield return new WaitForSeconds(2.5f);
            if (Session != s || p == null)
            {
                yield break;
            }

            if (p.IsPlayerControlled)
            {
                s.Hud.FadeTo(1f);
                yield return new WaitForSecondsRealtime(0.7f);
            }

            int fine = ArrestRules.Fine(severity);
            int paid = Mathf.Min(fine, p.Wallet.Cash);
            p.Wallet.Debit(fine, $"arrest:{p.Id.Value}:{s.Now.ToString("0.0", CultureInfo.InvariantCulture)}", allowPartial: true);
            p.Record.Arrests++;
            var door = s.District.PoliceStationDoor;
            p.PlaceOnFoot(GameWorld.SnapToNavMesh(door), 180f, s.DynamicRoot);
            p.SetDetained(false);
            s.Clock.SkipGameHours(2);
            s.Log.Record(s.Now, LogCategory.Police, p.Id, $"released after arrest, fine {fine}, paid {paid}");
            if (p.IsPlayerControlled)
            {
                s.Switcher.SetInitial(p);
                s.Notify($"Released from Saltmarket Precinct. Fine paid: ${paid:N0}.", 5f);
                s.Hud.FadeTo(0f);
            }
            else
            {
                s.Notify($"{p.Profile.ShortName} was arrested and released from the precinct.", 5f);
            }
        }
    }
}
