using System.Collections.Generic;
using PortMarlowe.Game.Characters;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.World
{
    /// <summary>
    /// Builds the humanoid navigation mesh at load from the district's physics colliders using the
    /// engine's runtime NavMeshBuilder (no package dependency). Roads are a costlier area and marked
    /// crossings a cheap one, so pedestrians prefer sidewalks and cross at crosswalks. Build time is
    /// measured and logged for the performance budget.
    /// </summary>
    public static class NavMeshBaker
    {
        public static NavMeshDataInstance Build(BuiltDistrict district, out float milliseconds, out int sourceCount)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var settings = NavMesh.GetSettingsByID(0);
            settings.agentRadius = 0.3f;
            settings.agentHeight = 1.8f;
            settings.agentClimb = 0.4f;
            settings.agentSlope = 45f;
            settings.overrideVoxelSize = true;
            settings.voxelSize = 0.12f;
            settings.overrideTileSize = true;
            settings.tileSize = 128;

            var markups = new List<NavMeshBuildMarkup>
            {
                new NavMeshBuildMarkup { root = district.Roads, overrideArea = true, area = NavAreas.Road },
                new NavMeshBuildMarkup { root = district.Buildings, overrideArea = true, area = NavAreas.NotWalkable },
            };
            foreach (var t in district.NavIgnore)
            {
                markups.Add(new NavMeshBuildMarkup { root = t, ignoreFromBuild = true });
            }

            var sources = new List<NavMeshBuildSource>();
            NavMeshBuilder.CollectSources(district.NavBounds, GameLayers.NavGeometry, NavMeshCollectGeometry.PhysicsColliders, NavAreas.Walkable, markups, sources);

            // Crosswalk preference volumes.
            foreach (Transform zone in district.Crosswalks)
            {
                sources.Add(new NavMeshBuildSource
                {
                    shape = NavMeshBuildSourceShape.ModifierBox,
                    transform = zone.localToWorldMatrix,
                    size = Vector3.one,
                    area = NavAreas.Crosswalk,
                });
            }

            NavMesh.SetAreaCost(NavAreas.Road, 3f);
            NavMesh.SetAreaCost(NavAreas.Crosswalk, 1.1f);
            var data = NavMeshBuilder.BuildNavMeshData(settings, sources, district.NavBounds, Vector3.zero, Quaternion.identity);
            var instance = NavMesh.AddNavMeshData(data);
            sw.Stop();
            milliseconds = (float)sw.Elapsed.TotalMilliseconds;
            sourceCount = sources.Count;
            Debug.Log($"[PM] NavMesh built from {sources.Count} sources in {milliseconds:0} ms");
            return instance;
        }
    }
}
