using System;
using System.Collections.Generic;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Police;

namespace PortMarlowe.Core.Save
{
    /// <summary>
    /// Versioned save schema. Every field is written explicitly (no reflection). Bump
    /// <see cref="SaveSchema.CurrentVersion"/> and register a migration in <see cref="SaveMigrator"/>
    /// whenever the shape changes; never reinterpret an existing field in place.
    /// </summary>
    public static class SaveSchema
    {
        public const string Format = "PortMarloweSave";
        public const int CurrentVersion = 1;
    }

    [Serializable]
    public sealed class CharacterRecord
    {
        public string Id = string.Empty;
        public Vec3 Position;
        public float Yaw;
        public int OutfitIndex;
        public int Cash;
        public float Health = 100f;
        public int PartnerOrder;
        public string VehicleId = string.Empty;
        public int Seat = -1;
        public CriminalProfile Profile = new CriminalProfile();

        public JsonValue ToJson()
        {
            var o = JsonValue.NewObject();
            o.Set("id", Id);
            o.Set("pos", Vec(Position));
            o.Set("yaw", Yaw);
            o.Set("outfit", OutfitIndex);
            o.Set("cash", Cash);
            o.Set("health", Health);
            o.Set("partnerOrder", PartnerOrder);
            o.Set("vehicle", VehicleId);
            o.Set("seat", Seat);
            var p = JsonValue.NewObject();
            p.Set("civilianViolence", Profile.CivilianViolence);
            p.Set("vehicleCrimes", Profile.VehicleCrimes);
            p.Set("propertyDamage", Profile.PropertyDamage);
            p.Set("officerViolence", Profile.OfficerViolence);
            p.Set("evasions", Profile.Evasions);
            p.Set("arrests", Profile.Arrests);
            o.Set("profile", p);
            return o;
        }

        public static CharacterRecord FromJson(JsonValue o)
        {
            var r = new CharacterRecord
            {
                Id = o.GetString("id"),
                Position = ReadVec(o["pos"]),
                Yaw = o.GetFloat("yaw"),
                OutfitIndex = o.GetInt("outfit"),
                Cash = o.GetInt("cash"),
                Health = o.GetFloat("health", 100f),
                PartnerOrder = o.GetInt("partnerOrder"),
                VehicleId = o.GetString("vehicle"),
                Seat = o.GetInt("seat", -1),
            };
            var p = o.GetObject("profile");
            if (p != null)
            {
                r.Profile.CivilianViolence = p.GetInt("civilianViolence");
                r.Profile.VehicleCrimes = p.GetInt("vehicleCrimes");
                r.Profile.PropertyDamage = p.GetInt("propertyDamage");
                r.Profile.OfficerViolence = p.GetInt("officerViolence");
                r.Profile.Evasions = p.GetInt("evasions");
                r.Profile.Arrests = p.GetInt("arrests");
            }

            return r;
        }

        internal static JsonValue Vec(Vec3 v)
        {
            var a = JsonValue.NewArray();
            a.Add(JsonValue.From(Round(v.X)));
            a.Add(JsonValue.From(Round(v.Y)));
            a.Add(JsonValue.From(Round(v.Z)));
            return a;
        }

        internal static Vec3 ReadVec(JsonValue a)
        {
            if (a == null || a.Kind != JsonKind.Array || a.Count < 3)
            {
                return Vec3.Zero;
            }

            return new Vec3((float)a.Items[0].NumberValue, (float)a.Items[1].NumberValue, (float)a.Items[2].NumberValue);
        }

        internal static double Round(float v) => Math.Round(v, 4);
    }

    [Serializable]
    public sealed class VehicleRecord
    {
        public string Id = string.Empty;
        public string Archetype = string.Empty;
        public Vec3 Position;
        public float Yaw;
        public float FuelLitres;
        public float Body = 1000f;
        public float Engine = 1000f;
        public int Security;
        public string Owner = string.Empty;
        public bool Locked;
        public string Plate = string.Empty;
        public int ColorFamily;
        public float PaintR;
        public float PaintG;
        public float PaintB;

        public JsonValue ToJson()
        {
            var o = JsonValue.NewObject();
            o.Set("id", Id);
            o.Set("archetype", Archetype);
            o.Set("pos", CharacterRecord.Vec(Position));
            o.Set("yaw", Yaw);
            o.Set("fuel", FuelLitres);
            o.Set("body", Body);
            o.Set("engine", Engine);
            o.Set("security", Security);
            o.Set("owner", Owner);
            o.Set("locked", Locked);
            o.Set("plate", Plate);
            o.Set("color", ColorFamily);
            var paint = JsonValue.NewArray();
            paint.Add(JsonValue.From(CharacterRecord.Round(PaintR)));
            paint.Add(JsonValue.From(CharacterRecord.Round(PaintG)));
            paint.Add(JsonValue.From(CharacterRecord.Round(PaintB)));
            o.Set("paint", paint);
            return o;
        }

        public static VehicleRecord FromJson(JsonValue o)
        {
            var r = new VehicleRecord
            {
                Id = o.GetString("id"),
                Archetype = o.GetString("archetype"),
                Position = CharacterRecord.ReadVec(o["pos"]),
                Yaw = o.GetFloat("yaw"),
                FuelLitres = o.GetFloat("fuel"),
                Body = o.GetFloat("body", 1000f),
                Engine = o.GetFloat("engine", 1000f),
                Security = o.GetInt("security"),
                Owner = o.GetString("owner"),
                Locked = o.GetBool("locked"),
                Plate = o.GetString("plate"),
                ColorFamily = o.GetInt("color"),
            };
            var paint = o.GetArray("paint");
            if (paint.Count >= 3)
            {
                r.PaintR = (float)paint.Items[0].NumberValue;
                r.PaintG = (float)paint.Items[1].NumberValue;
                r.PaintB = (float)paint.Items[2].NumberValue;
            }

            return r;
        }
    }

    /// <summary>Police state worth persisting: descriptions on file (cooling cases) and their clocks.</summary>
    [Serializable]
    public sealed class CaseRecord
    {
        public int Id;
        public int Stage;
        public int Status;
        public int TotalSeverity;
        public string ConfirmedSuspect = string.Empty;
        public Vec3 LastKnown;
        public double LastKnownTime;
        public double RecognitionEndsAt;
        public double SearchEndsAt;
        public SuspectDescription Description = new SuspectDescription();
        public List<long> Incidents = new List<long>();
        public string Reason = string.Empty;

        public JsonValue ToJson()
        {
            var o = JsonValue.NewObject();
            o.Set("id", Id);
            o.Set("stage", Stage);
            o.Set("status", Status);
            o.Set("severity", TotalSeverity);
            o.Set("suspect", ConfirmedSuspect);
            o.Set("lastKnown", CharacterRecord.Vec(LastKnown));
            o.Set("lastKnownTime", LastKnownTime);
            o.Set("recognitionEndsAt", RecognitionEndsAt);
            o.Set("searchEndsAt", SearchEndsAt);
            o.Set("reason", Reason);
            var d = JsonValue.NewObject();
            d.Set("top", (int)Description.Top).Set("topC", CharacterRecord.Round(Description.TopConfidence));
            d.Set("bottom", (int)Description.Bottom).Set("bottomC", CharacterRecord.Round(Description.BottomConfidence));
            d.Set("build", (int)Description.Build).Set("buildC", CharacterRecord.Round(Description.BuildConfidence));
            d.Set("height", (int)Description.Height).Set("heightC", CharacterRecord.Round(Description.HeightConfidence));
            d.Set("headwear", Description.Headwear).Set("headwearC", CharacterRecord.Round(Description.HeadwearConfidence));
            d.Set("vehClass", Description.VehicleClass ?? string.Empty);
            d.Set("vehColor", (int)Description.VehicleColor).Set("vehC", CharacterRecord.Round(Description.VehicleConfidence));
            d.Set("plate", Description.Plate ?? string.Empty);
            o.Set("description", d);
            var inc = JsonValue.NewArray();
            foreach (long i in Incidents)
            {
                inc.Add(JsonValue.From(i));
            }

            o.Set("incidents", inc);
            return o;
        }

        public static CaseRecord FromJson(JsonValue o)
        {
            var r = new CaseRecord
            {
                Id = o.GetInt("id"),
                Stage = o.GetInt("stage"),
                Status = o.GetInt("status"),
                TotalSeverity = o.GetInt("severity"),
                ConfirmedSuspect = o.GetString("suspect"),
                LastKnown = CharacterRecord.ReadVec(o["lastKnown"]),
                LastKnownTime = o.GetNumber("lastKnownTime"),
                RecognitionEndsAt = o.GetNumber("recognitionEndsAt"),
                SearchEndsAt = o.GetNumber("searchEndsAt"),
                Reason = o.GetString("reason"),
            };
            var d = o.GetObject("description");
            if (d != null)
            {
                r.Description.Top = (ColorFamily)d.GetInt("top");
                r.Description.TopConfidence = d.GetFloat("topC");
                r.Description.Bottom = (ColorFamily)d.GetInt("bottom");
                r.Description.BottomConfidence = d.GetFloat("bottomC");
                r.Description.Build = (BuildClass)d.GetInt("build");
                r.Description.BuildConfidence = d.GetFloat("buildC");
                r.Description.Height = (HeightClass)d.GetInt("height");
                r.Description.HeightConfidence = d.GetFloat("heightC");
                r.Description.Headwear = d.GetBool("headwear");
                r.Description.HeadwearConfidence = d.GetFloat("headwearC");
                r.Description.VehicleClass = d.GetString("vehClass");
                r.Description.VehicleColor = (ColorFamily)d.GetInt("vehColor");
                r.Description.VehicleConfidence = d.GetFloat("vehC");
                r.Description.Plate = d.GetString("plate");
            }

            foreach (var i in o.GetArray("incidents").Items)
            {
                r.Incidents.Add((long)i.NumberValue);
            }

            return r;
        }

        public static CaseRecord From(PoliceCase c)
        {
            var r = new CaseRecord
            {
                Id = c.Id,
                Stage = (int)c.Stage,
                Status = (int)c.Status,
                TotalSeverity = c.TotalSeverity,
                ConfirmedSuspect = c.ConfirmedSuspect.Value ?? string.Empty,
                LastKnown = c.LastKnownPosition,
                LastKnownTime = c.LastKnownTime,
                RecognitionEndsAt = c.RecognitionEndsAt,
                SearchEndsAt = c.SearchEndsAt,
                Description = c.Description.Clone(),
                Reason = c.Reason,
            };
            r.Incidents.AddRange(c.IncidentIds);
            return r;
        }

        public PoliceCase ToCase()
        {
            var c = new PoliceCase
            {
                Id = Id,
                Stage = (ResponseStage)Stage,
                Status = (CaseStatus)Status,
                TotalSeverity = TotalSeverity,
                ConfirmedSuspect = new StableId(ConfirmedSuspect),
                LastKnownPosition = LastKnown,
                LastKnownTime = LastKnownTime,
                RecognitionEndsAt = RecognitionEndsAt,
                SearchEndsAt = SearchEndsAt,
                Description = Description.Clone(),
                Reason = Reason,
            };
            c.IncidentIds.AddRange(Incidents);
            return c;
        }
    }

    [Serializable]
    public sealed class SaveGame
    {
        public int SchemaVersion = SaveSchema.CurrentVersion;
        public string BuildId = string.Empty;
        public string SavedAtUtc = string.Empty;
        public string Label = string.Empty;
        public string Reason = string.Empty;
        public double SimTime;
        public int Day;
        public double TimeOfDay;
        public ulong WorldSeed;
        public string Controlled = string.Empty;
        public List<CharacterRecord> Characters = new List<CharacterRecord>();
        public List<VehicleRecord> Vehicles = new List<VehicleRecord>();
        public List<CaseRecord> Cases = new List<CaseRecord>();
        public List<string> LedgerKeys = new List<string>();
        public int SwitchCount;

        public CharacterRecord FindCharacter(string id) => Characters.Find(c => c.Id == id);
        public VehicleRecord FindVehicle(string id) => Vehicles.Find(v => v.Id == id);

        public JsonValue ToJson()
        {
            var o = JsonValue.NewObject();
            o.Set("schemaVersion", SchemaVersion);
            o.Set("buildId", BuildId);
            o.Set("savedAtUtc", SavedAtUtc);
            o.Set("label", Label);
            o.Set("reason", Reason);
            var w = JsonValue.NewObject();
            w.Set("simTime", SimTime);
            w.Set("day", Day);
            w.Set("timeOfDay", TimeOfDay);
            // ulong does not fit a double exactly; store as string.
            w.Set("seed", WorldSeed.ToString(System.Globalization.CultureInfo.InvariantCulture));
            o.Set("world", w);
            o.Set("controlled", Controlled);
            var chars = JsonValue.NewArray();
            foreach (var c in Characters)
            {
                chars.Add(c.ToJson());
            }

            o.Set("characters", chars);
            var vehs = JsonValue.NewArray();
            foreach (var v in Vehicles)
            {
                vehs.Add(v.ToJson());
            }

            o.Set("vehicles", vehs);
            var cases = JsonValue.NewArray();
            foreach (var c in Cases)
            {
                cases.Add(c.ToJson());
            }

            o.Set("policeCases", cases);
            var ledger = JsonValue.NewArray();
            foreach (var k in LedgerKeys)
            {
                ledger.Add(k);
            }

            o.Set("ledger", ledger);
            o.Set("switchCount", SwitchCount);
            return o;
        }

        public static SaveGame FromJson(JsonValue o)
        {
            if (o == null || o.Kind != JsonKind.Object)
            {
                throw new InvalidOperationException("Save payload must be a JSON object.");
            }

            var g = new SaveGame
            {
                SchemaVersion = o.GetInt("schemaVersion"),
                BuildId = o.GetString("buildId"),
                SavedAtUtc = o.GetString("savedAtUtc"),
                Label = o.GetString("label"),
                Reason = o.GetString("reason"),
                Controlled = o.GetString("controlled"),
                SwitchCount = o.GetInt("switchCount"),
            };
            var w = o.GetObject("world");
            if (w != null)
            {
                g.SimTime = w.GetNumber("simTime");
                g.Day = w.GetInt("day");
                g.TimeOfDay = w.GetNumber("timeOfDay", 9.5);
                ulong.TryParse(w.GetString("seed", "0"), System.Globalization.NumberStyles.Integer, System.Globalization.CultureInfo.InvariantCulture, out g.WorldSeed);
            }

            foreach (var c in o.GetArray("characters").Items)
            {
                g.Characters.Add(CharacterRecord.FromJson(c));
            }

            foreach (var v in o.GetArray("vehicles").Items)
            {
                g.Vehicles.Add(VehicleRecord.FromJson(v));
            }

            foreach (var c in o.GetArray("policeCases").Items)
            {
                g.Cases.Add(CaseRecord.FromJson(c));
            }

            foreach (var k in o.GetArray("ledger").Items)
            {
                if (k.Kind == JsonKind.String)
                {
                    g.LedgerKeys.Add(k.StringValue);
                }
            }

            return g;
        }

        /// <summary>Structural validation run after load and before applying to the world.</summary>
        public List<string> Validate()
        {
            var problems = new List<string>();
            if (SchemaVersion != SaveSchema.CurrentVersion)
            {
                problems.Add($"schema version {SchemaVersion} (expected {SaveSchema.CurrentVersion})");
            }

            if (Characters.Count == 0)
            {
                problems.Add("no characters");
            }

            if (FindCharacter(Controlled) == null)
            {
                problems.Add($"controlled character '{Controlled}' missing");
            }

            var ids = new HashSet<string>();
            foreach (var c in Characters)
            {
                if (!ids.Add(c.Id))
                {
                    problems.Add($"duplicate character {c.Id}");
                }

                if (!string.IsNullOrEmpty(c.VehicleId) && FindVehicle(c.VehicleId) == null)
                {
                    problems.Add($"{c.Id} seated in missing vehicle {c.VehicleId}");
                }
            }

            var seats = new HashSet<string>();
            foreach (var c in Characters)
            {
                if (!string.IsNullOrEmpty(c.VehicleId) && !seats.Add(c.VehicleId + "#" + c.Seat))
                {
                    problems.Add($"seat conflict {c.VehicleId}#{c.Seat}");
                }
            }

            foreach (var v in Vehicles)
            {
                if (!ids.Add(v.Id))
                {
                    problems.Add($"duplicate id {v.Id}");
                }

                if (v.FuelLitres < 0 || float.IsNaN(v.FuelLitres))
                {
                    problems.Add($"vehicle {v.Id} invalid fuel");
                }
            }

            return problems;
        }
    }
}
