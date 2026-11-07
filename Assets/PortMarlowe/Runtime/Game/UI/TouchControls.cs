using PortMarlowe.Game.Characters;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.OnScreen;
using UnityEngine.UI;

namespace PortMarlowe.Game.UI
{
    /// <summary>
    /// On-screen controls for phones and tablets (browser builds included). Each control drives a
    /// virtual Xbox-style gamepad through the Input System's on-screen components, so gameplay code
    /// and bindings are unchanged: the left stick moves, face buttons keep their controller
    /// meanings, and pedals appear while driving. Shown on mobile platforms and whenever the screen
    /// is touched; hidden behind menus (menu rows are tappable instead).
    /// </summary>
    public sealed class TouchControls : MonoBehaviour
    {
        private const float HideAfterSecondsWithoutTouch = 30f;

        private GameSession _s;
        private RectTransform _root;
        private GameObject _onFoot;
        private GameObject _driving;
        private GameObject _common;
        private float _lastTouch = float.NegativeInfinity;

        public bool Visible => _root != null && _root.gameObject.activeSelf;

        public static TouchControls Create(Transform canvas, GameSession session)
        {
            var go = new GameObject("TouchControls", typeof(RectTransform));
            go.transform.SetParent(canvas, false);
            var fade = canvas.Find("Fade");
            if (fade != null)
            {
                go.transform.SetSiblingIndex(fade.GetSiblingIndex());
            }

            var t = go.AddComponent<TouchControls>();
            t._s = session;
            t.Build();
            return t;
        }

        private void Build()
        {
            _root = (RectTransform)transform;
            UiFactory.Fill(_root);
            _common = Group("Common");
            _onFoot = Group("OnFoot");
            _driving = Group("Driving");

            // Left thumb: movement / steering (both modes).
            Stick(_common.transform, "MoveStick", "<Gamepad>/leftStick", new Vector2(0f, 0f), new Vector2(230f, 230f), 300f);

            // Right thumb, on foot: camera stick plus the four face buttons.
            Stick(_onFoot.transform, "LookStick", "<Gamepad>/rightStick", new Vector2(1f, 0f), new Vector2(-640f, 300f), 240f);
            Vector2 c = new Vector2(-230f, 250f);
            FaceButton(_onFoot.transform, "A", "Sprint", "<Gamepad>/buttonSouth", c + new Vector2(0f, -110f));
            FaceButton(_onFoot.transform, "B", "Strike", "<Gamepad>/buttonEast", c + new Vector2(110f, 0f));
            FaceButton(_onFoot.transform, "X", "Use", "<Gamepad>/buttonWest", c + new Vector2(-110f, 0f));
            FaceButton(_onFoot.transform, "Y", "Car", "<Gamepad>/buttonNorth", c + new Vector2(0f, 110f));

            // Right thumb, driving: pedals, handbrake and exit.
            Pedal(_driving.transform, "Gas", "<Gamepad>/rightTrigger", new Vector2(-150f, 180f), new Color(0.3f, 0.75f, 0.35f));
            Pedal(_driving.transform, "Brake", "<Gamepad>/leftTrigger", new Vector2(-340f, 160f), new Color(0.82f, 0.3f, 0.26f));
            FaceButton(_driving.transform, "RB", "Handbrake", "<Gamepad>/rightShoulder", new Vector2(-520f, 150f));
            FaceButton(_driving.transform, "Y", "Exit", "<Gamepad>/buttonNorth", new Vector2(-170f, 380f));

            // Top right, under the police panel: pause, switch character, partner order.
            FaceButton(_common.transform, "||", "Pause", "<Gamepad>/start", new Vector2(-90f, -260f), topRight: true, size: 96f);
            FaceButton(_common.transform, "<>", "Switch", "<Gamepad>/dpad/down", new Vector2(-210f, -260f), topRight: true, size: 96f);
            FaceButton(_common.transform, "P", "Partner", "<Gamepad>/dpad/up", new Vector2(-330f, -260f), topRight: true, size: 96f);

            _root.gameObject.SetActive(false);
        }

        private GameObject Group(string name)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(_root, false);
            UiFactory.Fill((RectTransform)go.transform);
            return go;
        }

        private static void Stick(Transform parent, string name, string path, Vector2 anchor, Vector2 position, float baseSize)
        {
            var area = UiFactory.Rect(parent, name, anchor, anchor, new Vector2(0.5f, 0.5f), position, new Vector2(baseSize, baseSize));
            var ring = UiFactory.Image(area, "Ring", new Color(1f, 1f, 1f, 0.16f), UiFactory.Circle);
            UiFactory.Fill(ring.rectTransform);

            // The knob is created inactive so the control path is set before OnEnable runs.
            var knobGo = new GameObject("Knob", typeof(RectTransform));
            knobGo.SetActive(false);
            knobGo.transform.SetParent(area, false);
            var knob = knobGo.AddComponent<Image>();
            knob.sprite = UiFactory.Circle;
            knob.color = new Color(1f, 1f, 1f, 0.42f);
            knob.raycastTarget = true;
            var rt = knob.rectTransform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(baseSize * 0.42f, baseSize * 0.42f);
            var stick = knobGo.AddComponent<OnScreenStick>();
            stick.movementRange = baseSize * 0.38f;
            stick.controlPath = path;
            knobGo.SetActive(true);
        }

        private static void FaceButton(Transform parent, string glyph, string caption, string path, Vector2 position, bool topRight = false, float size = 110f)
        {
            Vector2 anchor = topRight ? new Vector2(1f, 1f) : new Vector2(1f, 0f);
            var go = new GameObject("Btn_" + caption, typeof(RectTransform));
            go.SetActive(false);
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = anchor;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = position;
            rt.sizeDelta = new Vector2(size, size);
            var img = go.AddComponent<Image>();
            img.sprite = UiFactory.Circle;
            var face = UiFactory.GlyphColor(glyph);
            img.color = new Color(face.r, face.g, face.b, 0.55f);
            img.raycastTarget = true;
            var label = UiFactory.Text(go.transform, "Glyph", (int)(size * 0.36f), Color.white, TextAnchor.MiddleCenter, FontStyle.Bold);
            UiFactory.Fill(label.rectTransform);
            label.text = glyph;
            var cap = UiFactory.Text(go.transform, "Caption", 20, new Color(1f, 1f, 1f, 0.8f), TextAnchor.UpperCenter);
            cap.rectTransform.anchorMin = new Vector2(0f, 0f);
            cap.rectTransform.anchorMax = new Vector2(1f, 0f);
            cap.rectTransform.pivot = new Vector2(0.5f, 1f);
            cap.rectTransform.sizeDelta = new Vector2(80f, 26f);
            cap.rectTransform.anchoredPosition = new Vector2(0f, -2f);
            cap.text = caption;
            go.AddComponent<OnScreenButton>().controlPath = path;
            go.SetActive(true);
        }

        private static void Pedal(Transform parent, string caption, string path, Vector2 position, Color color)
        {
            var go = new GameObject("Pedal_" + caption, typeof(RectTransform));
            go.SetActive(false);
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(1f, 0f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.anchoredPosition = position;
            rt.sizeDelta = new Vector2(160f, 230f);
            var img = go.AddComponent<Image>();
            img.sprite = UiFactory.Rounded;
            img.type = UnityEngine.UI.Image.Type.Sliced;
            img.color = new Color(color.r, color.g, color.b, 0.5f);
            img.raycastTarget = true;
            var label = UiFactory.Text(go.transform, "Label", 30, Color.white, TextAnchor.MiddleCenter, FontStyle.Bold);
            UiFactory.Fill(label.rectTransform);
            label.text = caption.ToUpperInvariant();
            go.AddComponent<OnScreenButton>().controlPath = path;
            go.SetActive(true);
        }

        private void LateUpdate()
        {
            var touch = Touchscreen.current;
            if (touch != null && touch.primaryTouch.press.isPressed)
            {
                _lastTouch = Time.unscaledTime;
            }

            var p = _s?.Controlled;
            bool menu = _s?.Hud == null || _s.Hud.MenuOpen;
            bool touchMode = Application.isMobilePlatform || Time.unscaledTime - _lastTouch < HideAfterSecondsWithoutTouch;
            bool show = touchMode && p != null && !menu;
            if (_root.gameObject.activeSelf != show)
            {
                _root.gameObject.SetActive(show);
            }

            if (!show)
            {
                return;
            }

            bool driving = p.InVehicle && p.IsDriver;
            SetActive(_driving, driving);
            SetActive(_onFoot, !driving);
            SetActive(_common, true);
        }

        private static void SetActive(GameObject go, bool active)
        {
            if (go.activeSelf != active)
            {
                go.SetActive(active);
            }
        }
    }
}
