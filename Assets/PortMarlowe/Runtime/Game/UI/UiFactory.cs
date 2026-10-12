using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.UI;

namespace PortMarlowe.Game.UI
{
    /// <summary>Small helpers to build uGUI from code (no prefab or font import step required).</summary>
    public static class UiFactory
    {
        private static Font _font;
        private static Sprite _circle;
        private static Sprite _rounded;

        public static Font Font => _font != null ? _font : (_font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf"));
        public static Sprite Circle => _circle != null ? _circle : (_circle = ProceduralTextures.Circle(64));
        public static Sprite Rounded => _rounded != null ? _rounded : (_rounded = ProceduralTextures.RoundedRect(32, 10));

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics()
        {
            _font = null;
            _circle = null;
            _rounded = null;
        }

        public static readonly Color Panel = new Color(0.05f, 0.06f, 0.07f, 0.72f);
        public static readonly Color TextMain = new Color(0.93f, 0.92f, 0.88f);
        public static readonly Color TextDim = new Color(0.68f, 0.69f, 0.68f);
        public static readonly Color Accent = new Color(0.94f, 0.66f, 0.28f);

        public static Canvas CreateCanvas(Transform parent, string name, int sortOrder)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = sortOrder;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
            return canvas;
        }

        public static RectTransform Rect(Transform parent, string name, Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot, Vector2 position, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform));
            var rt = go.GetComponent<RectTransform>();
            rt.SetParent(parent, false);
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.pivot = pivot;
            rt.anchoredPosition = position;
            rt.sizeDelta = size;
            return rt;
        }

        public static Image Image(Transform parent, string name, Color color, Sprite sprite = null, bool sliced = false)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var img = go.AddComponent<Image>();
            img.color = color;
            img.sprite = sprite;
            img.type = sliced ? UnityEngine.UI.Image.Type.Sliced : UnityEngine.UI.Image.Type.Simple;
            img.raycastTarget = false;
            return img;
        }

        public static Text Text(Transform parent, string name, int size, Color color, TextAnchor anchor, FontStyle style = FontStyle.Normal)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<Text>();
            t.font = Font;
            t.fontSize = size;
            t.color = color;
            t.alignment = anchor;
            t.fontStyle = style;
            t.horizontalOverflow = HorizontalWrapMode.Wrap;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            var shadow = go.AddComponent<Shadow>();
            shadow.effectColor = new Color(0f, 0f, 0f, 0.6f);
            shadow.effectDistance = new Vector2(1.5f, -1.5f);
            return t;
        }

        public static void Fill(RectTransform rt, float inset = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
        }

        /// <summary>Xbox face-button colours for glyphs (original circular treatment).</summary>
        public static Color GlyphColor(string button)
        {
            switch (button)
            {
                case "A": return new Color(0.36f, 0.72f, 0.28f);
                case "B": return new Color(0.82f, 0.25f, 0.22f);
                case "X": return new Color(0.22f, 0.48f, 0.86f);
                case "Y": return new Color(0.92f, 0.74f, 0.18f);
                default: return new Color(0.35f, 0.36f, 0.38f);
            }
        }
    }

    /// <summary>A controller glyph + label prompt ("[Y] Enter vehicle").</summary>
    public sealed class PromptWidget
    {
        private readonly RectTransform _root;
        private readonly Image _glyph;
        private readonly Text _glyphText;
        private readonly Text _label;

        public PromptWidget(Transform parent, string name, Vector2 position)
        {
            _root = UiFactory.Rect(parent, name, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), position, new Vector2(700f, 54f));
            var bg = UiFactory.Image(_root, "Bg", UiFactory.Panel, UiFactory.Rounded, true);
            UiFactory.Fill(bg.rectTransform);
            _glyph = UiFactory.Image(_root, "Glyph", Color.white, UiFactory.Circle);
            _glyph.rectTransform.anchorMin = _glyph.rectTransform.anchorMax = new Vector2(0f, 0.5f);
            _glyph.rectTransform.pivot = new Vector2(0f, 0.5f);
            _glyph.rectTransform.anchoredPosition = new Vector2(10f, 0f);
            _glyph.rectTransform.sizeDelta = new Vector2(40f, 40f);
            _glyphText = UiFactory.Text(_glyph.transform, "Letter", 24, Color.white, TextAnchor.MiddleCenter, FontStyle.Bold);
            UiFactory.Fill(_glyphText.rectTransform);
            _label = UiFactory.Text(_root, "Label", 28, UiFactory.TextMain, TextAnchor.MiddleLeft);
            UiFactory.Fill(_label.rectTransform);
            _label.rectTransform.offsetMin = new Vector2(62f, 0f);
            Hide();
        }

        public void Show(string button, string label, bool enabled = true)
        {
            _root.gameObject.SetActive(true);
            _glyph.color = enabled ? UiFactory.GlyphColor(button) : new Color(0.3f, 0.3f, 0.3f);
            _glyphText.text = button;
            _label.text = label;
            _label.color = enabled ? UiFactory.TextMain : UiFactory.TextDim;
            float w = Mathf.Clamp(80f + label.Length * 15f, 220f, 900f);
            _root.sizeDelta = new Vector2(w, 54f);
        }

        public void Hide() => _root.gameObject.SetActive(false);
    }
}
