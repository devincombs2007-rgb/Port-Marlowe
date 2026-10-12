using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Rendering;
using PortMarlowe.Game.World;
using UnityEngine;
using UnityEngine.Rendering;

namespace PortMarlowe.Game.Vehicles
{
    public enum VehicleLivery
    {
        Civilian = 0,
        Police = 1,
    }

    /// <summary>
    /// PLACEHOLDER vehicle construction: a procedurally modelled four-door sedan ("Aldine Courier",
    /// fictional) with WheelCollider physics, opening front doors, seat anchors and emissive lights.
    /// The production path swaps the mesh for a licensed, LOD'd vehicle model behind the same
    /// VehicleEntity/VehicleController contract.
    /// </summary>
    public static class VehicleFactory
    {
        public const float Length = 4.6f;
        public const float Width = 1.82f;

        private static Material _glass;
        private static Material _trim;
        private static Material _tyre;
        private static Material _rim;
        private static Material _interior;

        public static VehicleEntity CreateSedan(MaterialLibrary lib, Transform parent, StableId id, Vector3 position, float yaw,
            Color paint, ColorFamily family, string plate, VehicleLivery livery)
        {
            EnsureShared(lib);
            var root = new GameObject("Vehicle_" + id.Value);
            root.transform.SetParent(parent, false);
            root.transform.SetPositionAndRotation(position + Vector3.up * 0.05f, Quaternion.Euler(0f, yaw, 0f));
            root.layer = GameLayers.Vehicle;

            var paintMat = lib.Lit("Paint_" + id.Value, paint, 0.82f, 0.35f);
            var secondary = livery == VehicleLivery.Police ? lib.Lit("PaintB_" + id.Value, new Color(0.9f, 0.9f, 0.88f), 0.8f, 0.2f) : paintMat;
            var head = lib.LitEmissive("Head_" + id.Value, new Color(0.9f, 0.9f, 0.85f), null, null, Color.black, 0.9f, Vector2.one);
            var brake = lib.LitEmissive("Brake_" + id.Value, new Color(0.45f, 0.04f, 0.03f), null, null, Color.black, 0.85f, Vector2.one);

            // ---- Body mesh (vehicle-local space).
            var mb = new MeshBuilder();
            float L = Length * 0.5f;
            float W = Width * 0.5f;
            mb.Box(paintMat, new Vector3(-W, 0.34f, -L), new Vector3(W, 0.86f, L), 1f, true);
            mb.Box(paintMat, new Vector3(-W + 0.02f, 0.86f, 0.9f), new Vector3(W - 0.02f, 0.94f, L - 0.05f), 1f); // hood crown
            mb.Box(paintMat, new Vector3(-W + 0.02f, 0.86f, -L + 0.05f), new Vector3(W - 0.02f, 0.97f, -1.35f), 1f); // boot lid
            mb.Box(_glass, new Vector3(-W + 0.1f, 0.86f, -1.3f), new Vector3(W - 0.1f, 1.36f, 0.85f), 1f); // greenhouse
            mb.Box(secondary == paintMat ? paintMat : _trim, new Vector3(-W + 0.14f, 1.36f, -1.1f), new Vector3(W - 0.14f, 1.42f, 0.62f), 1f); // roof
            mb.Box(_trim, new Vector3(-W - 0.02f, 0.3f, L - 0.12f), new Vector3(W + 0.02f, 0.52f, L + 0.04f), 1f); // front bumper
            mb.Box(_trim, new Vector3(-W - 0.02f, 0.3f, -L - 0.04f), new Vector3(W + 0.02f, 0.52f, -L + 0.12f), 1f); // rear bumper
            mb.Box(_trim, new Vector3(-W - 0.04f, 0.34f, -L + 0.4f), new Vector3(-W + 0.01f, 0.42f, L - 0.4f), 1f); // side skirts
            mb.Box(_trim, new Vector3(W - 0.01f, 0.34f, -L + 0.4f), new Vector3(W + 0.04f, 0.42f, L - 0.4f), 1f);
            mb.Box(head, new Vector3(-W + 0.12f, 0.66f, L - 0.02f), new Vector3(-W + 0.5f, 0.78f, L + 0.01f), 1f);
            mb.Box(head, new Vector3(W - 0.5f, 0.66f, L - 0.02f), new Vector3(W - 0.12f, 0.78f, L + 0.01f), 1f);
            mb.Box(brake, new Vector3(-W + 0.1f, 0.7f, -L - 0.01f), new Vector3(-W + 0.48f, 0.82f, -L + 0.02f), 1f);
            mb.Box(brake, new Vector3(W - 0.48f, 0.7f, -L - 0.01f), new Vector3(W - 0.1f, 0.82f, -L + 0.02f), 1f);
            mb.Box(_trim, new Vector3(-0.32f, 0.38f, L + 0.02f), new Vector3(0.32f, 0.5f, L + 0.05f), 1f); // grille / plate
            mb.Box(_trim, new Vector3(-W - 0.12f, 0.98f, 0.62f), new Vector3(-W, 1.06f, 0.74f), 1f); // mirrors
            mb.Box(_trim, new Vector3(W, 0.98f, 0.62f), new Vector3(W + 0.12f, 1.06f, 0.74f), 1f);
            mb.Box(_interior, new Vector3(-W + 0.15f, 0.55f, -0.4f), new Vector3(-0.08f, 0.62f, 0.4f), 1f); // seats (visible through glass)
            mb.Box(_interior, new Vector3(0.08f, 0.55f, -0.4f), new Vector3(W - 0.15f, 0.62f, 0.4f), 1f);
            mb.Box(_interior, new Vector3(-W + 0.15f, 0.55f, -1.2f), new Vector3(W - 0.15f, 0.62f, -0.55f), 1f);
            mb.Box(_interior, new Vector3(-W + 0.15f, 0.62f, -0.05f), new Vector3(-0.08f, 1.15f, 0.05f), 1f);
            mb.Box(_interior, new Vector3(0.08f, 0.62f, -0.05f), new Vector3(W - 0.15f, 1.15f, 0.05f), 1f);
            // Wheel arches.
            foreach (float z in new[] { 1.42f, -1.42f })
            {
                mb.Box(_tyre, new Vector3(-W - 0.005f, 0.32f, z - 0.42f), new Vector3(-W + 0.12f, 0.8f, z + 0.42f), 1f);
                mb.Box(_tyre, new Vector3(W - 0.12f, 0.32f, z - 0.42f), new Vector3(W + 0.005f, 0.8f, z + 0.42f), 1f);
            }

            Material beaconA = null;
            Material beaconB = null;
            if (livery == VehicleLivery.Police)
            {
                beaconA = lib.LitEmissive("BeaconA_" + id.Value, new Color(0.5f, 0.05f, 0.05f), null, null, Color.black, 0.9f, Vector2.one);
                beaconB = lib.LitEmissive("BeaconB_" + id.Value, new Color(0.05f, 0.1f, 0.5f), null, null, Color.black, 0.9f, Vector2.one);
                mb.Box(_trim, new Vector3(-0.62f, 1.42f, -0.18f), new Vector3(0.62f, 1.47f, 0.08f), 1f);
                mb.Box(beaconA, new Vector3(-0.6f, 1.47f, -0.16f), new Vector3(-0.04f, 1.56f, 0.06f), 1f);
                mb.Box(beaconB, new Vector3(0.04f, 1.47f, -0.16f), new Vector3(0.6f, 1.56f, 0.06f), 1f);
                mb.Box(_trim, new Vector3(-0.55f, 0.3f, L + 0.04f), new Vector3(0.55f, 0.75f, L + 0.14f), 1f); // push bar
                // White door panels livery.
                mb.Box(secondary, new Vector3(-W - 0.012f, 0.45f, -1.15f), new Vector3(-W - 0.002f, 0.84f, 0.95f), 1f);
                mb.Box(secondary, new Vector3(W + 0.002f, 0.45f, -1.15f), new Vector3(W + 0.012f, 0.84f, 0.95f), 1f);
            }

            var body = mb.Emit("Body", root.transform, GameLayers.Vehicle);
            body.isStatic = false;

            // ---- Colliders.
            AddBox(root.transform, new Vector3(0f, 0.62f, 0f), new Vector3(Width, 0.56f, Length));
            AddBox(root.transform, new Vector3(0f, 1.12f, -0.22f), new Vector3(Width - 0.22f, 0.5f, 2.1f));

            // ---- Opening front doors (visual panels hinged at the A-pillar).
            var doors = new Transform[4];
            for (int s = 0; s < 2; s++)
            {
                float side = s == 0 ? -1f : 1f;
                var hinge = new GameObject(s == 0 ? "DoorHingeL" : "DoorHingeR").transform;
                hinge.SetParent(root.transform, false);
                hinge.localPosition = new Vector3(side * (W + 0.015f), 0f, 0.92f);
                var dmb = new MeshBuilder();
                float x0 = side < 0 ? -0.04f : 0f;
                float x1 = side < 0 ? 0f : 0.04f;
                dmb.Box(livery == VehicleLivery.Police ? secondary : paintMat, new Vector3(x0, 0.4f, -1.05f), new Vector3(x1, 0.86f, -0.02f), 1f);
                dmb.Box(_glass, new Vector3(x0 * 0.5f, 0.86f, -1.0f), new Vector3(x1 * 0.5f, 1.3f, -0.12f), 1f);
                var dgo = dmb.Emit("DoorPanel", hinge, GameLayers.Vehicle);
                dgo.isStatic = false;
                doors[s] = hinge;
            }

            // ---- Wheels.
            var wheels = new WheelCollider[4];
            var visuals = new Transform[4];
            var handling = new HandlingData();
            Vector3[] wheelPos =
            {
                new Vector3(-W + 0.12f, 0.42f, 1.42f), new Vector3(W - 0.12f, 0.42f, 1.42f),
                new Vector3(-W + 0.12f, 0.42f, -1.42f), new Vector3(W - 0.12f, 0.42f, -1.42f),
            };
            for (int i = 0; i < 4; i++)
            {
                var wgo = new GameObject("Wheel" + i);
                wgo.layer = GameLayers.Vehicle;
                wgo.transform.SetParent(root.transform, false);
                wgo.transform.localPosition = wheelPos[i];
                wheels[i] = wgo.AddComponent<WheelCollider>();

                var vis = new GameObject("WheelVisual" + i).transform;
                vis.SetParent(root.transform, false);
                var holder = new GameObject("Mesh").transform;
                holder.SetParent(vis, false);
                holder.localRotation = Quaternion.Euler(0f, 0f, 90f);
                var wm = new MeshBuilder();
                wm.Cylinder(_tyre, new Vector3(0f, -0.11f, 0f), handling.WheelRadius, 0.22f, 16);
                wm.Cylinder(_rim, new Vector3(0f, 0.112f, 0f), handling.WheelRadius * 0.62f, 0.006f, 12);
                var wmo = wm.Emit("Tyre", holder, GameLayers.Vehicle);
                wmo.isStatic = false;
                // Mirror the right-hand wheels so the rim faces outward.
                if (i % 2 == 1)
                {
                    holder.localRotation = Quaternion.Euler(0f, 0f, -90f);
                }

                visuals[i] = vis;
            }

            // ---- Seats and door standing points (left-hand drive: driver on -X).
            var seats = new Transform[4];
            Vector3[] seatPos = { new Vector3(-0.42f, 0.1f, 0.0f), new Vector3(0.42f, 0.1f, 0.0f), new Vector3(-0.42f, 0.1f, -0.85f), new Vector3(0.42f, 0.1f, -0.85f) };
            for (int i = 0; i < 4; i++)
            {
                var st = new GameObject("Seat" + i).transform;
                st.SetParent(root.transform, false);
                st.localPosition = seatPos[i];
                seats[i] = st;
            }

            var rb = root.AddComponent<Rigidbody>();
            rb.centerOfMass = new Vector3(0f, 0.38f, 0.1f);
            var controller = root.AddComponent<VehicleController>();
            controller.Handling = handling;
            controller.Initialise(wheels, visuals);

            var entity = root.AddComponent<VehicleEntity>();
            entity.Id = id;
            entity.Plate = plate;
            entity.ColorFamily = family;
            entity.Paint = paint;
            entity.Seats = seats;
            entity.DoorPointsLocal = new[]
            {
                new Vector3(-W - 0.75f, 0f, 0.35f), new Vector3(W + 0.75f, 0f, 0.35f),
                new Vector3(-W - 0.75f, 0f, -0.75f), new Vector3(W + 0.75f, 0f, -0.75f),
            };
            entity.DoorPanels = doors;
            entity.Controller = controller;
            entity.HeadLightMaterial = head;
            entity.BrakeLightMaterial = brake;
            entity.IsPolice = livery == VehicleLivery.Police;
            entity.BeaconMaterialA = beaconA;
            entity.BeaconMaterialB = beaconB;
            entity.ModelName = livery == VehicleLivery.Police ? "Aldine Courier Patrol" : "Aldine Courier";

            // Headlight spots only for vehicles that will actually drive (player/police); parked civilians skip them.
            if (livery == VehicleLivery.Police)
            {
                entity.HeadLights = new[] { AddHeadLight(root.transform, -0.6f), AddHeadLight(root.transform, 0.6f) };
            }

            return entity;
        }

        public static void AddHeadLights(VehicleEntity v)
        {
            if (v.HeadLights == null || v.HeadLights.Length == 0)
            {
                v.HeadLights = new[] { AddHeadLight(v.transform, -0.6f), AddHeadLight(v.transform, 0.6f) };
            }
        }

        private static Light AddHeadLight(Transform root, float x)
        {
            var go = new GameObject("HeadLight");
            go.transform.SetParent(root, false);
            go.transform.localPosition = new Vector3(x, 0.72f, Length * 0.5f + 0.05f);
            go.transform.localRotation = Quaternion.Euler(8f, 0f, 0f);
            var l = go.AddComponent<Light>();
            l.type = LightType.Spot;
            l.range = 32f;
            l.spotAngle = 62f;
            l.innerSpotAngle = 30f;
            l.intensity = 3.2f;
            l.color = new Color(1f, 0.95f, 0.86f);
            l.shadows = LightShadows.None;
            l.enabled = false;
            return l;
        }

        private static void AddBox(Transform parent, Vector3 center, Vector3 size)
        {
            var go = new GameObject("Collider");
            go.layer = GameLayers.Vehicle;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = center;
            var bc = go.AddComponent<BoxCollider>();
            bc.size = size;
        }

        private static void EnsureShared(MaterialLibrary lib)
        {
            if (_glass != null)
            {
                return;
            }

            _glass = lib.Lit("VehicleGlass", new Color(0.06f, 0.08f, 0.1f), 0.95f, 0.1f);
            _trim = lib.Lit("VehicleTrim", new Color(0.05f, 0.05f, 0.055f), 0.35f, 0.1f);
            _tyre = lib.Lit("Tyre", new Color(0.04f, 0.04f, 0.04f), 0.15f, 0f);
            _rim = lib.Lit("Rim", new Color(0.7f, 0.71f, 0.72f), 0.75f, 0.9f);
            _interior = lib.Lit("VehicleInterior", new Color(0.12f, 0.11f, 0.1f), 0.2f, 0f);
        }

        /// <summary>Forget cached shared materials (new session / domain reload disabled).</summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        public static void ResetShared()
        {
            _glass = null;
            _trim = null;
            _tyre = null;
            _rim = null;
            _interior = null;
        }

        public static readonly (Color color, ColorFamily family)[] CivilianPaints =
        {
            (new Color(0.62f, 0.63f, 0.64f), ColorFamily.Grey),
            (new Color(0.08f, 0.08f, 0.09f), ColorFamily.Black),
            (new Color(0.86f, 0.86f, 0.84f), ColorFamily.White),
            (new Color(0.5f, 0.08f, 0.08f), ColorFamily.Red),
            (new Color(0.13f, 0.22f, 0.42f), ColorFamily.Blue),
            (new Color(0.66f, 0.58f, 0.42f), ColorFamily.Tan),
            (new Color(0.18f, 0.3f, 0.22f), ColorFamily.Green),
            (new Color(0.36f, 0.37f, 0.4f), ColorFamily.Grey),
        };

        public static string RandomPlate(DeterministicRandom rng)
        {
            const string letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
            return $"{letters[rng.Range(0, letters.Length)]}{letters[rng.Range(0, letters.Length)]} {rng.Range(1000, 9999)}";
        }

        public static VehicleSecurityLevel RandomSecurity(DeterministicRandom rng) =>
            rng.Chance(0.78f) ? VehicleSecurityLevel.Low : VehicleSecurityLevel.Mid;
    }
}
