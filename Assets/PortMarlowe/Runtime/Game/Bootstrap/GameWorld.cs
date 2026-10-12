using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Partner;
using PortMarlowe.Core.Save;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Core.World;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Cameras;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Diagnostics;
using PortMarlowe.Game.Input;
using PortMarlowe.Game.Law;
using PortMarlowe.Game.Population;
using PortMarlowe.Game.Property;
using PortMarlowe.Game.Rendering;
using PortMarlowe.Game.SaveSystem;
using PortMarlowe.Game.Switching;
using PortMarlowe.Game.UI;
using PortMarlowe.Game.Vehicles;
using PortMarlowe.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game
{
    /// <summary>
    /// Builds one session's world and systems in a fixed order, and populates it either for a new
    /// game or from a validated save. Everything created here is parented under the session root
    /// so tearing a session down is a single destroy plus the explicit releases in
    /// <see cref="Teardown"/>.
    /// </summary>
    public static class GameWorld
    {
        public static readonly StableId PlayerCarId = new StableId("veh.player");
        public const string PlayerCarPlate = "PM 4471";
        public const int ParkedCivilianCars = 12;

        public sealed class Handles
        {
            public GameObject Root;
            public NavMeshDataInstance NavMesh;
        }

        /// <summary>World, navigation, camera, lighting, UI and systems. No protagonists yet.</summary>
        public static GameSession Build(Transform parent, ulong sessionSeed, out Handles handles)
        {
            var total = System.Diagnostics.Stopwatch.StartNew();
            handles = new Handles { Root = new GameObject("Session") };
            var root = handles.Root.transform;
            root.SetParent(parent, false);

            var s = new GameSession(sessionSeed);
            s.WorldRoot = new GameObject("World").transform;
            s.WorldRoot.SetParent(root, false);
            s.DynamicRoot = new GameObject("Dynamic").transform;
            s.DynamicRoot.SetParent(root, false);
            s.Input = new GameInput();
            s.Materials = new MaterialLibrary();
            s.Diagnostics = DiagnosticsService.Create(root, s);

            // The district layout is authored (fixed seed) so saves always refer to the same streets;
            // the session seed only drives population and incidental variation.
            var sw = System.Diagnostics.Stopwatch.StartNew();
            s.WorldMaterials = WorldMaterials.Create(s.Materials);
            var plan = DistrictPlanner.CreateSaltmarket();
            s.District = new DistrictBuilder(plan, s.WorldMaterials).Build(s.WorldRoot);
            s.Diagnostics.DistrictBuildMs = (float)sw.Elapsed.TotalMilliseconds;

            Physics.SyncTransforms();
            handles.NavMesh = NavMeshBaker.Build(s.District, out float navMs, out int navSources);
            s.Diagnostics.NavMeshBuildMs = navMs;
            s.Diagnostics.NavMeshSources = navSources;
            s.Roads = new RoadNetwork(plan);

            s.CameraRig = ThirdPersonCamera.Create(root);
            s.MainCamera = s.CameraRig.Camera;
            RenderBackends.Current.ConfigureCamera(s.MainCamera);
            s.Audio = GameAudio.Create(root);
            s.Lighting = LightingRig.Create(root, s.Clock, s.Materials, s.District);
            s.Hud = Hud.Create(root, s);
            Minimap.Create(s.Hud.CanvasRoot, s);

            s.Crime = new CrimeSystem(s);
            s.Switcher = new SwitchController(s);
            s.Save = new SaveService(s);

            var systems = new GameObject("Systems");
            systems.transform.SetParent(root, false);
            s.Pedestrians = systems.AddComponent<PedestrianDirector>();
            s.Pedestrians.Init(s);
            s.Traffic = systems.AddComponent<TrafficDirector>();
            s.Traffic.Init(s);
            s.Police = systems.AddComponent<PoliceDispatcher>();
            s.Police.Init(s, s.Roads);
            s.Safehouse = systems.AddComponent<SafehouseController>();
            s.Safehouse.Init(s);
            s.PlayerControl = systems.AddComponent<PlayerController>();
            s.PlayerControl.Init(s);

            s.Diagnostics.SessionLoadMs = (float)total.Elapsed.TotalMilliseconds;
            return s;
        }

        /// <summary>Release everything a session owns that is not a child of its root object.</summary>
        public static void Teardown(GameSession s, Handles handles)
        {
            if (s != null)
            {
                s.Police?.ClearAll();
                s.Traffic?.Clear();
                s.Pedestrians?.Clear();
                s.Input?.Dispose();
                s.Materials?.DestroyAll();
            }

            VehicleFactory.ResetShared();
            if (handles != null)
            {
                if (handles.NavMesh.valid)
                {
                    NavMesh.RemoveNavMeshData(handles.NavMesh);
                }

                if (handles.Root != null)
                {
                    Object.Destroy(handles.Root);
                }
            }

            RenderSettings.skybox = null;
            RenderSettings.sun = null;
        }

        // ----------------------------------------------------------------------------------------
        // New game
        // ----------------------------------------------------------------------------------------

        public static void PopulateNewGame(GameSession s)
        {
            var plan = s.District.Plan;
            var start = plan.Find(PoiKind.PlayerStart);
            var partnerStart = plan.Find(PoiKind.PartnerStart);
            var rhys = SpawnProtagonist(s, Roster.Rhys(), start.Position.ToUnity(), start.Yaw);
            var lena = SpawnProtagonist(s, Roster.Lena(), partnerStart.Position.ToUnity(), partnerStart.Yaw);

            var parking = plan.Find(PoiKind.SafehouseParking);
            var car = SpawnCivilianCar(s, PlayerCarId, parking.Position.ToUnity(), parking.Yaw,
                new Color(0.32f, 0.08f, 0.07f), ColorFamily.Red, PlayerCarPlate, VehicleSecurityLevel.Mid);
            car.Owner = rhys.Id;
            car.Locked = true;
            car.Persistent = true;
            car.Fuel.Litres = car.Fuel.CapacityLitres * 0.7f;

            SpawnParkedTraffic(s, new List<Vector3> { car.transform.position });
            s.Switcher.SetInitial(rhys);
            rhys.EnsureAgentOnNavMesh();
            lena.EnsureAgentOnNavMesh();
            s.Pedestrians.Populate();
            s.Log.Record(s.Now, LogCategory.General, rhys.Id, "new game started");
        }

        public static Protagonist SpawnProtagonist(GameSession s, ProtagonistProfile profile, Vector3 position, float yaw)
        {
            var p = Protagonist.Create(s, profile, SnapToNavMesh(position), yaw, s.DynamicRoot);
            s.Protagonists[p.Id] = p;
            s.Control.Register(p.Id);
            p.gameObject.AddComponent<PartnerController>().Init(s);
            return p;
        }

        public static VehicleEntity SpawnCivilianCar(GameSession s, StableId id, Vector3 position, float yaw, Color paint, ColorFamily family,
            string plate, VehicleSecurityLevel security)
        {
            var v = VehicleFactory.CreateSedan(s.Materials, s.DynamicRoot, id, position, yaw, paint, family, plate, VehicleLivery.Civilian);
            v.Security = security;
            v.Locked = security != VehicleSecurityLevel.Unlocked;
            s.RegisterVehicle(v);
            v.gameObject.AddComponent<VehicleImpacts>().Init(s);
            if (s.Audio != null)
            {
                VehicleAudio.Attach(v, s.Audio);
            }

            v.Controller.EngineRunning = false;
            v.Controller.Input = DriveInput.Parked;
            return v;
        }

        /// <summary>Non-persistent parked cars, regenerated from the session seed on every load.</summary>
        public static void SpawnParkedTraffic(GameSession s, List<Vector3> occupied)
        {
            var rng = new DeterministicRandom(s.Seed ^ 0x9A2CUL);
            var slots = new List<ParkingSlot>();
            foreach (var slot in s.District.Plan.Parking)
            {
                if (slot.Tag != "safehouse")
                {
                    slots.Add(slot);
                }
            }

            int spawned = 0;
            for (int i = 0; i < slots.Count * 2 && spawned < ParkedCivilianCars && slots.Count > 0; i++)
            {
                var slot = slots[rng.Range(0, slots.Count)];
                Vector3 pos = slot.Position.ToUnity();
                if (IsNear(pos, occupied, 6f))
                {
                    continue;
                }

                occupied.Add(pos);
                var paint = VehicleFactory.CivilianPaints[rng.Range(0, VehicleFactory.CivilianPaints.Length)];
                var id = new StableId("veh.parked." + spawned.ToString("00"));
                SpawnCivilianCar(s, id, pos, slot.Yaw, paint.color, paint.family, VehicleFactory.RandomPlate(rng), VehicleFactory.RandomSecurity(rng));
                spawned++;
            }
        }

        private static bool IsNear(Vector3 p, List<Vector3> others, float distance)
        {
            foreach (var o in others)
            {
                if ((o - p).sqrMagnitude < distance * distance)
                {
                    return true;
                }
            }

            return false;
        }

        public static Vector3 SnapToNavMesh(Vector3 p)
        {
            return NavMesh.SamplePosition(p + Vector3.up * 0.5f, out var hit, 4f, NavMesh.AllAreas) ? hit.position : p;
        }

        // ----------------------------------------------------------------------------------------
        // Load
        // ----------------------------------------------------------------------------------------

        /// <summary>Recreate the saved state. The save was validated by the coordinator before this call.</summary>
        public static void ApplySave(GameSession s, SaveGame g)
        {
            s.Clock.Restore(g.SimTime, g.Day, g.TimeOfDay);
            s.Ledger.Restore(g.LedgerKeys);

            var occupied = new List<Vector3>();
            foreach (var r in g.Vehicles)
            {
                var paint = new Color(r.PaintR, r.PaintG, r.PaintB);
                var v = SpawnCivilianCar(s, new StableId(r.Id), r.Position.ToUnity(), r.Yaw, paint, (ColorFamily)r.ColorFamily, r.Plate, (VehicleSecurityLevel)r.Security);
                v.Owner = string.IsNullOrEmpty(r.Owner) ? StableId.None : new StableId(r.Owner);
                v.Locked = r.Locked;
                v.Persistent = true;
                v.Fuel.Litres = Mathf.Clamp(r.FuelLitres, 0f, v.Fuel.CapacityLitres);
                v.Condition.Body = Mathf.Clamp(r.Body, 0f, VehicleCondition.MaxHealth);
                v.Condition.Engine = Mathf.Clamp(r.Engine, 0f, VehicleCondition.MaxHealth);
                occupied.Add(v.transform.position);
            }

            // Older saves or a lost vehicle: the owned car always exists.
            if (!s.Vehicles.ContainsKey(PlayerCarId))
            {
                var parking = s.District.Plan.Find(PoiKind.SafehouseParking);
                var car = SpawnCivilianCar(s, PlayerCarId, parking.Position.ToUnity(), parking.Yaw,
                    new Color(0.32f, 0.08f, 0.07f), ColorFamily.Red, PlayerCarPlate, VehicleSecurityLevel.Mid);
                car.Owner = Roster.RhysId;
                car.Persistent = true;
                occupied.Add(car.transform.position);
            }

            SpawnParkedTraffic(s, occupied);

            foreach (var profile in new[] { Roster.Rhys(), Roster.Lena() })
            {
                var rec = g.FindCharacter(profile.Id.Value);
                Vector3 pos = rec != null ? rec.Position.ToUnity() : s.District.Plan.Find(PoiKind.PlayerStart).Position.ToUnity();
                var p = SpawnProtagonist(s, profile, pos, rec?.Yaw ?? 0f);
                if (rec == null)
                {
                    continue;
                }

                p.SetOutfit(Mathf.Clamp(rec.OutfitIndex, 0, profile.Outfits.Length - 1));
                p.Wallet.RestoreCash(rec.Cash);
                p.Health = Mathf.Clamp(rec.Health, 1f, 100f);
                p.Record.CivilianViolence = rec.Profile.CivilianViolence;
                p.Record.VehicleCrimes = rec.Profile.VehicleCrimes;
                p.Record.PropertyDamage = rec.Profile.PropertyDamage;
                p.Record.OfficerViolence = rec.Profile.OfficerViolence;
                p.Record.Evasions = rec.Profile.Evasions;
                p.Record.Arrests = rec.Profile.Arrests;
                p.GetComponent<PartnerController>().Order = rec.PartnerOrder == (int)PartnerOrder.Hold ? PartnerOrder.Hold : PartnerOrder.Follow;

                if (!string.IsNullOrEmpty(rec.VehicleId) && s.Vehicles.TryGetValue(new StableId(rec.VehicleId), out var v) &&
                    rec.Seat >= 0 && rec.Seat < v.Seats.Length &&
                    s.Seats.PlaceDirect(v.Id, rec.Seat, p.Id, s.Now) == SeatResult.Ok)
                {
                    p.PlaceInSeat(v, rec.Seat);
                    s.OnVehicleEntered(p, v);
                }
                else
                {
                    p.EnsureAgentOnNavMesh();
                }
            }

            foreach (var c in g.Cases)
            {
                s.Dispatch.RestoreCase(c.ToCase());
            }

            var controlled = !string.IsNullOrEmpty(g.Controlled) && s.Protagonists.TryGetValue(new StableId(g.Controlled), out var cp)
                ? cp
                : s.Protagonists[Roster.RhysId];
            s.Switcher.SetInitial(controlled);
            s.Pedestrians.Populate();
            s.Log.Record(s.Now, LogCategory.General, controlled.Id, "save applied");
        }
    }
}
