using System;
using System.Collections.Generic;
using PortMarlowe.Core.Crime;

namespace PortMarlowe.Core.Police
{
    /// <summary>
    /// Port Marlowe's original five-stage response model. Stages are driven by evidence and
    /// danger (reported/observed crimes), never by elapsed chase time alone.
    /// </summary>
    public enum ResponseStage
    {
        None = 0,
        /// <summary>Stage 1 "Callout": a patrol unit attends a reported location and canvasses.</summary>
        Callout = 1,
        /// <summary>Stage 2 "Pursuit": local units actively chase a confirmed suspect.</summary>
        Pursuit = 2,
        /// <summary>Stage 3 "Cordon": coordinated interception, roadblocks on exit routes (roadblocks planned).</summary>
        Cordon = 3,
        /// <summary>Stage 4 "Tactical": severe-threat containment units (planned content).</summary>
        Tactical = 4,
        /// <summary>Stage 5 "Citywide": exceptional mobilisation incl. air/harbor observation (planned content).</summary>
        Citywide = 5,
    }

    public enum CaseStatus
    {
        /// <summary>Report received; units assigned but not yet available (response delay).</summary>
        Dispatched = 0,
        /// <summary>Units at the reported location searching for anyone matching the description.</summary>
        Investigating = 1,
        /// <summary>An officer currently sees a person they have identified as the suspect.</summary>
        Contact = 2,
        /// <summary>Contact lost; units search around the last known position.</summary>
        Search = 3,
        /// <summary>Units stood down; the description stays on file for a recognition window.</summary>
        Cooling = 4,
        Closed = 5,
    }

    public sealed class StageRule
    {
        public ResponseStage Stage;
        public int MaxUnits;
        public double ResponseDelaySeconds;
        public float SearchRadius;
        public float SearchRadiusGrowthPerSecond;
        public double SearchDurationSeconds;
        public double InvestigateDurationSeconds;
        public string Name;
        public string PlayerDescription;
    }

    /// <summary>Initial tuning hypotheses; see Docs/Specs/Police.md for ranges.</summary>
    public static class PoliceRules
    {
        public const float ContactMatchThreshold = 0.6f;
        public const float RecognitionMatchThreshold = 0.75f;
        public const double ContactLostAfterSeconds = 4.0;
        public const double RecognitionWindowSeconds = 180.0;
        public const double CaseMergeWindowSeconds = 120.0;
        public const float CaseMergeDistance = 120f;
        public const double ArrestHoldSeconds = 1.5;
        public const float ArrestRange = 1.8f;

        private static readonly StageRule[] Rules =
        {
            new StageRule { Stage = ResponseStage.None, Name = "None", MaxUnits = 0 },
            new StageRule
            {
                Stage = ResponseStage.Callout, Name = "Callout", MaxUnits = 1, ResponseDelaySeconds = 12,
                SearchRadius = 40f, SearchRadiusGrowthPerSecond = 1.0f, SearchDurationSeconds = 40, InvestigateDurationSeconds = 45,
                PlayerDescription = "A patrol unit is attending the reported location.",
            },
            new StageRule
            {
                Stage = ResponseStage.Pursuit, Name = "Pursuit", MaxUnits = 2, ResponseDelaySeconds = 6,
                SearchRadius = 60f, SearchRadiusGrowthPerSecond = 2.0f, SearchDurationSeconds = 60, InvestigateDurationSeconds = 60,
                PlayerDescription = "Local units are pursuing.",
            },
            new StageRule
            {
                Stage = ResponseStage.Cordon, Name = "Cordon", MaxUnits = 3, ResponseDelaySeconds = 5,
                SearchRadius = 90f, SearchRadiusGrowthPerSecond = 2.5f, SearchDurationSeconds = 90, InvestigateDurationSeconds = 75,
                PlayerDescription = "Units are coordinating to intercept exit routes.",
            },
            new StageRule
            {
                Stage = ResponseStage.Tactical, Name = "Tactical", MaxUnits = 4, ResponseDelaySeconds = 5,
                SearchRadius = 120f, SearchRadiusGrowthPerSecond = 3f, SearchDurationSeconds = 120, InvestigateDurationSeconds = 90,
                PlayerDescription = "Tactical units are containing the area.",
            },
            new StageRule
            {
                Stage = ResponseStage.Citywide, Name = "Citywide", MaxUnits = 4, ResponseDelaySeconds = 4,
                SearchRadius = 160f, SearchRadiusGrowthPerSecond = 3.5f, SearchDurationSeconds = 150, InvestigateDurationSeconds = 120,
                PlayerDescription = "Citywide mobilisation.",
            },
        };

        public static StageRule For(ResponseStage stage) => Rules[(int)stage];

        public static ResponseStage StageForSeverity(int totalSeverity)
        {
            if (totalSeverity >= 9)
            {
                return ResponseStage.Tactical;
            }

            if (totalSeverity >= 6)
            {
                return ResponseStage.Cordon;
            }

            if (totalSeverity >= 3)
            {
                return ResponseStage.Pursuit;
            }

            return totalSeverity > 0 ? ResponseStage.Callout : ResponseStage.None;
        }
    }

    public sealed class PoliceCase
    {
        public int Id;
        public ResponseStage Stage;
        public CaseStatus Status;
        public SuspectDescription Description = new SuspectDescription();
        public readonly List<long> IncidentIds = new List<long>();
        public int TotalSeverity;
        public Vec3 ReportedLocation;
        public Vec3 LastKnownPosition;
        public double LastKnownTime;
        public double OpenedAt;
        public double UnitsAvailableAt;
        public double StatusChangedAt;
        public double LastSightingAt;
        public double SearchEndsAt;
        public double RecognitionEndsAt;

        /// <summary>Entity an officer has visually confirmed as the suspect. None until contact.</summary>
        public StableId ConfirmedSuspect;

        /// <summary>Plain-language reason for the current state, shown to the player.</summary>
        public string Reason = string.Empty;

        public bool IsActive => Status != CaseStatus.Cooling && Status != CaseStatus.Closed;
        public bool IsOpen => Status != CaseStatus.Closed;
    }

    /// <summary>
    /// PoliceDispatchCoordinator: turns delivered reports and officer sightings into cases, stages,
    /// unit demand and search areas. It is deterministic and engine-independent; the Unity layer
    /// reconciles physical units against <see cref="DesiredUnits"/> and feeds back sightings.
    /// Police never learn a suspect's position except through reports or sightings.
    /// </summary>
    public sealed class PoliceDispatchCoordinator
    {
        private readonly IncidentRegistry _incidents;
        private readonly EventLog _log;
        private readonly List<PoliceCase> _cases = new List<PoliceCase>();
        private int _nextCaseId = 1;

        public PoliceDispatchCoordinator(IncidentRegistry incidents, EventLog log = null)
        {
            _incidents = incidents ?? throw new ArgumentNullException(nameof(incidents));
            _log = log;
        }

        public IReadOnlyList<PoliceCase> Cases => _cases;

        public event Action<PoliceCase> CaseChanged;

        /// <summary>Highest stage among active cases.</summary>
        public ResponseStage HighestActiveStage
        {
            get
            {
                var s = ResponseStage.None;
                foreach (var c in _cases)
                {
                    if (c.IsActive && c.Stage > s)
                    {
                        s = c.Stage;
                    }
                }

                return s;
            }
        }

        public PoliceCase GetCase(int id)
        {
            foreach (var c in _cases)
            {
                if (c.Id == id)
                {
                    return c;
                }
            }

            return null;
        }

        /// <summary>Consume delivered reports from the registry and advance case timers.</summary>
        public void Tick(double now)
        {
            while (_incidents.TryDequeueDelivered(out var report))
            {
                Ingest(report, now);
            }

            foreach (var c in _cases)
            {
                AdvanceTimers(c, now);
            }
        }

        /// <summary>Units this case wants on the ground right now (0 before the response delay elapses).</summary>
        public int DesiredUnits(PoliceCase c, double now)
        {
            if (c == null || !c.IsActive || now < c.UnitsAvailableAt)
            {
                return 0;
            }

            return PoliceRules.For(c.Stage).MaxUnits;
        }

        public float CurrentSearchRadius(PoliceCase c, double now)
        {
            var rule = PoliceRules.For(c.Stage);
            double since = c.Status == CaseStatus.Search ? Math.Max(0, now - c.LastSightingAt) : 0;
            return Math.Min(rule.SearchRadius * 2.5f, rule.SearchRadius + (float)since * rule.SearchRadiusGrowthPerSecond);
        }

        /// <summary>
        /// An officer has eyes on <paramref name="entity"/>. <paramref name="matchScore"/> is the
        /// descriptor match (or 1 for a person directly seen committing a crime). Returns true if
        /// this sighting is treated as contact with the case's suspect.
        /// </summary>
        public bool ReportSighting(PoliceCase c, StableId entity, Appearance seenAppearance, float matchScore, Vec3 position, double now, bool witnessedCrime)
        {
            if (c == null || c.Status == CaseStatus.Closed)
            {
                return false;
            }

            bool alreadyConfirmed = !c.ConfirmedSuspect.IsNone && c.ConfirmedSuspect == entity;
            float threshold = c.Status == CaseStatus.Cooling ? PoliceRules.RecognitionMatchThreshold : PoliceRules.ContactMatchThreshold;
            if (!witnessedCrime && !alreadyConfirmed && matchScore < threshold)
            {
                return false;
            }

            bool wasContact = c.Status == CaseStatus.Contact;
            c.ConfirmedSuspect = entity;
            c.LastKnownPosition = position;
            c.LastKnownTime = now;
            c.LastSightingAt = now;
            // Officers now describe what they see; stale clothing details lose authority.
            c.Description.ReplacePersonFrom(seenAppearance, 0.95f);

            if (c.Stage < ResponseStage.Pursuit)
            {
                c.Stage = ResponseStage.Pursuit;
                c.UnitsAvailableAt = Math.Min(c.UnitsAvailableAt, now + PoliceRules.For(ResponseStage.Pursuit).ResponseDelaySeconds);
            }

            if (!wasContact)
            {
                SetStatus(c, CaseStatus.Contact, now,
                    witnessedCrime ? "An officer saw the crime." :
                    alreadyConfirmed ? "An officer has eyes on you." :
                    $"An officer recognised you from the description ({c.Description.Summary()}).");
            }

            return true;
        }

        /// <summary>
        /// A crime happened in direct view of an officer: creates an officer report (instant) and
        /// escalates the case the suspect is already part of.
        /// </summary>
        public PoliceCase ReportCrimeWitnessedByOfficer(Incident incident, StableId officer, Appearance offenderAppearance, VehicleDescriptor? vehicle, double now)
        {
            var desc = new SuspectDescription();
            desc.ReplacePersonFrom(offenderAppearance, 0.95f);
            if (vehicle.HasValue)
            {
                desc.VehicleClass = vehicle.Value.VehicleClass;
                desc.VehicleColor = vehicle.Value.Color;
                desc.VehicleConfidence = 0.9f;
                desc.Plate = vehicle.Value.Plate;
            }

            // Officer reports are delivered synchronously into the queue (a duplicate returns null and is
            // harmless); ingest now so contact is immediate.
            _incidents.RecordObservation(incident.Id, officer, desc, incident.Location, now, byOfficer: true);
            Tick(now);
            var c = FindCaseForIncident(incident.Id);
            if (c != null)
            {
                ReportSighting(c, incident.Offender, offenderAppearance, 1f, incident.Location, now, witnessedCrime: true);
            }

            return c;
        }

        /// <summary>Suspect detained. Closes every open case confirmed against that entity.</summary>
        public int ReportArrest(StableId suspect, double now)
        {
            int closed = 0;
            foreach (var c in _cases)
            {
                if (c.IsOpen && c.ConfirmedSuspect == suspect)
                {
                    SetStatus(c, CaseStatus.Closed, now, "Suspect detained.");
                    closed++;
                }
            }

            return closed;
        }

        /// <summary>Cases for which <paramref name="entity"/> is the confirmed suspect or the ground-truth offender.</summary>
        public IEnumerable<PoliceCase> CasesInvolving(StableId entity)
        {
            foreach (var c in _cases)
            {
                if (!c.IsOpen)
                {
                    continue;
                }

                if (c.ConfirmedSuspect == entity)
                {
                    yield return c;
                    continue;
                }

                foreach (long id in c.IncidentIds)
                {
                    var inc = _incidents.GetIncident(id);
                    if (inc != null && inc.Offender == entity)
                    {
                        yield return c;
                        break;
                    }
                }
            }
        }

        public PoliceCase FindCaseForIncident(long incidentId)
        {
            foreach (var c in _cases)
            {
                if (c.IncidentIds.Contains(incidentId))
                {
                    return c;
                }
            }

            return null;
        }

        /// <summary>Remove closed cases (bounded history). Returns removed count.</summary>
        public int PruneClosed()
        {
            return _cases.RemoveAll(c => c.Status == CaseStatus.Closed);
        }

        public void Clear()
        {
            _cases.Clear();
            _nextCaseId = 1;
        }

        /// <summary>Restore a persisted case (save/load). Ids are preserved.</summary>
        public void RestoreCase(PoliceCase c)
        {
            _cases.Add(c);
            if (c.Id >= _nextCaseId)
            {
                _nextCaseId = c.Id + 1;
            }
        }

        private void Ingest(WitnessReport report, double now)
        {
            var incident = _incidents.GetIncident(report.IncidentId);
            if (incident == null)
            {
                return;
            }

            var c = FindCaseForIncident(incident.Id) ?? FindMergeableCase(report, incident, now);
            bool created = false;
            if (c == null)
            {
                c = new PoliceCase
                {
                    Id = _nextCaseId++,
                    OpenedAt = now,
                    ReportedLocation = report.ReportedLocation,
                    LastKnownPosition = report.ReportedLocation,
                    LastKnownTime = incident.Time,
                };
                _cases.Add(c);
                created = true;
            }

            if (!c.IncidentIds.Contains(incident.Id))
            {
                c.IncidentIds.Add(incident.Id);
                c.TotalSeverity += incident.Severity;
            }

            c.Description.MergeFrom(report.Description);
            if (report.ReportedLocation.SqrMagnitude > 0f && c.Status != CaseStatus.Contact)
            {
                c.ReportedLocation = report.ReportedLocation;
                if (incident.Time >= c.LastKnownTime)
                {
                    c.LastKnownPosition = report.ReportedLocation;
                    c.LastKnownTime = incident.Time;
                }
            }

            var newStage = PoliceRules.StageForSeverity(c.TotalSeverity);
            if (c.Status == CaseStatus.Contact && newStage < ResponseStage.Pursuit)
            {
                newStage = ResponseStage.Pursuit;
            }

            bool escalated = newStage > c.Stage;
            if (escalated || created)
            {
                c.Stage = newStage > c.Stage ? newStage : c.Stage;
                double available = now + PoliceRules.For(c.Stage).ResponseDelaySeconds;
                c.UnitsAvailableAt = created ? available : Math.Min(c.UnitsAvailableAt, available);
            }

            if (created || c.Status == CaseStatus.Cooling)
            {
                SetStatus(c, CaseStatus.Dispatched, now,
                    $"{(report.ByOfficer ? "An officer" : "A witness")} reported {CrimeRules.Label(incident.Type)}. Description: {c.Description.Summary()}.");
            }
            else if (escalated)
            {
                c.Reason = $"Escalated to {PoliceRules.For(c.Stage).Name}: {CrimeRules.Label(incident.Type)} reported.";
                CaseChanged?.Invoke(c);
            }

            _log?.Record(now, LogCategory.Police, report.Witness,
                $"case #{c.Id} {(created ? "opened" : "updated")} stage={c.Stage} sev={c.TotalSeverity} desc=[{c.Description.Summary()}]");
        }

        private PoliceCase FindMergeableCase(WitnessReport report, Incident incident, double now)
        {
            PoliceCase best = null;
            foreach (var c in _cases)
            {
                if (!c.IsOpen || now - c.LastKnownTime > PoliceRules.CaseMergeWindowSeconds)
                {
                    continue;
                }

                if (Vec3.FlatDistance(c.LastKnownPosition, report.ReportedLocation) > PoliceRules.CaseMergeDistance)
                {
                    continue;
                }

                // Merge when descriptions are compatible (same top colour where both are known) or one lacks a description.
                bool compatible = !c.Description.HasPerson || !report.Description.HasPerson ||
                                  c.Description.Top == report.Description.Top ||
                                  (!string.IsNullOrEmpty(c.Description.Plate) && c.Description.Plate == report.Description.Plate);
                if (compatible && (best == null || c.LastKnownTime > best.LastKnownTime))
                {
                    best = c;
                }
            }

            return best;
        }

        private void AdvanceTimers(PoliceCase c, double now)
        {
            var rule = PoliceRules.For(c.Stage);
            switch (c.Status)
            {
                case CaseStatus.Dispatched:
                    if (now >= c.UnitsAvailableAt)
                    {
                        c.SearchEndsAt = now + rule.InvestigateDurationSeconds;
                        SetStatus(c, CaseStatus.Investigating, now, $"Police are canvassing near the reported location for: {c.Description.Summary()}.");
                    }

                    break;
                case CaseStatus.Investigating:
                    if (now >= c.SearchEndsAt)
                    {
                        c.RecognitionEndsAt = now + PoliceRules.RecognitionWindowSeconds;
                        SetStatus(c, CaseStatus.Cooling, now, "Units stood down. Your description stays on file for a while.");
                    }

                    break;
                case CaseStatus.Contact:
                    if (now - c.LastSightingAt >= PoliceRules.ContactLostAfterSeconds)
                    {
                        c.SearchEndsAt = now + rule.SearchDurationSeconds;
                        SetStatus(c, CaseStatus.Search, now, "Contact lost. Police are searching around where you were last seen.");
                    }

                    break;
                case CaseStatus.Search:
                    if (now >= c.SearchEndsAt)
                    {
                        c.RecognitionEndsAt = now + PoliceRules.RecognitionWindowSeconds;
                        SetStatus(c, CaseStatus.Cooling, now, "Search called off. Officers still have your description.");
                    }

                    break;
                case CaseStatus.Cooling:
                    if (now >= c.RecognitionEndsAt)
                    {
                        SetStatus(c, CaseStatus.Closed, now, "Case went cold.");
                    }

                    break;
            }
        }

        private void SetStatus(PoliceCase c, CaseStatus status, double now, string reason)
        {
            if (c.Status == status && c.Reason == reason)
            {
                return;
            }

            c.Status = status;
            c.StatusChangedAt = now;
            c.Reason = reason ?? string.Empty;
            _log?.Record(now, LogCategory.Police, c.ConfirmedSuspect, $"case #{c.Id} -> {status} ({PoliceRules.For(c.Stage).Name}): {c.Reason}");
            CaseChanged?.Invoke(c);
        }
    }
}
