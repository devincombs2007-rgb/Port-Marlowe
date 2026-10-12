using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.World
{
    public enum BlockUse
    {
        WaterfrontCommercial,
        Plaza,
        Warehouse,
        Residential,
        MidRise,
        PoliceStation,
        Park,
        Commercial,
    }

    public enum PoiKind
    {
        Safehouse,
        SafehouseParking,
        PoliceStation,
        PoliceGarage,
        EntryPoint,
        PlayerStart,
        PartnerStart,
        PedestrianSpot,
        Landmark,
        ShopFront,
        Bench,
    }

    public sealed class RoadNode
    {
        public int Id;
        public Vec3 Position;
        public bool IsEntryPoint;
        public string Name = string.Empty;
    }

    public sealed class RoadEdge
    {
        public int A;
        public int B;
        public string StreetName = string.Empty;
        public float SpeedLimit = 13.4f; // 30 mph
    }

    public sealed class BlockPlan
    {
        public int Ix;
        public int Iz;
        public BlockUse Use;
        public string Name = string.Empty;

        /// <summary>Lot rectangle (inside the sidewalks), metres.</summary>
        public float MinX;
        public float MinZ;
        public float MaxX;
        public float MaxZ;
    }

    public sealed class BuildingPlan
    {
        public int BlockIndex;
        public float MinX;
        public float MinZ;
        public float MaxX;
        public float MaxZ;
        public float Height;
        public int Floors;
        public int Palette;
        public bool Storefront;

        /// <summary>Facing direction of the main facade (unit vector on XZ).</summary>
        public Vec3 Facing;
        public string Name = string.Empty;
        public bool Enterable;
    }

    public sealed class ParkingSlot
    {
        public Vec3 Position;
        public float Yaw;
        public bool Reserved;
        public string Tag = string.Empty;
    }

    public sealed class Poi
    {
        public PoiKind Kind;
        public Vec3 Position;
        public float Yaw;
        public string Name = string.Empty;
    }

    /// <summary>
    /// Engine-independent plan for the first playable district ("Saltmarket"). The Unity
    /// DistrictBuilder turns this into geometry; validators check connectivity and access rules
    /// before anything is built. All units metres, +X east, +Z north, Y up.
    /// </summary>
    public sealed class DistrictPlan
    {
        public string Name = "Saltmarket";
        public ulong Seed;
        public float BlockPitch = 76f;
        public float RoadHalfWidth = 5f;
        public float SidewalkWidth = 3f;
        public float LaneOffset = 2.5f;
        public int StreetsX = 4;
        public int StreetsZ = 4;

        /// <summary>South promenade edge; water begins beyond (lower Z) this line.</summary>
        public float QuayEdgeZ;

        public float MinX;
        public float MaxX;
        public float MinZ;
        public float MaxZ;

        public readonly List<RoadNode> Nodes = new List<RoadNode>();
        public readonly List<RoadEdge> Edges = new List<RoadEdge>();
        public readonly List<BlockPlan> Blocks = new List<BlockPlan>();
        public readonly List<BuildingPlan> Buildings = new List<BuildingPlan>();
        public readonly List<ParkingSlot> Parking = new List<ParkingSlot>();
        public readonly List<Poi> Pois = new List<Poi>();

        public readonly string[] NorthSouthStreets = { "Kettle Street", "Brine Avenue", "Lantern Street", "Gannet Avenue" };
        public readonly string[] EastWestStreets = { "Quay Road", "Tern Street", "Cooper Street", "Hollis Road" };

        public Poi Find(PoiKind kind)
        {
            foreach (var p in Pois)
            {
                if (p.Kind == kind)
                {
                    return p;
                }
            }

            return null;
        }

        public IEnumerable<Poi> FindAll(PoiKind kind)
        {
            foreach (var p in Pois)
            {
                if (p.Kind == kind)
                {
                    yield return p;
                }
            }
        }

        public float StreetX(int i) => i * BlockPitch;
        public float StreetZ(int j) => j * BlockPitch;

        public int NodeAt(int i, int j) => j * StreetsX + i;

        /// <summary>True if the XZ point lies on a carriageway (roads only, not sidewalks).</summary>
        public bool IsOnRoad(float x, float z)
        {
            foreach (var e in Edges)
            {
                var a = Nodes[e.A].Position;
                var b = Nodes[e.B].Position;
                if (DistanceToSegment(x, z, a, b) <= RoadHalfWidth)
                {
                    return true;
                }
            }

            return false;
        }

        public static float DistanceToSegment(float x, float z, Vec3 a, Vec3 b)
        {
            float abx = b.X - a.X;
            float abz = b.Z - a.Z;
            float len2 = abx * abx + abz * abz;
            float t = len2 < 1e-6f ? 0f : MathUtil.Clamp01(((x - a.X) * abx + (z - a.Z) * abz) / len2);
            float px = a.X + abx * t - x;
            float pz = a.Z + abz * t - z;
            return (float)Math.Sqrt(px * px + pz * pz);
        }
    }

    public static class DistrictPlanner
    {
        public const ulong DefaultSeed = 0x5A17_3A2C_E7B1_0001UL;

        public static DistrictPlan CreateSaltmarket(ulong seed = DefaultSeed)
        {
            var rng = new DeterministicRandom(seed);
            var plan = new DistrictPlan { Seed = seed };
            float pitch = plan.BlockPitch;
            float half = plan.RoadHalfWidth;
            float walk = plan.SidewalkWidth;

            // Road grid nodes.
            for (int j = 0; j < plan.StreetsZ; j++)
            {
                for (int i = 0; i < plan.StreetsX; i++)
                {
                    plan.Nodes.Add(new RoadNode
                    {
                        Id = plan.Nodes.Count,
                        Position = new Vec3(plan.StreetX(i), 0f, plan.StreetZ(j)),
                        Name = $"{plan.NorthSouthStreets[i]} & {plan.EastWestStreets[j]}",
                    });
                }
            }

            for (int j = 0; j < plan.StreetsZ; j++)
            {
                for (int i = 0; i < plan.StreetsX; i++)
                {
                    if (i + 1 < plan.StreetsX)
                    {
                        plan.Edges.Add(new RoadEdge { A = plan.NodeAt(i, j), B = plan.NodeAt(i + 1, j), StreetName = plan.EastWestStreets[j] });
                    }

                    if (j + 1 < plan.StreetsZ)
                    {
                        plan.Edges.Add(new RoadEdge { A = plan.NodeAt(i, j), B = plan.NodeAt(i, j + 1), StreetName = plan.NorthSouthStreets[i] });
                    }
                }
            }

            // Road stubs leaving the slice: valid off-screen entry points for responders and traffic.
            float far = pitch * 3f;
            AddStub(plan, plan.NodeAt(1, 3), new Vec3(plan.StreetX(1), 0f, far + 62f), "North entry (Brine Ave)");
            AddStub(plan, plan.NodeAt(2, 3), new Vec3(plan.StreetX(2), 0f, far + 62f), "North entry (Lantern St)");
            AddStub(plan, plan.NodeAt(3, 2), new Vec3(far + 62f, 0f, plan.StreetZ(2)), "East entry (Cooper St)");
            AddStub(plan, plan.NodeAt(0, 1), new Vec3(-62f, 0f, plan.StreetZ(1)), "West entry (Tern St)");

            plan.MinX = -half - walk - 70f;
            plan.MaxX = far + half + walk + 70f;
            plan.QuayEdgeZ = -half - walk - 10f;
            plan.MinZ = plan.QuayEdgeZ - 40f;
            plan.MaxZ = far + half + walk + 70f;

            // Blocks: a 3x3 grid between the streets.
            var uses = new[,]
            {
                // [ix, iz]
                { BlockUse.WaterfrontCommercial, BlockUse.Residential, BlockUse.Residential },
                { BlockUse.Plaza, BlockUse.MidRise, BlockUse.Park },
                { BlockUse.Warehouse, BlockUse.PoliceStation, BlockUse.Commercial },
            };
            var names = new[,]
            {
                { "Chandlers Row", "Tern Street Walk-ups", "Hollis Terrace" },
                { "Pier Market Square", "Ashcombe Block", "Cooper Green" },
                { "Gannet Yards", "Saltmarket Precinct", "Lantern Corner" },
            };

            for (int iz = 0; iz < 3; iz++)
            {
                for (int ix = 0; ix < 3; ix++)
                {
                    var b = new BlockPlan
                    {
                        Ix = ix,
                        Iz = iz,
                        Use = uses[ix, iz],
                        Name = names[ix, iz],
                        MinX = plan.StreetX(ix) + half + walk,
                        MaxX = plan.StreetX(ix + 1) - half - walk,
                        MinZ = plan.StreetZ(iz) + half + walk,
                        MaxZ = plan.StreetZ(iz + 1) - half - walk,
                    };
                    plan.Blocks.Add(b);
                    BuildBlock(plan, b, plan.Blocks.Count - 1, rng);
                }
            }

            AddParking(plan, rng);
            AddPois(plan);
            return plan;
        }

        private static void AddStub(DistrictPlan plan, int fromNode, Vec3 end, string name)
        {
            var node = new RoadNode { Id = plan.Nodes.Count, Position = end, IsEntryPoint = true, Name = name };
            plan.Nodes.Add(node);
            plan.Edges.Add(new RoadEdge { A = fromNode, B = node.Id, StreetName = name });
            plan.Pois.Add(new Poi { Kind = PoiKind.EntryPoint, Position = end, Name = name });
        }

        private static void BuildBlock(DistrictPlan plan, BlockPlan b, int blockIndex, DeterministicRandom rng)
        {
            float w = b.MaxX - b.MinX;
            float d = b.MaxZ - b.MinZ;
            switch (b.Use)
            {
                case BlockUse.Plaza:
                case BlockUse.Park:
                    // Open block: a single low kiosk/pavilion along the north edge keeps sightlines open.
                    plan.Buildings.Add(new BuildingPlan
                    {
                        BlockIndex = blockIndex,
                        MinX = b.MinX + w * 0.35f,
                        MaxX = b.MinX + w * 0.65f,
                        MinZ = b.MaxZ - 9f,
                        MaxZ = b.MaxZ - 1f,
                        Height = 4.5f,
                        Floors = 1,
                        Palette = 3,
                        Storefront = b.Use == BlockUse.Plaza,
                        Facing = new Vec3(0, 0, -1),
                        Name = b.Use == BlockUse.Plaza ? "Market Pavilion" : "Green Shelter",
                    });
                    return;
                case BlockUse.PoliceStation:
                    // Station faces Lantern Street (west face); vehicle yard on the south (Tern St) side.
                    plan.Buildings.Add(new BuildingPlan
                    {
                        BlockIndex = blockIndex,
                        MinX = b.MinX,
                        MaxX = b.MinX + 26f,
                        MinZ = b.MinZ + 22f,
                        MaxZ = b.MaxZ,
                        Height = 12f,
                        Floors = 3,
                        Palette = 5,
                        Storefront = false,
                        Facing = new Vec3(-1, 0, 0),
                        Name = "Saltmarket Precinct House",
                    });
                    plan.Buildings.Add(new BuildingPlan
                    {
                        BlockIndex = blockIndex,
                        MinX = b.MinX + 32f,
                        MaxX = b.MaxX,
                        MinZ = b.MinZ + 30f,
                        MaxZ = b.MaxZ,
                        Height = 9f,
                        Floors = 2,
                        Palette = 5,
                        Facing = new Vec3(1, 0, 0),
                        Name = "Precinct Annex",
                    });
                    return;
            }

            // Perimeter buildings with a hidden courtyard. Depth varies by use.
            float depth = b.Use == BlockUse.Warehouse ? 26f : 16f;
            float minH, maxH;
            int palette;
            bool storefront;
            switch (b.Use)
            {
                case BlockUse.MidRise: minH = 24f; maxH = 42f; palette = 1; storefront = true; break;
                case BlockUse.Warehouse: minH = 8f; maxH = 13f; palette = 4; storefront = false; break;
                case BlockUse.Residential: minH = 9f; maxH = 16f; palette = 2; storefront = false; break;
                case BlockUse.WaterfrontCommercial: minH = 10f; maxH = 20f; palette = 0; storefront = true; break;
                default: minH = 10f; maxH = 22f; palette = 0; storefront = true; break;
            }

            // South and north rows span the full width; east and west rows fill between them.
            AddRow(plan, blockIndex, b.MinX, b.MaxX, b.MinZ, b.MinZ + depth, true, new Vec3(0, 0, -1), minH, maxH, palette, storefront, rng);
            AddRow(plan, blockIndex, b.MinX, b.MaxX, b.MaxZ - depth, b.MaxZ, true, new Vec3(0, 0, 1), minH, maxH, palette, storefront, rng);
            AddRow(plan, blockIndex, b.MinX, b.MinX + depth, b.MinZ + depth, b.MaxZ - depth, false, new Vec3(-1, 0, 0), minH, maxH, palette, storefront, rng);
            AddRow(plan, blockIndex, b.MaxX - depth, b.MaxX, b.MinZ + depth, b.MaxZ - depth, false, new Vec3(1, 0, 0), minH, maxH, palette, storefront, rng);
        }

        private static void AddRow(DistrictPlan plan, int blockIndex, float x0, float x1, float z0, float z1, bool alongX,
            Vec3 facing, float minH, float maxH, int palette, bool storefront, DeterministicRandom rng)
        {
            float length = alongX ? x1 - x0 : z1 - z0;
            float cursor = 0f;
            while (cursor < length - 0.5f)
            {
                float remaining = length - cursor;
                float seg = remaining < 18f ? remaining : Math.Min(remaining, rng.Range(10f, 20f));
                if (remaining - seg < 6f)
                {
                    seg = remaining;
                }

                float h = (float)Math.Round(rng.Range(minH, maxH) / 3.2f) * 3.2f;
                h = Math.Max(3.6f, h);
                var bp = new BuildingPlan
                {
                    BlockIndex = blockIndex,
                    Height = h,
                    Floors = Math.Max(1, (int)Math.Round(h / 3.2f)),
                    Palette = palette,
                    Storefront = storefront,
                    Facing = facing,
                };
                if (alongX)
                {
                    bp.MinX = x0 + cursor;
                    bp.MaxX = x0 + cursor + seg;
                    bp.MinZ = z0;
                    bp.MaxZ = z1;
                }
                else
                {
                    bp.MinX = x0;
                    bp.MaxX = x1;
                    bp.MinZ = z0 + cursor;
                    bp.MaxZ = z0 + cursor + seg;
                }

                plan.Buildings.Add(bp);
                cursor += seg;
            }
        }

        private static void AddParking(DistrictPlan plan, DeterministicRandom rng)
        {
            // Parallel parking along the kerb of selected street segments (right-hand traffic: kerb lane).
            float kerbOffset = plan.RoadHalfWidth - 1.2f;
            for (int j = 1; j < plan.StreetsZ - 1; j++)
            {
                for (int i = 0; i < plan.StreetsX - 1; i++)
                {
                    float x0 = plan.StreetX(i) + plan.RoadHalfWidth + 9f;
                    float x1 = plan.StreetX(i + 1) - plan.RoadHalfWidth - 9f;
                    float z = plan.StreetZ(j);
                    for (float x = x0; x <= x1 - 5.5f; x += 11f)
                    {
                        plan.Parking.Add(new ParkingSlot { Position = new Vec3(x + 2.75f, 0f, z + kerbOffset), Yaw = 90f });
                        plan.Parking.Add(new ParkingSlot { Position = new Vec3(x + 8.25f, 0f, z - kerbOffset), Yaw = 270f });
                    }
                }
            }
        }

        private static void AddPois(DistrictPlan plan)
        {
            // Safehouse: a walk-up on the north side of Tern Street (block 0,1).
            var resBlock = plan.Blocks.Find(b => b.Ix == 0 && b.Iz == 1);
            float doorX = resBlock.MinX + 22f;
            float doorZ = resBlock.MinZ;
            plan.Pois.Add(new Poi { Kind = PoiKind.Safehouse, Position = new Vec3(doorX, 0f, doorZ), Yaw = 180f, Name = "Tern Street walk-up" });

            // Reserve the closest kerb slot outside the door for the resident car.
            ParkingSlot best = null;
            float bestD = float.MaxValue;
            foreach (var s in plan.Parking)
            {
                float dd = Vec3.FlatDistance(s.Position, new Vec3(doorX, 0, doorZ));
                if (s.Position.Z > plan.StreetZ(1) && dd < bestD)
                {
                    best = s;
                    bestD = dd;
                }
            }

            if (best != null)
            {
                best.Reserved = true;
                best.Tag = "safehouse";
                plan.Pois.Add(new Poi { Kind = PoiKind.SafehouseParking, Position = best.Position, Yaw = best.Yaw, Name = "Resident parking" });
            }

            // Mark the safehouse building enterable (the one containing the door x on the south row).
            foreach (var bp in plan.Buildings)
            {
                if (plan.Blocks[bp.BlockIndex] == resBlock && bp.MinZ <= resBlock.MinZ + 0.1f && bp.MinX <= doorX && bp.MaxX >= doorX)
                {
                    bp.Enterable = true;
                    bp.Name = "Tern Street walk-up";
                }
            }

            var station = plan.Blocks.Find(b => b.Use == BlockUse.PoliceStation);
            plan.Pois.Add(new Poi
            {
                Kind = PoiKind.PoliceStation,
                Position = new Vec3(station.MinX - plan.SidewalkWidth * 0.5f, 0f, (station.MinZ + station.MaxZ) * 0.5f + 11f),
                Yaw = 270f,
                Name = "Saltmarket Precinct",
            });
            plan.Pois.Add(new Poi
            {
                Kind = PoiKind.PoliceGarage,
                Position = new Vec3(station.MinX + 16f, 0f, station.MinZ + 8f),
                Yaw = 180f,
                Name = "Precinct vehicle yard",
            });

            plan.Pois.Add(new Poi { Kind = PoiKind.PlayerStart, Position = new Vec3(doorX + 1.5f, 0f, doorZ - 1.6f), Yaw = 180f, Name = "Player start" });
            plan.Pois.Add(new Poi { Kind = PoiKind.PartnerStart, Position = new Vec3(doorX - 1.5f, 0f, doorZ - 1.6f), Yaw = 180f, Name = "Partner start" });

            var mid = plan.Blocks.Find(b => b.Use == BlockUse.MidRise);
            plan.Pois.Add(new Poi { Kind = PoiKind.Landmark, Position = new Vec3((mid.MinX + mid.MaxX) * 0.5f, 0f, (mid.MinZ + mid.MaxZ) * 0.5f), Name = "Ashcombe clock" });

            // Pedestrian destinations: sidewalk corners and plaza/park spots.
            for (int j = 0; j < plan.StreetsZ; j++)
            {
                for (int i = 0; i < plan.StreetsX; i++)
                {
                    float cx = plan.StreetX(i);
                    float cz = plan.StreetZ(j);
                    float o = plan.RoadHalfWidth + plan.SidewalkWidth * 0.5f;
                    plan.Pois.Add(new Poi { Kind = PoiKind.PedestrianSpot, Position = new Vec3(cx + o, 0f, cz + o) });
                    plan.Pois.Add(new Poi { Kind = PoiKind.PedestrianSpot, Position = new Vec3(cx - o, 0f, cz - o) });
                }
            }

            foreach (var b in plan.Blocks)
            {
                if (b.Use == BlockUse.Plaza || b.Use == BlockUse.Park)
                {
                    float cx = (b.MinX + b.MaxX) * 0.5f;
                    float cz = (b.MinZ + b.MaxZ) * 0.5f;
                    plan.Pois.Add(new Poi { Kind = PoiKind.PedestrianSpot, Position = new Vec3(cx - 12f, 0f, cz) });
                    plan.Pois.Add(new Poi { Kind = PoiKind.PedestrianSpot, Position = new Vec3(cx + 12f, 0f, cz - 8f) });
                    plan.Pois.Add(new Poi { Kind = PoiKind.Bench, Position = new Vec3(cx, 0f, cz - 14f), Yaw = 0f });
                }
            }

            // Promenade along the quay.
            for (float x = 10f; x < plan.StreetX(3) - 10f; x += 30f)
            {
                plan.Pois.Add(new Poi { Kind = PoiKind.PedestrianSpot, Position = new Vec3(x, 0f, plan.QuayEdgeZ + 5f) });
            }
        }
    }

    public static class DistrictValidator
    {
        /// <summary>Returns human-readable problems; empty means the plan is valid.</summary>
        public static List<string> Validate(DistrictPlan plan)
        {
            var problems = new List<string>();

            // 1. Road graph connectivity (all nodes reachable from node 0).
            var adj = new Dictionary<int, List<int>>();
            foreach (var n in plan.Nodes)
            {
                adj[n.Id] = new List<int>();
            }

            foreach (var e in plan.Edges)
            {
                adj[e.A].Add(e.B);
                adj[e.B].Add(e.A);
            }

            var seen = new HashSet<int>();
            var stack = new Stack<int>();
            stack.Push(0);
            while (stack.Count > 0)
            {
                int n = stack.Pop();
                if (!seen.Add(n))
                {
                    continue;
                }

                foreach (int m in adj[n])
                {
                    stack.Push(m);
                }
            }

            if (seen.Count != plan.Nodes.Count)
            {
                problems.Add($"road graph disconnected: {plan.Nodes.Count - seen.Count} unreachable nodes");
            }

            // 2. Multiple routes: every grid intersection has degree >= 2 (no single choke point).
            foreach (var n in plan.Nodes)
            {
                if (!n.IsEntryPoint && adj[n.Id].Count < 2)
                {
                    problems.Add($"intersection {n.Name} is a dead end");
                }
            }

            // 3. Buildings never intrude on carriageways and never overlap each other.
            for (int i = 0; i < plan.Buildings.Count; i++)
            {
                var b = plan.Buildings[i];
                if (b.MaxX <= b.MinX || b.MaxZ <= b.MinZ || b.Height <= 0f)
                {
                    problems.Add($"building {i} has degenerate bounds");
                }

                float cx = (b.MinX + b.MaxX) * 0.5f;
                float cz = (b.MinZ + b.MaxZ) * 0.5f;
                if (plan.IsOnRoad(cx, cz) || plan.IsOnRoad(b.MinX, b.MinZ) || plan.IsOnRoad(b.MaxX, b.MaxZ))
                {
                    problems.Add($"building {i} ({b.Name}) intrudes on a road");
                }

                for (int k = i + 1; k < plan.Buildings.Count; k++)
                {
                    var o = plan.Buildings[k];
                    bool overlap = b.MinX < o.MaxX - 0.01f && o.MinX < b.MaxX - 0.01f && b.MinZ < o.MaxZ - 0.01f && o.MinZ < b.MaxZ - 0.01f;
                    if (overlap)
                    {
                        problems.Add($"buildings {i} and {k} overlap");
                    }
                }
            }

            // 4. Required points of interest exist and are reachable from a road.
            foreach (var kind in new[] { PoiKind.Safehouse, PoiKind.SafehouseParking, PoiKind.PoliceStation, PoiKind.PoliceGarage, PoiKind.PlayerStart, PoiKind.PartnerStart })
            {
                var p = plan.Find(kind);
                if (p == null)
                {
                    problems.Add($"missing {kind}");
                    continue;
                }

                float nearestRoad = float.MaxValue;
                foreach (var e in plan.Edges)
                {
                    nearestRoad = Math.Min(nearestRoad, DistrictPlan.DistanceToSegment(p.Position.X, p.Position.Z, plan.Nodes[e.A].Position, plan.Nodes[e.B].Position));
                }

                if (nearestRoad > 30f)
                {
                    problems.Add($"{kind} is {nearestRoad:0}m from the nearest road");
                }
            }

            // 5. Responders can enter from outside the slice.
            int entries = 0;
            foreach (var n in plan.Nodes)
            {
                if (n.IsEntryPoint)
                {
                    entries++;
                }
            }

            if (entries < 2)
            {
                problems.Add("fewer than two responder entry points");
            }

            // 6. Parking slots sit on the carriageway but away from intersections.
            foreach (var s in plan.Parking)
            {
                if (!plan.IsOnRoad(s.Position.X, s.Position.Z))
                {
                    problems.Add($"parking slot at {s.Position} is off-road");
                }

                foreach (var n in plan.Nodes)
                {
                    if (Vec3.FlatDistance(n.Position, s.Position) < plan.RoadHalfWidth + 6f)
                    {
                        problems.Add($"parking slot at {s.Position} blocks intersection {n.Name}");
                    }
                }
            }

            var enterable = plan.Buildings.Find(b => b.Enterable);
            if (enterable == null)
            {
                problems.Add("safehouse building not marked enterable");
            }

            return problems;
        }
    }
}
