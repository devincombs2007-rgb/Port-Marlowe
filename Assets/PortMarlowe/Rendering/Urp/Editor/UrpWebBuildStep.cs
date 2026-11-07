using PortMarlowe.EditorTools;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace PortMarlowe.Rendering.Urp.EditorTools
{
    /// <summary>
    /// Browser builds use URP's plain Forward path without screen-space ambient occlusion: WebGL 2
    /// lacks the compute and buffer features Forward+ and SSAO lean on, and phones need the
    /// headroom. The renderer is switched for the build only and restored afterwards, so desktop,
    /// Linux and Xbox builds keep Forward+ with SSAO.
    /// </summary>
    public sealed class UrpWebBuildStep : BuildTool.IBuildProfileStep
    {
        private RenderingMode? _previousMode;
        private bool _ssaoWasActive;
        private UniversalRendererData _renderer;
        private ScriptableRendererFeature _ssao;

        public void Before(BuildTool.Profile profile, ProjectSetupLog log)
        {
            if (profile != BuildTool.Profile.Web)
            {
                return;
            }

            var pipeline = GraphicsSettings.defaultRenderPipeline as UniversalRenderPipelineAsset;
            _renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(ProjectSetup.SettingsFolder + "/URP/PM_URP_Renderer.asset");
            if (pipeline == null || _renderer == null)
            {
                log.Warn("URP renderer asset not found; Web build uses the current renderer settings.");
                return;
            }

            _previousMode = _renderer.renderingMode;
            _renderer.renderingMode = RenderingMode.Forward;
            foreach (var f in _renderer.rendererFeatures)
            {
                if (f != null && f.GetType().Name == "ScreenSpaceAmbientOcclusion")
                {
                    _ssao = f;
                    _ssaoWasActive = f.isActive;
                    f.SetActive(false);
                }
            }

            EditorUtility.SetDirty(_renderer);
            AssetDatabase.SaveAssets();
            log.Info("Web build: URP Forward path, SSAO off.");
        }

        public void After(BuildTool.Profile profile, ProjectSetupLog log)
        {
            if (profile != BuildTool.Profile.Web || _renderer == null || _previousMode == null)
            {
                return;
            }

            _renderer.renderingMode = _previousMode.Value;
            if (_ssao != null)
            {
                _ssao.SetActive(_ssaoWasActive);
            }

            EditorUtility.SetDirty(_renderer);
            log.Info("Restored the URP renderer after the Web build.");
        }
    }
}
