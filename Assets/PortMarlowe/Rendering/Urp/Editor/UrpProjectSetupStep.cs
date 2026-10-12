using System;
using PortMarlowe.EditorTools;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace PortMarlowe.Rendering.Urp.EditorTools
{
    /// <summary>
    /// Creates (or updates) the URP pipeline asset and renderer, assigns them to graphics and
    /// quality settings, and writes the <see cref="UrpProfileAssets"/> reference asset the runtime
    /// backend loads. Forward+ is used so the nearest-N streetlights are not limited by the
    /// per-object light cap.
    /// </summary>
    public sealed class UrpProjectSetupStep : IProjectSetupStep
    {
        private const string Folder = ProjectSetup.SettingsFolder + "/URP";
        private const string PipelinePath = Folder + "/PM_URP.asset";
        private const string RendererPath = Folder + "/PM_URP_Renderer.asset";
        private const string ProfileFolder = ProjectSetup.Root + "/Content/Resources/PortMarlowe";
        private const string ProfilePath = ProfileFolder + "/UrpProfile.asset";

        public int Order => 10;
        public string Name => "URP pipeline asset";

        public void Run(ProjectSetupLog log)
        {
            ProjectSetup.EnsureFolder(Folder);
            ProjectSetup.EnsureFolder(ProfileFolder);

            var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>(RendererPath);
            if (renderer == null)
            {
                renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(renderer, RendererPath);
                log.Info("Created " + RendererPath);
            }

            renderer.renderingMode = RenderingMode.ForwardPlus;
            var ssao = EnsureAmbientOcclusion(renderer, log);
            EditorUtility.SetDirty(renderer);

            var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelinePath);
            if (pipeline == null)
            {
                pipeline = UniversalRenderPipelineAsset.Create(renderer);
                AssetDatabase.CreateAsset(pipeline, PipelinePath);
                log.Info("Created " + PipelinePath);
            }

            pipeline.supportsHDR = true;
            pipeline.supportsCameraDepthTexture = true;
            pipeline.msaaSampleCount = 1;
            pipeline.renderScale = 1f;
            pipeline.shadowDistance = 90f;
            pipeline.shadowCascadeCount = 4;
            pipeline.maxAdditionalLightsCount = 8;
            EditorUtility.SetDirty(pipeline);

            GraphicsSettings.defaultRenderPipeline = pipeline;
            int current = QualitySettings.GetQualityLevel();
            for (int i = 0; i < QualitySettings.count; i++)
            {
                QualitySettings.SetQualityLevel(i, false);
                QualitySettings.renderPipeline = pipeline;
            }

            QualitySettings.SetQualityLevel(current, false);

            var profile = AssetDatabase.LoadAssetAtPath<UrpProfileAssets>(ProfilePath);
            if (profile == null)
            {
                profile = ScriptableObject.CreateInstance<UrpProfileAssets>();
                AssetDatabase.CreateAsset(profile, ProfilePath);
            }

            profile.Pipeline = pipeline;
            profile.AmbientOcclusion = ssao;
            EditorUtility.SetDirty(profile);
            log.Info("URP assigned to graphics settings and all quality levels (Forward+).");
        }

        /// <summary>
        /// Adds URP's screen-space ambient occlusion feature as a sub-asset of the renderer. The
        /// feature type is resolved by name so a package-side visibility change degrades to a
        /// warning (no AO) instead of breaking project setup.
        /// </summary>
        private static ScriptableRendererFeature EnsureAmbientOcclusion(UniversalRendererData renderer, ProjectSetupLog log)
        {
            foreach (var f in renderer.rendererFeatures)
            {
                if (f != null && f.GetType().Name == "ScreenSpaceAmbientOcclusion")
                {
                    return f;
                }
            }

            var type = typeof(ScriptableRendererFeature).Assembly.GetType("UnityEngine.Rendering.Universal.ScreenSpaceAmbientOcclusion");
            if (type == null)
            {
                log.Warn("URP ScreenSpaceAmbientOcclusion feature type not found; AO disabled.");
                return null;
            }

            try
            {
                var feature = (ScriptableRendererFeature)ScriptableObject.CreateInstance(type);
                feature.name = "SSAO";
                AssetDatabase.AddObjectToAsset(feature, renderer);
                renderer.rendererFeatures.Add(feature);

                // Keep the serialized feature map in step with the list, as the renderer inspector does.
                if (AssetDatabase.TryGetGUIDAndLocalFileIdentifier(feature, out _, out long localId))
                {
                    var so = new SerializedObject(renderer);
                    var map = so.FindProperty("m_RendererFeatureMap");
                    if (map != null)
                    {
                        map.arraySize++;
                        map.GetArrayElementAtIndex(map.arraySize - 1).longValue = localId;
                        so.ApplyModifiedPropertiesWithoutUndo();
                    }
                }

                log.Info("Added SSAO renderer feature.");
                return feature;
            }
            catch (Exception e)
            {
                log.Warn("Could not add SSAO feature: " + e.Message);
                return null;
            }
        }
    }
}
