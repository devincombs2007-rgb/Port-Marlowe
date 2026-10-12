using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Game.World;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortMarlowe.Game.Rendering
{
    /// <summary>
    /// Time-of-day lighting: sun/moon direction and colour, procedural sky, trilight ambient, fog,
    /// night emissives (windows, lamps) and a nearest-N streetlight budget. Reflection fallback is a
    /// time-sliced realtime probe (conventional, not ray traced). Values are art-direction hypotheses
    /// to be tuned against device captures.
    /// </summary>
    public sealed class LightingRig : MonoBehaviour
    {
        public int MaxActiveStreetLights = 20;

        private WorldClock _clock;
        private Light _sun;
        private Material _sky;
        private BuiltDistrict _district;
        private ReflectionProbe _probe;
        private float _probeTimer;
        private float _lampTimer;
        private Transform _focus;
        private readonly List<(float d, StreetLamp lamp)> _lampSort = new List<(float, StreetLamp)>();

        public float NightFactor { get; private set; }
        public Light Sun => _sun;

        public static LightingRig Create(Transform parent, WorldClock clock, MaterialLibrary lib, BuiltDistrict district)
        {
            var go = new GameObject("LightingRig");
            go.transform.SetParent(parent, false);
            var rig = go.AddComponent<LightingRig>();
            rig._clock = clock;
            rig._district = district;

            var sunGo = new GameObject("Sun");
            sunGo.transform.SetParent(go.transform, false);
            rig._sun = sunGo.AddComponent<Light>();
            rig._sun.type = LightType.Directional;
            rig._sun.shadows = LightShadows.Soft;
            rig._sun.shadowStrength = 0.92f;
            rig._sun.shadowBias = 0.04f;
            rig._sun.shadowNormalBias = 0.35f;
            RenderSettings.sun = rig._sun;

            rig._sky = lib.Sky();
            RenderSettings.skybox = rig._sky;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;

            var probeGo = new GameObject("CityReflectionProbe");
            probeGo.transform.SetParent(go.transform, false);
            probeGo.transform.position = new Vector3(114f, 8f, 114f);
            rig._probe = probeGo.AddComponent<ReflectionProbe>();
            rig._probe.mode = ReflectionProbeMode.Realtime;
            rig._probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
            rig._probe.timeSlicingMode = ReflectionProbeTimeSlicingMode.IndividualFaces;
            rig._probe.size = new Vector3(420f, 120f, 420f);
            rig._probe.resolution = 128;
            rig._probe.boxProjection = false;
            rig._probe.cullingMask = GameLayers.Mask(GameLayers.Default, GameLayers.Ground, GameLayers.Building, GameLayers.Water);
            rig._probe.hdr = true;
            rig.Apply(true);
            return rig;
        }

        public void SetFocus(Transform focus) => _focus = focus;

        private void Update() => Apply(false);

        private void Apply(bool force)
        {
            if (_clock == null)
            {
                return;
            }

            float h = (float)_clock.TimeOfDayHours;
            // Sun path: rises ~6:00 in the east, sets ~19:30 in the west, peak ~62 degrees.
            float dayT = Mathf.InverseLerp(6f, 19.5f, h);
            float elevation = Mathf.Sin(dayT * Mathf.PI) * 62f;
            bool day = h > 6f && h < 19.5f;
            float azimuth = Mathf.Lerp(80f, 280f, dayT);
            float night = day ? Mathf.Clamp01(1f - elevation / 8f) : 1f;
            NightFactor = Mathf.SmoothStep(0f, 1f, night);
            Vehicles.Lighting.NightFactor = NightFactor;

            if (day && elevation > 0.5f)
            {
                _sun.transform.rotation = Quaternion.Euler(elevation, azimuth, 0f);
                float golden = Mathf.Clamp01(1f - elevation / 25f);
                _sun.color = Color.Lerp(new Color(1f, 0.96f, 0.9f), new Color(1f, 0.62f, 0.36f), golden);
                _sun.intensity = Mathf.Lerp(0.25f, 1.35f, Mathf.Clamp01(elevation / 30f));
            }
            else
            {
                // Moonlight: dim, cool, high-ish so shadows stay readable.
                float moonT = Mathf.Repeat((h - 19.5f) / 10.5f, 1f);
                _sun.transform.rotation = Quaternion.Euler(35f + 15f * Mathf.Sin(moonT * Mathf.PI), Mathf.Lerp(100f, 260f, moonT), 0f);
                _sun.color = new Color(0.62f, 0.72f, 1f);
                _sun.intensity = 0.16f;
            }

            Color skyDay = new Color(0.52f, 0.62f, 0.75f);
            Color skyDusk = new Color(0.42f, 0.36f, 0.42f);
            Color skyNight = new Color(0.06f, 0.08f, 0.13f);
            Color sky = NightFactor < 0.5f ? Color.Lerp(skyDay, skyDusk, NightFactor * 2f) : Color.Lerp(skyDusk, skyNight, NightFactor * 2f - 1f);
            RenderSettings.ambientSkyColor = sky;
            RenderSettings.ambientEquatorColor = Color.Lerp(new Color(0.46f, 0.47f, 0.48f), new Color(0.09f, 0.09f, 0.12f), NightFactor);
            RenderSettings.ambientGroundColor = Color.Lerp(new Color(0.23f, 0.21f, 0.19f), new Color(0.04f, 0.04f, 0.05f), NightFactor);
            RenderSettings.fogColor = Color.Lerp(new Color(0.66f, 0.72f, 0.78f), new Color(0.07f, 0.08f, 0.11f), NightFactor);
            RenderSettings.fogDensity = Mathf.Lerp(0.0019f, 0.0032f, NightFactor);
            if (_sky != null)
            {
                _sky.SetFloat("_Exposure", Mathf.Lerp(1.15f, 0.12f, NightFactor));
                _sky.SetFloat("_AtmosphereThickness", Mathf.Lerp(0.95f, 1.4f, Mathf.Clamp01(1f - elevation / 20f)));
                _sky.SetFloat("_SunSize", 0.035f);
            }

            if (_district != null)
            {
                foreach (var (material, nightEmission) in _district.Materials.NightEmissives)
                {
                    MaterialLibrary.SetEmission(material, nightEmission * NightFactor);
                }

                if (_district.SafehouseLamp != null)
                {
                    _district.SafehouseLamp.intensity = Mathf.Lerp(0.8f, 1.8f, NightFactor);
                }
            }

            _lampTimer -= Time.deltaTime;
            if (force || _lampTimer <= 0f)
            {
                _lampTimer = 0.5f;
                UpdateStreetLights();
            }

            _probeTimer -= Time.deltaTime;
            if (force || _probeTimer <= 0f)
            {
                _probeTimer = 20f;
                _probe.RenderProbe();
            }
        }

        /// <summary>Only the nearest N lamps are real lights at night; the rest rely on emissive heads.</summary>
        private void UpdateStreetLights()
        {
            if (_district == null)
            {
                return;
            }

            bool on = NightFactor > 0.35f;
            Vector3 focus = _focus != null ? _focus.position : Vector3.zero;
            _lampSort.Clear();
            foreach (var lamp in _district.Lamps)
            {
                _lampSort.Add(((lamp.Position - focus).sqrMagnitude, lamp));
            }

            _lampSort.Sort((a, b) => a.d.CompareTo(b.d));
            for (int i = 0; i < _lampSort.Count; i++)
            {
                _lampSort[i].lamp.Light.enabled = on && i < MaxActiveStreetLights;
            }
        }
    }
}
