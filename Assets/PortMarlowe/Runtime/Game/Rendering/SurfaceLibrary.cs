using System.Collections.Generic;
using UnityEngine;

namespace PortMarlowe.Game.Rendering
{
    /// <summary>An imported PBR texture set (see Tools/Assets/fetch_cc0.py and Docs/AssetManifest.md).</summary>
    public sealed class SurfaceSet
    {
        public string Role;
        public Texture2D Albedo;
        public Texture2D Normal;
        public Texture2D Mask;

        /// <summary>Grey detail albedo centred on 0.5 (multiply-x2), present for facade sets.</summary>
        public Texture2D Detail;
        public float FallbackSmoothness = 0.2f;
    }

    /// <summary>
    /// Looks up imported CC0 surface sets by role under Resources/PM_Surfaces/&lt;role&gt;/ (albedo,
    /// normal, mask). The sets are fetched by a pinned, hash-checked script rather than committed;
    /// when a role is absent the caller keeps its procedural texture, so a checkout without the
    /// fetched assets still builds and runs.
    /// </summary>
    public static class SurfaceLibrary
    {
        public const string Folder = "PM_Surfaces/";
        private static readonly Dictionary<string, SurfaceSet> Cache = new Dictionary<string, SurfaceSet>();

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics() => Cache.Clear();

        public static bool TryGet(string role, out SurfaceSet set)
        {
            if (Cache.TryGetValue(role, out set))
            {
                return set != null;
            }

            var albedo = Resources.Load<Texture2D>(Folder + role + "/albedo");
            if (albedo == null)
            {
                Cache[role] = null;
                return false;
            }

            set = new SurfaceSet
            {
                Role = role,
                Albedo = albedo,
                Normal = Resources.Load<Texture2D>(Folder + role + "/normal"),
                Mask = Resources.Load<Texture2D>(Folder + role + "/mask"),
                Detail = Resources.Load<Texture2D>(Folder + role + "/detail"),
            };
            Cache[role] = set;
            return true;
        }

        /// <summary>Roles found at runtime, for the diagnostics report.</summary>
        public static IEnumerable<string> LoadedRoles()
        {
            foreach (var kv in Cache)
            {
                if (kv.Value != null)
                {
                    yield return kv.Key;
                }
            }
        }
    }
}
