using System.Collections.Generic;
using PortMarlowe.Game.Rendering;
using UnityEngine;

namespace PortMarlowe.Game.World
{
    /// <summary>
    /// The district's material set, following the art bible (Docs/ArtBible.md): weathered coastal
    /// concrete, sun-faded stucco and brick tones, dark asphalt, restrained saturation. Placeholder
    /// procedural textures stand in for licensed PBR sets until they are imported.
    /// </summary>
    public sealed class WorldMaterials
    {
        public Material Asphalt;
        public Material Sidewalk;
        public Material Curb;
        public Material Paving;
        public Material Grass;
        public Material Yard;
        public Material LaneWhite;
        public Material LaneYellow;
        public Material Water;
        public Material QuayStone;
        public Material Roof;
        public Material Trim;
        public Material Metal;
        public Material DarkMetal;
        public Material Bark;
        public Material Foliage;
        public Material FoliageDark;
        public Material Wood;
        public Material Barrier;
        public Material LampHead;
        public Material Storefront;
        public Material InteriorWall;
        public Material InteriorFloor;
        public Material Fabric;
        public Material FabricAccent;
        public Material PoliceSign;
        public Material CourtSurface;
        public Material Skyline;

        /// <summary>[style][tint] facade materials (style: residential, office, warehouse).</summary>
        public Material[][] Facades;

        /// <summary>Materials whose emission is scaled by the lighting rig at night, with their full-night colour.</summary>
        public readonly List<(Material material, Color nightEmission)> NightEmissives = new List<(Material, Color)>();

        public static readonly Color[][] FacadeTints =
        {
            // Residential: stucco and painted brick, sun-faded.
            new[] { new Color(0.86f, 0.78f, 0.66f), new Color(0.74f, 0.83f, 0.82f), new Color(0.88f, 0.72f, 0.64f), new Color(0.80f, 0.80f, 0.74f) },
            // Office/mid-rise: concrete and cool render.
            new[] { new Color(0.80f, 0.81f, 0.82f), new Color(0.70f, 0.74f, 0.78f), new Color(0.86f, 0.84f, 0.80f), new Color(0.66f, 0.66f, 0.68f) },
            // Warehouse: painted metal cladding.
            new[] { new Color(0.62f, 0.66f, 0.70f), new Color(0.72f, 0.64f, 0.52f), new Color(0.56f, 0.62f, 0.58f), new Color(0.78f, 0.76f, 0.70f) },
        };

        public static WorldMaterials Create(MaterialLibrary lib)
        {
            var w = new WorldMaterials();
            var asphaltTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Asphalt", 256, new Color(0.13f, 0.13f, 0.135f), new Color(0.24f, 0.24f, 0.24f), 24f, 4, 1));
            var asphaltN = MaterialLibrary.Seal(ProceduralTextures.NoiseNormal("AsphaltN", 256, 32f, 3, 1.4f, 2), false);
            var concreteTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Concrete", 256, new Color(0.56f, 0.55f, 0.52f), new Color(0.70f, 0.69f, 0.66f), 8f, 4, 3));
            var concreteN = MaterialLibrary.Seal(ProceduralTextures.NoiseNormal("ConcreteN", 256, 12f, 3, 0.8f, 4), false);
            var grassTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Grass", 256, new Color(0.17f, 0.27f, 0.11f), new Color(0.31f, 0.40f, 0.16f), 20f, 4, 5));
            var waterN = MaterialLibrary.Seal(ProceduralTextures.NoiseNormal("WaterN", 256, 6f, 4, 2.2f, 6), false);
            var stoneTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Stone", 256, new Color(0.38f, 0.37f, 0.34f), new Color(0.52f, 0.50f, 0.46f), 10f, 4, 7, true));
            var barkTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Bark", 128, new Color(0.18f, 0.14f, 0.10f), new Color(0.30f, 0.24f, 0.18f), 6f, 3, 8, true));
            var leafTex = MaterialLibrary.Seal(ProceduralTextures.Noise("Leaf", 128, new Color(0.12f, 0.22f, 0.08f), new Color(0.28f, 0.40f, 0.14f), 16f, 3, 9));

            w.Asphalt = lib.LitNormal("Asphalt", Color.white, asphaltTex, asphaltN, 0.6f, 0.18f, new Vector2(1f / 6f, 1f / 6f));
            w.Sidewalk = lib.LitNormal("Sidewalk", new Color(0.95f, 0.94f, 0.92f), concreteTex, concreteN, 0.5f, 0.22f, new Vector2(0.5f, 0.5f));
            w.Curb = lib.LitNormal("Curb", new Color(0.82f, 0.81f, 0.79f), concreteTex, concreteN, 0.4f, 0.2f, Vector2.one);
            w.Paving = lib.LitNormal("Paving", new Color(0.84f, 0.76f, 0.66f), stoneTex, concreteN, 0.7f, 0.25f, new Vector2(0.4f, 0.4f));
            w.Grass = lib.Lit("Grass", Color.white, 0.08f, 0f, grassTex, new Vector2(0.25f, 0.25f));
            w.Yard = lib.LitNormal("Yard", new Color(0.8f, 0.8f, 0.8f), asphaltTex, asphaltN, 0.4f, 0.2f, new Vector2(1f / 6f, 1f / 6f));
            w.LaneWhite = lib.Lit("LaneWhite", new Color(0.86f, 0.86f, 0.84f), 0.3f);
            w.LaneYellow = lib.Lit("LaneYellow", new Color(0.86f, 0.68f, 0.18f), 0.3f);
            w.Water = lib.LitNormal("Water", new Color(0.05f, 0.16f, 0.19f), Texture2D.whiteTexture, waterN, 0.35f, 0.94f, new Vector2(0.05f, 0.05f));
            w.QuayStone = lib.LitNormal("QuayStone", Color.white, stoneTex, concreteN, 0.8f, 0.2f, new Vector2(0.5f, 0.5f));
            w.Roof = lib.LitNormal("Roof", new Color(0.55f, 0.55f, 0.56f), concreteTex, concreteN, 0.6f, 0.1f, new Vector2(0.25f, 0.25f));
            w.Trim = lib.Lit("Trim", new Color(0.62f, 0.61f, 0.58f), 0.25f, 0f, concreteTex, new Vector2(0.5f, 0.5f));
            w.Metal = lib.Lit("Metal", new Color(0.55f, 0.57f, 0.6f), 0.55f, 0.8f);
            w.DarkMetal = lib.Lit("DarkMetal", new Color(0.12f, 0.13f, 0.14f), 0.45f, 0.7f);
            w.Bark = lib.Lit("Bark", Color.white, 0.1f, 0f, barkTex, new Vector2(1f, 0.5f));
            w.Foliage = lib.Lit("Foliage", Color.white, 0.12f, 0f, leafTex, new Vector2(1.5f, 1.5f));
            w.FoliageDark = lib.Lit("FoliageDark", new Color(0.7f, 0.75f, 0.7f), 0.1f, 0f, leafTex, new Vector2(1.5f, 1.5f));
            w.Wood = lib.Lit("Wood", new Color(0.42f, 0.29f, 0.18f), 0.3f);
            w.Barrier = lib.Lit("Barrier", new Color(0.82f, 0.36f, 0.10f), 0.35f);
            w.InteriorWall = lib.Lit("InteriorWall", new Color(0.82f, 0.79f, 0.72f), 0.15f);
            w.InteriorFloor = lib.Lit("InteriorFloor", new Color(0.46f, 0.33f, 0.22f), 0.45f);
            w.Fabric = lib.Lit("Fabric", new Color(0.24f, 0.31f, 0.38f), 0.05f);
            w.FabricAccent = lib.Lit("FabricAccent", new Color(0.62f, 0.38f, 0.24f), 0.05f);
            w.CourtSurface = lib.Lit("Court", new Color(0.28f, 0.42f, 0.46f), 0.3f);

            // Imported CC0 PBR sets replace the procedural placeholders where present (tile size in metres).
            w.Asphalt = Surface(lib, "road_asphalt", "Asphalt", new Color(0.9f, 0.9f, 0.9f), 4f, 1f, w.Asphalt);
            w.Yard = Surface(lib, "road_asphalt", "Yard", new Color(0.78f, 0.78f, 0.78f), 4f, 1f, w.Yard);
            w.Sidewalk = Surface(lib, "sidewalk_concrete", "Sidewalk", Color.white, 2f, 1f, w.Sidewalk);
            w.Curb = Surface(lib, "concrete", "Curb", new Color(0.9f, 0.9f, 0.88f), 1.5f, 0.8f, w.Curb);
            w.Paving = Surface(lib, "plaza_paving", "Paving", Color.white, 2.5f, 1f, w.Paving);
            w.QuayStone = Surface(lib, "quay_stone", "QuayStone", Color.white, 3f, 1f, w.QuayStone);
            w.Roof = Surface(lib, "roof", "Roof", new Color(0.85f, 0.85f, 0.85f), 3f, 0.8f, w.Roof);
            w.Grass = Surface(lib, "grass", "Grass", Color.white, 3f, 1f, w.Grass);

            w.LampHead = lib.LitEmissive("LampHead", new Color(0.9f, 0.88f, 0.8f), null, null, Color.black, 0.6f, Vector2.one);
            w.NightEmissives.Add((w.LampHead, new Color(1f, 0.82f, 0.58f) * 2.2f));
            w.PoliceSign = lib.LitEmissive("PoliceSign", new Color(0.12f, 0.24f, 0.62f), null, null, new Color(0.1f, 0.25f, 0.9f) * 0.6f, 0.7f, Vector2.one);
            w.NightEmissives.Add((w.PoliceSign, new Color(0.15f, 0.35f, 1f) * 2.4f));

            ProceduralTextures.Storefront(out var sfAlbedo, out var sfLit);
            MaterialLibrary.Seal(sfAlbedo);
            MaterialLibrary.Seal(sfLit);
            w.Storefront = lib.LitEmissive("Storefront", Color.white, sfAlbedo, sfLit, Color.black, 0.85f, new Vector2(1f / 6f, 1f / 4f));
            w.NightEmissives.Add((w.Storefront, new Color(1f, 0.9f, 0.75f) * 1.4f));

            w.Facades = new Material[3][];
            for (int style = 0; style < 3; style++)
            {
                ProceduralTextures.Facade((ProceduralTextures.FacadeStyle)style, 11 + style, out var albedo, out var lit);
                MaterialLibrary.Seal(albedo);
                MaterialLibrary.Seal(lit);
                w.Facades[style] = new Material[FacadeTints[style].Length];
                for (int t = 0; t < FacadeTints[style].Length; t++)
                {
                    float smooth = style == 1 ? 0.55f : 0.25f;
                    var tiling = new Vector2(1f / 12f, 1f / 12.8f);
                    var m = FacadeDetail(style, t, out var detail, out float detailMetres)
                        ? lib.LitEmissiveDetail($"Facade_{style}_{t}", FacadeTints[style][t], albedo, lit, smooth, tiling, detail, detailMetres, 0.8f)
                        : lib.LitEmissive($"Facade_{style}_{t}", FacadeTints[style][t], albedo, lit, Color.black, smooth, tiling);
                    w.Facades[style][t] = m;
                    w.NightEmissives.Add((m, new Color(1f, 0.86f, 0.62f) * (style == 2 ? 0.6f : 1.1f)));
                }
            }

            w.Skyline = lib.LitEmissive("Skyline", new Color(0.62f, 0.66f, 0.72f), w.Facades[1][0].GetTexture("_BaseMap") as Texture2D,
                w.Facades[1][0].GetTexture("_EmissionMap") as Texture2D, Color.black, 0.4f, new Vector2(1f / 24f, 1f / 25.6f));
            w.NightEmissives.Add((w.Skyline, new Color(1f, 0.85f, 0.6f) * 0.9f));
            return w;
        }

        /// <summary>Which imported surface details a facade: plaster or brick for walk-ups, concrete for offices, metal for warehouses.</summary>
        private static bool FacadeDetail(int style, int tint, out SurfaceSet set, out float tileMetres)
        {
            string role;
            switch (style)
            {
                case 0:
                    role = tint == 2 ? "facade_brick" : "facade_plaster";
                    tileMetres = tint == 2 ? 1.6f : 2.5f;
                    break;
                case 1:
                    role = "concrete";
                    tileMetres = 2.5f;
                    break;
                default:
                    role = "facade_metal";
                    tileMetres = 3f;
                    break;
            }

            return SurfaceLibrary.TryGet(role, out set) && set.Detail != null;
        }

        private static Material Surface(MaterialLibrary lib, string role, string name, Color tint, float tileMetres, float normalScale, Material fallback)
        {
            if (!SurfaceLibrary.TryGet(role, out var set))
            {
                return fallback;
            }

            return lib.LitPbr(name, tint, set, new Vector2(1f / tileMetres, 1f / tileMetres), normalScale);
        }

        public Material Facade(int palette, int buildingIndex)
        {
            int style;
            switch (palette)
            {
                case 1:
                case 5:
                    style = 1;
                    break;
                case 4:
                    style = 2;
                    break;
                default:
                    style = 0;
                    break;
            }

            var set = Facades[style];
            return set[Mathf.Abs(buildingIndex * 7 + palette * 3) % set.Length];
        }
    }
}
