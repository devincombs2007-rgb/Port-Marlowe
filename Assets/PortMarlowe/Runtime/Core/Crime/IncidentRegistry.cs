using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Crime
{
    public enum CrimeType
    {
        Assault = 0,
        VehicleBreakIn = 1,
        HitPedestrian = 2,
        RecklessDriving = 3,
        PropertyDamage = 4,
        AssaultOfficer = 5,
        ResistingArrest = 6,
    }

    public static class CrimeRules
    {
        /// <summary>Severity drives initial response stage; see PoliceRules.StageForSeverity.</summary>
        public static int Severity(CrimeType type)
        {
            switch (type)
            {
                case CrimeType.RecklessDriving: return 1;
                case CrimeType.PropertyDamage: return 1;
                case CrimeType.Assault: return 2;
                case CrimeType.VehicleBreakIn: return 2;
                case CrimeType.HitPedestrian: return 3;
                case CrimeType.ResistingArrest: return 3;
                case CrimeType.AssaultOfficer: return 4;
                default: return 1;
            }
        }

        /// <summary>Radius (m) within which the event is audible to bystanders regardless of line of sight.</summary>
        public static float AudibleRadius(CrimeType type)
        {
            switch (type)
            {
                case CrimeType.VehicleBreakIn: return 22f; // glass + alarm
                case CrimeType.HitPedestrian: return 25f;  // impact + screams
                case CrimeType.Assault: return 10f;
                case CrimeType.AssaultOfficer: return 12f;
                default: return 0f;
            }
        }

        public static string Label(CrimeType type)
        {
            switch (type)
            {
                case CrimeType.Assault: return "assault";
                case CrimeType.VehicleBreakIn: return "vehicle break-in";
                case CrimeType.HitPedestrian: return "pedestrian struck by vehicle";
                case CrimeType.RecklessDriving: return "reckless driving";
                case CrimeType.PropertyDamage: return "property damage";
                case CrimeType.AssaultOfficer: return "assault on an officer";
                case CrimeType.ResistingArrest: return "resisting arrest";
                default: return type.ToString();
            }
        }
    }

    public enum ReportState
    {
        /// <summary>Witness saw or heard something; has not started calling.</summary>
        Observed = 0,
        /// <summary>Call in progress; completes at CallEndsAt unless interrupted.</summary>
        Calling = 1,
        Delivered = 2,
        Failed = 3,
    }

    public sealed class Incident
    {
        public long Id;
        public CrimeType Type;
        public int Severity;
        public Vec3 Location;
        public double Time;
        public EntityId Victim;

        /// <summary>
        /// Ground truth offender. Police logic never reads this to locate anyone; it is used for the
        /// player's own feedback (HUD "witnessed" state), criminal-profile bookkeeping and tests.
        /// </summary>
        public EntityId Offender;

        public VehicleDescriptor? OffenderVehicle;
        public int DeliveredReports;
    }

    public sealed class WitnessReport
    {
        public long Id;
        public long IncidentId;
        public EntityId Witness;
        public bool ByOfficer;
        public SuspectDescription Description;
        public Vec3 ReportedLocation;
        public double ObservedAt;
        public double CallStartedAt;
        public double CallEndsAt;
        public ReportState State;
        public string FailReason = string.Empty;
    }

    /// <summary>
    /// IncidentRegistry: persistent record of crimes and the reports about them.
    /// Pipeline: incident → observation → (reaction/flight) → call → delivered report → dispatch.
    /// A report lives here, not on the witness object, so despawning or demoting a witness can
    /// neither delete a transmitted report nor freeze one that is already being made.
    /// </summary>
    public sealed class IncidentRegistry
    {
        /// <summary>Default call duration used when an aggregate (off-screen) witness reports.</summary>
        public const double AggregateCallSeconds = 9.0;

        /// <summary>Observed reports that never start a call expire after this long (witness decided not to call).</summary>
        public const double ObservationExpirySeconds = 90.0;

        private readonly Dictionary<long, Incident> _incidents = new Dictionary<long, Incident>();
        private readonly Dictionary<long, WitnessReport> _reports = new Dictionary<long, WitnessReport>();
        private readonly HashSet<string> _witnessIncidentKeys = new HashSet<string>(StringComparer.Ordinal);
        private readonly Queue<WitnessReport> _delivered = new Queue<WitnessReport>();
        private readonly EventLog _log;
        private long _nextIncidentId = 1;
        private long _nextReportId = 1;

        public IncidentRegistry(EventLog log = null)
        {
            _log = log;
        }

        public event Action<Incident> IncidentCreated;
        public event Action<WitnessReport> ReportDelivered;

        public IReadOnlyDictionary<long, Incident> Incidents => _incidents;
        public IReadOnlyDictionary<long, WitnessReport> Reports => _reports;

        public Incident CreateIncident(CrimeType type, Vec3 location, double time, EntityId offender, EntityId victim, VehicleDescriptor? offenderVehicle = null)
        {
            var incident = new Incident
            {
                Id = _nextIncidentId++,
                Type = type,
                Severity = CrimeRules.Severity(type),
                Location = location,
                Time = time,
                Offender = offender,
                Victim = victim,
                OffenderVehicle = offenderVehicle,
            };
            _incidents.Add(incident.Id, incident);
            _log?.Record(time, LogCategory.Crime, offender, $"incident #{incident.Id} {CrimeRules.Label(type)} at {location}");
            IncidentCreated?.Invoke(incident);
            return incident;
        }

        public Incident GetIncident(long id) => _incidents.TryGetValue(id, out var i) ? i : null;
        public WitnessReport GetReport(long id) => _reports.TryGetValue(id, out var r) ? r : null;

        /// <summary>
        /// Records that a witness perceived an incident. Each witness reports a given incident once.
        /// Officers deliver immediately (radio). Returns null for a duplicate.
        /// </summary>
        public WitnessReport RecordObservation(long incidentId, EntityId witness, SuspectDescription description, Vec3 reportedLocation, double now, bool byOfficer)
        {
            if (!_incidents.ContainsKey(incidentId))
            {
                throw new ArgumentException($"Unknown incident {incidentId}", nameof(incidentId));
            }

            string key = witness.Value + "|" + incidentId.ToString(System.Globalization.CultureInfo.InvariantCulture);
            if (!_witnessIncidentKeys.Add(key))
            {
                return null;
            }

            var report = new WitnessReport
            {
                Id = _nextReportId++,
                IncidentId = incidentId,
                Witness = witness,
                ByOfficer = byOfficer,
                Description = description ?? new SuspectDescription(),
                ReportedLocation = reportedLocation,
                ObservedAt = now,
                State = ReportState.Observed,
            };
            _reports.Add(report.Id, report);

            if (byOfficer)
            {
                report.CallStartedAt = now;
                report.CallEndsAt = now;
                Deliver(report, now);
            }

            return report;
        }

        public bool BeginCall(long reportId, double now, double durationSeconds)
        {
            if (!_reports.TryGetValue(reportId, out var r) || r.State != ReportState.Observed)
            {
                return false;
            }

            r.State = ReportState.Calling;
            r.CallStartedAt = now;
            r.CallEndsAt = now + Math.Max(0.5, durationSeconds);
            _log?.Record(now, LogCategory.Crime, r.Witness, $"calling police about incident #{r.IncidentId} (ends {r.CallEndsAt:0.0})");
            return true;
        }

        /// <summary>The witness was incapacitated, lost the phone, or was intimidated before the call completed.</summary>
        public bool FailReport(long reportId, double now, string reason)
        {
            if (!_reports.TryGetValue(reportId, out var r) || r.State == ReportState.Delivered || r.State == ReportState.Failed)
            {
                return false;
            }

            r.State = ReportState.Failed;
            r.FailReason = reason ?? string.Empty;
            _log?.Record(now, LogCategory.Crime, r.Witness, $"report #{r.Id} failed: {r.FailReason}");
            return true;
        }

        /// <summary>
        /// The witness left full simulation (despawned/demoted). Its intent persists: an observed
        /// report becomes an aggregate call so the report still reaches dispatch.
        /// </summary>
        public void OnWitnessDemoted(EntityId witness, double now)
        {
            foreach (var r in _reports.Values)
            {
                if (r.Witness == witness && r.State == ReportState.Observed)
                {
                    BeginCall(r.Id, now, AggregateCallSeconds);
                }
            }
        }

        public void Tick(double now)
        {
            List<WitnessReport> completing = null;
            foreach (var r in _reports.Values)
            {
                if (r.State == ReportState.Calling && r.CallEndsAt <= now)
                {
                    (completing ??= new List<WitnessReport>()).Add(r);
                }
                else if (r.State == ReportState.Observed && now - r.ObservedAt > ObservationExpirySeconds)
                {
                    r.State = ReportState.Failed;
                    r.FailReason = "witness chose not to call";
                }
            }

            if (completing == null)
            {
                return;
            }

            completing.Sort((a, b) => a.CallEndsAt.CompareTo(b.CallEndsAt));
            foreach (var r in completing)
            {
                Deliver(r, now);
            }
        }

        /// <summary>Delivered reports not yet consumed by dispatch, oldest first.</summary>
        public bool TryDequeueDelivered(out WitnessReport report)
        {
            if (_delivered.Count > 0)
            {
                report = _delivered.Dequeue();
                return true;
            }

            report = null;
            return false;
        }

        /// <summary>Count of reports in progress (observed or calling) about crimes committed by <paramref name="offender"/>.</summary>
        public int PendingReportsAbout(EntityId offender)
        {
            int count = 0;
            foreach (var r in _reports.Values)
            {
                if ((r.State == ReportState.Observed || r.State == ReportState.Calling) &&
                    _incidents.TryGetValue(r.IncidentId, out var inc) && inc.Offender == offender)
                {
                    count++;
                }
            }

            return count;
        }

        public IEnumerable<WitnessReport> ReportsByWitness(EntityId witness)
        {
            foreach (var r in _reports.Values)
            {
                if (r.Witness == witness)
                {
                    yield return r;
                }
            }
        }

        /// <summary>Drop resolved history older than <paramref name="maxAgeSeconds"/> to bound memory.</summary>
        public int Prune(double now, double maxAgeSeconds)
        {
            var stale = new List<long>();
            foreach (var r in _reports.Values)
            {
                if ((r.State == ReportState.Delivered || r.State == ReportState.Failed) && now - r.ObservedAt > maxAgeSeconds)
                {
                    stale.Add(r.Id);
                }
            }

            foreach (long id in stale)
            {
                var r = _reports[id];
                _reports.Remove(id);
                _witnessIncidentKeys.Remove(r.Witness.Value + "|" + r.IncidentId.ToString(System.Globalization.CultureInfo.InvariantCulture));
            }

            var staleIncidents = new List<long>();
            foreach (var i in _incidents.Values)
            {
                if (now - i.Time > maxAgeSeconds && !HasOpenReports(i.Id))
                {
                    staleIncidents.Add(i.Id);
                }
            }

            foreach (long id in staleIncidents)
            {
                _incidents.Remove(id);
            }

            return stale.Count + staleIncidents.Count;
        }

        public void Clear()
        {
            _incidents.Clear();
            _reports.Clear();
            _witnessIncidentKeys.Clear();
            _delivered.Clear();
            _nextIncidentId = 1;
            _nextReportId = 1;
        }

        private bool HasOpenReports(long incidentId)
        {
            foreach (var r in _reports.Values)
            {
                if (r.IncidentId == incidentId && (r.State == ReportState.Observed || r.State == ReportState.Calling))
                {
                    return true;
                }
            }

            return false;
        }

        private void Deliver(WitnessReport r, double now)
        {
            r.State = ReportState.Delivered;
            if (_incidents.TryGetValue(r.IncidentId, out var incident))
            {
                incident.DeliveredReports++;
            }

            _delivered.Enqueue(r);
            _log?.Record(now, LogCategory.Crime, r.Witness, $"report #{r.Id} delivered ({(r.ByOfficer ? "officer" : "civilian")}): {r.Description.Summary()}");
            ReportDelivered?.Invoke(r);
        }
    }
}
