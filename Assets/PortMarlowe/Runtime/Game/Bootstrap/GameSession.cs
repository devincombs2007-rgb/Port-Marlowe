using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Core.Control;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Economy;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Save;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Cameras;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Diagnostics;
using PortMarlowe.Game.Input;
using PortMarlowe.Game.Law;
using PortMarlowe.Game.Population;
using PortMarlowe.Game.Rendering;
using PortMarlowe.Game.Property;
using PortMarlowe.Game.SaveSystem;
using PortMarlowe.Game.Switching;
using PortMarlowe.Game.UI;
using PortMarlowe.Game.Vehicles;
using PortMarlowe.Game.World;
using UnityEngine;

namespace PortMarlowe.Game
{
    /// <summary>
    /// Per-session composition root. Holds the engine-independent authorities (clock, incidents,
    /// dispatch, seats, control, ledger) and references to the Unity adapters. Created fresh for
    /// every new game or load, so no state survives between sessions (works with domain reload
    /// disabled). Systems receive this object explicitly instead of searching the scene.
    /// </summary>
    public sealed class GameSession
    {
        public readonly WorldClock Clock = new WorldClock(9.5);
        public readonly EventLog Log = new EventLog(1024);
        public readonly IncidentRegistry Incidents;
        public readonly PoliceDispatchCoordinator Dispatch;
        public readonly SeatReservationService Seats;
        public readonly ControlOwnershipService Control;
        public readonly IdempotencyLedger Ledger = new IdempotencyLedger();
        public readonly DeterministicRandom Rng;
        public readonly ulong Seed;

        public readonly Dictionary<StableId, Protagonist> Protagonists = new Dictionary<StableId, Protagonist>();
        public readonly Dictionary<StableId, VehicleEntity> Vehicles = new Dictionary<StableId, VehicleEntity>();

        public GameInput Input;
        public MaterialLibrary Materials;
        public WorldMaterials WorldMaterials;
        public BuiltDistrict District;
        public Transform WorldRoot;
        public Transform DynamicRoot;
        public Camera MainCamera;
        public ThirdPersonCamera CameraRig;
        public Hud Hud;
        public CrimeSystem Crime;
        public PedestrianDirector Pedestrians;
        public TrafficDirector Traffic;
        public PoliceDispatcher Police;
        public SafehouseController Safehouse;
        public SwitchController Switcher;
        public SaveService Save;
        public LightingRig Lighting;
        public GameAudio Audio;
        public DiagnosticsService Diagnostics;
        public PlayerController PlayerControl;
        public RoadNetwork Roads;

        public GameSession(ulong seed)
        {
            Seed = seed;
            Rng = new DeterministicRandom(seed ^ 0xA5A5UL);
            Incidents = new IncidentRegistry(Log);
            Dispatch = new PoliceDispatchCoordinator(Incidents, Log);
            Seats = new SeatReservationService(Log);
            Control = new ControlOwnershipService(Log);
            Log.Recorded += e => Debug.Log("[PM] " + e);
        }

        public double Now => Clock.Now;

        public Protagonist Controlled =>
            !Control.Controlled.IsNone && Protagonists.TryGetValue(Control.Controlled, out var p) ? p : null;

        public Protagonist PartnerOf(Protagonist p)
        {
            foreach (var kv in Protagonists)
            {
                if (kv.Value != p)
                {
                    return kv.Value;
                }
            }

            return null;
        }

        public Protagonist Partner => Controlled != null ? PartnerOf(Controlled) : null;

        public void RegisterVehicle(VehicleEntity v)
        {
            Vehicles[v.Id] = v;
            Seats.RegisterVehicle(v.Id, v.Seats.Length);
        }

        public void UnregisterVehicle(VehicleEntity v)
        {
            Vehicles.Remove(v.Id);
            Seats.UnregisterVehicle(v.Id);
        }

        public void Notify(string text, float seconds = 3.5f)
        {
            if (Hud != null)
            {
                Hud.Toast(text, seconds);
            }

            Log.Record(Now, LogCategory.General, StableId.None, "notify: " + text);
        }

        public void OnVehicleEntered(Protagonist who, VehicleEntity v)
        {
            if (!v.Persistent && (v.IsOwnedBy(who.Id, PartnerOf(who)?.Id ?? StableId.None) || !v.IsPolice))
            {
                // Vehicles a protagonist has used persist across save/load (spec: unique vehicles).
                v.Persistent = true;
            }

            if (who.IsDriver && who.IsPlayerControlled)
            {
                VehicleFactory.AddHeadLights(v);
            }

            Log.Record(Now, LogCategory.Vehicle, who.Id, $"entered {v.Id} seat {who.Seat}");
        }

        public void OnVehicleExited(Protagonist who, VehicleEntity v)
        {
            Log.Record(Now, LogCategory.Vehicle, who.Id, $"exited {v.Id}");
        }
    }
}
