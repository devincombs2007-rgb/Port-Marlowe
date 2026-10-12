using System.Collections.Generic;
using PortMarlowe.Core.World;
using UnityEngine;

namespace PortMarlowe.Game.World
{
    /// <summary>
    /// Lane-level routing over the district road graph (right-hand traffic). Produces waypoint lists
    /// in the correct lane for AI drivers (responders now; ambient traffic and partner driving later).
    /// </summary>
    public sealed class RoadNetwork
    {
        private readonly DistrictPlan _plan;
        private readonly List<Vector3> _nodes = new List<Vector3>();
        private readonly List<List<int>> _adj = new List<List<int>>();

        public RoadNetwork(DistrictPlan plan)
        {
            _plan = plan;
            foreach (var n in plan.Nodes)
            {
                _nodes.Add(n.Position.ToUnity());
                _adj.Add(new List<int>());
            }

            foreach (var e in plan.Edges)
            {
                _adj[e.A].Add(e.B);
                _adj[e.B].Add(e.A);
            }
        }

        public float LaneOffset => _plan.LaneOffset;
        public int NodeCount => _nodes.Count;
        public Vector3 NodePosition(int i) => _nodes[i];
        public bool IsEntry(int i) => _plan.Nodes[i].IsEntryPoint;

        public int NearestNode(Vector3 p, Vector3? preferDirection = null)
        {
            int best = -1;
            float bestScore = float.MaxValue;
            for (int i = 0; i < _nodes.Count; i++)
            {
                Vector3 to = _nodes[i] - p;
                to.y = 0f;
                float score = to.magnitude;
                if (preferDirection.HasValue && to.sqrMagnitude > 4f && Vector3.Dot(preferDirection.Value, to.normalized) < -0.2f)
                {
                    score += 60f; // behind us: strongly discouraged (avoids U-turns)
                }

                if (score < bestScore)
                {
                    bestScore = score;
                    best = i;
                }
            }

            return best;
        }

        /// <summary>A* over intersections. Returns node indices (inclusive) or an empty list.</summary>
        public List<int> FindPath(int from, int to)
        {
            var result = new List<int>();
            if (from < 0 || to < 0)
            {
                return result;
            }

            var open = new List<int> { from };
            var came = new Dictionary<int, int>();
            var g = new Dictionary<int, float> { [from] = 0f };
            var closed = new HashSet<int>();
            while (open.Count > 0)
            {
                int cur = open[0];
                float bestF = g[cur] + Vector3.Distance(_nodes[cur], _nodes[to]);
                foreach (int o in open)
                {
                    float f = g[o] + Vector3.Distance(_nodes[o], _nodes[to]);
                    if (f < bestF)
                    {
                        bestF = f;
                        cur = o;
                    }
                }

                if (cur == to)
                {
                    result.Add(cur);
                    while (came.TryGetValue(cur, out int prev))
                    {
                        cur = prev;
                        result.Add(cur);
                    }

                    result.Reverse();
                    return result;
                }

                open.Remove(cur);
                closed.Add(cur);
                foreach (int n in _adj[cur])
                {
                    if (closed.Contains(n))
                    {
                        continue;
                    }

                    float cost = g[cur] + Vector3.Distance(_nodes[cur], _nodes[n]);
                    if (!g.TryGetValue(n, out float existing) || cost < existing)
                    {
                        g[n] = cost;
                        came[n] = cur;
                        if (!open.Contains(n))
                        {
                            open.Add(n);
                        }
                    }
                }
            }

            return result;
        }

        /// <summary>
        /// Lane waypoints from <paramref name="start"/> (heading <paramref name="forward"/>) to the road
        /// point nearest <paramref name="destination"/>.
        /// </summary>
        public List<Vector3> Route(Vector3 start, Vector3 forward, Vector3 destination)
        {
            var points = new List<Vector3>();
            int a = NearestNode(start, forward.Flat().normalized);
            int b = NearestNode(destination);
            var path = FindPath(a, b);
            if (path.Count == 0)
            {
                points.Add(destination);
                return points;
            }

            float h = _plan.RoadHalfWidth;
            for (int i = 0; i < path.Count; i++)
            {
                Vector3 node = _nodes[path[i]];
                if (i + 1 < path.Count)
                {
                    Vector3 next = _nodes[path[i + 1]];
                    Vector3 dir = (next - node).Flat().normalized;
                    Vector3 right = new Vector3(dir.z, 0f, -dir.x);
                    if (i > 0 || Vector3.Distance(start, node) > h + 2f)
                    {
                        points.Add(node + right * LaneOffset * 0.6f);
                    }

                    points.Add(node + dir * (h + 1.5f) + right * LaneOffset);
                    points.Add(next - dir * (h + 1.5f) + right * LaneOffset);
                }
            }

            // Final approach: nearest point on the last road segment beside the destination.
            Vector3 last = _nodes[path[path.Count - 1]];
            Vector3 toDest = (destination - last).Flat();
            if (toDest.magnitude > h + 2f && path.Count >= 1)
            {
                int bestNeighbour = -1;
                float bestDot = 0.3f;
                foreach (int n in _adj[path[path.Count - 1]])
                {
                    float dot = Vector3.Dot((_nodes[n] - last).Flat().normalized, toDest.normalized);
                    if (dot > bestDot)
                    {
                        bestDot = dot;
                        bestNeighbour = n;
                    }
                }

                if (bestNeighbour >= 0)
                {
                    Vector3 dir = (_nodes[bestNeighbour] - last).Flat().normalized;
                    Vector3 right = new Vector3(dir.z, 0f, -dir.x);
                    float along = Mathf.Clamp(Vector3.Dot(destination - last, dir), h + 3f, Vector3.Distance(last, _nodes[bestNeighbour]) - h - 3f);
                    points.Add(last + dir * (h + 1.5f) + right * LaneOffset);
                    points.Add(last + dir * along + right * LaneOffset);
                }
            }

            for (int i = 0; i < points.Count; i++)
            {
                var p = points[i];
                p.y = 0f;
                points[i] = p;
            }

            return points;
        }
    }
}
