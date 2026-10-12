using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortMarlowe.Game.World
{
    /// <summary>
    /// Accumulates geometry per material and emits one mesh with submeshes, so a whole block of
    /// procedural buildings costs a handful of draw calls instead of hundreds.
    /// </summary>
    public sealed class MeshBuilder
    {
        private sealed class Part
        {
            public readonly List<int> Indices = new List<int>();
        }

        private readonly List<Vector3> _verts = new List<Vector3>();
        private readonly List<Vector3> _normals = new List<Vector3>();
        private readonly List<Vector2> _uvs = new List<Vector2>();
        private readonly List<Material> _materials = new List<Material>();
        private readonly List<Part> _parts = new List<Part>();

        public int VertexCount => _verts.Count;

        private Part PartFor(Material m)
        {
            int i = _materials.IndexOf(m);
            if (i < 0)
            {
                _materials.Add(m);
                _parts.Add(new Part());
                i = _materials.Count - 1;
            }

            return _parts[i];
        }

        /// <summary>Quad a-b-c-d (counter-clockwise when viewed from the front) with explicit UVs.</summary>
        public void Quad(Material m, Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 ua, Vector2 ub, Vector2 uc, Vector2 ud)
        {
            var p = PartFor(m);
            // Unity front faces wind clockwise as seen by the viewer, so the outward normal is (d-a) x (b-a).
            Vector3 n = Vector3.Cross(d - a, b - a).normalized;
            int i = _verts.Count;
            _verts.Add(a);
            _verts.Add(b);
            _verts.Add(c);
            _verts.Add(d);
            _normals.Add(n);
            _normals.Add(n);
            _normals.Add(n);
            _normals.Add(n);
            _uvs.Add(ua);
            _uvs.Add(ub);
            _uvs.Add(uc);
            _uvs.Add(ud);
            p.Indices.Add(i);
            p.Indices.Add(i + 3);
            p.Indices.Add(i + 2);
            p.Indices.Add(i);
            p.Indices.Add(i + 2);
            p.Indices.Add(i + 1);
        }

        /// <summary>Quad with world-scale UVs: <paramref name="uvScale"/> metres per texture repeat on each axis.</summary>
        public void QuadWorldUV(Material m, Vector3 a, Vector3 b, Vector3 c, Vector3 d, Vector2 uvScale, Vector2 uvOffset)
        {
            float w = Vector3.Distance(a, b);
            float h = Vector3.Distance(a, d);
            Vector2 s = new Vector2(1f / Mathf.Max(0.001f, uvScale.x), 1f / Mathf.Max(0.001f, uvScale.y));
            Quad(m, a, b, c, d,
                uvOffset,
                uvOffset + new Vector2(w * s.x, 0f),
                uvOffset + new Vector2(w * s.x, h * s.y),
                uvOffset + new Vector2(0f, h * s.y));
        }

        /// <summary>Axis-aligned box (min/max) with world-scale UVs; optionally skip the bottom face.</summary>
        public void Box(Material m, Vector3 min, Vector3 max, float uvMetres = 1f, bool bottom = false, Material topMaterial = null)
        {
            Vector3 p000 = new Vector3(min.x, min.y, min.z);
            Vector3 p100 = new Vector3(max.x, min.y, min.z);
            Vector3 p010 = new Vector3(min.x, max.y, min.z);
            Vector3 p110 = new Vector3(max.x, max.y, min.z);
            Vector3 p001 = new Vector3(min.x, min.y, max.z);
            Vector3 p101 = new Vector3(max.x, min.y, max.z);
            Vector3 p011 = new Vector3(min.x, max.y, max.z);
            Vector3 p111 = new Vector3(max.x, max.y, max.z);
            var uv = new Vector2(uvMetres, uvMetres);

            // South (-Z), North (+Z), West (-X), East (+X): bottom-left, bottom-right, top-right, top-left seen from outside.
            QuadWorldUV(m, p000, p100, p110, p010, uv, new Vector2(min.x / uvMetres, min.y / uvMetres));
            QuadWorldUV(m, p101, p001, p011, p111, uv, new Vector2(-max.x / uvMetres, min.y / uvMetres));
            QuadWorldUV(m, p001, p000, p010, p011, uv, new Vector2(-max.z / uvMetres, min.y / uvMetres));
            QuadWorldUV(m, p100, p101, p111, p110, uv, new Vector2(min.z / uvMetres, min.y / uvMetres));

            // Top: world XZ projection keeps adjacent slabs continuous.
            var top = topMaterial != null ? topMaterial : m;
            Quad(top, p010, p110, p111, p011,
                new Vector2(min.x, min.z) / uvMetres, new Vector2(max.x, min.z) / uvMetres,
                new Vector2(max.x, max.z) / uvMetres, new Vector2(min.x, max.z) / uvMetres);
            if (bottom)
            {
                Quad(m, p001, p101, p100, p000, Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            }
        }

        /// <summary>Oriented box from a transform-like centre/rotation/size (props, vehicle parts).</summary>
        public void OrientedBox(Material m, Vector3 center, Quaternion rot, Vector3 size, float uvMetres = 1f)
        {
            Vector3 h = size * 0.5f;
            Vector3 P(float x, float y, float z) => center + rot * new Vector3(x * h.x, y * h.y, z * h.z);
            var a = P(-1, -1, -1);
            var b = P(1, -1, -1);
            var c = P(1, 1, -1);
            var d = P(-1, 1, -1);
            var e = P(-1, -1, 1);
            var f = P(1, -1, 1);
            var g = P(1, 1, 1);
            var k = P(-1, 1, 1);
            var uv = new Vector2(uvMetres, uvMetres);
            QuadWorldUV(m, a, b, c, d, uv, Vector2.zero);
            QuadWorldUV(m, f, e, k, g, uv, Vector2.zero);
            QuadWorldUV(m, e, a, d, k, uv, Vector2.zero);
            QuadWorldUV(m, b, f, g, c, uv, Vector2.zero);
            QuadWorldUV(m, d, c, g, k, uv, Vector2.zero);
            QuadWorldUV(m, e, f, b, a, uv, Vector2.zero);
        }

        /// <summary>Vertical cylinder (poles, trunks, bollards) with optional cap.</summary>
        public void Cylinder(Material m, Vector3 baseCenter, float radius, float height, int segments = 10, bool cap = true)
        {
            var p = PartFor(m);
            int start = _verts.Count;
            for (int i = 0; i <= segments; i++)
            {
                float t = i / (float)segments;
                float ang = t * Mathf.PI * 2f;
                var dir = new Vector3(Mathf.Cos(ang), 0f, Mathf.Sin(ang));
                _verts.Add(baseCenter + dir * radius);
                _verts.Add(baseCenter + dir * radius + Vector3.up * height);
                _normals.Add(dir);
                _normals.Add(dir);
                _uvs.Add(new Vector2(t * radius * 6.28f, 0f));
                _uvs.Add(new Vector2(t * radius * 6.28f, height));
            }

            for (int i = 0; i < segments; i++)
            {
                int a = start + i * 2;
                p.Indices.Add(a);
                p.Indices.Add(a + 1);
                p.Indices.Add(a + 3);
                p.Indices.Add(a);
                p.Indices.Add(a + 3);
                p.Indices.Add(a + 2);
            }

            if (cap)
            {
                int c = _verts.Count;
                _verts.Add(baseCenter + Vector3.up * height);
                _normals.Add(Vector3.up);
                _uvs.Add(Vector2.zero);
                for (int i = 0; i <= segments; i++)
                {
                    float ang = i / (float)segments * Mathf.PI * 2f;
                    _verts.Add(baseCenter + new Vector3(Mathf.Cos(ang) * radius, height, Mathf.Sin(ang) * radius));
                    _normals.Add(Vector3.up);
                    _uvs.Add(new Vector2(Mathf.Cos(ang), Mathf.Sin(ang)) * radius);
                }

                for (int i = 0; i < segments; i++)
                {
                    p.Indices.Add(c);
                    p.Indices.Add(c + 2 + i);
                    p.Indices.Add(c + 1 + i);
                }
            }
        }

        /// <summary>Low-poly ellipsoid (tree canopies, bushes).</summary>
        public void Ellipsoid(Material m, Vector3 center, Vector3 radii, int rings = 6, int segments = 10)
        {
            var p = PartFor(m);
            int start = _verts.Count;
            for (int r = 0; r <= rings; r++)
            {
                float v = r / (float)rings;
                float phi = v * Mathf.PI;
                for (int s = 0; s <= segments; s++)
                {
                    float u = s / (float)segments;
                    float th = u * Mathf.PI * 2f;
                    var n = new Vector3(Mathf.Sin(phi) * Mathf.Cos(th), Mathf.Cos(phi), Mathf.Sin(phi) * Mathf.Sin(th));
                    _verts.Add(center + Vector3.Scale(n, radii));
                    _normals.Add(new Vector3(n.x / radii.x, n.y / radii.y, n.z / radii.z).normalized);
                    _uvs.Add(new Vector2(u * 3f, v * 2f));
                }
            }

            int stride = segments + 1;
            for (int r = 0; r < rings; r++)
            {
                for (int s = 0; s < segments; s++)
                {
                    int a = start + r * stride + s;
                    int b = a + stride;
                    p.Indices.Add(a);
                    p.Indices.Add(a + 1);
                    p.Indices.Add(b + 1);
                    p.Indices.Add(a);
                    p.Indices.Add(b + 1);
                    p.Indices.Add(b);
                }
            }
        }

        public Mesh ToMesh(string name)
        {
            var mesh = new Mesh { name = name };
            if (_verts.Count > 65000)
            {
                mesh.indexFormat = IndexFormat.UInt32;
            }

            mesh.SetVertices(_verts);
            mesh.SetNormals(_normals);
            mesh.SetUVs(0, _uvs);
            mesh.subMeshCount = _parts.Count;
            for (int i = 0; i < _parts.Count; i++)
            {
                mesh.SetTriangles(_parts[i].Indices, i, false);
            }

            mesh.RecalculateBounds();
            mesh.RecalculateTangents();
            mesh.UploadMeshData(true);
            return mesh;
        }

        /// <summary>Create a renderer object under <paramref name="parent"/>. Returns null when empty.</summary>
        public GameObject Emit(string name, Transform parent, int layer, bool castShadows = true)
        {
            if (_verts.Count == 0)
            {
                return null;
            }

            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.layer = layer;
            go.isStatic = true;
            var mf = go.AddComponent<MeshFilter>();
            mf.sharedMesh = ToMesh(name);
            var mr = go.AddComponent<MeshRenderer>();
            mr.sharedMaterials = _materials.ToArray();
            mr.shadowCastingMode = castShadows ? ShadowCastingMode.On : ShadowCastingMode.Off;
            return go;
        }

        public void Clear()
        {
            _verts.Clear();
            _normals.Clear();
            _uvs.Clear();
            _materials.Clear();
            _parts.Clear();
        }
    }
}
