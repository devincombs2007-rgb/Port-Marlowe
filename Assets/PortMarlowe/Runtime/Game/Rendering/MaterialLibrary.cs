using System.Collections.Generic;
using UnityEngine;

namespace PortMarlowe.Game.Rendering
{
    /// <summary>
    /// Creates runtime material instances from editor-authored URP templates in Resources so the
    /// shader variants a player build needs are guaranteed to be included. If a template is missing
    /// (project setup not run) it falls back to Shader.Find, which works in the editor only, and logs.
    /// </summary>
    public sealed class MaterialLibrary
    {
        public const string TemplateFolder = "PortMarlowe/Materials/";
        public const string LitTemplate = "PM_Lit";
        public const string LitNormalTemplate = "PM_LitNormal";
        public const string LitEmissiveTemplate = "PM_LitEmissive";
        public const string UnlitTemplate = "PM_Unlit";
        public const string SkyTemplate = "PM_Sky";
        public const string LitPbrTemplate = "PM_LitPbr";

        private static readonly int BaseColor = Shader.PropertyToID("_BaseColor");
        private static readonly int BaseMap = Shader.PropertyToID("_BaseMap");
        private static readonly int BumpMap = Shader.PropertyToID("_BumpMap");
        private static readonly int BumpScale = Shader.PropertyToID("_BumpScale");
        private static readonly int Smoothness = Shader.PropertyToID("_Smoothness");
        private static readonly int Metallic = Shader.PropertyToID("_Metallic");
        private static readonly int EmissionColor = Shader.PropertyToID("_EmissionColor");
        private static readonly int EmissionMap = Shader.PropertyToID("_EmissionMap");
        private static readonly int MetallicGlossMap = Shader.PropertyToID("_MetallicGlossMap");
        private static readonly int OcclusionMap = Shader.PropertyToID("_OcclusionMap");
        private static readonly int OcclusionStrength = Shader.PropertyToID("_OcclusionStrength");

        private readonly Dictionary<string, Material> _templates = new Dictionary<string, Material>();
        private readonly List<Object> _owned = new List<Object>();

        public bool UsingFallbackShaders { get; private set; }

        public Material Lit(string name, Color color, float smoothness = 0.35f, float metallic = 0f, Texture2D baseMap = null, Vector2? tiling = null)
        {
            var m = Instantiate(LitTemplate, "Universal Render Pipeline/Lit", name);
            m.SetColor(BaseColor, color);
            m.SetFloat(Smoothness, smoothness);
            m.SetFloat(Metallic, metallic);
            if (baseMap != null)
            {
                m.SetTexture(BaseMap, baseMap);
                m.SetTextureScale(BaseMap, tiling ?? Vector2.one);
            }

            return m;
        }

        public Material LitNormal(string name, Color color, Texture2D baseMap, Texture2D normal, float bumpScale, float smoothness, Vector2 tiling, float metallic = 0f)
        {
            var m = Instantiate(LitNormalTemplate, "Universal Render Pipeline/Lit", name);
            m.SetColor(BaseColor, color);
            m.SetTexture(BaseMap, baseMap);
            m.SetTextureScale(BaseMap, tiling);
            m.SetTexture(BumpMap, normal);
            m.SetFloat(BumpScale, bumpScale);
            m.SetFloat(Smoothness, smoothness);
            m.SetFloat(Metallic, metallic);
            m.EnableKeyword("_NORMALMAP");
            return m;
        }

        /// <summary>Lit material whose emission (map x colour) is driven at runtime (windows, lamps, lights).</summary>
        public Material LitEmissive(string name, Color color, Texture2D baseMap, Texture2D emissionMap, Color emission, float smoothness, Vector2 tiling)
        {
            var m = Instantiate(LitEmissiveTemplate, "Universal Render Pipeline/Lit", name);
            m.SetColor(BaseColor, color);
            if (baseMap != null)
            {
                m.SetTexture(BaseMap, baseMap);
            }

            m.SetTextureScale(BaseMap, tiling);
            m.SetTexture(EmissionMap, emissionMap != null ? emissionMap : Texture2D.whiteTexture);
            m.SetColor(EmissionColor, emission);
            m.SetFloat(Smoothness, smoothness);
            m.EnableKeyword("_EMISSION");
            m.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
            return m;
        }

        /// <summary>
        /// Full PBR surface from an imported texture set: albedo, OpenGL-convention normal, and a
        /// packed mask (R metallic, G occlusion, A smoothness) feeding both the metallic-gloss and
        /// occlusion slots of URP Lit.
        /// </summary>
        public Material LitPbr(string name, Color tint, SurfaceSet set, Vector2 tiling, float normalScale = 1f)
        {
            var m = Instantiate(LitPbrTemplate, "Universal Render Pipeline/Lit", name);
            m.SetColor(BaseColor, tint);
            m.SetTexture(BaseMap, set.Albedo);
            m.SetTextureScale(BaseMap, tiling);
            if (set.Normal != null)
            {
                m.SetTexture(BumpMap, set.Normal);
                m.SetFloat(BumpScale, normalScale);
                m.EnableKeyword("_NORMALMAP");
            }

            if (set.Mask != null)
            {
                m.SetTexture(MetallicGlossMap, set.Mask);
                m.SetTexture(OcclusionMap, set.Mask);
                m.SetFloat(OcclusionStrength, 1f);
                m.SetFloat(Smoothness, 1f);
                m.EnableKeyword("_METALLICSPECGLOSSMAP");
                m.EnableKeyword("_OCCLUSIONMAP");
            }
            else
            {
                m.SetFloat(Smoothness, set.FallbackSmoothness);
            }

            return m;
        }

        public Material Unlit(string name, Color color)
        {
            var m = Instantiate(UnlitTemplate, "Universal Render Pipeline/Unlit", name);
            m.SetColor(BaseColor, color);
            return m;
        }

        public Material Sky()
        {
            var m = Instantiate(SkyTemplate, "Skybox/Procedural", "Sky");
            return m;
        }

        public static void SetEmission(Material m, Color c)
        {
            if (m != null)
            {
                m.SetColor(EmissionColor, c);
            }
        }

        public static void SetBaseColor(Material m, Color c)
        {
            if (m != null)
            {
                m.SetColor(BaseColor, c);
            }
        }

        /// <summary>Compress a generated texture on the GPU-friendly path and drop the CPU copy.</summary>
        public static Texture2D Seal(Texture2D tex, bool compress = true)
        {
            if (compress && tex.width % 4 == 0 && tex.height % 4 == 0)
            {
                tex.Compress(true);
            }

            tex.Apply(false, true);
            return tex;
        }

        public void Track(Object o)
        {
            if (o != null)
            {
                _owned.Add(o);
            }
        }

        public void DestroyAll()
        {
            foreach (var o in _owned)
            {
                if (o != null)
                {
                    Object.Destroy(o);
                }
            }

            _owned.Clear();
        }

        private Material Instantiate(string template, string fallbackShader, string name)
        {
            if (!_templates.TryGetValue(template, out var t))
            {
                t = Resources.Load<Material>(TemplateFolder + template);
                if (t == null)
                {
                    var shader = Shader.Find(fallbackShader);
                    if (shader == null)
                    {
                        Debug.LogError($"[PortMarlowe] Material template '{template}' and shader '{fallbackShader}' are both missing. Run Port Marlowe > Setup Project.");
                        shader = Shader.Find("Hidden/InternalErrorShader");
                    }
                    else if (!Application.isEditor)
                    {
                        Debug.LogError($"[PortMarlowe] Material template '{template}' missing from build; using Shader.Find fallback (variants may be stripped).");
                    }

                    UsingFallbackShaders = true;
                    t = new Material(shader) { name = template + "_Fallback" };
                }

                _templates[template] = t;
            }

            var m = new Material(t) { name = name };
            _owned.Add(m);
            return m;
        }
    }
}
