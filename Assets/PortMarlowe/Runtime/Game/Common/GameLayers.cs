using PortMarlowe.Core;
using UnityEngine;

namespace PortMarlowe.Game
{
    /// <summary>
    /// Physics layer allocation. Indices are fixed so code does not depend on TagManager names;
    /// the editor setup also writes matching names for readability in the editor.
    /// </summary>
    public static class GameLayers
    {
        public const int Default = 0;
        public const int Ground = 8;
        public const int Building = 9;
        public const int Vehicle = 10;
        public const int Protagonist = 11;
        public const int PedestrianSolid = 12;
        public const int PedestrianHit = 13;
        public const int Interactable = 14;
        public const int Prop = 15;
        public const int Water = 16;

        public static readonly string[] Names =
        {
            null, null, null, null, null, null, null, null,
            "PM_Ground", "PM_Building", "PM_Vehicle", "PM_Protagonist", "PM_PedestrianSolid",
            "PM_PedestrianHit", "PM_Interactable", "PM_Prop", "PM_Water",
        };

        public static int Mask(params int[] layers)
        {
            int m = 0;
            foreach (int l in layers)
            {
                m |= 1 << l;
            }

            return m;
        }

        /// <summary>Static world geometry for camera collision and line-of-sight.</summary>
        public static readonly int WorldStatic = Mask(Default, Ground, Building, Prop);

        /// <summary>What blocks a person's line of sight (vehicles too).</summary>
        public static readonly int SightBlockers = Mask(Default, Ground, Building, Vehicle, Prop);

        /// <summary>Camera collision: walls, ground and vehicles, but not people or tiny props.</summary>
        public static readonly int CameraBlockers = Mask(Default, Ground, Building, Vehicle);

        /// <summary>Geometry the navigation mesh is built from.</summary>
        public static readonly int NavGeometry = Mask(Default, Ground, Building, Prop);

        /// <summary>Apply the layer collision matrix at runtime (does not rely on ProjectSettings).</summary>
        public static void ConfigureCollisionMatrix()
        {
            // Pedestrian solid bodies block people on foot but never vehicles (cars use hit triggers instead).
            Physics.IgnoreLayerCollision(PedestrianSolid, Vehicle, true);
            Physics.IgnoreLayerCollision(PedestrianSolid, PedestrianSolid, true);
            Physics.IgnoreLayerCollision(PedestrianHit, PedestrianHit, true);
            Physics.IgnoreLayerCollision(PedestrianHit, PedestrianSolid, true);
            Physics.IgnoreLayerCollision(PedestrianHit, Protagonist, true);
            Physics.IgnoreLayerCollision(PedestrianHit, Ground, true);
            Physics.IgnoreLayerCollision(PedestrianHit, Building, true);
            Physics.IgnoreLayerCollision(Interactable, Vehicle, true);
            Physics.IgnoreLayerCollision(Interactable, Protagonist, true);
            Physics.IgnoreLayerCollision(Interactable, PedestrianSolid, true);
            Physics.IgnoreLayerCollision(Interactable, PedestrianHit, true);
        }

        public static void SetLayerRecursively(GameObject go, int layer)
        {
            go.layer = layer;
            foreach (Transform child in go.transform)
            {
                SetLayerRecursively(child.gameObject, layer);
            }
        }
    }

    public static class Conv
    {
        public static Vector3 ToUnity(this Vec3 v) => new Vector3(v.X, v.Y, v.Z);
        public static Vec3 ToCore(this Vector3 v) => new Vec3(v.x, v.y, v.z);

        /// <summary>Yaw in degrees from a direction on the XZ plane.</summary>
        public static float Yaw(Vector3 forward) => Mathf.Atan2(forward.x, forward.z) * Mathf.Rad2Deg;

        public static Vector3 Flat(this Vector3 v) => new Vector3(v.x, 0f, v.z);
    }
}
