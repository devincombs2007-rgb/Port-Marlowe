using System;
using System.Collections.Generic;
using NUnit.Framework;
using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Save;
using PortMarlowe.Core.World;

namespace PortMarlowe.Tests.Core
{
    /// <summary>In-memory storage with fault injection at named operations.</summary>
    internal sealed class MemoryStorage : ISaveStorage
    {
        public readonly Dictionary<string, string> Files = new Dictionary<string, string>();
        public string FailOn = string.Empty;
        public int Operations;

        private void Op(string name)
        {
            Operations++;
            if (FailOn == name)
            {
                throw new System.IO.IOException("injected failure at " + name);
            }
        }

        public bool Exists(string name) => Files.ContainsKey(name);

        public string Read(string name)
        {
            Op("read:" + name);
            return Files[name];
        }

        public void Write(string name, string text)
        {
            Op("write:" + name);
            Files[name] = text;
        }

        public void Delete(string name)
        {
            Op("delete:" + name);
            Files.Remove(name);
        }

        public void Move(string from, string to)
        {
            Op("move:" + from);
            if (Files.ContainsKey(to))
            {
                throw new System.IO.IOException("destination exists");
            }

            Files[to] = Files[from];
            Files.Remove(from);
        }

        public void Copy(string from, string to)
        {
            Op("copy:" + from);
            Files[to] = Files[from];
        }

        public IEnumerable<string> List() => Files.Keys;
    }

    internal sealed class Gate : ISaveGate
    {
        public bool Open = true;
        public string Why = "police have eyes on you";

        public bool CanSave(out string reason)
        {
            reason = Open ? string.Empty : Why;
            return Open;
        }
    }

    public class JsonTests
    {
        [Test]
        public void RoundTrip_PreservesValuesAndOrder()
        {
            var o = JsonValue.NewObject();
            o.Set("b", 1.5).Set("a", "line\n\"quoted\" \\ tab\t ü").Set("t", true);
            var arr = JsonValue.NewArray();
            arr.Add(JsonValue.From(-3e-7)).Add(JsonValue.Null).Add("x");
            o.Set("arr", arr);
            string text = o.Serialize(true);
            var back = JsonValue.Parse(text);
            Assert.AreEqual(text, back.Serialize(true));
            Assert.AreEqual("line\n\"quoted\" \\ tab\t ü", back.GetString("a"));
            Assert.AreEqual(1.5, back.GetNumber("b"));
            Assert.AreEqual(-3e-7, back["arr"].Items[0].NumberValue);
            var keys = new List<string>();
            foreach (var m in back.Members)
            {
                keys.Add(m.Key);
            }

            CollectionAssert.AreEqual(new[] { "b", "a", "t", "arr" }, keys);
        }

        [Test]
        public void Parse_RejectsMalformedInput()
        {
            foreach (var bad in new[] { "", "{", "{\"a\":}", "[1,]", "{\"a\":1}x", "\"unterminated", "{\"a\":NaN}", "tru" })
            {
                Assert.IsFalse(JsonValue.TryParse(bad, out _, out string err), bad);
                Assert.IsNotNull(err);
            }
        }

        [Test]
        public void Parse_LimitsNestingDepth()
        {
            string deep = new string('[', 200) + new string(']', 200);
            Assert.IsFalse(JsonValue.TryParse(deep, out _, out _));
        }

        [Test]
        public void UnicodeEscape_Decodes()
        {
            Assert.AreEqual("é", JsonValue.Parse("\"\\u00e9\"").StringValue);
        }
    }

    public class SaveTests
    {
        private static SaveGame Sample(double simTime = 1234.5)
        {
            var g = new SaveGame
            {
                BuildId = "test",
                SavedAtUtc = "2026-10-12T18:00:00Z",
                Label = "Rhys — Tern Street",
                Reason = "manual",
                SimTime = simTime,
                Day = 2,
                TimeOfDay = 21.25,
                WorldSeed = DistrictPlanner.DefaultSeed,
                Controlled = "char.rhys",
                SwitchCount = 7,
            };
            g.Characters.Add(new CharacterRecord { Id = "char.rhys", Position = new Vec3(10.5f, 0f, 80.25f), Yaw = 90f, Cash = 420, OutfitIndex = 1, VehicleId = "veh.player", Seat = 0 });
            g.Characters.Add(new CharacterRecord { Id = "char.lena", Position = new Vec3(12f, 0f, 80f), Cash = 95, VehicleId = "veh.player", Seat = 1, PartnerOrder = 1 });
            g.Characters[0].Profile.CivilianViolence = 2;
            g.Vehicles.Add(new VehicleRecord { Id = "veh.player", Archetype = "sedan", FuelLitres = 31.5f, Body = 640f, Engine = 880f, Owner = "char.rhys", Plate = "PM 4471", PaintR = 0.2f, PaintG = 0.3f, PaintB = 0.25f });
            var c = new PoliceCase { Id = 3, Stage = ResponseStage.Pursuit, Status = CaseStatus.Cooling, TotalSeverity = 4, RecognitionEndsAt = 1400, ConfirmedSuspect = new StableId("char.rhys") };
            c.Description.ReplacePersonFrom(new Appearance(ColorFamily.Red, ColorFamily.Blue, BuildClass.Average, HeightClass.Tall, false), 0.9f);
            c.IncidentIds.Add(11);
            g.Cases.Add(CaseRecord.From(c));
            g.LedgerKeys.Add("char.rhys:fine:arrest:1");
            return g;
        }

        [Test]
        public void SaveLoad_RoundTripsWorldState()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            Assert.IsTrue(sc.Save("slot1", Sample()).Success);
            var r = sc.Load("slot1");
            Assert.IsTrue(r.Success, r.Error);
            Assert.AreEqual("main", r.Source);
            var g = r.Game;
            Assert.AreEqual("char.rhys", g.Controlled);
            Assert.AreEqual(2, g.Characters.Count);
            Assert.AreEqual(420, g.FindCharacter("char.rhys").Cash);
            Assert.AreEqual(new Vec3(10.5f, 0f, 80.25f), g.FindCharacter("char.rhys").Position);
            Assert.AreEqual(1, g.FindCharacter("char.lena").Seat);
            Assert.AreEqual(31.5f, g.FindVehicle("veh.player").FuelLitres, 1e-4f);
            Assert.AreEqual(640f, g.FindVehicle("veh.player").Body, 1e-4f);
            Assert.AreEqual(DistrictPlanner.DefaultSeed, g.WorldSeed);
            Assert.AreEqual(2, g.FindCharacter("char.rhys").Profile.CivilianViolence);
            var c = g.Cases[0].ToCase();
            Assert.AreEqual(CaseStatus.Cooling, c.Status);
            Assert.AreEqual(ColorFamily.Red, c.Description.Top);
            Assert.AreEqual(11, c.IncidentIds[0]);
            CollectionAssert.Contains(g.LedgerKeys, "char.rhys:fine:arrest:1");
        }

        [Test]
        public void SecondSave_KeepsPreviousAsBackup()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample(100));
            sc.Save("slot1", Sample(200));
            Assert.IsTrue(store.Exists(SaveCoordinator.BackupName("slot1")));
            Assert.IsFalse(store.Exists(SaveCoordinator.TempName("slot1")));
            Assert.AreEqual(200, sc.Load("slot1").Game.SimTime);
        }

        [Test]
        public void CorruptMain_RecoversFromBackup()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample(100));
            sc.Save("slot1", Sample(200));
            string main = SaveCoordinator.MainName("slot1");
            store.Files[main] = store.Files[main].Substring(0, store.Files[main].Length / 2);
            var r = sc.Load("slot1");
            Assert.IsTrue(r.Success, r.Error);
            Assert.AreEqual("bak", r.Source);
            Assert.AreEqual(100, r.Game.SimTime);
            Assert.IsNotEmpty(r.Warnings);
            // Repaired: main is valid again.
            Assert.AreEqual("main", sc.Load("slot1").Source);
        }

        [Test]
        public void CrashBetweenDeleteAndMove_RecoversFromTemp()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample(100));
            store.FailOn = "move:" + SaveCoordinator.TempName("slot1");
            var res = sc.Save("slot1", Sample(200));
            Assert.IsFalse(res.Success);
            store.FailOn = string.Empty;
            Assert.IsFalse(store.Exists(SaveCoordinator.MainName("slot1")));
            var r = sc.Load("slot1");
            Assert.IsTrue(r.Success);
            Assert.AreEqual("tmp", r.Source);
            Assert.AreEqual(200, r.Game.SimTime);
        }

        [Test]
        public void FailedTempWrite_LeavesCommittedSaveUntouched()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample(100));
            store.FailOn = "write:" + SaveCoordinator.TempName("slot1");
            Assert.IsFalse(sc.Save("slot1", Sample(200)).Success);
            store.FailOn = string.Empty;
            var r = sc.Load("slot1");
            Assert.AreEqual("main", r.Source);
            Assert.AreEqual(100, r.Game.SimTime);
        }

        [Test]
        public void InvalidSnapshot_IsRejected_NotCommitted()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample(100));
            var bad = Sample(200);
            bad.Controlled = "char.nobody";
            var res = sc.Save("slot1", bad);
            Assert.IsFalse(res.Success);
            StringAssert.Contains("controlled", res.Error);
            Assert.AreEqual(100, sc.Load("slot1").Game.SimTime);
        }

        [Test]
        public void SeatConflict_IsInvalid()
        {
            var g = Sample();
            g.Characters[1].Seat = 0;
            CollectionAssert.IsNotEmpty(g.Validate());
        }

        [Test]
        public void NewerSchema_IsRefused()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            var g = Sample();
            g.SchemaVersion = SaveSchema.CurrentVersion + 1;
            store.Files[SaveCoordinator.MainName("slot1")] = SaveCoordinator.Encode(g);
            var r = sc.Load("slot1");
            Assert.IsFalse(r.Success);
            StringAssert.Contains("newer", r.Error);
            Assert.IsTrue(store.Exists(SaveCoordinator.MainName("slot1")), "never erase a save we cannot read");
        }

        [Test]
        public void Migrator_AppliesStepsInOrder()
        {
            var m = new SaveMigrator(targetVersion: 3);
            m.Register(1, p => p.Set("addedIn2", true));
            m.Register(2, p => p.Set("addedIn3", "yes"));
            var payload = JsonValue.NewObject().Set("schemaVersion", 1);
            var outp = m.Migrate(payload, out int from);
            Assert.AreEqual(1, from);
            Assert.AreEqual(3, outp.GetInt("schemaVersion"));
            Assert.IsTrue(outp.GetBool("addedIn2"));
            Assert.AreEqual("yes", outp.GetString("addedIn3"));
            var missing = new SaveMigrator(targetVersion: 2);
            Assert.Throws<InvalidOperationException>(() => missing.Migrate(JsonValue.NewObject().Set("schemaVersion", 1), out _));
        }

        [Test]
        public void DeferredSave_CompletesAtNextSafeBoundary_WithFreshSnapshot()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            var gate = new Gate { Open = false };
            double world = 100;
            var res = sc.RequestSave("auto", () => Sample(world), gate);
            Assert.IsTrue(res.Deferred);
            Assert.IsTrue(sc.HasPending);
            Assert.IsNull(sc.Tick(gate));
            world = 150;
            gate.Open = true;
            var done = sc.Tick(gate);
            Assert.IsNotNull(done);
            Assert.IsTrue(done.Success);
            Assert.IsFalse(sc.HasPending);
            Assert.AreEqual(150, sc.Load("auto").Game.SimTime);
        }

        [Test]
        public void Inspect_ReportsLabelWithoutFullLoad()
        {
            var store = new MemoryStorage();
            var sc = new SaveCoordinator(store);
            sc.Save("slot1", Sample());
            var info = sc.Inspect("slot1");
            Assert.IsTrue(info.Valid);
            Assert.AreEqual("Rhys — Tern Street", info.Label);
            Assert.AreEqual("empty", sc.Inspect("slot2").Problem);
        }

        [Test]
        public void FileStorage_WritesUnderRootOnly()
        {
            string root = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "pm-save-test-" + Guid.NewGuid().ToString("N"));
            try
            {
                var fs = new FileSaveStorage(root);
                var sc = new SaveCoordinator(fs);
                Assert.IsTrue(sc.Save("slot1", Sample()).Success);
                Assert.IsTrue(sc.Load("slot1").Success);
                Assert.Throws<ArgumentException>(() => fs.Write("../escape.txt", "x"));
            }
            finally
            {
                if (System.IO.Directory.Exists(root))
                {
                    System.IO.Directory.Delete(root, true);
                }
            }
        }
    }

    public class DistrictTests
    {
        [Test]
        public void Saltmarket_PlanIsValid()
        {
            var plan = DistrictPlanner.CreateSaltmarket();
            var problems = DistrictValidator.Validate(plan);
            Assert.IsEmpty(problems, string.Join("\n", problems));
        }

        [Test]
        public void Plan_IsDeterministicForSeed()
        {
            var a = DistrictPlanner.CreateSaltmarket(99);
            var b = DistrictPlanner.CreateSaltmarket(99);
            Assert.AreEqual(a.Buildings.Count, b.Buildings.Count);
            for (int i = 0; i < a.Buildings.Count; i++)
            {
                Assert.AreEqual(a.Buildings[i].Height, b.Buildings[i].Height);
                Assert.AreEqual(a.Buildings[i].MinX, b.Buildings[i].MinX);
            }
        }

        [Test]
        public void Plan_HasRequiredServicesAndEntryPoints()
        {
            var plan = DistrictPlanner.CreateSaltmarket();
            Assert.IsNotNull(plan.Find(PoiKind.Safehouse));
            Assert.IsNotNull(plan.Find(PoiKind.SafehouseParking));
            Assert.IsNotNull(plan.Find(PoiKind.PoliceStation));
            int entries = 0;
            foreach (var _ in plan.FindAll(PoiKind.EntryPoint))
            {
                entries++;
            }

            Assert.GreaterOrEqual(entries, 2);
            Assert.Greater(plan.Parking.Count, 10);
            Assert.AreEqual(1, plan.Parking.FindAll(p => p.Reserved).Count);
        }

        [Test]
        public void Validator_DetectsBrokenPlans()
        {
            var plan = DistrictPlanner.CreateSaltmarket();
            plan.Pois.RemoveAll(p => p.Kind == PoiKind.Safehouse);
            plan.Buildings.Add(new BuildingPlan { MinX = -3, MaxX = 3, MinZ = 30, MaxZ = 40, Height = 10 });
            var problems = DistrictValidator.Validate(plan);
            Assert.IsTrue(problems.Exists(p => p.Contains("missing Safehouse")), string.Join("\n", problems));
            Assert.IsTrue(problems.Exists(p => p.Contains("intrudes on a road")), string.Join("\n", problems));
        }
    }
}
