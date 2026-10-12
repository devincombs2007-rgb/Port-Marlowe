using UnityEngine;
using UnityEngine.Rendering.Universal;

namespace PortMarlowe.Rendering.Urp
{
    /// <summary>
    /// Asset references created by the editor setup step and loaded from Resources at runtime, so
    /// the backend can toggle renderer features without reflection into URP internals.
    /// </summary>
    public sealed class UrpProfileAssets : ScriptableObject
    {
        public const string ResourcePath = "PortMarlowe/UrpProfile";

        public UniversalRenderPipelineAsset Pipeline;
        public ScriptableRendererFeature AmbientOcclusion;
    }
}
