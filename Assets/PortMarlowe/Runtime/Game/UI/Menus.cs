using System;
using System.Collections.Generic;
using PortMarlowe.Game.Input;
using UnityEngine;
using UnityEngine.UI;

namespace PortMarlowe.Game.UI
{
    /// <summary>Flow operations the menus can trigger (implemented by the GameWorld bootstrap).</summary>
    public interface IGameFlow
    {
        bool InSession { get; }
        bool HasSave(string slot);
        void NewGame();
        void LoadSlot(string slot);
        void SaveSlot(string slot);
        void QuitToTitle();
        void QuitApplication();
        bool CanQuitApplication { get; }
        void WriteDiagnosticsReport();
    }

    public sealed class MenuItem
    {
        public Func<string> Label;
        public Action Confirm;
        public Action<int> Adjust;
        public Func<bool> Enabled = () => true;
    }

    public sealed class MenuPage
    {
        public string Title;
        public readonly List<MenuItem> Items = new List<MenuItem>();
        public int Selected;
        public bool CanBack = true;

        public MenuPage Add(Func<string> label, Action confirm, Action<int> adjust = null, Func<bool> enabled = null)
        {
            Items.Add(new MenuItem { Label = label, Confirm = confirm, Adjust = adjust, Enabled = enabled ?? (() => true) });
            return this;
        }
    }

    /// <summary>
    /// Controller-first menus (title, pause, settings, controls). D-pad/left stick navigate with
    /// repeat, A confirms, B goes back, Menu closes. Opening pauses simulation time explicitly.
    /// </summary>
    public sealed class MenuController
    {
        private const int Rows = 12;
        private readonly GameSession _s;
        private readonly RectTransform _root;
        private readonly Text _title;
        private readonly Text[] _rows = new Text[Rows];
        private readonly Text _footer;
        private readonly Stack<MenuPage> _stack = new Stack<MenuPage>();
        private float _repeatAt;
        private int _lastDir;

        public IGameFlow Flow { get; set; }
        public bool IsOpen => _stack.Count > 0;

        public MenuController(GameSession session, Transform canvas)
        {
            _s = session;
            _root = UiFactory.Rect(canvas, "Menu", new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(120f, 0f), new Vector2(820f, 760f));
            var bg = UiFactory.Image(_root, "Bg", new Color(0.04f, 0.045f, 0.05f, 0.88f), UiFactory.Rounded, true);
            UiFactory.Fill(bg.rectTransform);
            _title = UiFactory.Text(_root, "Title", 54, UiFactory.Accent, TextAnchor.UpperLeft, FontStyle.Bold);
            SetTopLeft(_title.rectTransform, new Vector2(40f, -30f), new Vector2(740f, 70f));
            for (int i = 0; i < Rows; i++)
            {
                _rows[i] = UiFactory.Text(_root, "Row" + i, 34, UiFactory.TextMain, TextAnchor.MiddleLeft);
                SetTopLeft(_rows[i].rectTransform, new Vector2(40f, -120f - i * 50f), new Vector2(740f, 48f));
            }

            _footer = UiFactory.Text(_root, "Footer", 22, UiFactory.TextDim, TextAnchor.LowerLeft);
            SetTopLeft(_footer.rectTransform, new Vector2(40f, -700f), new Vector2(740f, 40f));
            _footer.text = "(A) Select    (B) Back    D-pad: navigate / adjust";
            _root.gameObject.SetActive(false);
        }

        private static void SetTopLeft(RectTransform rt, Vector2 pos, Vector2 size)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = pos;
            rt.sizeDelta = size;
        }

        public void OpenTitle()
        {
            _stack.Clear();
            var page = new MenuPage { Title = "PORT MARLOWE", CanBack = false };
            page.Add(() => "Continue", () => Flow?.LoadSlot(LatestSlot()), enabled: () => Flow != null && (Flow.HasSave(SaveSystem.SaveService.ManualSlot) || Flow.HasSave(SaveSystem.SaveService.AutosaveSlot)));
            page.Add(() => "New game", () => Flow?.NewGame());
            page.Add(() => "Settings", () => Push(SettingsPage()));
            page.Add(() => "Controls", () => Push(ControlsPage()));
            page.Add(() => "Quit", () => Flow?.QuitApplication(), enabled: () => Flow != null && Flow.CanQuitApplication);
            Push(page);
        }

        public void OpenPause()
        {
            if (IsOpen)
            {
                return;
            }

            var page = new MenuPage { Title = "Paused" };
            page.Add(() => "Resume", CloseAll);
            page.Add(() => "Save game", () => { CloseAll(); Flow?.SaveSlot(SaveSystem.SaveService.ManualSlot); });
            page.Add(() => "Load last save", () => { CloseAll(); Flow?.LoadSlot(SaveSystem.SaveService.ManualSlot); }, enabled: () => Flow != null && Flow.HasSave(SaveSystem.SaveService.ManualSlot));
            page.Add(() => "Load autosave", () => { CloseAll(); Flow?.LoadSlot(SaveSystem.SaveService.AutosaveSlot); }, enabled: () => Flow != null && Flow.HasSave(SaveSystem.SaveService.AutosaveSlot));
            page.Add(() => "Settings", () => Push(SettingsPage()));
            page.Add(() => "Controls", () => Push(ControlsPage()));
            page.Add(() => "Write diagnostics report", () => Flow?.WriteDiagnosticsReport());
            page.Add(() => "Quit to title", () => { CloseAll(); Flow?.QuitToTitle(); });
            Push(page);
        }

        private string LatestSlot()
        {
            var manual = _s.Save?.Inspect(SaveSystem.SaveService.ManualSlot);
            var auto = _s.Save?.Inspect(SaveSystem.SaveService.AutosaveSlot);
            if (manual == null || !manual.Valid)
            {
                return SaveSystem.SaveService.AutosaveSlot;
            }

            if (auto == null || !auto.Valid)
            {
                return SaveSystem.SaveService.ManualSlot;
            }

            return string.CompareOrdinal(manual.SavedAtUtc, auto.SavedAtUtc) >= 0 ? SaveSystem.SaveService.ManualSlot : SaveSystem.SaveService.AutosaveSlot;
        }

        private MenuPage SettingsPage()
        {
            var page = new MenuPage { Title = "Settings" };
            page.Add(() => "Invert camera Y: " + OnOff(GameSettings.InvertY), () => Toggle(() => GameSettings.InvertY = !GameSettings.InvertY), d => Toggle(() => GameSettings.InvertY = !GameSettings.InvertY));
            page.Add(() => $"Look sensitivity: {GameSettings.LookSensitivity:0.0}", null, d => { GameSettings.LookSensitivity = Mathf.Clamp(GameSettings.LookSensitivity + d * 0.1f, 0.3f, 2.5f); GameSettings.Save(); });
            page.Add(() => "Vibration: " + OnOff(GameSettings.Vibration), () => Toggle(() => GameSettings.Vibration = !GameSettings.Vibration), d => Toggle(() => GameSettings.Vibration = !GameSettings.Vibration));
            page.Add(() => "Reduced camera shake: " + OnOff(GameSettings.ReducedCameraShake), () => Toggle(() => GameSettings.ReducedCameraShake = !GameSettings.ReducedCameraShake), d => Toggle(() => GameSettings.ReducedCameraShake = !GameSettings.ReducedCameraShake));
            page.Add(() => "Graphics profile: " + GameSettings.Quality, null, d =>
            {
                int q = ((int)GameSettings.Quality + d + 3) % 3;
                GameSettings.Quality = (QualityProfile)q;
                GameSettings.Save();
                Rendering.RenderBackends.Current.ApplyQuality(GameSettings.Quality);
            });
            page.Add(() => "Diagnostics overlay: " + OnOff(GameSettings.ShowDiagnostics), () => Toggle(() => GameSettings.ShowDiagnostics = !GameSettings.ShowDiagnostics), d => Toggle(() => GameSettings.ShowDiagnostics = !GameSettings.ShowDiagnostics));
            page.Add(() => "Back", Pop);
            return page;
        }

        private MenuPage ControlsPage()
        {
            var page = new MenuPage { Title = "Controls (Xbox controller)" };
            var map = GameInput.ControllerMap;
            for (int i = 0; i < map.GetLength(0) && page.Items.Count < Rows - 1; i++)
            {
                string label = $"{map[i, 0],-14}  {map[i, 1]}";
                page.Add(() => label, null);
            }

            page.Add(() => "Back", Pop);
            return page;
        }

        private static string OnOff(bool b) => b ? "On" : "Off";

        private static void Toggle(Action a)
        {
            a();
            GameSettings.Save();
        }

        private void Push(MenuPage page)
        {
            _stack.Push(page);
            OnOpenChanged();
        }

        private void Pop()
        {
            if (_stack.Count > 0 && (_stack.Peek().CanBack || _stack.Count > 1))
            {
                _stack.Pop();
                OnOpenChanged();
            }
        }

        public void CloseAll()
        {
            _stack.Clear();
            OnOpenChanged();
        }

        private void OnOpenChanged()
        {
            bool open = IsOpen;
            _root.gameObject.SetActive(open);
            _s.Input.SetGameplayEnabled(!open && Flow != null && Flow.InSession);
            bool paused = open && Flow != null && Flow.InSession;
            Time.timeScale = paused ? 0f : 1f;
            _s.Clock.Paused = paused;
            if (paused)
            {
                AudioListener.pause = true;
            }
            else
            {
                AudioListener.pause = false;
            }

            Render();
        }

        public void Tick()
        {
            if (!IsOpen)
            {
                return;
            }

            var input = _s.Input;
            var page = _stack.Peek();
            Vector2 nav = input.ReadMenuNavigate();
            int vertical = nav.y > 0.5f ? -1 : (nav.y < -0.5f ? 1 : 0);
            int horizontal = nav.x > 0.5f ? 1 : (nav.x < -0.5f ? -1 : 0);
            int dir = vertical != 0 ? vertical * 10 : horizontal;
            if (dir == 0)
            {
                _lastDir = 0;
            }
            else if (dir != _lastDir || Time.unscaledTime >= _repeatAt)
            {
                _repeatAt = Time.unscaledTime + (dir != _lastDir ? 0.35f : 0.12f);
                _lastDir = dir;
                if (vertical != 0)
                {
                    page.Selected = Mathf.Clamp(page.Selected + vertical, 0, page.Items.Count - 1);
                    _s.Audio?.PlayOneShot(Audio.SfxKind.UiMove, Vector3.zero, 0.5f);
                }
                else if (horizontal != 0)
                {
                    var item = page.Items[page.Selected];
                    if (item.Adjust != null && item.Enabled())
                    {
                        item.Adjust(horizontal);
                        _s.Audio?.PlayOneShot(Audio.SfxKind.UiMove, Vector3.zero, 0.5f);
                    }
                }
            }

            if (input.MenuConfirm.WasPressedThisFrame())
            {
                var item = page.Items[page.Selected];
                if (item.Confirm != null && item.Enabled())
                {
                    _s.Audio?.PlayOneShot(Audio.SfxKind.UiConfirm, Vector3.zero, 0.6f);
                    item.Confirm();
                }
            }
            else if (input.MenuBack.WasPressedThisFrame())
            {
                if (_stack.Count > 1 || page.CanBack)
                {
                    if (_stack.Count == 1 && Flow != null && Flow.InSession)
                    {
                        CloseAll();
                    }
                    else
                    {
                        Pop();
                    }
                }
            }
            else if (input.MenuPause.WasPressedThisFrame() && Flow != null && Flow.InSession)
            {
                CloseAll();
            }

            Render();
        }

        private void Render()
        {
            if (!IsOpen)
            {
                return;
            }

            var page = _stack.Peek();
            _title.text = page.Title;
            for (int i = 0; i < Rows; i++)
            {
                if (i < page.Items.Count)
                {
                    var item = page.Items[i];
                    bool selected = i == page.Selected;
                    bool enabled = item.Enabled();
                    _rows[i].enabled = true;
                    _rows[i].text = (selected ? "> " : "   ") + item.Label() + (item.Adjust != null && selected ? "   < >" : string.Empty);
                    _rows[i].color = !enabled ? new Color(0.45f, 0.45f, 0.45f) : (selected ? UiFactory.Accent : UiFactory.TextMain);
                }
                else
                {
                    _rows[i].enabled = false;
                }
            }
        }
    }
}
