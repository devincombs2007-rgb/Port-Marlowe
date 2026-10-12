using PortMarlowe.Game;
using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace PortMarlowe.Rendering.Urp
{
    /// <summary>
    /// URP implementation of the render seam: per-camera post-processing and anti-aliasing, a
    /// global volume (ACES tonemapping, bloom, colour adjustments, vignette) driven by time of day,
    /// and quality profiles mapped onto pipeline settings. Conventional rasterisation only; URP
    /// has no ray-traced effects, so nothing here depends on hardware ray tracing.
    /// </summary>
    public sealed class UrpRenderBackend : IRenderBackend
    {
        private readonly UniversalRenderPipelineAsset _asset;
        private readonly UrpProfileAssets _profileAssets;
        private Volume _volume;
        private ColorAdjustments _color;
        private Bloom _bloom;
        private QualityProfile _profile;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void RegisterIfActive()
        {
            if (GraphicsSettings.currentRenderPipeline is UniversalRenderPipelineAsset asset)
            {
                RenderBackends.Register(new UrpRenderBackend(asset));
            }
            else
            {
                Debug.LogWarning("[PM] URP is not the active pipeline; using the fallback render backend.");
            }
        }

        private UrpRenderBackend(UniversalRenderPipelineAsset asset)
        {
            // Work on a runtime copy so play sessions never write quality changes into the asset.
            _asset = Object.Instantiate(asset);
            _asset.name = asset.name + " (runtime)";
            QualitySettings.renderPipeline = _asset;
            _profileAssets = Resources.Load<UrpProfileAssets>(UrpProfileAssets.ResourcePath);
        }

        public string Name => "URP " + _asset.name;

        public void ConfigureCamera(Camera camera)
        {
            camera.allowHDR = true;
            var data = camera.GetUniversalAdditionalCameraData();
            data.renderPostProcessing = true;
            data.stopNaN = true;
            data.dithering = true;
            ApplyAntialiasing(data, _profile);
            EnsureVolume();
        }

        public void ApplyQuality(QualityProfile profile)
        {
            _profile = profile;
            var t = QualityTargets.For(profile);
            FallbackRenderBackend.ApplyEngineSettings(t);
            _asset.renderScale = t.RenderScale;
            _asset.upscalingFilter = t.RenderScale < 0.99f ? UpscalingFilterSelection.FSR : UpscalingFilterSelection.Auto;
            _asset.shadowDistance = t.ShadowDistance;
            _asset.shadowCascadeCount = t.ShadowCascades;
            _asset.msaaSampleCount = t.MsaaSamples;
            if (_profileAssets != null && _profileAssets.AmbientOcclusion != null)
            {
                _profileAssets.AmbientOcclusion.SetActive(t.Ssao);
            }

            if (_bloom != null)
            {
                _bloom.active = t.Bloom;
            }

            var cam = Camera.main;
            if (cam != null)
            {
                ApplyAntialiasing(cam.GetUniversalAdditionalCameraData(), profile);
            }
        }

        private static void ApplyAntialiasing(UniversalAdditionalCameraData data, QualityProfile profile)
        {
            // SMAA on console profiles (MSAA is costly with deferred-style post); MSAA handles desktop.
            data.antialiasing = profile == QualityProfile.DesktopHigh ? AntialiasingMode.None : AntialiasingMode.SubpixelMorphologicalAntiAliasing;
            data.antialiasingQuality = profile == QualityProfile.Performance ? AntialiasingQuality.Medium : AntialiasingQuality.High;
        }

        public void SetNightFactor(float nightFactor)
        {
            if (_color == null)
            {
                return;
            }

            // URP has no eye adaptation; a gentle exposure lift keeps night readable on a TV.
            _color.postExposure.value = Mathf.Lerp(0f, 0.85f, nightFactor);
            _color.saturation.value = Mathf.Lerp(6f, -6f, nightFactor);
            if (_bloom != null)
            {
                _bloom.intensity.value = Mathf.Lerp(0.35f, 0.85f, nightFactor);
            }
        }

        public string Describe() =>
            $"{Name}; profile {_profile}; scale {_asset.renderScale:0.00}; shadows {_asset.shadowDistance:0} m x{_asset.shadowCascadeCount}; MSAA {_asset.msaaSampleCount}x";

        private void EnsureVolume()
        {
            if (_volume != null)
            {
                return;
            }

            var go = new GameObject("PM_GlobalVolume");
            Object.DontDestroyOnLoad(go);
            _volume = go.AddComponent<Volume>();
            _volume.isGlobal = true;
            _volume.priority = 0f;
            var profile = ScriptableObject.CreateInstance<VolumeProfile>();
            _volume.sharedProfile = profile;

            var tonemap = profile.Add<Tonemapping>(true);
            tonemap.mode.Override(TonemappingMode.ACES);

            _bloom = profile.Add<Bloom>(true);
            _bloom.threshold.Override(1.05f);
            _bloom.intensity.Override(0.35f);
            _bloom.scatter.Override(0.62f);
            _bloom.active = QualityTargets.For(_profile).Bloom;

            _color = profile.Add<ColorAdjustments>(true);
            _color.postExposure.Override(0f);
            _color.contrast.Override(10f);
            _color.saturation.Override(6f);

            var white = profile.Add<WhiteBalance>(true);
            white.temperature.Override(4f);

            var vignette = profile.Add<Vignette>(true);
            vignette.intensity.Override(0.17f);
            vignette.smoothness.Override(0.45f);
        }
    }
}
