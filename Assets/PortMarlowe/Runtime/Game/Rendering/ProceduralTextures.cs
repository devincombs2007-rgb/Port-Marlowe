using UnityEngine;

namespace PortMarlowe.Game.Rendering
{
    /// <summary>
    /// Runtime-generated placeholder textures (graybox+ quality). They give surfaces scale and
    /// breakup until licensed PBR materials (Poly Haven / ambientCG CC0 sets) replace them; see
    /// Docs/AssetManifest.md. All generation is deterministic.
    /// </summary>
    public static class ProceduralTextures
    {
        public static Texture2D Noise(string name, int size, Color a, Color b, float frequency, int octaves, int seed, bool streaks = false)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, true, false) { name = name, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 4 };
            var px = new Color32[size * size];
            float ox = seed * 17.13f;
            float oy = seed * 31.7f;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float n = Fbm((x + ox) / size * frequency, (y + oy) / size * frequency, octaves, size, frequency);
                    if (streaks)
                    {
                        n = Mathf.Lerp(n, Fbm((x + ox) / size * frequency * 0.25f, (y + oy) / size * frequency * 6f, 2, size, frequency), 0.35f);
                    }

                    px[y * size + x] = Color.Lerp(a, b, n);
                }
            }

            tex.SetPixels32(px);
            tex.Apply(true, false);
            return tex;
        }

        /// <summary>Tangent-space normal map from a tiling noise height field (RGBA, A=1; works with URP UnpackNormal).</summary>
        public static Texture2D NoiseNormal(string name, int size, float frequency, int octaves, float strength, int seed)
        {
            var heights = new float[size * size];
            float ox = seed * 11.7f;
            float oy = seed * 5.3f;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    heights[y * size + x] = Fbm((x + ox) / size * frequency, (y + oy) / size * frequency, octaves, size, frequency);
                }
            }

            var tex = new Texture2D(size, size, TextureFormat.RGBA32, true, true) { name = name, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 4 };
            var px = new Color32[size * size];
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float l = heights[y * size + (x - 1 + size) % size];
                    float r = heights[y * size + (x + 1) % size];
                    float d = heights[((y - 1 + size) % size) * size + x];
                    float u = heights[((y + 1) % size) * size + x];
                    var n = new Vector3((l - r) * strength, (d - u) * strength, 1f).normalized;
                    px[y * size + x] = new Color(n.x * 0.5f + 0.5f, n.y * 0.5f + 0.5f, n.z * 0.5f + 0.5f, 1f);
                }
            }

            tex.SetPixels32(px);
            tex.Apply(true, false);
            return tex;
        }

        public enum FacadeStyle
        {
            Residential = 0,
            Office = 1,
            Warehouse = 2,
        }

        /// <summary>
        /// Facade tile covering 4 bays x 4 floors (12 m x 12.8 m). Walls are light so the material
        /// tint controls colour; windows stay dark. The emission mask lights a deterministic subset of
        /// windows at night.
        /// </summary>
        public static void Facade(FacadeStyle style, int seed, out Texture2D albedo, out Texture2D emission)
        {
            const int size = 512;
            const int bays = 4;
            const int floors = 4;
            albedo = new Texture2D(size, size, TextureFormat.RGBA32, true, false) { name = "Facade_" + style, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 8 };
            emission = new Texture2D(size, size, TextureFormat.RGBA32, true, false) { name = "FacadeLit_" + style, wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear };
            var a = new Color32[size * size];
            var e = new Color32[size * size];
            var rng = new PortMarlowe.Core.DeterministicRandom((ulong)(seed * 7919 + (int)style + 1));
            var lit = new bool[bays, floors];
            var warmth = new float[bays, floors];
            for (int bx = 0; bx < bays; bx++)
            {
                for (int fy = 0; fy < floors; fy++)
                {
                    lit[bx, fy] = rng.Chance(0.42f);
                    warmth[bx, fy] = rng.Range(0.75f, 1f);
                }
            }

            float bayW = size / (float)bays;
            float floorH = size / (float)floors;

            // Window rectangle within a bay, in bay-local [0,1] units.
            float wx0, wx1, wy0, wy1;
            switch (style)
            {
                case FacadeStyle.Office: wx0 = 0.06f; wx1 = 0.94f; wy0 = 0.18f; wy1 = 0.92f; break;
                case FacadeStyle.Warehouse: wx0 = 0.1f; wx1 = 0.9f; wy0 = 0.62f; wy1 = 0.86f; break;
                default: wx0 = 0.28f; wx1 = 0.72f; wy0 = 0.22f; wy1 = 0.82f; break;
            }

            for (int y = 0; y < size; y++)
            {
                int fy = Mathf.Min(floors - 1, (int)(y / floorH));
                float ly = (y - fy * floorH) / floorH;
                for (int x = 0; x < size; x++)
                {
                    int bx = Mathf.Min(bays - 1, (int)(x / bayW));
                    float lx = (x - bx * bayW) / bayW;
                    float grain = Fbm(x / 64f, y / 64f, 3, 8, 8f);
                    Color wall = Color.Lerp(new Color(0.78f, 0.77f, 0.74f), new Color(0.9f, 0.89f, 0.86f), grain);

                    // Floor band / slab edge.
                    if (ly < 0.05f)
                    {
                        wall *= 0.86f;
                    }

                    if (style == FacadeStyle.Warehouse && ((x / 12) % 2 == 0))
                    {
                        wall *= 0.94f; // corrugation
                    }

                    Color px = wall;
                    Color em = Color.black;
                    bool inWindow = lx > wx0 && lx < wx1 && ly > wy0 && ly < wy1;
                    if (inWindow)
                    {
                        float fx = (lx - wx0) / (wx1 - wx0);
                        float fyy = (ly - wy0) / (wy1 - wy0);
                        bool frame = fx < 0.04f || fx > 0.96f || fyy < 0.05f || fyy > 0.95f ||
                                     (style != FacadeStyle.Warehouse && Mathf.Abs(fx - 0.5f) < 0.018f) ||
                                     (style == FacadeStyle.Office && Mathf.Abs(fyy - 0.5f) < 0.02f);
                        if (frame)
                        {
                            px = new Color(0.16f, 0.17f, 0.18f);
                        }
                        else
                        {
                            float sky = Mathf.Lerp(0.18f, 0.32f, fyy);
                            px = new Color(sky * 0.55f, sky * 0.62f, sky * 0.72f);
                            if (lit[bx, fy])
                            {
                                float w = warmth[bx, fy];
                                em = new Color(1f, 0.82f * w, 0.55f * w);
                                // Blind/curtain variation.
                                if (fyy > 0.8f && (bx + fy) % 3 == 0)
                                {
                                    em *= 0.35f;
                                }
                            }
                        }
                    }
                    else if (style == FacadeStyle.Residential && lx > wx0 - 0.03f && lx < wx1 + 0.03f && ly > wy0 - 0.06f && ly < wy0)
                    {
                        px = wall * 0.7f; // sill
                    }

                    a[y * size + x] = px;
                    e[y * size + x] = em;
                }
            }

            albedo.SetPixels32(a);
            albedo.Apply(true, false);
            emission.SetPixels32(e);
            emission.Apply(true, false);
        }

        /// <summary>Ground-floor shopfront: large glazing with mullions, lit interiors at night.</summary>
        public static void Storefront(out Texture2D albedo, out Texture2D emission)
        {
            const int w = 512;
            const int h = 128;
            albedo = new Texture2D(w, h, TextureFormat.RGBA32, true, false) { name = "Storefront", wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Trilinear, anisoLevel = 8 };
            emission = new Texture2D(w, h, TextureFormat.RGBA32, true, false) { name = "StorefrontLit", wrapMode = TextureWrapMode.Repeat };
            var a = new Color32[w * h];
            var e = new Color32[w * h];
            for (int y = 0; y < h; y++)
            {
                float v = y / (float)h;
                for (int x = 0; x < w; x++)
                {
                    float u = (x % 128) / 128f;
                    Color px;
                    Color em = Color.black;
                    if (v > 0.86f)
                    {
                        px = new Color(0.22f, 0.24f, 0.26f); // fascia
                    }
                    else if (v < 0.08f || u < 0.03f || u > 0.97f)
                    {
                        px = new Color(0.3f, 0.3f, 0.31f); // kickplate/mullion
                    }
                    else
                    {
                        float g = 0.16f + 0.12f * v;
                        px = new Color(g * 0.8f, g * 0.9f, g);
                        em = (x / 128) % 2 == 0 ? new Color(1f, 0.93f, 0.8f) * (0.6f + 0.4f * (1f - v)) : new Color(0.9f, 0.95f, 1f) * 0.45f;
                    }

                    a[y * w + x] = px;
                    e[y * w + x] = em;
                }
            }

            albedo.SetPixels32(a);
            albedo.Apply(true, false);
            emission.SetPixels32(e);
            emission.Apply(true, false);
        }

        /// <summary>Small RGBA palette texture used by procedural characters (one texel column per part).</summary>
        public static Texture2D Palette(string name, int slots)
        {
            var tex = new Texture2D(slots, 1, TextureFormat.RGBA32, false, false) { name = name, filterMode = FilterMode.Point, wrapMode = TextureWrapMode.Clamp };
            return tex;
        }

        /// <summary>Anti-aliased filled circle for controller glyphs and HUD chips.</summary>
        public static Sprite Circle(int size = 64)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { name = "Circle", wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var px = new Color32[size * size];
            float r = size * 0.5f;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float d = Mathf.Sqrt((x + 0.5f - r) * (x + 0.5f - r) + (y + 0.5f - r) * (y + 0.5f - r));
                    float alpha = Mathf.Clamp01(r - d);
                    px[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }

            tex.SetPixels32(px);
            tex.Apply(false, false);
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f);
        }

        /// <summary>Rounded rectangle sprite with 9-slice borders for HUD panels.</summary>
        public static Sprite RoundedRect(int size = 32, int radius = 8)
        {
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, false) { name = "RoundedRect", wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var px = new Color32[size * size];
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float cx = Mathf.Clamp(x + 0.5f, radius, size - radius);
                    float cy = Mathf.Clamp(y + 0.5f, radius, size - radius);
                    float d = Mathf.Sqrt((x + 0.5f - cx) * (x + 0.5f - cx) + (y + 0.5f - cy) * (y + 0.5f - cy));
                    px[y * size + x] = new Color(1f, 1f, 1f, Mathf.Clamp01(radius - d + 0.5f));
                }
            }

            tex.SetPixels32(px);
            tex.Apply(false, false);
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), 100f, 0, SpriteMeshType.FullRect, new Vector4(radius, radius, radius, radius));
        }

        /// <summary>Tileable fractal noise in [0,1] (period = <paramref name="period"/> in noise units at frequency).</summary>
        private static float Fbm(float x, float y, int octaves, int sizeForTiling, float baseFrequency)
        {
            float sum = 0f;
            float amp = 0.5f;
            float norm = 0f;
            float fx = x;
            float fy = y;
            float period = baseFrequency;
            for (int o = 0; o < octaves; o++)
            {
                sum += amp * TileableNoise(fx, fy, period);
                norm += amp;
                fx *= 2f;
                fy *= 2f;
                period *= 2f;
                amp *= 0.5f;
            }

            return Mathf.Clamp01(sum / Mathf.Max(1e-4f, norm));
        }

        /// <summary>Perlin noise blended across the tile period so the texture wraps seamlessly.</summary>
        private static float TileableNoise(float x, float y, float period)
        {
            if (period <= 0f)
            {
                return Mathf.PerlinNoise(x, y);
            }

            float px = Mathf.Repeat(x, period);
            float py = Mathf.Repeat(y, period);
            float wx = px / period;
            float wy = py / period;
            float a = Mathf.PerlinNoise(px, py);
            float b = Mathf.PerlinNoise(px - period, py);
            float c = Mathf.PerlinNoise(px, py - period);
            float d = Mathf.PerlinNoise(px - period, py - period);
            float ab = Mathf.Lerp(a, b, wx);
            float cd = Mathf.Lerp(c, d, wx);
            return Mathf.Lerp(ab, cd, wy);
        }
    }
}
