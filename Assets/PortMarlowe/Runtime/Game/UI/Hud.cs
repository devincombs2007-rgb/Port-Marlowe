using System.Collections.Generic;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Diagnostics;
using UnityEngine;
using UnityEngine.UI;

namespace PortMarlowe.Game.UI
{
    /// <summary>
    /// Original, restrained HUD sized for TV distance: police attention (text + reason, not colour
    /// alone), character/cash, partner status, vehicle speed/fuel/condition, context prompts with
    /// Xbox glyphs, notifications, clock, and an optional diagnostics overlay. Reads state only.
    /// </summary>
    public sealed class Hud : MonoBehaviour
    {
        private GameSession _s;
        private Canvas _canvas;
        private RectTransform _heatPanel;
        private Text _heatHeadline;
        private Text _heatStage;
        private Text _heatReason;
        private Image _heatBar;
        private Text _charName;
        private Text _cash;
        private Text _partner;
        private RectTransform _vehiclePanel;
        private Text _speed;
        private Image _fuelFill;
        private Text _fuelLabel;
        private Text _condition;
        private Text _clock;
        private Text _diagnostics;
        private PromptWidget _promptVehicle;
        private PromptWidget _promptInteract;
        private readonly List<(Text text, float until)> _toasts = new List<(Text, float)>();
        private RectTransform _toastRoot;
        private Image _fade;
        private float _fadeTarget;
        private Text _centerMessage;
        private float _centerUntil;
        private MenuController _menus;

        public MenuController Menus => _menus;
        public Transform CanvasRoot => _canvas.transform;
        public bool MenuOpen => _menus != null && _menus.IsOpen;

        public static Hud Create(Transform parent, GameSession session)
        {
            var go = new GameObject("HUD");
            go.transform.SetParent(parent, false);
            var hud = go.AddComponent<Hud>();
            hud._s = session;
            hud.Build();
            hud._menus = new MenuController(session, hud._canvas.transform);
            return hud;
        }

        private void Build()
        {
            _canvas = UiFactory.CreateCanvas(transform, "HudCanvas", 10);
            var root = _canvas.transform;

            // Police attention, top right.
            _heatPanel = UiFactory.Rect(root, "Heat", Vector2.one, Vector2.one, Vector2.one, new Vector2(-36f, -32f), new Vector2(560f, 150f));
            var hb = UiFactory.Image(_heatPanel, "Bg", UiFactory.Panel, UiFactory.Rounded, true);
            UiFactory.Fill(hb.rectTransform);
            _heatBar = UiFactory.Image(_heatPanel, "Bar", Color.white);
            _heatBar.rectTransform.anchorMin = new Vector2(0f, 0f);
            _heatBar.rectTransform.anchorMax = new Vector2(0f, 1f);
            _heatBar.rectTransform.pivot = new Vector2(0f, 0.5f);
            _heatBar.rectTransform.sizeDelta = new Vector2(8f, -16f);
            _heatBar.rectTransform.anchoredPosition = new Vector2(10f, 0f);
            _heatHeadline = UiFactory.Text(_heatPanel, "Headline", 34, UiFactory.TextMain, TextAnchor.UpperLeft, FontStyle.Bold);
            Place(_heatHeadline.rectTransform, new Vector2(30f, -12f), new Vector2(510f, 44f));
            _heatStage = UiFactory.Text(_heatPanel, "Stage", 22, UiFactory.TextDim, TextAnchor.UpperLeft);
            Place(_heatStage.rectTransform, new Vector2(30f, -54f), new Vector2(510f, 28f));
            _heatReason = UiFactory.Text(_heatPanel, "Reason", 22, UiFactory.TextMain, TextAnchor.UpperLeft);
            Place(_heatReason.rectTransform, new Vector2(30f, -84f), new Vector2(510f, 60f));

            // Character, bottom left.
            var charPanel = UiFactory.Rect(root, "Character", Vector2.zero, Vector2.zero, Vector2.zero, new Vector2(36f, 36f), new Vector2(520f, 120f));
            var cb = UiFactory.Image(charPanel, "Bg", UiFactory.Panel, UiFactory.Rounded, true);
            UiFactory.Fill(cb.rectTransform);
            _charName = UiFactory.Text(charPanel, "Name", 32, UiFactory.TextMain, TextAnchor.UpperLeft, FontStyle.Bold);
            Place(_charName.rectTransform, new Vector2(20f, -10f), new Vector2(300f, 40f));
            _cash = UiFactory.Text(charPanel, "Cash", 30, UiFactory.Accent, TextAnchor.UpperRight, FontStyle.Bold);
            Place(_cash.rectTransform, new Vector2(320f, -10f), new Vector2(180f, 40f));
            _partner = UiFactory.Text(charPanel, "Partner", 22, UiFactory.TextDim, TextAnchor.UpperLeft);
            Place(_partner.rectTransform, new Vector2(20f, -54f), new Vector2(480f, 56f));

            // Vehicle, bottom right.
            _vehiclePanel = UiFactory.Rect(root, "Vehicle", new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-36f, 36f), new Vector2(380f, 150f));
            var vb = UiFactory.Image(_vehiclePanel, "Bg", UiFactory.Panel, UiFactory.Rounded, true);
            UiFactory.Fill(vb.rectTransform);
            _speed = UiFactory.Text(_vehiclePanel, "Speed", 56, UiFactory.TextMain, TextAnchor.UpperLeft, FontStyle.Bold);
            Place(_speed.rectTransform, new Vector2(20f, -6f), new Vector2(340f, 64f));
            var fuelBg = UiFactory.Image(_vehiclePanel, "FuelBg", new Color(1f, 1f, 1f, 0.15f));
            Place(fuelBg.rectTransform, new Vector2(20f, -84f), new Vector2(240f, 14f));
            _fuelFill = UiFactory.Image(fuelBg.transform, "FuelFill", UiFactory.Accent);
            _fuelFill.rectTransform.anchorMin = Vector2.zero;
            _fuelFill.rectTransform.anchorMax = new Vector2(1f, 1f);
            _fuelFill.rectTransform.pivot = new Vector2(0f, 0.5f);
            _fuelFill.rectTransform.offsetMin = Vector2.zero;
            _fuelFill.rectTransform.offsetMax = Vector2.zero;
            _fuelLabel = UiFactory.Text(_vehiclePanel, "FuelLabel", 20, UiFactory.TextDim, TextAnchor.MiddleLeft);
            Place(_fuelLabel.rectTransform, new Vector2(270f, -78f), new Vector2(100f, 26f));
            _condition = UiFactory.Text(_vehiclePanel, "Condition", 22, UiFactory.TextDim, TextAnchor.UpperLeft);
            Place(_condition.rectTransform, new Vector2(20f, -106f), new Vector2(340f, 36f));

            _clock = UiFactory.Text(root, "Clock", 24, UiFactory.TextDim, TextAnchor.UpperLeft);
            var crt = _clock.rectTransform;
            crt.anchorMin = crt.anchorMax = new Vector2(0f, 1f);
            crt.pivot = new Vector2(0f, 1f);
            crt.anchoredPosition = new Vector2(36f, -28f);
            crt.sizeDelta = new Vector2(400f, 32f);

            _toastRoot = UiFactory.Rect(root, "Toasts", new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(36f, -70f), new Vector2(760f, 300f));

            _promptVehicle = new PromptWidget(root, "PromptVehicle", new Vector2(0f, 120f));
            _promptInteract = new PromptWidget(root, "PromptInteract", new Vector2(0f, 186f));

            _centerMessage = UiFactory.Text(root, "Center", 40, UiFactory.TextMain, TextAnchor.MiddleCenter, FontStyle.Bold);
            var cm = _centerMessage.rectTransform;
            cm.anchorMin = cm.anchorMax = new Vector2(0.5f, 0.62f);
            cm.sizeDelta = new Vector2(1500f, 140f);

            _diagnostics = UiFactory.Text(root, "Diagnostics", 18, new Color(0.8f, 1f, 0.8f), TextAnchor.UpperLeft);
            var drt = _diagnostics.rectTransform;
            drt.anchorMin = drt.anchorMax = new Vector2(0f, 1f);
            drt.pivot = new Vector2(0f, 1f);
            drt.anchoredPosition = new Vector2(36f, -380f);
            drt.sizeDelta = new Vector2(760f, 520f);

            _fade = UiFactory.Image(root, "Fade", new Color(0f, 0f, 0f, 0f));
            UiFactory.Fill(_fade.rectTransform);
        }

        private static void Place(RectTransform rt, Vector2 topLeft, Vector2 size)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = topLeft;
            rt.sizeDelta = size;
        }

        public void Toast(string message, float seconds)
        {
            if (_toastRoot == null)
            {
                return;
            }

            var t = UiFactory.Text(_toastRoot, "Toast", 26, UiFactory.TextMain, TextAnchor.UpperLeft);
            t.text = message;
            _toasts.Insert(0, (t, Time.unscaledTime + seconds));
            while (_toasts.Count > 4)
            {
                Destroy(_toasts[_toasts.Count - 1].text.gameObject);
                _toasts.RemoveAt(_toasts.Count - 1);
            }
        }

        public void CenterMessage(string message, float seconds)
        {
            _centerMessage.text = message;
            _centerUntil = Time.unscaledTime + seconds;
        }

        public void FadeTo(float alpha) => _fadeTarget = Mathf.Clamp01(alpha);

        /// <summary>Set the fade immediately (a new session starts black and fades in).</summary>
        public void SetFade(float alpha)
        {
            _fadeTarget = Mathf.Clamp01(alpha);
            var c = _fade.color;
            c.a = _fadeTarget;
            _fade.color = c;
        }

        public void OpenPauseMenu() => _menus.OpenPause();

        private void LateUpdate()
        {
            if (_s == null)
            {
                return;
            }

            float udt = Time.unscaledDeltaTime;
            var c = _fade.color;
            c.a = Mathf.MoveTowards(c.a, _fadeTarget, udt / 0.6f);
            _fade.color = c;
            _centerMessage.enabled = Time.unscaledTime < _centerUntil;

            // Toast layout and expiry.
            for (int i = _toasts.Count - 1; i >= 0; i--)
            {
                if (Time.unscaledTime > _toasts[i].until)
                {
                    Destroy(_toasts[i].text.gameObject);
                    _toasts.RemoveAt(i);
                }
            }

            for (int i = 0; i < _toasts.Count; i++)
            {
                var rt = _toasts[i].text.rectTransform;
                rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
                rt.pivot = new Vector2(0f, 1f);
                rt.anchoredPosition = new Vector2(0f, -i * 40f);
                rt.sizeDelta = new Vector2(760f, 38f);
                float left = _toasts[i].until - Time.unscaledTime;
                _toasts[i].text.color = new Color(UiFactory.TextMain.r, UiFactory.TextMain.g, UiFactory.TextMain.b, Mathf.Clamp01(left / 0.5f));
            }

            _menus.Tick();
            var p = _s.Controlled;
            bool showGameplay = p != null && !MenuOpen;
            _canvas.transform.Find("Heat").gameObject.SetActive(showGameplay);
            _canvas.transform.Find("Character").gameObject.SetActive(showGameplay);
            if (!showGameplay)
            {
                _vehiclePanel.gameObject.SetActive(false);
                _promptVehicle.Hide();
                _promptInteract.Hide();
                _diagnostics.enabled = GameSettings.ShowDiagnostics && _s.Diagnostics != null;
                if (_diagnostics.enabled)
                {
                    _diagnostics.text = _s.Diagnostics.OverlayText();
                }

                return;
            }

            UpdateHeat(p);
            _charName.text = p.Profile.FullName;
            _cash.text = "$" + p.Wallet.Cash.ToString("N0");
            var partner = _s.PartnerOf(p);
            var pc = partner != null ? partner.GetComponent<PartnerController>() : null;
            _partner.text = pc != null ? pc.StatusText + "    [D-pad down] switch   [D-pad up] " + (pc.Order == Core.Partner.PartnerOrder.Follow ? "hold" : "follow") : string.Empty;
            _clock.text = $"Day {_s.Clock.Day + 1}   {(int)_s.Clock.TimeOfDayHours:00}:{(int)(_s.Clock.TimeOfDayHours % 1 * 60):00}   Saltmarket";

            UpdateVehicle(p);
            UpdatePrompts(p);
            _diagnostics.enabled = GameSettings.ShowDiagnostics && _s.Diagnostics != null;
            if (_diagnostics.enabled)
            {
                _diagnostics.text = _s.Diagnostics.OverlayText();
            }
        }

        private void UpdateHeat(Protagonist p)
        {
            var heat = HeatEvaluator.Evaluate(p.Id, p.Appearance, p.VehicleDescriptor, _s.Incidents, _s.Dispatch, _s.Now);
            _heatHeadline.text = heat.Headline;
            Color col;
            switch (heat.Level)
            {
                case HeatLevel.Contact: col = new Color(0.95f, 0.28f, 0.22f); break;
                case HeatLevel.Searching: col = new Color(0.95f, 0.55f, 0.2f); break;
                case HeatLevel.Reported: col = new Color(0.95f, 0.75f, 0.25f); break;
                case HeatLevel.Witnessed: col = new Color(0.85f, 0.85f, 0.4f); break;
                case HeatLevel.DescriptionOnFile: col = new Color(0.6f, 0.7f, 0.95f); break;
                default: col = new Color(0.4f, 0.75f, 0.5f); break;
            }

            _heatBar.color = col;
            _heatHeadline.color = col;
            _heatStage.text = heat.Level >= HeatLevel.Reported && heat.Stage != ResponseStage.None
                ? $"Response: {PoliceRules.For(heat.Stage).Name} (stage {(int)heat.Stage} of 5)"
                : (heat.Level == HeatLevel.Unseen ? "No one is looking for you." : string.Empty);
            _heatReason.text = heat.Level == HeatLevel.Unseen ? string.Empty : heat.Reason;
        }

        private void UpdateVehicle(Protagonist p)
        {
            var v = p.InVehicle ? p.Vehicle : null;
            _vehiclePanel.gameObject.SetActive(v != null);
            if (v == null)
            {
                return;
            }

            float kmh = v.Controller.Speed * 3.6f;
            _speed.text = $"{kmh:0} km/h";
            _fuelFill.rectTransform.anchorMax = new Vector2(Mathf.Clamp01(v.Fuel.Fraction), 1f);
            _fuelFill.color = v.Fuel.InReserve ? new Color(0.95f, 0.35f, 0.25f) : UiFactory.Accent;
            _fuelLabel.text = v.Fuel.IsEmpty ? "EMPTY" : (v.Fuel.InReserve ? "RESERVE" : "FUEL");
            string cond;
            switch (v.Condition.State)
            {
                case VehicleHealthState.Disabled: cond = "Engine disabled"; break;
                case VehicleHealthState.Damaged: cond = $"Damaged ({v.Condition.Engine / 10f:0}% engine)"; break;
                default: cond = v.ModelName; break;
            }

            _condition.text = p.IsDriver ? cond : cond + "  (passenger)";
        }

        private void UpdatePrompts(Protagonist p)
        {
            var pcon = _s.PlayerControl;
            if (p.State == ProtagonistState.InVehicle)
            {
                _promptVehicle.Show("Y", p.Vehicle != null && p.Vehicle.Controller.Speed > 4f ? "Slow down to get out" : "Exit vehicle", p.Vehicle == null || p.Vehicle.Controller.Speed <= 4f);
                _promptInteract.Hide();
                return;
            }

            if (p.State == ProtagonistState.EnteringVehicle)
            {
                _promptVehicle.Show("Y", p.Transition != null && p.Transition.BreakIn ? "Breaking in..." : "Cancel", p.Transition != null && !p.Transition.Committed && p.Transition.Phase != TransitionPhase.BreakIn);
                _promptInteract.Hide();
                return;
            }

            if (pcon != null && pcon.TargetVehicle != null)
            {
                var v = pcon.TargetVehicle;
                bool owned = v.IsOwnedBy(p.Id, _s.PartnerOf(p)?.Id ?? Core.StableId.None);
                string verb = v.Locked && !owned && !v.WindowBroken ? "Break in (crime)" : (pcon.TargetSeat == 0 ? "Drive" : "Ride as passenger");
                _promptVehicle.Show("Y", verb + " - " + v.ModelName);
            }
            else if (pcon != null && !string.IsNullOrEmpty(pcon.TargetVehicleReason))
            {
                _promptVehicle.Show("Y", pcon.TargetVehicleReason, false);
            }
            else
            {
                _promptVehicle.Hide();
            }

            var it = pcon?.Interactions;
            if (it != null && it.Current != null)
            {
                bool ok = string.IsNullOrEmpty(it.CurrentBlockedReason);
                _promptInteract.Show("X", ok ? it.CurrentLabel : it.CurrentBlockedReason, ok);
            }
            else
            {
                _promptInteract.Hide();
            }
        }
    }
}
