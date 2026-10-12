using System.Collections.Generic;
using PortMarlowe.Core.World;
using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.UI;

namespace PortMarlowe.Game.UI
{
    /// <summary>
    /// Camera-aligned circular minimap (PM-060, first pass). The map texture is drawn once per
    /// session from the district plan (blocks, buildings, roads, water). Markers: player, partner,
    /// safehouse (clamped to the rim when off-map), owned car, and police units only when the player
    /// could plausibly know about them — within sight range or running sirens. The map never reveals
    /// what police know or where witnesses are.
    /// </summary>
    public sealed class Minimap : MonoBehaviour
    {
        public const float Diameter = 260f;
        public const float ViewRadiusMetres = 95f;
        public const float PoliceKnownRadius = 70f;

        private GameSession _s;
        private Texture2D _map;
        private RectTransform _root;
        private RawImage _image;
        private RectTransform _player;
        private RectTransform _partner;
        private RectTransform _safehouse;
        private RectTransform _car;
        private readonly List<RectTransform> _police = new List<RectTransform>();
        private float _minX;
        private float _minZ;
        private float _metresPerTexel;

        public static Minimap Create(Transform canvas, GameSession session)
        {
            var go = new GameObject("Minimap", typeof(RectTransform));
            go.transform.SetParent(canvas, false);
            // Draw beneath the screen fade and the menus.
            var fade = canvas.Find("Fade");
            if (fade != null)
            {
                go.transform.SetSiblingIndex(fade.GetSiblingIndex());
            }

            var m = go.AddComponent<Minimap>();
            m._s = session;
            m.Build();
            return m;
        }

        private void Build()
        {
            _root = (RectTransform)transform;
            _root.anchorMin = _root.anchorMax = Vector2.zero;
            _root.pivot = Vector2.zero;
            _root.anchoredPosition = new Vector2(36f, 176f);
            _root.sizeDelta = new Vector2(Diameter, Diameter);

            var frame = UiFactory.Image(_root, "Frame", new Color(0f, 0f, 0f, 0.55f), UiFactory.Circle);
            UiFactory.Fill(frame.rectTransform, -4f);

            var maskGo = UiFactory.Image(_root, "Mask", Color.white, UiFactory.Circle);
            UiFactory.Fill(maskGo.rectTransform);
            var mask = maskGo.gameObject.AddComponent<Mask>();
            mask.showMaskGraphic = false;

            _map = DrawMap(_s.District.Plan);
            _s.Materials.Track(_map);
            var imgGo = new GameObject("Map", typeof(RectTransform));
            imgGo.transform.SetParent(maskGo.transform, false);
            _image = imgGo.AddComponent<RawImage>();
            _image.texture = _map;
            _image.raycastTarget = false;
            var irt = _image.rectTransform;
            irt.anchorMin = irt.anchorMax = new Vector2(0.5f, 0.5f);
            irt.sizeDelta = new Vector2(Diameter, Diameter);

            _safehouse = Marker(maskGo.transform, "Safehouse", new Color(0.96f, 0.7f, 0.25f), 16f);
            _car = Marker(maskGo.transform, "Car", new Color(0.55f, 0.8f, 1f), 12f);
            _partner = Marker(maskGo.transform, "Partner", new Color(0.4f, 0.95f, 0.55f), 13f);
            _player = Marker(maskGo.transform, "Player", Color.white, 16f);
            var nose = UiFactory.Image(_player, "Nose", Color.white);
            nose.rectTransform.sizeDelta = new Vector2(4f, 12f);
            nose.rectTransform.anchoredPosition = new Vector2(0f, 9f);
        }

        private static RectTransform Marker(Transform parent, string name, Color color, float size)
        {
            var img = UiFactory.Image(parent, name, color, UiFactory.Circle);
            var rt = img.rectTransform;
            rt.anchorMin = rt.anchorMax = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(size, size);
            return rt;
        }

        private Texture2D DrawMap(DistrictPlan plan)
        {
            const int size = 512;
            float width = plan.MaxX - plan.MinX;
            float depth = plan.MaxZ - plan.MinZ;
            _metresPerTexel = Mathf.Max(width, depth) / size;
            _minX = plan.MinX;
            _minZ = plan.MinZ;
            var px = new Color32[size * size];
            var ground = new Color32(38, 42, 46, 255);
            var water = new Color32(22, 46, 62, 255);
            for (int y = 0; y < size; y++)
            {
                float z = _minZ + (y + 0.5f) * _metresPerTexel;
                for (int x = 0; x < size; x++)
                {
                    px[y * size + x] = z < plan.QuayEdgeZ ? water : ground;
                }
            }

            foreach (var b in plan.Blocks)
            {
                Color32 c;
                switch (b.Use)
                {
                    case BlockUse.Park: c = new Color32(46, 74, 44, 255); break;
                    case BlockUse.Plaza: c = new Color32(72, 66, 58, 255); break;
                    case BlockUse.PoliceStation: c = new Color32(46, 56, 84, 255); break;
                    default: c = new Color32(52, 56, 60, 255); break;
                }

                FillRect(px, size, b.MinX, b.MinZ, b.MaxX, b.MaxZ, c);
            }

            foreach (var bd in plan.Buildings)
            {
                FillRect(px, size, bd.MinX, bd.MinZ, bd.MaxX, bd.MaxZ, new Color32(84, 88, 94, 255));
            }

            var road = new Color32(128, 130, 132, 255);
            foreach (var e in plan.Edges)
            {
                var a = plan.Nodes[e.A].Position;
                var b = plan.Nodes[e.B].Position;
                float hw = plan.RoadHalfWidth;
                FillRect(px, size, Mathf.Min(a.X, b.X) - hw, Mathf.Min(a.Z, b.Z) - hw, Mathf.Max(a.X, b.X) + hw, Mathf.Max(a.Z, b.Z) + hw, road);
            }

            var tex = new Texture2D(size, size, TextureFormat.RGBA32, true) { name = "MinimapDistrict", wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            tex.SetPixels32(px);
            tex.Apply(true, true);
            return tex;
        }

        private void FillRect(Color32[] px, int size, float x0, float z0, float x1, float z1, Color32 c)
        {
            int ix0 = Mathf.Clamp(Mathf.FloorToInt((x0 - _minX) / _metresPerTexel), 0, size - 1);
            int ix1 = Mathf.Clamp(Mathf.CeilToInt((x1 - _minX) / _metresPerTexel), 0, size - 1);
            int iz0 = Mathf.Clamp(Mathf.FloorToInt((z0 - _minZ) / _metresPerTexel), 0, size - 1);
            int iz1 = Mathf.Clamp(Mathf.CeilToInt((z1 - _minZ) / _metresPerTexel), 0, size - 1);
            for (int y = iz0; y <= iz1; y++)
            {
                for (int x = ix0; x <= ix1; x++)
                {
                    px[y * size + x] = c;
                }
            }
        }

        private void LateUpdate()
        {
            var p = _s?.Controlled;
            bool show = p != null && _s.Hud != null && !_s.Hud.MenuOpen;
            _root.gameObject.SetActive(show);
            if (!show)
            {
                return;
            }

            Vector3 centre = p.transform.position;
            float yaw = _s.CameraRig != null ? _s.CameraRig.Yaw : 0f;

            // Show a square of 2R metres around the player, rotated so camera-forward is up.
            float texSpan = 2f * ViewRadiusMetres / (_metresPerTexel * _map.width);
            float u = (centre.x - _minX) / (_metresPerTexel * _map.width);
            float v = (centre.z - _minZ) / (_metresPerTexel * _map.height);
            _image.uvRect = new Rect(u - texSpan * 0.5f, v - texSpan * 0.5f, texSpan, texSpan);
            _image.rectTransform.localRotation = Quaternion.Euler(0f, 0f, yaw);
            _player.localRotation = Quaternion.Euler(0f, 0f, yaw - p.transform.eulerAngles.y);

            var partner = _s.PartnerOf(p);
            Place(_partner, partner != null ? partner.transform.position : (Vector3?)null, centre, yaw, false);
            Place(_safehouse, _s.District.SafehouseDoorOutside, centre, yaw, true);
            _s.Vehicles.TryGetValue(GameWorld.PlayerCarId, out var car);
            Place(_car, car != null && !(p.InVehicle && p.Vehicle == car) ? car.transform.position : (Vector3?)null, centre, yaw, false);

            int n = 0;
            if (_s.Police != null)
            {
                foreach (var unit in _s.Police.Units)
                {
                    if (unit?.Car == null)
                    {
                        continue;
                    }

                    Vector3 pos = unit.Car.transform.position;
                    bool known = unit.Car.SirenOn || (pos - centre).sqrMagnitude < PoliceKnownRadius * PoliceKnownRadius;
                    if (!known)
                    {
                        continue;
                    }

                    if (n >= _police.Count)
                    {
                        _police.Add(Marker(_partner.parent, "Police", new Color(0.35f, 0.55f, 1f), 12f));
                    }

                    _police[n].gameObject.SetActive(true);
                    bool blinkRed = unit.Car.SirenOn && Mathf.Repeat(Time.unscaledTime, 0.6f) < 0.3f;
                    _police[n].GetComponent<Image>().color = blinkRed ? new Color(1f, 0.3f, 0.3f) : new Color(0.35f, 0.55f, 1f);
                    Place(_police[n], pos, centre, yaw, false);
                    n++;
                }
            }

            for (int i = n; i < _police.Count; i++)
            {
                _police[i].gameObject.SetActive(false);
            }

            _player.SetAsLastSibling();
        }

        private static void Place(RectTransform marker, Vector3? world, Vector3 centre, float yaw, bool clampToRim)
        {
            if (world == null)
            {
                marker.gameObject.SetActive(false);
                return;
            }

            Vector3 d = world.Value - centre;
            Vector2 local = new Vector2(d.x, d.z);
            local = (Vector2)(Quaternion.Euler(0f, 0f, yaw) * local);
            float r = local.magnitude;
            float maxR = ViewRadiusMetres * 0.94f;
            if (r > maxR)
            {
                if (!clampToRim)
                {
                    marker.gameObject.SetActive(false);
                    return;
                }

                local *= maxR / r;
            }

            marker.gameObject.SetActive(true);
            marker.anchoredPosition = local * (Diameter * 0.5f / ViewRadiusMetres);
        }
    }
}
