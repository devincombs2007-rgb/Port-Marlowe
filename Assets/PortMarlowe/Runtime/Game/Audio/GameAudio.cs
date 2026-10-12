using System.Collections.Generic;
using PortMarlowe.Game.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.Audio
{
    public enum SfxKind
    {
        Impact = 0,
        Punch = 1,
        Glass = 2,
        Door = 3,
        UiMove = 4,
        UiConfirm = 5,
        Alarm = 6,
    }

    /// <summary>
    /// PLACEHOLDER audio: short clips synthesised at startup (no licensed audio is available on the
    /// build host; see Docs/AssetManifest.md for the Freesound/licensed replacement plan). Provides a
    /// pooled one-shot player and loop clips for engines, sirens and horns. Buses map to an
    /// AudioMixer once real content exists; for now volumes are per-category constants.
    /// </summary>
    public sealed class GameAudio : MonoBehaviour
    {
        private const int Rate = 44100;
        private readonly Dictionary<SfxKind, AudioClip> _clips = new Dictionary<SfxKind, AudioClip>();
        private readonly List<AudioSource> _pool = new List<AudioSource>();
        private int _next;

        public AudioClip EngineLoop { get; private set; }
        public AudioClip SirenLoop { get; private set; }
        public AudioClip HornLoop { get; private set; }
        public AudioClip AlarmLoop { get; private set; }

        public static GameAudio Create(Transform parent)
        {
            var go = new GameObject("GameAudio");
            go.transform.SetParent(parent, false);
            var a = go.AddComponent<GameAudio>();
            a.Build();
            return a;
        }

        private void Build()
        {
            var rng = new PortMarlowe.Core.DeterministicRandom(77);
            _clips[SfxKind.Impact] = Make("Impact", 0.35f, (t, i) => Noise(rng) * Mathf.Exp(-t * 14f) * 0.9f + Mathf.Sin(t * 2f * Mathf.PI * 60f) * Mathf.Exp(-t * 9f) * 0.6f);
            _clips[SfxKind.Punch] = Make("Punch", 0.18f, (t, i) => (Noise(rng) * 0.5f + Mathf.Sin(t * 2f * Mathf.PI * 110f)) * Mathf.Exp(-t * 30f));
            _clips[SfxKind.Glass] = Make("Glass", 0.6f, (t, i) => Noise(rng) * Mathf.Exp(-t * 8f) * (0.4f + 0.6f * Mathf.Abs(Mathf.Sin(t * 2f * Mathf.PI * (2600f + 900f * Mathf.Sin(t * 37f))))));
            _clips[SfxKind.Door] = Make("Door", 0.22f, (t, i) => (Noise(rng) * 0.3f + Mathf.Sin(t * 2f * Mathf.PI * 140f)) * Mathf.Exp(-t * 22f));
            _clips[SfxKind.UiMove] = Make("UiMove", 0.05f, (t, i) => Mathf.Sin(t * 2f * Mathf.PI * 880f) * (1f - t / 0.05f) * 0.4f);
            _clips[SfxKind.UiConfirm] = Make("UiConfirm", 0.12f, (t, i) => Mathf.Sin(t * 2f * Mathf.PI * (660f + t * 3000f)) * (1f - t / 0.12f) * 0.45f);

            // Loops: integer cycle counts per loop length so they wrap without clicks.
            EngineLoop = Make("EngineLoop", 1f, (t, i) =>
            {
                float f = 55f;
                float v = Mathf.Sin(t * 2f * Mathf.PI * f) * 0.5f + Mathf.Sin(t * 2f * Mathf.PI * f * 2f) * 0.25f + Mathf.Sin(t * 2f * Mathf.PI * f * 3f) * 0.12f;
                return v * (0.8f + 0.2f * Mathf.Sin(t * 2f * Mathf.PI * 11f)) * 0.6f;
            });
            SirenLoop = Make("SirenLoop", 2f, (t, i) =>
            {
                // Two-tone wail: frequency sweeps 650-1350 Hz once per second (phase-accumulated).
                return Mathf.Sin(SirenPhase(i)) * 0.5f;
            });
            HornLoop = Make("HornLoop", 0.5f, (t, i) => (Mathf.Sin(t * 2f * Mathf.PI * 400f) + Mathf.Sin(t * 2f * Mathf.PI * 500f)) * 0.3f);
            AlarmLoop = Make("AlarmLoop", 1f, (t, i) => Mathf.Sign(Mathf.Sin(t * 2f * Mathf.PI * (t % 0.5f < 0.25f ? 900f : 700f))) * 0.18f);

            for (int i = 0; i < 12; i++)
            {
                var go = new GameObject("Sfx" + i);
                go.transform.SetParent(transform, false);
                var src = go.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.spatialBlend = 1f;
                src.rolloffMode = AudioRolloffMode.Linear;
                src.minDistance = 2f;
                src.maxDistance = 60f;
                _pool.Add(src);
            }
        }

        private double _sirenPhase;

        private float SirenPhase(int i)
        {
            if (i == 0)
            {
                _sirenPhase = 0;
            }

            float t = i / (float)Rate;
            float f = 1000f + 350f * Mathf.Sin(t * 2f * Mathf.PI * 0.5f);
            _sirenPhase += 2.0 * System.Math.PI * f / Rate;
            return (float)_sirenPhase;
        }

        public void PlayOneShot(SfxKind kind, Vector3 position, float volume = 1f)
        {
            if (!_clips.TryGetValue(kind, out var clip))
            {
                return;
            }

            var src = _pool[_next];
            _next = (_next + 1) % _pool.Count;
            src.transform.position = position;
            src.spatialBlend = kind == SfxKind.UiMove || kind == SfxKind.UiConfirm ? 0f : 1f;
            src.pitch = Random.Range(0.92f, 1.08f);
            src.PlayOneShot(clip, volume);
        }

        public AudioSource CreateLoop(Transform parent, AudioClip clip, float volume, float maxDistance)
        {
            var go = new GameObject(clip.name + "Source");
            go.transform.SetParent(parent, false);
            var src = go.AddComponent<AudioSource>();
            src.clip = clip;
            src.loop = true;
            src.spatialBlend = 1f;
            src.volume = volume;
            src.rolloffMode = AudioRolloffMode.Linear;
            src.minDistance = 3f;
            src.maxDistance = maxDistance;
            src.dopplerLevel = 0.3f;
            return src;
        }

        private static float Noise(PortMarlowe.Core.DeterministicRandom rng) => rng.NextFloat() * 2f - 1f;

        private static AudioClip Make(string name, float seconds, System.Func<float, int, float> fn)
        {
            int n = Mathf.Max(1, (int)(seconds * Rate));
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                data[i] = Mathf.Clamp(fn(i / (float)Rate, i), -1f, 1f);
            }

            var clip = AudioClip.Create(name, n, 1, Rate, false);
            clip.SetData(data, 0);
            return clip;
        }
    }

    /// <summary>Engine, horn, siren and alarm loops for one vehicle, driven by its controller state.</summary>
    public sealed class VehicleAudio : MonoBehaviour
    {
        private VehicleEntity _v;
        private AudioSource _engine;
        private AudioSource _siren;
        private AudioSource _horn;
        private AudioSource _alarm;

        public bool HornPressed { get; set; }

        public static VehicleAudio Attach(VehicleEntity v, GameAudio audio)
        {
            var a = v.gameObject.AddComponent<VehicleAudio>();
            a._v = v;
            a._engine = audio.CreateLoop(v.transform, audio.EngineLoop, 0.55f, 70f);
            a._horn = audio.CreateLoop(v.transform, audio.HornLoop, 0.7f, 80f);
            a._alarm = audio.CreateLoop(v.transform, audio.AlarmLoop, 0.5f, 70f);
            if (v.IsPolice)
            {
                a._siren = audio.CreateLoop(v.transform, audio.SirenLoop, 0.75f, 160f);
            }

            return a;
        }

        private void Update()
        {
            if (_v == null || _v.Controller == null)
            {
                return;
            }

            var c = _v.Controller;
            Toggle(_engine, c.EngineRunning);
            if (c.EngineRunning)
            {
                _engine.pitch = Mathf.Lerp(0.55f, 2.3f, c.Rpm01);
                _engine.volume = Mathf.Lerp(0.35f, 0.7f, c.EngineLoad);
            }

            Toggle(_horn, HornPressed);
            Toggle(_alarm, _v.AlarmActive);
            if (_siren != null)
            {
                Toggle(_siren, _v.SirenOn);
            }
        }

        private static void Toggle(AudioSource s, bool on)
        {
            if (s == null)
            {
                return;
            }

            if (on && !s.isPlaying)
            {
                s.Play();
            }
            else if (!on && s.isPlaying)
            {
                s.Stop();
            }
        }
    }
}
