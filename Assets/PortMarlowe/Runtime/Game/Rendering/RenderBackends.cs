using UnityEngine;

namespace PortMarlowe.Game.Rendering
{
    /// <summary>
    /// Seam between gameplay code and the render pipeline. Gameplay never references URP types
    /// directly; the URP backend assembly (PortMarlowe.Rendering.Urp) registers itself at startup.
    /// When no pipeline backend is present (pipeline asset missing, headless test runs) the
    /// built-in fallback still applies the engine-level parts of each quality profile.
    /// </summary>
    public interface IRenderBackend
    {
        string Name { get; }

        /// <summary>Per-camera setup: post-processing, anti-aliasing, depth/opaque textures.</summary>
        void ConfigureCamera(Camera camera);

        /// <summary>Apply a quality profile (render scale, shadows, LOD bias, frame pacing).</summary>
        void ApplyQuality(QualityProfile profile);

        /// <summary>Drive exposure/colour grading from the time of day (0 = noon, 1 = night).</summary>
        void SetNightFactor(float nightFactor);

        /// <summary>One-line description for the diagnostics overlay and report.</summary>
        string Describe();
    }

    public static class RenderBackends
    {
        private static IRenderBackend _current;

        public static IRenderBackend Current => _current ?? (_current = new FallbackRenderBackend());

        public static void Register(IRenderBackend backend)
        {
            if (backend != null)
            {
                _current = backend;
                Debug.Log("[PM] Render backend: " + backend.Name);
            }
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics() => _current = null;
    }

    /// <summary>Profile values shared by every backend so the numbers live in one place.</summary>
    public readonly struct QualityTargets
    {
        public readonly int TargetFrameRate;
        public readonly float RenderScale;
        public readonly float ShadowDistance;
        public readonly int ShadowCascades;
        public readonly float LodBias;
        public readonly int MsaaSamples;
        public readonly bool SoftShadows;
        public readonly bool Ssao;
        public readonly bool Bloom;

        private QualityTargets(int fps, float scale, float shadowDistance, int cascades, float lodBias, int msaa, bool softShadows, bool ssao, bool bloom)
        {
            TargetFrameRate = fps;
            RenderScale = scale;
            ShadowDistance = shadowDistance;
            ShadowCascades = cascades;
            LodBias = lodBias;
            MsaaSamples = msaa;
            SoftShadows = softShadows;
            Ssao = ssao;
            Bloom = bloom;
        }

        /// <summary>
        /// Starting points only. The console numbers are hypotheses to be replaced by on-device
        /// captures (UWP on Xbox runs with feature level 11 and a 5 GB title memory budget).
        /// </summary>
        public static QualityTargets For(QualityProfile profile)
        {
            switch (profile)
            {
                case QualityProfile.Fidelity:
                    return new QualityTargets(30, 1.0f, 110f, 4, 1.5f, 1, true, true, true);
                case QualityProfile.DesktopHigh:
                    return new QualityTargets(-1, 1.0f, 150f, 4, 2.0f, 4, true, true, true);
                default:
                    return new QualityTargets(60, 0.8f, 70f, 2, 1.0f, 1, true, false, true);
            }
        }
    }

    /// <summary>Engine-level settings only; used when no pipeline backend registered.</summary>
    public sealed class FallbackRenderBackend : IRenderBackend
    {
        private QualityProfile _profile;

        public string Name => "Fallback (engine settings only)";

        public void ConfigureCamera(Camera camera)
        {
            camera.allowHDR = true;
            camera.allowMSAA = true;
        }

        public void ApplyQuality(QualityProfile profile)
        {
            _profile = profile;
            var t = QualityTargets.For(profile);
            ApplyEngineSettings(t);
        }

        public void SetNightFactor(float nightFactor)
        {
        }

        public string Describe() => $"{Name}; profile {_profile}";

        /// <summary>Settings that are pipeline-independent; backends call this too.</summary>
        public static void ApplyEngineSettings(QualityTargets t)
        {
            // Frame pacing through vsync intervals (targetFrameRate is ignored while vsync is on):
            // 60 Hz output gives interval 1 for 60 FPS and 2 for 30 FPS.
            double refresh = Screen.currentResolution.refreshRateRatio.value;
            if (refresh < 1.0)
            {
                refresh = 60.0;
            }

            QualitySettings.vSyncCount = t.TargetFrameRate > 0 ? Mathf.Clamp(Mathf.RoundToInt((float)(refresh / t.TargetFrameRate)), 1, 4) : 0;
            Application.targetFrameRate = t.TargetFrameRate;
            QualitySettings.lodBias = t.LodBias;
            QualitySettings.shadowDistance = t.ShadowDistance;
            QualitySettings.shadowCascades = t.ShadowCascades;
            QualitySettings.antiAliasing = t.MsaaSamples > 1 ? t.MsaaSamples : 0;
            QualitySettings.anisotropicFiltering = AnisotropicFiltering.ForceEnable;
            QualitySettings.streamingMipmapsActive = true;
            QualitySettings.streamingMipmapsMemoryBudget = 1024f;
        }
    }
}
