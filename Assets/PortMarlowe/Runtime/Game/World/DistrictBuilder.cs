using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Core.World;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortMarlowe.Game.World
{
    public sealed class StreetLamp
    {
        public Light Light;
        public Vector3 Position;
    }

    /// <summary>Runtime handles produced by <see cref="DistrictBuilder"/>.</summary>
    public sealed class BuiltDistrict
    {
        public Transform Root;
        public Transform Roads;
        public Transform Crosswalks;
        public Transform Buildings;
        public DistrictPlan Plan;
        public WorldMaterials Materials;
        public readonly List<StreetLamp> Lamps = new List<StreetLamp>();
        public Bounds PlayableBounds;
        public Bounds NavBounds;

        // Safehouse
        public Transform SafehouseDoorHinge;
        public Vector3 SafehouseDoorOutside;
        public Vector3 SafehouseDoorInside;
        public Bounds SafehouseInterior;
        public Vector3 SafehouseBed;
        public Vector3 SafehouseWardrobe;
        public Vector3 SafehouseInsideSpawn;
        public Light SafehouseLamp;

        public Vector3 PoliceGarage;
        public Vector3 PoliceStationDoor;
        public readonly List<Transform> NavIgnore = new List<Transform>();
    }

    /// <summary>
    /// Builds the Saltmarket district from its <see cref="DistrictPlan"/>: carriageways, kerbs and
    /// sidewalks, the quay, perimeter-block buildings with facade materials, the enterable safehouse,
    /// the precinct, street furniture, a backdrop ring and boundary blockers. Geometry is merged per
    /// block and material to keep draw calls bounded; colliders are simple boxes.
    /// </summary>
    public sealed class DistrictBuilder
    {
        private const float KerbHeight = 0.15f;
        private const float RoadDepth = 0.4f;
        private const float StoreyHeight = 3.2f;
        private const float StorefrontHeight = 4.0f;

        private readonly DistrictPlan _plan;
        private readonly WorldMaterials _m;
        private BuiltDistrict _out;
        private Transform _colliders;
        private Transform _props;

        public DistrictBuilder(DistrictPlan plan, WorldMaterials materials)
        {
            _plan = plan;
            _m = materials;
        }

        public BuiltDistrict Build(Transform parent)
        {
            var root = new GameObject("District_" + _plan.Name).transform;
            root.SetParent(parent, false);
            _out = new BuiltDistrict { Root = root, Plan = _plan, Materials = _m };
            _out.Roads = NewChild(root, "Roads");
            _out.Crosswalks = NewChild(root, "Crosswalks");
            _out.Buildings = NewChild(root, "Buildings");
            _colliders = NewChild(root, "Colliders");
            _props = NewChild(root, "Props");

            BuildGround();
            BuildRoads();
            BuildBlocks();
            BuildWaterfront();
            BuildOuterRing();
            BuildBuildings();
            BuildStreetFurniture();
            BuildBoundary();
            BuildSkyline();

            float pad = 4f;
            _out.PlayableBounds = new Bounds();
            _out.PlayableBounds.SetMinMax(new Vector3(_plan.MinX - pad, -5f, _plan.MinZ - pad), new Vector3(_plan.MaxX + pad, 80f, _plan.MaxZ + pad));
            _out.NavBounds = _out.PlayableBounds;
            return _out;
        }

        // ------------------------------------------------------------------ ground & roads

        private void BuildGround()
        {
            var mb = new MeshBuilder();
            float x0 = _plan.MinX - 60f;
            float x1 = _plan.MaxX + 60f;
            float z0 = _plan.QuayEdgeZ;
            float z1 = _plan.MaxZ + 60f;
            mb.Box(_m.Curb, new Vector3(x0, -RoadDepth - 0.2f, z0), new Vector3(x1, -0.02f, z1), 4f, false, _m.Yard);
            mb.Emit("Earth", _out.Root, GameLayers.Ground, false);
            AddBoxCollider(_colliders, "EarthCollider", new Vector3(x0, -RoadDepth - 0.2f, z0), new Vector3(x1, -0.02f, z1), GameLayers.Ground);
        }

        private void BuildRoads()
        {
            float h = _plan.RoadHalfWidth;
            var mb = new MeshBuilder();
            var marks = new MeshBuilder();
            var gridNodes = new HashSet<int>();
            foreach (var n in _plan.Nodes)
            {
                if (!n.IsEntryPoint)
                {
                    gridNodes.Add(n.Id);
                    var c = n.Position.ToUnity();
                    var min = new Vector3(c.x - h, -RoadDepth, c.z - h);
                    var max = new Vector3(c.x + h, 0f, c.z + h);
                    mb.Box(_m.Asphalt, min, max, 6f);
                    AddBoxCollider(_out.Roads, "Junction", min, max, GameLayers.Ground);
                }
            }

            foreach (var e in _plan.Edges)
            {
                var a = _plan.Nodes[e.A];
                var b = _plan.Nodes[e.B];
                Vector3 pa = a.Position.ToUnity();
                Vector3 pb = b.Position.ToUnity();
                bool alongX = Mathf.Abs(pb.x - pa.x) > Mathf.Abs(pb.z - pa.z);
                // Trim at grid junctions; stubs run 15 m past their entry node.
                float startTrim = gridNodes.Contains(a.Id) ? h : -15f;
                float endTrim = gridNodes.Contains(b.Id) ? h : -15f;
                Vector3 dir = (pb - pa).normalized;
                Vector3 s = pa + dir * startTrim;
                Vector3 t = pb - dir * endTrim;
                Vector3 min = new Vector3(Mathf.Min(s.x, t.x), -RoadDepth, Mathf.Min(s.z, t.z));
                Vector3 max = new Vector3(Mathf.Max(s.x, t.x), 0f, Mathf.Max(s.z, t.z));
                if (alongX)
                {
                    min.z = pa.z - h;
                    max.z = pa.z + h;
                }
                else
                {
                    min.x = pa.x - h;
                    max.x = pa.x + h;
                }

                mb.Box(_m.Asphalt, min, max, 6f);
                AddBoxCollider(_out.Roads, "Road_" + e.StreetName, min, max, GameLayers.Ground);
                AddLaneMarkings(marks, s, t, dir, alongX, gridNodes.Contains(a.Id), gridNodes.Contains(b.Id));
            }

            mb.Emit("RoadSurface", _out.Roads, GameLayers.Ground, false);
            marks.Emit("RoadMarkings", _out.Roads, GameLayers.Ground, false);
        }

        private void AddLaneMarkings(MeshBuilder marks, Vector3 s, Vector3 t, Vector3 dir, bool alongX, bool crossAtStart, bool crossAtEnd)
        {
            const float y = 0.012f;
            Vector3 side = new Vector3(dir.z, 0f, -dir.x); // right of travel
            float length = Vector3.Distance(s, t);

            // Dashed centre line (yellow): 3 m dash, 4 m gap, kept clear of crosswalks.
            for (float d = 6f; d < length - 6f; d += 7f)
            {
                Vector3 p0 = s + dir * d;
                Vector3 p1 = s + dir * Mathf.Min(d + 3f, length - 6f);
                MarkQuad(marks, _m.LaneYellow, p0, p1, side, 0.07f, y);
            }

            float h = _plan.RoadHalfWidth;
            if (crossAtStart)
            {
                Crosswalk(marks, s, dir, side, h, y);
            }

            if (crossAtEnd)
            {
                Crosswalk(marks, t, -dir, -side, h, y);
            }
        }

        private void Crosswalk(MeshBuilder marks, Vector3 edge, Vector3 inward, Vector3 side, float halfWidth, float y)
        {
            // Zebra stripes parallel to traffic, 3 m deep, plus a stop line for the inbound lane.
            Vector3 c = edge + inward * 1.8f;
            for (float o = -halfWidth + 0.6f; o < halfWidth - 0.4f; o += 1.0f)
            {
                Vector3 p0 = c + side * o - inward * 1.4f;
                Vector3 p1 = c + side * o + inward * 1.4f;
                MarkQuad(marks, _m.LaneWhite, p0, p1, side, 0.25f, y);
            }

            Vector3 stop0 = edge + inward * 3.8f - side * 0.1f;
            Vector3 stop1 = stop0 - side * (halfWidth - 0.3f);
            MarkQuad(marks, _m.LaneWhite, stop0, stop1, inward, 0.2f, y);

            // Pedestrian preference zone for navigation (cheaper than open road).
            var zone = new GameObject("CrosswalkZone");
            zone.transform.SetParent(_out.Crosswalks, false);
            zone.transform.position = new Vector3(c.x, 0f, c.z);
            zone.transform.rotation = Quaternion.LookRotation(side, Vector3.up);
            zone.transform.localScale = new Vector3(3.2f, 1.5f, halfWidth * 2f + 1f);
        }

        private static void MarkQuad(MeshBuilder mb, Material m, Vector3 p0, Vector3 p1, Vector3 side, float halfWidth, float y)
        {
            Vector3 a = p0 - side * halfWidth;
            Vector3 b = p0 + side * halfWidth;
            Vector3 c = p1 + side * halfWidth;
            Vector3 d = p1 - side * halfWidth;
            a.y = b.y = c.y = d.y = y;
            // Ensure upward-facing winding regardless of direction.
            Vector3 n = Vector3.Cross(d - a, b - a);
            if (n.y < 0f)
            {
                mb.Quad(m, a, d, c, b, Vector2.zero, Vector2.up, Vector2.one, Vector2.right);
            }
            else
            {
                mb.Quad(m, a, b, c, d, Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            }
        }

        // ------------------------------------------------------------------ blocks / sidewalks

        private void BuildBlocks()
        {
            float walk = _plan.SidewalkWidth;
            foreach (var b in _plan.Blocks)
            {
                var mb = new MeshBuilder();
                var min = new Vector3(b.MinX - walk, -RoadDepth, b.MinZ - walk);
                var max = new Vector3(b.MaxX + walk, KerbHeight, b.MaxZ + walk);
                mb.Box(_m.Curb, min, max, 2f, false, _m.Sidewalk);
                Material lot;
                switch (b.Use)
                {
                    case BlockUse.Park: lot = _m.Grass; break;
                    case BlockUse.Plaza: lot = _m.Paving; break;
                    case BlockUse.PoliceStation:
                    case BlockUse.Warehouse: lot = _m.Yard; break;
                    default: lot = _m.Paving; break;
                }

                float ly = KerbHeight + 0.006f;
                mb.Quad(lot,
                    new Vector3(b.MinX, ly, b.MinZ), new Vector3(b.MaxX, ly, b.MinZ),
                    new Vector3(b.MaxX, ly, b.MaxZ), new Vector3(b.MinX, ly, b.MaxZ),
                    new Vector2(b.MinX, b.MinZ) / 4f, new Vector2(b.MaxX, b.MinZ) / 4f,
                    new Vector2(b.MaxX, b.MaxZ) / 4f, new Vector2(b.MinX, b.MaxZ) / 4f);
                mb.Emit("Block_" + b.Name, _out.Root, GameLayers.Ground, false);
                AddBoxCollider(_colliders, "Block_" + b.Name, min, max, GameLayers.Ground);

                if (b.Use == BlockUse.Park)
                {
                    BuildPark(b);
                }
                else if (b.Use == BlockUse.Plaza)
                {
                    BuildPlaza(b);
                }
            }
        }

        private void BuildPark(BlockPlan b)
        {
            var mb = new MeshBuilder();
            float cx = (b.MinX + b.MaxX) * 0.5f;
            float cz = (b.MinZ + b.MaxZ) * 0.5f;
            float y = KerbHeight + 0.012f;
            // Cross paths.
            mb.Quad(_m.Paving, new Vector3(b.MinX, y, cz - 1.5f), new Vector3(b.MaxX, y, cz - 1.5f), new Vector3(b.MaxX, y, cz + 1.5f), new Vector3(b.MinX, y, cz + 1.5f),
                new Vector2(0, 0), new Vector2(15, 0), new Vector2(15, 1), new Vector2(0, 1));
            mb.Quad(_m.Paving, new Vector3(cx - 1.5f, y, b.MinZ), new Vector3(cx + 1.5f, y, b.MinZ), new Vector3(cx + 1.5f, y, b.MaxZ), new Vector3(cx - 1.5f, y, b.MaxZ),
                new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 15), new Vector2(0, 15));

            // Public court (future basketball activity site): surface, lines, two hoops.
            Vector3 c0 = new Vector3(b.MinX + 6f, y + 0.004f, cz + 6f);
            Vector3 c1 = new Vector3(b.MinX + 6f + 15f, y + 0.004f, cz + 6f + 26f);
            mb.Quad(_m.CourtSurface, new Vector3(c0.x, c0.y, c0.z), new Vector3(c1.x, c0.y, c0.z), new Vector3(c1.x, c0.y, c1.z), new Vector3(c0.x, c0.y, c1.z),
                Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            float ly = c0.y + 0.004f;
            MarkQuad(mb, _m.LaneWhite, new Vector3(c0.x, ly, (c0.z + c1.z) * 0.5f), new Vector3(c1.x, ly, (c0.z + c1.z) * 0.5f), Vector3.forward, 0.05f, ly);
            foreach (float hz in new[] { c0.z + 1.2f, c1.z - 1.2f })
            {
                float hx = (c0.x + c1.x) * 0.5f;
                mb.Cylinder(_m.DarkMetal, new Vector3(hx, KerbHeight, hz), 0.09f, 3.05f, 8);
                float facing = hz < cz + 10f ? 1f : -1f;
                mb.Box(_m.LaneWhite, new Vector3(hx - 0.9f, 2.9f, hz + facing * 0.05f - 0.03f), new Vector3(hx + 0.9f, 3.95f, hz + facing * 0.05f + 0.03f));
                mb.Cylinder(_m.Barrier, new Vector3(hx, 3.05f, hz + facing * 0.38f), 0.23f, 0.03f, 12, false);
                AddBoxCollider(_colliders, "HoopPole", new Vector3(hx - 0.1f, KerbHeight, hz - 0.1f), new Vector3(hx + 0.1f, 3.05f, hz + 0.1f), GameLayers.Prop);
            }

            // Trees and benches.
            var rng = new DeterministicRandom(_plan.Seed ^ 0x9A3BUL);
            for (int i = 0; i < 9; i++)
            {
                float tx = rng.Range(b.MinX + 26f, b.MaxX - 4f);
                float tz = rng.Range(b.MinZ + 4f, b.MaxZ - 4f);
                if (Mathf.Abs(tx - cx) < 3f || Mathf.Abs(tz - cz) < 3f)
                {
                    continue;
                }

                Tree(mb, new Vector3(tx, KerbHeight, tz), rng.Range(0.85f, 1.25f), rng);
            }

            Bench(mb, new Vector3(cx + 4f, KerbHeight, cz - 3f), 0f);
            Bench(mb, new Vector3(cx - 4f, KerbHeight, cz + 3f), 180f);
            mb.Emit("Park_" + b.Name, _props, GameLayers.Prop);
        }

        private void BuildPlaza(BlockPlan b)
        {
            var mb = new MeshBuilder();
            float cx = (b.MinX + b.MaxX) * 0.5f;
            float cz = (b.MinZ + b.MaxZ) * 0.5f;
            // Fountain: stone basin, water disc, central column.
            mb.Cylinder(_m.QuayStone, new Vector3(cx, KerbHeight, cz), 4.2f, 0.55f, 24);
            mb.Cylinder(_m.Water, new Vector3(cx, KerbHeight + 0.4f, cz), 3.9f, 0.16f, 24);
            mb.Cylinder(_m.QuayStone, new Vector3(cx, KerbHeight, cz), 0.5f, 2.2f, 12);
            AddCylinderCollider(_colliders, "Fountain", new Vector3(cx, KerbHeight, cz), 4.2f, 0.6f, GameLayers.Prop);
            var rng = new DeterministicRandom(_plan.Seed ^ 0x51AAUL);
            for (int i = 0; i < 4; i++)
            {
                float a = i * Mathf.PI * 0.5f + Mathf.PI * 0.25f;
                Tree(mb, new Vector3(cx + Mathf.Cos(a) * 14f, KerbHeight, cz + Mathf.Sin(a) * 14f), 1.1f, rng);
                Bench(mb, new Vector3(cx + Mathf.Cos(a) * 8f, KerbHeight, cz + Mathf.Sin(a) * 8f), -a * Mathf.Rad2Deg + 90f);
            }

            // Market stalls along the west side.
            for (int i = 0; i < 4; i++)
            {
                float sz = b.MinZ + 10f + i * 10f;
                float sx = b.MinX + 5f;
                mb.Box(_m.Wood, new Vector3(sx - 1.2f, KerbHeight, sz - 2f), new Vector3(sx + 1.2f, KerbHeight + 1f, sz + 2f), 1f);
                mb.Box(i % 2 == 0 ? _m.FabricAccent : _m.Fabric, new Vector3(sx - 1.5f, KerbHeight + 2.4f, sz - 2.3f), new Vector3(sx + 1.5f, KerbHeight + 2.5f, sz + 2.3f), 1f);
                mb.Cylinder(_m.Metal, new Vector3(sx - 1.3f, KerbHeight, sz - 2.1f), 0.04f, 2.4f, 6, false);
                mb.Cylinder(_m.Metal, new Vector3(sx + 1.3f, KerbHeight, sz + 2.1f), 0.04f, 2.4f, 6, false);
                AddBoxCollider(_colliders, "Stall", new Vector3(sx - 1.2f, KerbHeight, sz - 2f), new Vector3(sx + 1.2f, KerbHeight + 1f, sz + 2f), GameLayers.Prop);
            }

            mb.Emit("Plaza_" + b.Name, _props, GameLayers.Prop);
        }

        // ------------------------------------------------------------------ waterfront

        private void BuildWaterfront()
        {
            float x0 = _plan.MinX + 30f;
            float x1 = _plan.MaxX - 30f;
            float zEdge = _plan.QuayEdgeZ;
            float zRoad = -_plan.RoadHalfWidth;
            var mb = new MeshBuilder();
            // Promenade slab (sidewalk + paving band) from the road to the quay edge.
            var min = new Vector3(x0, -RoadDepth, zEdge);
            var max = new Vector3(x1, KerbHeight, zRoad);
            mb.Box(_m.Curb, min, max, 2f, false, _m.Paving);
            AddBoxCollider(_colliders, "Promenade", min, max, GameLayers.Ground);
            // Quay wall down to the water.
            mb.Box(_m.QuayStone, new Vector3(x0, -3.2f, zEdge - 0.6f), new Vector3(x1, KerbHeight + 0.05f, zEdge), 2f);
            AddBoxCollider(_colliders, "QuayWall", new Vector3(x0, -3.2f, zEdge - 0.6f), new Vector3(x1, KerbHeight + 0.05f, zEdge), GameLayers.Ground);

            // Railing: posts every 2 m and a top rail. One collider for the whole run.
            for (float x = x0 + 1f; x < x1; x += 2f)
            {
                mb.Box(_m.DarkMetal, new Vector3(x - 0.04f, KerbHeight, zEdge + 0.25f), new Vector3(x + 0.04f, KerbHeight + 1.05f, zEdge + 0.33f));
            }

            mb.Box(_m.DarkMetal, new Vector3(x0, KerbHeight + 1.0f, zEdge + 0.24f), new Vector3(x1, KerbHeight + 1.08f, zEdge + 0.34f));
            mb.Box(_m.DarkMetal, new Vector3(x0, KerbHeight + 0.5f, zEdge + 0.27f), new Vector3(x1, KerbHeight + 0.54f, zEdge + 0.31f));
            AddBoxCollider(_colliders, "Railing", new Vector3(x0, KerbHeight, zEdge + 0.2f), new Vector3(x1, KerbHeight + 1.1f, zEdge + 0.4f), GameLayers.Prop);

            // Bollards and lamps along the promenade.
            for (float x = x0 + 8f; x < x1 - 4f; x += 16f)
            {
                mb.Cylinder(_m.DarkMetal, new Vector3(x, KerbHeight, zEdge + 1.2f), 0.12f, 0.9f, 8);
            }

            mb.Emit("Promenade", _props, GameLayers.Prop);

            // Water surface.
            var water = new MeshBuilder();
            float wy = -1.6f;
            water.Quad(_m.Water,
                new Vector3(x0 - 600f, wy, zEdge - 1200f), new Vector3(x1 + 600f, wy, zEdge - 1200f),
                new Vector3(x1 + 600f, wy, zEdge - 0.5f), new Vector3(x0 - 600f, wy, zEdge - 0.5f),
                Vector2.zero, new Vector2(1f, 0f), new Vector2(1f, 1f), new Vector2(0f, 1f));
            var wgo = water.Emit("Harbour", _out.Root, GameLayers.Water, false);
            if (wgo != null)
            {
                wgo.GetComponent<MeshRenderer>().receiveShadows = true;
            }
        }

        // ------------------------------------------------------------------ outer ring / backdrop

        private void BuildOuterRing()
        {
            float h = _plan.RoadHalfWidth;
            float walk = _plan.SidewalkWidth;
            float far = _plan.StreetX(3);
            float ringDepth = 22f;
            var stubs = new List<(bool vertical, float pos, float side)>();
            foreach (var e in _plan.Edges)
            {
                var b = _plan.Nodes[e.B];
                if (!b.IsEntryPoint)
                {
                    continue;
                }

                var a = _plan.Nodes[e.A];
                bool vertical = Mathf.Abs(b.Position.Z - a.Position.Z) > Mathf.Abs(b.Position.X - a.Position.X);
                stubs.Add((vertical, vertical ? a.Position.X : a.Position.Z, vertical ? Mathf.Sign(b.Position.Z - a.Position.Z) : Mathf.Sign(b.Position.X - a.Position.X)));
            }

            var mb = new MeshBuilder();
            int bi = 0;
            // West edge (x < 0), north edge (z > far), east edge (x > far).
            BuildEdge(mb, ref bi, false, -h - walk, -h - walk - ringDepth, -h - walk, far + h + walk + ringDepth, stubs, -1f);
            BuildEdge(mb, ref bi, true, far + h + walk, far + h + walk + ringDepth, -h - walk - ringDepth, far + h + walk + ringDepth, stubs, 1f);
            BuildEdge(mb, ref bi, false, far + h + walk, far + h + walk + ringDepth, -h - walk, far + h + walk, stubs, 1f);
            mb.Emit("Backdrop", _out.Buildings, GameLayers.Building);
        }

        /// <summary>
        /// One edge of the outer ring: a sidewalk strip next to the perimeter road and a row of backdrop
        /// buildings behind it, leaving openings where entry roads leave the slice.
        /// </summary>
        private void BuildEdge(MeshBuilder mb, ref int bi, bool northEdge, float a0, float a1, float s0, float s1,
            List<(bool vertical, float pos, float side)> stubs, float outward)
        {
            float h = _plan.RoadHalfWidth;
            float walk = _plan.SidewalkWidth;
            // Openings along this edge.
            var gaps = new List<float>();
            foreach (var s in stubs)
            {
                if (northEdge && s.vertical && s.side > 0f)
                {
                    gaps.Add(s.pos);
                }
                else if (!northEdge && !s.vertical && Mathf.Sign(s.side) == Mathf.Sign(outward))
                {
                    gaps.Add(s.pos);
                }
            }

            gaps.Sort();
            float gapHalf = h + walk;
            float cursor = s0;
            var rng = new DeterministicRandom(_plan.Seed ^ (ulong)(northEdge ? 0x77 : (outward > 0 ? 0x55 : 0x33)));
            var segments = new List<(float from, float to)>();
            foreach (float g in gaps)
            {
                segments.Add((cursor, g - gapHalf));
                cursor = g + gapHalf;
            }

            segments.Add((cursor, s1));
            float inner = Mathf.Min(a0, a1);
            float outer = Mathf.Max(a0, a1);
            float walkInner = outward > 0 ? inner : outer - walk;
            float walkOuter = outward > 0 ? inner + walk : outer;
            float bInner = outward > 0 ? inner + walk : inner;
            float bOuter = outward > 0 ? outer : outer - walk;

            foreach (var seg in segments)
            {
                if (seg.to - seg.from < 2f)
                {
                    continue;
                }

                // Sidewalk strip.
                Vector3 smin = northEdge ? new Vector3(seg.from, -RoadDepth, walkInner) : new Vector3(walkInner, -RoadDepth, seg.from);
                Vector3 smax = northEdge ? new Vector3(seg.to, KerbHeight, walkOuter) : new Vector3(walkOuter, KerbHeight, seg.to);
                mb.Box(_m.Curb, smin, smax, 2f, false, _m.Sidewalk);
                AddBoxCollider(_colliders, "OuterWalk", smin, smax, GameLayers.Ground);

                // Backdrop buildings.
                float cur = seg.from;
                while (cur < seg.to - 1f)
                {
                    float len = Mathf.Min(seg.to - cur, rng.Range(12f, 24f));
                    if (seg.to - (cur + len) < 5f)
                    {
                        len = seg.to - cur;
                    }

                    float height = Mathf.Round(rng.Range(10f, 34f) / StoreyHeight) * StoreyHeight;
                    Vector3 bmin = northEdge ? new Vector3(cur, KerbHeight, bInner) : new Vector3(bInner, KerbHeight, cur);
                    Vector3 bmax = northEdge ? new Vector3(cur + len, KerbHeight + height, bOuter) : new Vector3(bOuter, KerbHeight + height, cur + len);
                    var fac = _m.Facade(bi % 3 == 0 ? 1 : 0, bi);
                    FacadeBox(mb, fac, bmin, bmax, false);
                    mb.Box(_m.Curb, new Vector3(bmin.x, -RoadDepth, bmin.z), new Vector3(bmax.x, KerbHeight, bmax.z), 2f, false, _m.Sidewalk);
                    AddBoxCollider(_colliders, "Backdrop", new Vector3(bmin.x, -RoadDepth, bmin.z), bmax, GameLayers.Building);
                    cur += len;
                    bi++;
                }
            }

            // Sidewalks lining each stub road, ending at a barrier beyond the entry node.
            foreach (float g in gaps)
            {
                float len = 62f + 12f;
                for (int side = -1; side <= 1; side += 2)
                {
                    float c = g + side * (h + walk * 0.5f);
                    Vector3 wmin, wmax;
                    if (northEdge)
                    {
                        wmin = new Vector3(c - walk * 0.5f, -RoadDepth, inner);
                        wmax = new Vector3(c + walk * 0.5f, KerbHeight, inner + len);
                    }
                    else
                    {
                        float start = outward > 0 ? inner : outer - len;
                        float end = outward > 0 ? inner + len : outer;
                        wmin = new Vector3(start, -RoadDepth, c - walk * 0.5f);
                        wmax = new Vector3(end, KerbHeight, c + walk * 0.5f);
                    }

                    mb.Box(_m.Curb, wmin, wmax, 2f, false, _m.Sidewalk);
                    AddBoxCollider(_colliders, "StubWalk", wmin, wmax, GameLayers.Ground);
                }

                // Road-closed barrier beyond the entry point (responders spawn on the entry node, inside it).
                float bpos = 62f + 10f;
                Vector3 bm, bx;
                if (northEdge)
                {
                    bm = new Vector3(g - h - walk, 0f, inner + bpos);
                    bx = new Vector3(g + h + walk, 1.2f, inner + bpos + 0.6f);
                }
                else
                {
                    float p = outward > 0 ? inner + bpos : outer - bpos;
                    bm = new Vector3(Mathf.Min(p, p + outward * 0.6f), 0f, g - h - walk);
                    bx = new Vector3(Mathf.Max(p, p + outward * 0.6f), 1.2f, g + h + walk);
                }

                mb.Box(_m.Barrier, bm, bx, 0.5f);
                AddBoxCollider(_colliders, "RoadClosed", bm, bx + new Vector3(0f, 2.8f, 0f), GameLayers.Prop);
            }
        }

        // ------------------------------------------------------------------ buildings

        private void BuildBuildings()
        {
            var perBlock = new Dictionary<int, MeshBuilder>();
            for (int i = 0; i < _plan.Buildings.Count; i++)
            {
                var bp = _plan.Buildings[i];
                if (!perBlock.TryGetValue(bp.BlockIndex, out var mb))
                {
                    mb = new MeshBuilder();
                    perBlock[bp.BlockIndex] = mb;
                }

                if (bp.Enterable)
                {
                    BuildSafehouse(mb, bp, i);
                    continue;
                }

                var fac = _m.Facade(bp.Palette, i);
                Vector3 min = new Vector3(bp.MinX, KerbHeight, bp.MinZ);
                Vector3 max = new Vector3(bp.MaxX, KerbHeight + bp.Height, bp.MaxZ);
                if (bp.Storefront && bp.Height > StorefrontHeight + 2f)
                {
                    StorefrontBand(mb, min, new Vector3(max.x, KerbHeight + StorefrontHeight, max.z));
                    FacadeBox(mb, fac, new Vector3(min.x, KerbHeight + StorefrontHeight, min.z), max, true);
                }
                else
                {
                    FacadeBox(mb, fac, min, max, true);
                }

                AddBoxCollider(_colliders, "Building_" + i, min, max, GameLayers.Building);

                if (_plan.Blocks[bp.BlockIndex].Use == BlockUse.PoliceStation && bp.Name == "Saltmarket Precinct House")
                {
                    DressPrecinct(mb, bp);
                }
            }

            foreach (var kv in perBlock)
            {
                var block = _plan.Blocks[kv.Key];
                kv.Value.Emit("Buildings_" + block.Name, _out.Buildings, GameLayers.Building);
                if (block.Use == BlockUse.PoliceStation)
                {
                    BuildPrecinctYard(block);
                }
            }
        }

        /// <summary>Box building with tiled facade sides, parapet, roof and optional rooftop clutter.</summary>
        private void FacadeBox(MeshBuilder mb, Material facade, Vector3 min, Vector3 max, bool rooftop)
        {
            var tile = new Vector2(12f, 12.8f);
            float y0 = min.y;
            float y1 = max.y;
            mb.QuadWorldUV(facade, new Vector3(min.x, y0, min.z), new Vector3(max.x, y0, min.z), new Vector3(max.x, y1, min.z), new Vector3(min.x, y1, min.z), tile, Vector2.zero);
            mb.QuadWorldUV(facade, new Vector3(max.x, y0, max.z), new Vector3(min.x, y0, max.z), new Vector3(min.x, y1, max.z), new Vector3(max.x, y1, max.z), tile, Vector2.zero);
            mb.QuadWorldUV(facade, new Vector3(min.x, y0, max.z), new Vector3(min.x, y0, min.z), new Vector3(min.x, y1, min.z), new Vector3(min.x, y1, max.z), tile, Vector2.zero);
            mb.QuadWorldUV(facade, new Vector3(max.x, y0, min.z), new Vector3(max.x, y0, max.z), new Vector3(max.x, y1, max.z), new Vector3(max.x, y1, min.z), tile, Vector2.zero);
            mb.Quad(_m.Roof, new Vector3(min.x, y1, min.z), new Vector3(max.x, y1, min.z), new Vector3(max.x, y1, max.z), new Vector3(min.x, y1, max.z),
                new Vector2(min.x, min.z) * 0.25f, new Vector2(max.x, min.z) * 0.25f, new Vector2(max.x, max.z) * 0.25f, new Vector2(min.x, max.z) * 0.25f);

            // Parapet (0.7 m) on all sides.
            const float t = 0.25f;
            const float ph = 0.7f;
            mb.Box(_m.Trim, new Vector3(min.x - 0.05f, y1, min.z - 0.05f), new Vector3(max.x + 0.05f, y1 + ph, min.z + t), 2f);
            mb.Box(_m.Trim, new Vector3(min.x - 0.05f, y1, max.z - t), new Vector3(max.x + 0.05f, y1 + ph, max.z + 0.05f), 2f);
            mb.Box(_m.Trim, new Vector3(min.x - 0.05f, y1, min.z + t), new Vector3(min.x + t, y1 + ph, max.z - t), 2f);
            mb.Box(_m.Trim, new Vector3(max.x - t, y1, min.z + t), new Vector3(max.x + 0.05f, y1 + ph, max.z - t), 2f);

            float w = max.x - min.x;
            float d = max.z - min.z;
            if (rooftop && y1 - y0 > 9f && w > 8f && d > 8f)
            {
                float cx = (min.x + max.x) * 0.5f;
                float cz = (min.z + max.z) * 0.5f;
                mb.Box(_m.Metal, new Vector3(cx - 1.4f, y1, cz - 1f), new Vector3(cx + 1.4f, y1 + 1.2f, cz + 1f), 1f);
                mb.Box(_m.Trim, new Vector3(cx + 2f, y1, cz - 1.5f), new Vector3(cx + 4.4f, y1 + 2.6f, cz + 1.5f), 1f);
            }
        }

        private void StorefrontBand(MeshBuilder mb, Vector3 min, Vector3 max)
        {
            var tile = new Vector2(6f, 4f);
            float y0 = min.y;
            float y1 = max.y;
            mb.QuadWorldUV(_m.Storefront, new Vector3(min.x, y0, min.z), new Vector3(max.x, y0, min.z), new Vector3(max.x, y1, min.z), new Vector3(min.x, y1, min.z), tile, Vector2.zero);
            mb.QuadWorldUV(_m.Storefront, new Vector3(max.x, y0, max.z), new Vector3(min.x, y0, max.z), new Vector3(min.x, y1, max.z), new Vector3(max.x, y1, max.z), tile, Vector2.zero);
            mb.QuadWorldUV(_m.Storefront, new Vector3(min.x, y0, max.z), new Vector3(min.x, y0, min.z), new Vector3(min.x, y1, min.z), new Vector3(min.x, y1, max.z), tile, Vector2.zero);
            mb.QuadWorldUV(_m.Storefront, new Vector3(max.x, y0, min.z), new Vector3(max.x, y0, max.z), new Vector3(max.x, y1, max.z), new Vector3(max.x, y1, min.z), tile, Vector2.zero);
            // Awning ledge above the shopfront.
            mb.Box(_m.Trim, new Vector3(min.x - 0.6f, y1 - 0.25f, min.z - 0.6f), new Vector3(max.x + 0.6f, y1, max.z + 0.6f), 2f);
        }

        private void DressPrecinct(MeshBuilder mb, BuildingPlan bp)
        {
            // Entrance on the west face (Lantern Street): canopy, sign band, double door.
            float x = bp.MinX;
            float cz = (bp.MinZ + bp.MaxZ) * 0.5f;
            mb.Box(_m.Trim, new Vector3(x - 2.2f, KerbHeight + 3.2f, cz - 3f), new Vector3(x, KerbHeight + 3.45f, cz + 3f), 1f);
            mb.Box(_m.PoliceSign, new Vector3(x - 0.15f, KerbHeight + 3.6f, cz - 2.5f), new Vector3(x, KerbHeight + 4.4f, cz + 2.5f), 1f);
            mb.Box(_m.DarkMetal, new Vector3(x - 0.05f, KerbHeight, cz - 1.2f), new Vector3(x + 0.02f, KerbHeight + 2.6f, cz + 1.2f), 1f);
            mb.Cylinder(_m.Metal, new Vector3(x - 2f, KerbHeight, cz - 2.8f), 0.08f, 3.2f, 8);
            mb.Cylinder(_m.Metal, new Vector3(x - 2f, KerbHeight, cz + 2.8f), 0.08f, 3.2f, 8);
            _out.PoliceStationDoor = new Vector3(x - 1.2f, KerbHeight, cz);
        }

        private void BuildPrecinctYard(BlockPlan block)
        {
            var mb = new MeshBuilder();
            // Chain-link style fence around the yard (south part of the block) with a gate gap onto Tern Street.
            float y = KerbHeight;
            float z0 = block.MinZ;
            float z1 = block.MinZ + 22f;
            float x0 = block.MinX + 26f;
            float x1 = block.MaxX;
            FenceRun(mb, new Vector3(x0, y, z1), new Vector3(x1, y, z1));
            FenceRun(mb, new Vector3(x1, y, z0), new Vector3(x1, y, z1));
            FenceRun(mb, new Vector3(x0 + 12f, y, z0), new Vector3(x1, y, z0));
            // Painted bays.
            for (int i = 0; i < 4; i++)
            {
                float bx = block.MinX + 30f + i * 6f;
                MarkQuad(mb, _m.LaneWhite, new Vector3(bx, y + 0.012f, z1 - 1f), new Vector3(bx, y + 0.012f, z1 - 6.5f), Vector3.right, 0.06f, y + 0.012f);
            }

            mb.Emit("PrecinctYard", _props, GameLayers.Prop);
            _out.PoliceGarage = new Vector3(block.MinX + 16f, KerbHeight, block.MinZ + 8f);
        }

        private void FenceRun(MeshBuilder mb, Vector3 a, Vector3 b)
        {
            float len = Vector3.Distance(a, b);
            Vector3 dir = (b - a).normalized;
            for (float d = 0f; d <= len; d += 2.5f)
            {
                Vector3 p = a + dir * d;
                mb.Cylinder(_m.Metal, p, 0.035f, 2.1f, 6, false);
            }

            Vector3 side = new Vector3(dir.z, 0f, -dir.x) * 0.02f;
            mb.OrientedBox(_m.DarkMetal, (a + b) * 0.5f + Vector3.up * 1.05f, Quaternion.LookRotation(dir), new Vector3(0.02f, 1.9f, len));
            Vector3 min = Vector3.Min(a, b) - new Vector3(0.1f, 0f, 0.1f) - side;
            Vector3 max = Vector3.Max(a, b) + new Vector3(0.1f, 2.1f, 0.1f) + side;
            AddBoxCollider(_colliders, "Fence", min, max, GameLayers.Prop);
        }

        // ------------------------------------------------------------------ safehouse

        private void BuildSafehouse(MeshBuilder mb, BuildingPlan bp, int index)
        {
            var poi = _plan.Find(PoiKind.Safehouse);
            float doorX = poi.Position.X;
            float y0 = KerbHeight;
            float H = KerbHeight + bp.Height;
            const float wall = 0.3f;
            const float roomDepth = 8f;
            const float ceiling = 3.2f;
            const float doorHalf = 0.6f;
            const float doorHeight = 2.3f;
            float zf = bp.MinZ;
            float zr = bp.MinZ + roomDepth;
            float yc = y0 + ceiling;
            var tile = new Vector2(12f, 12.8f);
            var fac = _m.Facade(2 == bp.Palette ? 0 : bp.Palette, index);

            // Exterior: upper facade on all sides, ground floor stucco on the street face with a doorway.
            FacadeBox(mb, fac, new Vector3(bp.MinX, yc, bp.MinZ), new Vector3(bp.MaxX, H, bp.MaxZ), true);
            mb.QuadWorldUV(fac, new Vector3(bp.MaxX, y0, bp.MaxZ), new Vector3(bp.MinX, y0, bp.MaxZ), new Vector3(bp.MinX, yc, bp.MaxZ), new Vector3(bp.MaxX, yc, bp.MaxZ), tile, Vector2.zero);
            mb.QuadWorldUV(fac, new Vector3(bp.MinX, y0, bp.MaxZ), new Vector3(bp.MinX, y0, bp.MinZ), new Vector3(bp.MinX, yc, bp.MinZ), new Vector3(bp.MinX, yc, bp.MaxZ), tile, Vector2.zero);
            mb.QuadWorldUV(fac, new Vector3(bp.MaxX, y0, bp.MinZ), new Vector3(bp.MaxX, y0, bp.MaxZ), new Vector3(bp.MaxX, yc, bp.MaxZ), new Vector3(bp.MaxX, yc, bp.MinZ), tile, Vector2.zero);
            var stucco = _m.Trim;
            var st = new Vector2(2f, 2f);
            mb.QuadWorldUV(stucco, new Vector3(bp.MinX, y0, zf), new Vector3(doorX - doorHalf, y0, zf), new Vector3(doorX - doorHalf, yc, zf), new Vector3(bp.MinX, yc, zf), st, Vector2.zero);
            mb.QuadWorldUV(stucco, new Vector3(doorX + doorHalf, y0, zf), new Vector3(bp.MaxX, y0, zf), new Vector3(bp.MaxX, yc, zf), new Vector3(doorX + doorHalf, yc, zf), st, Vector2.zero);
            mb.QuadWorldUV(stucco, new Vector3(doorX - doorHalf, y0 + doorHeight, zf), new Vector3(doorX + doorHalf, y0 + doorHeight, zf), new Vector3(doorX + doorHalf, yc, zf), new Vector3(doorX - doorHalf, yc, zf), st, Vector2.zero);
            // Door reveal (wall thickness).
            mb.Box(stucco, new Vector3(doorX - doorHalf - 0.02f, y0, zf), new Vector3(doorX - doorHalf, y0 + doorHeight, zf + wall), 1f);
            mb.Box(stucco, new Vector3(doorX + doorHalf, y0, zf), new Vector3(doorX + doorHalf + 0.02f, y0 + doorHeight, zf + wall), 1f);
            mb.Box(stucco, new Vector3(doorX - doorHalf, y0 + doorHeight, zf), new Vector3(doorX + doorHalf, y0 + doorHeight + 0.02f, zf + wall), 1f);
            // Canopy, step and wall lamp.
            mb.Box(_m.DarkMetal, new Vector3(doorX - 1.2f, y0 + 2.6f, zf - 1.1f), new Vector3(doorX + 1.2f, y0 + 2.7f, zf), 1f);
            mb.Box(_m.QuayStone, new Vector3(doorX - 0.9f, y0, zf - 0.5f), new Vector3(doorX + 0.9f, y0 + 0.08f, zf), 1f);
            mb.Box(_m.LampHead, new Vector3(doorX + 1.0f, y0 + 2.2f, zf - 0.12f), new Vector3(doorX + 1.2f, y0 + 2.45f, zf), 1f);

            // Interior shell: floor, ceiling, walls (inward-facing).
            float ix0 = bp.MinX + wall;
            float ix1 = bp.MaxX - wall;
            float iz0 = zf + wall;
            float iz1 = zr;
            float fy = y0 + 0.01f;
            mb.Quad(_m.InteriorFloor, new Vector3(ix0, fy, iz0), new Vector3(ix1, fy, iz0), new Vector3(ix1, fy, iz1), new Vector3(ix0, fy, iz1),
                new Vector2(ix0, iz0) * 0.5f, new Vector2(ix1, iz0) * 0.5f, new Vector2(ix1, iz1) * 0.5f, new Vector2(ix0, iz1) * 0.5f);
            mb.Quad(_m.InteriorWall, new Vector3(ix0, yc, iz1), new Vector3(ix1, yc, iz1), new Vector3(ix1, yc, iz0), new Vector3(ix0, yc, iz0),
                Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            var wt = new Vector2(3f, 3f);
            // Back wall (faces -Z), side walls, front wall split around the door (faces +Z).
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(ix1, y0, iz1), new Vector3(ix0, y0, iz1), new Vector3(ix0, yc, iz1), new Vector3(ix1, yc, iz1), wt, Vector2.zero);
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(ix0, y0, iz1), new Vector3(ix0, y0, iz0), new Vector3(ix0, yc, iz0), new Vector3(ix0, yc, iz1), wt, Vector2.zero);
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(ix1, y0, iz0), new Vector3(ix1, y0, iz1), new Vector3(ix1, yc, iz1), new Vector3(ix1, yc, iz0), wt, Vector2.zero);
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(doorX - doorHalf, y0, iz0), new Vector3(ix0, y0, iz0), new Vector3(ix0, yc, iz0), new Vector3(doorX - doorHalf, yc, iz0), wt, Vector2.zero);
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(ix1, y0, iz0), new Vector3(doorX + doorHalf, y0, iz0), new Vector3(doorX + doorHalf, yc, iz0), new Vector3(ix1, yc, iz0), wt, Vector2.zero);
            mb.QuadWorldUV(_m.InteriorWall, new Vector3(doorX + doorHalf, y0 + doorHeight, iz0), new Vector3(doorX - doorHalf, y0 + doorHeight, iz0), new Vector3(doorX - doorHalf, yc, iz0), new Vector3(doorX + doorHalf, yc, iz0), wt, Vector2.zero);

            // Furniture: bed against the back-left, wardrobe on the right wall, table, sofa, rug, kitchenette.
            Vector3 bedMin = new Vector3(ix0 + 0.2f, y0, iz1 - 2.3f);
            mb.Box(_m.Wood, bedMin, bedMin + new Vector3(1.6f, 0.4f, 2.1f), 1f);
            mb.Box(_m.Fabric, bedMin + new Vector3(0.05f, 0.4f, 0.05f), bedMin + new Vector3(1.55f, 0.6f, 2.05f), 1f);
            mb.Box(_m.InteriorWall, bedMin + new Vector3(0.2f, 0.6f, 1.6f), bedMin + new Vector3(1.4f, 0.75f, 2.0f), 1f);
            mb.Box(_m.Wood, bedMin + new Vector3(0f, 0f, 2.05f), bedMin + new Vector3(1.6f, 1.1f, 2.1f), 1f);
            _out.SafehouseBed = bedMin + new Vector3(0.8f, 0f, -0.6f);
            AddBoxCollider(_colliders, "Bed", bedMin, bedMin + new Vector3(1.6f, 0.6f, 2.1f), GameLayers.Prop);

            Vector3 wardMin = new Vector3(ix1 - 0.65f, y0, iz1 - 3.6f);
            mb.Box(_m.Wood, wardMin, wardMin + new Vector3(0.6f, 2.1f, 1.4f), 1f);
            mb.Box(_m.DarkMetal, wardMin + new Vector3(-0.02f, 1.0f, 0.65f), wardMin + new Vector3(0f, 1.2f, 0.75f), 1f);
            _out.SafehouseWardrobe = wardMin + new Vector3(-0.7f, 0f, 0.7f);
            AddBoxCollider(_colliders, "Wardrobe", wardMin, wardMin + new Vector3(0.6f, 2.1f, 1.4f), GameLayers.Prop);

            Vector3 tableC = new Vector3((ix0 + ix1) * 0.5f + 1.2f, y0, iz0 + 3.2f);
            mb.Box(_m.Wood, tableC + new Vector3(-0.6f, 0.72f, -0.45f), tableC + new Vector3(0.6f, 0.77f, 0.45f), 1f);
            mb.Cylinder(_m.DarkMetal, tableC + new Vector3(0f, 0f, 0f), 0.06f, 0.72f, 6, false);
            AddBoxCollider(_colliders, "Table", tableC + new Vector3(-0.6f, 0f, -0.45f), tableC + new Vector3(0.6f, 0.77f, 0.45f), GameLayers.Prop);
            Vector3 sofaMin = new Vector3(ix0 + 0.2f, y0, iz0 + 1.6f);
            mb.Box(_m.FabricAccent, sofaMin, sofaMin + new Vector3(0.9f, 0.45f, 2.0f), 1f);
            mb.Box(_m.FabricAccent, sofaMin, sofaMin + new Vector3(0.25f, 0.85f, 2.0f), 1f);
            AddBoxCollider(_colliders, "Sofa", sofaMin, sofaMin + new Vector3(0.9f, 0.85f, 2.0f), GameLayers.Prop);
            float rugY = y0 + 0.02f;
            mb.Quad(_m.Fabric, new Vector3(tableC.x - 1.6f, rugY, tableC.z - 1.2f), new Vector3(tableC.x + 1.6f, rugY, tableC.z - 1.2f),
                new Vector3(tableC.x + 1.6f, rugY, tableC.z + 1.2f), new Vector3(tableC.x - 1.6f, rugY, tableC.z + 1.2f),
                Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            Vector3 kitMin = new Vector3(ix1 - 0.65f, y0, iz0 + 0.4f);
            mb.Box(_m.InteriorWall, kitMin, kitMin + new Vector3(0.6f, 0.9f, 2.4f), 1f);
            mb.Box(_m.DarkMetal, kitMin + new Vector3(0f, 0.9f, 0f), kitMin + new Vector3(0.6f, 0.94f, 2.4f), 1f);
            AddBoxCollider(_colliders, "Kitchen", kitMin, kitMin + new Vector3(0.6f, 0.94f, 2.4f), GameLayers.Prop);

            // Colliders: walls with a door gap, solid volumes behind and above the room.
            AddBoxCollider(_colliders, "SafehouseBack", new Vector3(bp.MinX, y0, zr), new Vector3(bp.MaxX, H, bp.MaxZ), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseUpper", new Vector3(bp.MinX, yc, bp.MinZ), new Vector3(bp.MaxX, H, zr), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseWallW", new Vector3(bp.MinX, y0, bp.MinZ), new Vector3(ix0, yc, zr), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseWallE", new Vector3(ix1, y0, bp.MinZ), new Vector3(bp.MaxX, yc, zr), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseFrontL", new Vector3(ix0, y0, zf), new Vector3(doorX - doorHalf, yc, iz0), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseFrontR", new Vector3(doorX + doorHalf, y0, zf), new Vector3(ix1, yc, iz0), GameLayers.Building);
            AddBoxCollider(_colliders, "SafehouseLintel", new Vector3(doorX - doorHalf, y0 + doorHeight, zf), new Vector3(doorX + doorHalf, yc, iz0), GameLayers.Building);

            // Hinged door panel (separate object; animated by the Safehouse component; excluded from nav baking).
            var hinge = new GameObject("SafehouseDoorHinge").transform;
            hinge.SetParent(_out.Root, false);
            hinge.position = new Vector3(doorX - doorHalf, y0, zf + wall * 0.5f);
            var panel = GameObject.CreatePrimitive(PrimitiveType.Cube);
            panel.name = "SafehouseDoor";
            panel.layer = GameLayers.Prop;
            panel.transform.SetParent(hinge, false);
            panel.transform.localPosition = new Vector3(doorHalf, doorHeight * 0.5f, 0f);
            panel.transform.localScale = new Vector3(doorHalf * 2f - 0.04f, doorHeight - 0.02f, 0.06f);
            panel.GetComponent<MeshRenderer>().sharedMaterial = _m.Wood;
            _out.SafehouseDoorHinge = hinge;
            _out.NavIgnore.Add(hinge);
            _out.SafehouseDoorOutside = new Vector3(doorX, y0, zf - 1.2f);
            _out.SafehouseDoorInside = new Vector3(doorX, y0, iz0 + 1.0f);
            _out.SafehouseInsideSpawn = new Vector3(doorX, y0, iz0 + 2.5f);
            var ib = new Bounds();
            ib.SetMinMax(new Vector3(ix0, y0 - 0.2f, iz0), new Vector3(ix1, yc, iz1));
            _out.SafehouseInterior = ib;

            var lampGo = new GameObject("SafehouseLamp");
            lampGo.transform.SetParent(_out.Root, false);
            lampGo.transform.position = new Vector3((ix0 + ix1) * 0.5f, yc - 0.4f, (iz0 + iz1) * 0.5f);
            var lamp = lampGo.AddComponent<Light>();
            lamp.type = LightType.Point;
            lamp.range = 9f;
            lamp.intensity = 1.6f;
            lamp.color = new Color(1f, 0.8f, 0.6f);
            lamp.shadows = LightShadows.None;
            _out.SafehouseLamp = lamp;
        }

        // ------------------------------------------------------------------ street furniture

        private void BuildStreetFurniture()
        {
            var mb = new MeshBuilder();
            float h = _plan.RoadHalfWidth;
            float kerbInset = 0.6f;
            var rng = new DeterministicRandom(_plan.Seed ^ 0x7EE5UL);
            var trees = new MeshBuilder();
            foreach (var e in _plan.Edges)
            {
                var a = _plan.Nodes[e.A];
                var b = _plan.Nodes[e.B];
                if (a.IsEntryPoint || b.IsEntryPoint)
                {
                    continue;
                }

                Vector3 pa = a.Position.ToUnity();
                Vector3 pb = b.Position.ToUnity();
                Vector3 dir = (pb - pa).normalized;
                Vector3 side = new Vector3(dir.z, 0f, -dir.x);
                float len = Vector3.Distance(pa, pb);
                for (int s = -1; s <= 1; s += 2)
                {
                    // Skip the waterfront side of Quay Road (promenade has its own lamps).
                    Vector3 off = side * s * (h + kerbInset);
                    for (float d = 14f; d < len - 10f; d += 26f)
                    {
                        Vector3 p = pa + dir * d + off;
                        p.y = KerbHeight;
                        if (!InsidePlayable(p))
                        {
                            continue;
                        }

                        StreetLight(mb, p, -side * s);
                    }

                    for (float d = 27f; d < len - 14f; d += 26f)
                    {
                        Vector3 p = pa + dir * d + side * s * (h + 1.4f);
                        p.y = KerbHeight;
                        if (!InsidePlayable(p) || !TreeFriendly(p))
                        {
                            continue;
                        }

                        Tree(trees, p, rng.Range(0.8f, 1.15f), rng);
                    }
                }
            }

            // Promenade lamps.
            for (float x = _plan.MinX + 40f; x < _plan.MaxX - 40f; x += 24f)
            {
                StreetLight(mb, new Vector3(x, KerbHeight, _plan.QuayEdgeZ + 1.6f), Vector3.forward);
            }

            mb.Emit("StreetLights", _props, GameLayers.Prop);
            trees.Emit("StreetTrees", _props, GameLayers.Prop);
        }

        private bool InsidePlayable(Vector3 p) =>
            p.x > -_plan.RoadHalfWidth - 0.5f && p.x < _plan.StreetX(3) + _plan.RoadHalfWidth + 0.5f &&
            p.z > -_plan.RoadHalfWidth - 0.5f && p.z < _plan.StreetZ(3) + _plan.RoadHalfWidth + 0.5f;

        private bool TreeFriendly(Vector3 p)
        {
            foreach (var b in _plan.Blocks)
            {
                bool near = p.x > b.MinX - 6f && p.x < b.MaxX + 6f && p.z > b.MinZ - 6f && p.z < b.MaxZ + 6f;
                if (near && (b.Use == BlockUse.Residential || b.Use == BlockUse.Park || b.Use == BlockUse.Plaza || b.Use == BlockUse.MidRise))
                {
                    return true;
                }
            }

            return false;
        }

        private void StreetLight(MeshBuilder mb, Vector3 basePos, Vector3 towardRoad)
        {
            towardRoad = towardRoad.normalized;
            mb.Cylinder(_m.DarkMetal, basePos, 0.09f, 6.4f, 8);
            Vector3 armStart = basePos + Vector3.up * 6.3f;
            Vector3 head = armStart + towardRoad * 1.6f;
            mb.OrientedBox(_m.DarkMetal, (armStart + head) * 0.5f, Quaternion.LookRotation(towardRoad), new Vector3(0.08f, 0.08f, 1.6f));
            mb.OrientedBox(_m.DarkMetal, head + Vector3.up * 0.05f, Quaternion.LookRotation(towardRoad), new Vector3(0.36f, 0.14f, 0.6f));
            mb.OrientedBox(_m.LampHead, head - Vector3.up * 0.04f, Quaternion.LookRotation(towardRoad), new Vector3(0.28f, 0.04f, 0.5f));
            AddCylinderCollider(_colliders, "LampPost", basePos, 0.12f, 6.4f, GameLayers.Prop);

            var go = new GameObject("StreetLamp");
            go.transform.SetParent(_props, false);
            go.transform.position = head - Vector3.up * 0.3f;
            var light = go.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 17f;
            light.intensity = 2.4f;
            light.color = new Color(1f, 0.82f, 0.6f);
            light.shadows = LightShadows.None;
            light.enabled = false;
            _out.Lamps.Add(new StreetLamp { Light = light, Position = go.transform.position });
        }

        private void Tree(MeshBuilder mb, Vector3 basePos, float scale, DeterministicRandom rng)
        {
            float trunkH = 2.6f * scale;
            mb.Cylinder(_m.Bark, basePos, 0.14f * scale, trunkH + 0.6f, 7, false);
            var leaf = rng.Chance(0.5f) ? _m.Foliage : _m.FoliageDark;
            mb.Ellipsoid(leaf, basePos + new Vector3(0f, trunkH + 1.3f * scale, 0f), new Vector3(1.9f, 1.5f, 1.9f) * scale, 5, 9);
            mb.Ellipsoid(leaf, basePos + new Vector3(0.8f * scale, trunkH + 0.9f * scale, 0.3f * scale), new Vector3(1.2f, 1.0f, 1.2f) * scale, 4, 8);
            mb.Ellipsoid(leaf, basePos + new Vector3(-0.6f * scale, trunkH + 1.0f * scale, -0.5f * scale), new Vector3(1.1f, 0.9f, 1.1f) * scale, 4, 8);
            AddCylinderCollider(_colliders, "TreeTrunk", basePos, 0.2f * scale, trunkH, GameLayers.Prop);
        }

        private void Bench(MeshBuilder mb, Vector3 basePos, float yaw)
        {
            var rot = Quaternion.Euler(0f, yaw, 0f);
            mb.OrientedBox(_m.Wood, basePos + rot * new Vector3(0f, 0.45f, 0f), rot, new Vector3(1.8f, 0.06f, 0.45f));
            mb.OrientedBox(_m.Wood, basePos + rot * new Vector3(0f, 0.8f, 0.2f), rot, new Vector3(1.8f, 0.4f, 0.05f));
            mb.OrientedBox(_m.DarkMetal, basePos + rot * new Vector3(-0.8f, 0.22f, 0f), rot, new Vector3(0.06f, 0.45f, 0.45f));
            mb.OrientedBox(_m.DarkMetal, basePos + rot * new Vector3(0.8f, 0.22f, 0f), rot, new Vector3(0.06f, 0.45f, 0.45f));
            var col = new GameObject("Bench");
            col.layer = GameLayers.Prop;
            col.transform.SetParent(_colliders, false);
            col.transform.SetPositionAndRotation(basePos + rot * new Vector3(0f, 0.5f, 0.05f), rot);
            col.AddComponent<BoxCollider>().size = new Vector3(1.8f, 1.0f, 0.55f);
        }

        // ------------------------------------------------------------------ boundary & skyline

        private void BuildBoundary()
        {
            // Invisible walls just inside the plan bounds keep players inside the slice even if they
            // find a gap in the backdrop. Water edge is open (falling in triggers recovery).
            float x0 = _plan.MinX + 8f;
            float x1 = _plan.MaxX - 8f;
            float z0 = _plan.QuayEdgeZ - 0.6f;
            float z1 = _plan.MaxZ - 8f;
            AddBoxCollider(_colliders, "BoundaryW", new Vector3(x0 - 1f, -5f, z0), new Vector3(x0, 60f, z1), GameLayers.Default);
            AddBoxCollider(_colliders, "BoundaryE", new Vector3(x1, -5f, z0), new Vector3(x1 + 1f, 60f, z1), GameLayers.Default);
            AddBoxCollider(_colliders, "BoundaryN", new Vector3(x0, -5f, z1), new Vector3(x1, 60f, z1 + 1f), GameLayers.Default);
            // Promenade ends: fences across at both ends.
            var mb = new MeshBuilder();
            foreach (float x in new[] { _plan.MinX + 30f, _plan.MaxX - 30f })
            {
                FenceRun(mb, new Vector3(x, KerbHeight, _plan.QuayEdgeZ), new Vector3(x, KerbHeight, -_plan.RoadHalfWidth));
            }

            mb.Emit("PromenadeEnds", _props, GameLayers.Prop);
        }

        private void BuildSkyline()
        {
            var mb = new MeshBuilder();
            var rng = new DeterministicRandom(_plan.Seed ^ 0x5C71UL);
            var center = new Vector3(_plan.StreetX(1) + _plan.BlockPitch * 0.5f, 0f, _plan.StreetZ(1) + _plan.BlockPitch * 0.5f);
            for (int i = 0; i < 46; i++)
            {
                float ang = i / 46f * Mathf.PI * 2f + rng.Range(-0.04f, 0.04f);
                // South is open water; push those towers further across the harbour.
                bool south = Mathf.Sin(ang) < -0.35f;
                float r = south ? rng.Range(700f, 1000f) : rng.Range(330f, 520f);
                var p = center + new Vector3(Mathf.Cos(ang), 0f, Mathf.Sin(ang)) * r;
                float w = rng.Range(18f, 40f);
                float d = rng.Range(18f, 40f);
                float hgt = rng.Range(30f, south ? 140f : 110f);
                var min = new Vector3(p.x - w * 0.5f, -1f, p.z - d * 0.5f);
                var max = new Vector3(p.x + w * 0.5f, hgt, p.z + d * 0.5f);
                var tile = new Vector2(24f, 25.6f);
                mb.QuadWorldUV(_m.Skyline, new Vector3(min.x, min.y, min.z), new Vector3(max.x, min.y, min.z), new Vector3(max.x, max.y, min.z), new Vector3(min.x, max.y, min.z), tile, Vector2.zero);
                mb.QuadWorldUV(_m.Skyline, new Vector3(max.x, min.y, max.z), new Vector3(min.x, min.y, max.z), new Vector3(min.x, max.y, max.z), new Vector3(max.x, max.y, max.z), tile, Vector2.zero);
                mb.QuadWorldUV(_m.Skyline, new Vector3(min.x, min.y, max.z), new Vector3(min.x, min.y, min.z), new Vector3(min.x, max.y, min.z), new Vector3(min.x, max.y, max.z), tile, Vector2.zero);
                mb.QuadWorldUV(_m.Skyline, new Vector3(max.x, min.y, min.z), new Vector3(max.x, min.y, max.z), new Vector3(max.x, max.y, max.z), new Vector3(max.x, max.y, min.z), tile, Vector2.zero);
                mb.Quad(_m.Roof, new Vector3(min.x, max.y, min.z), new Vector3(max.x, max.y, min.z), new Vector3(max.x, max.y, max.z), new Vector3(min.x, max.y, max.z), Vector2.zero, Vector2.right, Vector2.one, Vector2.up);
            }

            var go = mb.Emit("Skyline", _out.Root, GameLayers.Building, false);
            if (go != null)
            {
                go.GetComponent<MeshRenderer>().receiveShadows = false;
            }
        }

        // ------------------------------------------------------------------ helpers

        private static Transform NewChild(Transform parent, string name)
        {
            var t = new GameObject(name).transform;
            t.SetParent(parent, false);
            return t;
        }

        private static void AddBoxCollider(Transform parent, string name, Vector3 min, Vector3 max, int layer)
        {
            var go = new GameObject(name);
            go.layer = layer;
            go.isStatic = true;
            go.transform.SetParent(parent, false);
            go.transform.position = (min + max) * 0.5f;
            var bc = go.AddComponent<BoxCollider>();
            bc.size = new Vector3(Mathf.Abs(max.x - min.x), Mathf.Abs(max.y - min.y), Mathf.Abs(max.z - min.z));
        }

        private static void AddCylinderCollider(Transform parent, string name, Vector3 basePos, float radius, float height, int layer)
        {
            var go = new GameObject(name);
            go.layer = layer;
            go.isStatic = true;
            go.transform.SetParent(parent, false);
            go.transform.position = basePos + Vector3.up * height * 0.5f;
            var cc = go.AddComponent<CapsuleCollider>();
            cc.radius = radius;
            cc.height = Mathf.Max(height, radius * 2f);
            cc.direction = 1;
        }
    }
}
