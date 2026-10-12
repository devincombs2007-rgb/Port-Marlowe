using System;
using System.Collections.Generic;
using PortMarlowe.Core.Crime;

namespace PortMarlowe.Core.Police
{
    /// <summary>
    /// What the player is told about police attention, from least to most urgent. Each level has
    /// its own owner and clock: witnesses (IncidentRegistry), cases/search (dispatch), recognition
    /// (case description vs current appearance), long-term history (CriminalProfile).
    /// </summary>
    public enum HeatLevel
    {
        Unseen = 0,
        /// <summary>The description is on file; currently matching it risks recognition.</summary>
        DescriptionOnFile = 1,
        /// <summary>Someone saw you and may be calling it in.</summary>
        Witnessed = 2,
        /// <summary>A report reached dispatch; units are assigned.</summary>
        Reported = 3,
        /// <summary>Units are searching an area for your description.</summary>
        Searching = 4,
        /// <summary>An officer can see you.</summary>
        Contact = 5,
    }

    public struct HeatStatus
    {
        public HeatLevel Level;
        public ResponseStage Stage;
        public string Headline;
        public string Reason;
        public int CaseId;
        public Vec3 SearchCenter;
        public float SearchRadius;
    }

    public static class HeatEvaluator
    {
        /// <summary>
        /// Evaluate the player-facing status for one protagonist. Uses ground-truth offender links only
        /// to decide which cases concern the player (feedback), never to inform police behaviour.
        /// </summary>
        public static HeatStatus Evaluate(StableId who, Appearance currentAppearance, VehicleDescriptor? currentVehicle,
            IncidentRegistry incidents, PoliceDispatchCoordinator dispatch, double now)
        {
            var status = new HeatStatus { Level = HeatLevel.Unseen, Headline = "UNSEEN", Reason = string.Empty, CaseId = -1 };

            foreach (var c in dispatch.CasesInvolving(who))
            {
                HeatLevel level;
                string headline;
                switch (c.Status)
                {
                    case CaseStatus.Contact:
                        level = HeatLevel.Contact;
                        headline = "CONTACT";
                        break;
                    case CaseStatus.Search:
                    case CaseStatus.Investigating:
                        level = HeatLevel.Searching;
                        headline = "SEARCHING";
                        break;
                    case CaseStatus.Dispatched:
                        level = HeatLevel.Reported;
                        headline = "REPORTED";
                        break;
                    case CaseStatus.Cooling:
                        float match = DescriptorMatcher.Match(c.Description, currentAppearance, currentVehicle);
                        if (match < PoliceRules.RecognitionMatchThreshold)
                        {
                            continue;
                        }

                        level = HeatLevel.DescriptionOnFile;
                        headline = "DESCRIPTION ON FILE";
                        break;
                    default:
                        continue;
                }

                if (level > status.Level || (level == status.Level && c.Stage > status.Stage))
                {
                    status.Level = level;
                    status.Stage = c.Stage;
                    status.Headline = headline;
                    status.Reason = c.Reason;
                    status.CaseId = c.Id;
                    status.SearchCenter = c.LastKnownPosition;
                    status.SearchRadius = dispatch.CurrentSearchRadius(c, now);
                }
            }

            if (status.Level < HeatLevel.Witnessed)
            {
                int pending = incidents.PendingReportsAbout(who);
                if (pending > 0)
                {
                    status.Level = HeatLevel.Witnessed;
                    status.Headline = "WITNESSED";
                    status.Reason = pending == 1 ? "Someone saw that and may call it in." : $"{pending} witnesses may call it in.";
                }
            }

            return status;
        }
    }

    /// <summary>Long-term record per protagonist (separate from active pursuit). Persisted.</summary>
    [Serializable]
    public sealed class CriminalProfile
    {
        public int CivilianViolence;
        public int VehicleCrimes;
        public int PropertyDamage;
        public int OfficerViolence;
        public int Evasions;
        public int Arrests;

        public void RecordIncident(CrimeType type)
        {
            switch (type)
            {
                case CrimeType.Assault:
                case CrimeType.HitPedestrian:
                    CivilianViolence++;
                    break;
                case CrimeType.VehicleBreakIn:
                case CrimeType.RecklessDriving:
                    VehicleCrimes++;
                    break;
                case CrimeType.PropertyDamage:
                    PropertyDamage++;
                    break;
                case CrimeType.AssaultOfficer:
                case CrimeType.ResistingArrest:
                    OfficerViolence++;
                    break;
            }
        }

        public int Total => CivilianViolence + VehicleCrimes + PropertyDamage + OfficerViolence;
    }

    /// <summary>
    /// Arrest consequence rules. Free-roam arrests continue play (no reset): fine, release at the
    /// station, recorded history. The fine is idempotent per arrest event.
    /// </summary>
    public static class ArrestRules
    {
        public static int Fine(int totalSeverity) => Math.Min(2500, 150 + totalSeverity * 120);
    }
}
