using System;
using System.Globalization;
using System.IO;
using PortMarlowe.Core;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Save;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.SaveSystem
{
    /// <summary>
    /// Unity bridge to the core <see cref="SaveCoordinator"/>: captures the world into a versioned
    /// <see cref="SaveGame"/>, gates saving to safe moments (no pending police attention, no committed
    /// transitions, no switch in progress) and defers requests until the next safe boundary.
    /// Applying a save is done by the session builder (GameWorld) from the returned snapshot.
    /// </summary>
    public sealed class SaveService : ISaveGate
    {
        public const string ManualSlot = "slot1";
        public const string AutosaveSlot = "autosave";

        private readonly GameSession _s;
        private readonly SaveCoordinator _coordinator;

        public SaveService(GameSession session, string root = null)
        {
            _s = session;
            Root = root ?? Path.Combine(Application.persistentDataPath, "saves");
            _coordinator = new SaveCoordinator(new FileSaveStorage(Root), new SaveMigrator(), session.Log);
        }

        public string Root { get; }
        public bool IsWriting => _coordinator.IsWriting;
        public bool HasPending => _coordinator.HasPending;
        public SaveCoordinator Coordinator => _coordinator;

        public bool CanSave(out string reason)
        {
            reason = string.Empty;
            if (_s.Switcher != null && _s.Switcher.Busy)
            {
                reason = "switching characters";
                return false;
            }

            foreach (var p in _s.Protagonists.Values)
            {
                if (p.InCommittedAction || p.State == ProtagonistState.EnteringVehicle || p.State == ProtagonistState.ExitingVehicle)
                {
                    reason = "finish the current action";
                    return false;
                }

                if (p.State == ProtagonistState.OnFoot && !p.Motor.Grounded)
                {
                    reason = "not while falling";
                    return false;
                }

                if (p.InVehicle && p.Vehicle != null && p.Vehicle.Controller.Speed > 1f)
                {
                    reason = "stop the vehicle first";
                    return false;
                }

                var heat = HeatEvaluator.Evaluate(p.Id, p.Appearance, p.VehicleDescriptor, _s.Incidents, _s.Dispatch, _s.Now);
                if (heat.Level >= HeatLevel.Witnessed)
                {
                    reason = "police attention (" + heat.Headline.ToLowerInvariant() + ")";
                    return false;
                }
            }

            return true;
        }

        /// <summary>Save now or as soon as it becomes safe. Returns the immediate result (may be deferred).</summary>
        public SaveResult RequestSave(string slot, string reason)
        {
            var result = _coordinator.RequestSave(slot, () => Capture(reason), this);
            if (result.Deferred)
            {
                _s.Notify("Save queued: " + result.Error + ".", 3f);
            }
            else if (!result.Success)
            {
                _s.Notify("Save failed: " + result.Error, 4f);
            }

            return result;
        }

        public void Tick()
        {
            var r = _coordinator.Tick(this);
            if (r != null)
            {
                _s.Notify(r.Success ? "Saved." : "Save failed: " + r.Error, 2.5f);
            }
        }

        public LoadResult Load(string slot) => _coordinator.Load(slot);

        public SaveSlotInfo Inspect(string slot) => _coordinator.Inspect(slot);

        public SaveGame Capture(string reason)
        {
            var g = new SaveGame
            {
                BuildId = Application.version + "/" + Application.unityVersion,
                SavedAtUtc = DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture),
                Reason = reason,
                SimTime = _s.Clock.Now,
                Day = _s.Clock.Day,
                TimeOfDay = _s.Clock.TimeOfDayHours,
                WorldSeed = _s.Seed,
                Controlled = _s.Control.Controlled.Value,
                SwitchCount = _s.Control.CompletedSwitches,
            };

            var c = _s.Controlled;
            g.Label = c != null
                ? $"{c.Profile.ShortName} - Saltmarket, day {_s.Clock.Day + 1} {(int)_s.Clock.TimeOfDayHours:00}:{(int)(_s.Clock.TimeOfDayHours % 1 * 60):00}"
                : "Saltmarket";

            foreach (var p in _s.Protagonists.Values)
            {
                var pc = p.GetComponent<PartnerController>();
                var rec = new CharacterRecord
                {
                    Id = p.Id.Value,
                    Position = (p.InVehicle && p.Vehicle != null ? p.Vehicle.DoorPointWorld(p.Seat) : p.transform.position).ToCore(),
                    Yaw = p.transform.eulerAngles.y,
                    OutfitIndex = p.OutfitIndex,
                    Cash = p.Wallet.Cash,
                    Health = p.Health,
                    PartnerOrder = pc != null ? (int)pc.Order : 0,
                    VehicleId = p.InVehicle && p.Vehicle != null ? p.Vehicle.Id.Value : string.Empty,
                    Seat = p.InVehicle ? p.Seat : -1,
                };
                rec.Profile.CivilianViolence = p.Record.CivilianViolence;
                rec.Profile.VehicleCrimes = p.Record.VehicleCrimes;
                rec.Profile.PropertyDamage = p.Record.PropertyDamage;
                rec.Profile.OfficerViolence = p.Record.OfficerViolence;
                rec.Profile.Evasions = p.Record.Evasions;
                rec.Profile.Arrests = p.Record.Arrests;
                g.Characters.Add(rec);
            }

            foreach (var v in _s.Vehicles.Values)
            {
                if (v == null || !v.Persistent || v.IsPolice)
                {
                    continue;
                }

                g.Vehicles.Add(new VehicleRecord
                {
                    Id = v.Id.Value,
                    Archetype = v.Archetype,
                    Position = v.transform.position.ToCore(),
                    Yaw = v.transform.eulerAngles.y,
                    FuelLitres = v.Fuel.Litres,
                    Body = v.Condition.Body,
                    Engine = v.Condition.Engine,
                    Security = (int)v.Security,
                    Owner = v.Owner.Value ?? string.Empty,
                    Locked = v.Locked,
                    Plate = v.Plate,
                    ColorFamily = (int)v.ColorFamily,
                    PaintR = v.Paint.r,
                    PaintG = v.Paint.g,
                    PaintB = v.Paint.b,
                });
            }

            foreach (var pc in _s.Dispatch.Cases)
            {
                if (pc.IsOpen)
                {
                    g.Cases.Add(CaseRecord.From(pc));
                }
            }

            g.LedgerKeys.AddRange(_s.Ledger.Keys);
            return g;
        }
    }
}
