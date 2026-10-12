using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Core.World;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Population;
using PortMarlowe.Game.Vehicles;
using PortMarlowe.Game.World;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Law
{
    /// <summary>
    /// PoliceDispatchCoordinator's physical side. Reconciles patrol units against case demand
    /// (spawning only out of view at the precinct yard or off-slice entry roads), runs officer
    /// perception (sightings feed back into the coordinator), pursuit, search, challenge and arrest.
    /// Police never read a protagonist's position except through what officers can see or through
    /// the case's last-known position from reports.
    /// </summary>
    public sealed class PoliceDispatcher : MonoBehaviour
    {
        public int GlobalUnitCap = 4;
        public const float OfficerSightRange = 42f;
        public const float OfficerFov = 140f;
        public const float FootChaseSpeed = 6.2f;
        public const float ChallengeRange = 9f;

        private readonly List<PoliceUnit> _units = new List<PoliceUnit>();
        private GameSession _s;
        private RoadNetwork _roads;
        private DeterministicRandom _rng;
        private float _reconcileTimer;
        private float _perceptionTimer;
        private int _nextUnit = 1;
        private readonly List<Vector3> _entryPoints = new List<Vector3>();

        public IReadOnlyList<PoliceUnit> Units => _units;

        /// <summary>Raised when a protagonist is arrested (handled by the session flow).</summary>
        public System.Action<Protagonist, int> Arrested;

        public void Init(GameSession session, RoadNetwork roads)
        {
            _s = session;
            _roads = roads;
            _rng = new DeterministicRandom(session.Seed ^ 0xC0FFUL);
            foreach (var p in session.District.Plan.FindAll(PoiKind.EntryPoint))
            {
                _entryPoints.Add(p.Position.ToUnity());
            }
        }

        private void Update()
        {
            if (_s == null)
            {
                return;
            }

            float dt = Time.deltaTime;
            _reconcileTimer -= dt;
            if (_reconcileTimer <= 0f)
            {
                _reconcileTimer = 0.5f;
                Reconcile();
            }

            _perceptionTimer -= dt;
            if (_perceptionTimer <= 0f)
            {
                _perceptionTimer = 0.25f;
                OfficerPerception();
            }

            foreach (var u in _units)
            {
                if (!u.Destroyed)
                {
                    TickUnit(u, dt);
                }
            }

            _units.RemoveAll(u => u.Destroyed);
        }

        // ------------------------------------------------------------------ demand

        private void Reconcile()
        {
            double now = _s.Now;
            int total = 0;
            foreach (var u in _units)
            {
                if (u.State != UnitState.Leaving)
                {
                    total++;
                }
            }

            foreach (var c in _s.Dispatch.Cases)
            {
                int assigned = 0;
                foreach (var u in _units)
                {
                    if (u.CaseId == c.Id && u.State != UnitState.Leaving)
                    {
                        assigned++;
                    }
                }

                int desired = _s.Dispatch.DesiredUnits(c, now);
                while (assigned < desired && total < GlobalUnitCap)
                {
                    if (SpawnUnit(c) == null)
                    {
                        break;
                    }

                    assigned++;
                    total++;
                }

                if (assigned > desired)
                {
                    foreach (var u in _units)
                    {
                        if (assigned <= desired)
                        {
                            break;
                        }

                        if (u.CaseId == c.Id && u.State != UnitState.Leaving)
                        {
                            Release(u);
                            assigned--;
                        }
                    }
                }
            }

            // Units whose case vanished.
            foreach (var u in _units)
            {
                if (u.State != UnitState.Leaving)
                {
                    var c = _s.Dispatch.GetCase(u.CaseId);
                    if (c == null || !c.IsActive)
                    {
                        Release(u);
                    }
                }
            }
        }

        private PoliceUnit SpawnUnit(PoliceCase c)
        {
            if (!PickSpawn(c.LastKnownPosition.ToUnity(), out Vector3 pos, out float yaw))
            {
                return null;
            }

            int n = _nextUnit++;
            var carId = new StableId("veh.police." + n.ToString("00"));
            var car = VehicleFactory.CreateSedan(_s.Materials, _s.DynamicRoot, carId, pos, yaw, new Color(0.06f, 0.07f, 0.09f), ColorFamily.Black, "SPD " + (400 + n), VehicleLivery.Police);
            car.Security = VehicleSecurityLevel.High;
            car.Locked = true;
            _s.RegisterVehicle(car);
            car.gameObject.AddComponent<VehicleImpacts>().Init(_s);
            if (_s.Audio != null)
            {
                VehicleAudio.Attach(car, _s.Audio);
            }

            var driver = car.gameObject.AddComponent<VehicleAIDriver>();
            driver.Init(_roads);
            var officerId = new StableId("cop." + n.ToString("00"));
            var officer = NpcBody.Create(_s.DynamicRoot, officerId, pos, yaw, Roster.PoliceUniform(), _rng.Range(1.7f, 1.9f), _rng.Range(1.0f, 1.12f),
                Roster.SkinTones[_rng.Range(0, Roster.SkinTones.Length)], Roster.HairColors[_rng.Range(0, 3)], false, _s.Materials, true);
            _s.Seats.PlaceDirect(car.Id, 0, officerId, _s.Now);
            var unit = new PoliceUnit { CaseId = c.Id, Car = car, Driver = driver, Officer = officer, OfficerId = officerId, State = UnitState.Responding };
            unit.SetOfficerInCar(true, _s);
            car.SirenOn = c.Stage >= ResponseStage.Pursuit || c.Status == CaseStatus.Contact;
            driver.DriveTo(Goal(c), urgent: car.SirenOn);
            _units.Add(unit);
            _s.Log.Record(_s.Now, LogCategory.Police, officerId, $"unit {n} dispatched for case #{c.Id} from {pos}");
            return unit;
        }

        /// <summary>Spawn at the precinct yard or an entry road, never in view and never close to the player.</summary>
        private bool PickSpawn(Vector3 caseLocation, out Vector3 pos, out float yaw)
        {
            var candidates = new List<(Vector3 p, float yaw, float score)>();
            var yard = _s.District.PoliceGarage;
            candidates.Add((yard, 180f, Vector3.Distance(yard, caseLocation)));
            foreach (var e in _entryPoints)
            {
                // Face along the stub toward the grid intersection it connects to.
                Vector3 inward = (NearestGridNode(e) - e).Flat().normalized;
                Vector3 right = new Vector3(inward.z, 0f, -inward.x);
                Vector3 p = e + right * _roads.LaneOffset;
                candidates.Add((p, Conv.Yaw(inward), Vector3.Distance(p, caseLocation)));
            }

            candidates.Sort((a, b) => a.score.CompareTo(b.score));
            Vector3 player = _s.Controlled != null ? _s.Controlled.transform.position : Vector3.zero;
            foreach (var c in candidates)
            {
                if (Vector3.Distance(c.p, player) < 40f || IsVisible(c.p + Vector3.up))
                {
                    continue;
                }

                if (Physics.CheckBox(c.p + Vector3.up * 1f, new Vector3(1.2f, 0.8f, 2.6f), Quaternion.Euler(0f, c.yaw, 0f), GameLayers.Mask(GameLayers.Vehicle), QueryTriggerInteraction.Ignore))
                {
                    continue; // occupied
                }

                pos = c.p;
                yaw = c.yaw;
                return true;
            }

            pos = Vector3.zero;
            yaw = 0f;
            return false;
        }

        private Vector3 NearestGridNode(Vector3 p)
        {
            Vector3 best = p;
            float bestD = float.MaxValue;
            for (int i = 0; i < _roads.NodeCount; i++)
            {
                if (_roads.IsEntry(i))
                {
                    continue;
                }

                float d = Vector3.Distance(_roads.NodePosition(i), p);
                if (d < bestD)
                {
                    bestD = d;
                    best = _roads.NodePosition(i);
                }
            }

            return best;
        }

        private Vector3 Goal(PoliceCase c) => c.Status == CaseStatus.Contact || c.Status == CaseStatus.Search ? c.LastKnownPosition.ToUnity() : c.ReportedLocation.ToUnity();

        private void Release(PoliceUnit u)
        {
            if (u.State == UnitState.Leaving)
            {
                return;
            }

            u.State = UnitState.Leaving;
            u.StateTime = 0f;
            u.Car.SirenOn = false;
            if (!u.OfficerInCar)
            {
                u.OfficerState = OfficerState.ReturningToCar;
            }
        }

        // ------------------------------------------------------------------ perception

        /// <summary>A crime happened: any officer who can see the offender radios it in immediately.</summary>
        public int OnCrimeCommitted(in CrimeStimulus e)
        {
            int count = 0;
            foreach (var u in _units)
            {
                if (u.Destroyed || u.Officer == null)
                {
                    continue;
                }

                float vis = Perception.Visibility(u.Officer.Eye, u.Officer.transform.forward, e.Offender.ChestPosition, OfficerSightRange,
                    u.OfficerInCar ? 200f : OfficerFov, Vehicles.Lighting.NightFactor, e.OffenderVehicle != null ? e.OffenderVehicle : u.Car.transform);
                if (vis > 0f)
                {
                    var c = _s.Dispatch.ReportCrimeWitnessedByOfficer(e.Incident, u.OfficerId, e.Offender.Appearance, e.Offender.VehicleDescriptor, _s.Now);
                    if (c != null && u.CaseId != c.Id && u.State != UnitState.Leaving)
                    {
                        u.CaseId = c.Id;
                    }

                    count++;
                }
            }

            return count;
        }

        /// <summary>Protagonist strikes an officer within reach: always witnessed by that officer.</summary>
        public bool TryStrikeOfficer(Protagonist p, float range)
        {
            foreach (var u in _units)
            {
                if (u.Destroyed || u.OfficerInCar || u.Officer == null)
                {
                    continue;
                }

                Vector3 to = (u.Officer.transform.position - p.transform.position).Flat();
                if (to.magnitude > range || Vector3.Angle(p.transform.forward.Flat(), to) > 45f)
                {
                    continue;
                }

                var inc = _s.Incidents.CreateIncident(CrimeType.AssaultOfficer, u.Officer.transform.position.ToCore(), _s.Now, p.Id, u.OfficerId);
                p.Record.RecordIncident(CrimeType.AssaultOfficer);
                var c = _s.Dispatch.ReportCrimeWitnessedByOfficer(inc, u.OfficerId, p.Appearance, null, _s.Now);
                if (c != null && u.State != UnitState.Leaving)
                {
                    u.CaseId = c.Id;
                }

                u.Officer.Rig.SetPose(RigPose.Cower);
                return true;
            }

            return false;
        }

        private void OfficerPerception()
        {
            double now = _s.Now;
            foreach (var u in _units)
            {
                if (u.Destroyed || u.State == UnitState.Leaving)
                {
                    continue;
                }

                foreach (var p in _s.Protagonists.Values)
                {
                    Transform ignore = p.Vehicle != null ? p.Vehicle.transform : (u.OfficerInCar ? u.Car.transform : null);
                    float vis = Perception.Visibility(u.Officer.Eye, u.OfficerInCar ? u.Car.transform.forward : u.Officer.transform.forward,
                        p.ChestPosition, OfficerSightRange, u.OfficerInCar ? 200f : OfficerFov, Vehicles.Lighting.NightFactor, ignore);
                    if (vis <= 0.05f)
                    {
                        continue;
                    }

                    // Compare against every open case (recognition of described suspects).
                    foreach (var c in _s.Dispatch.Cases)
                    {
                        if (!c.IsOpen)
                        {
                            continue;
                        }

                        float match = DescriptorMatcher.Match(c.Description, p.Appearance, p.VehicleDescriptor) * Mathf.Lerp(0.85f, 1f, vis);
                        if (_s.Dispatch.ReportSighting(c, p.Id, p.Appearance, match, p.transform.position.ToCore(), now, false))
                        {
                            u.LastSawSuspect = Time.time;
                            if (u.CaseId != c.Id && c.Status == CaseStatus.Contact)
                            {
                                u.CaseId = c.Id;
                            }
                        }
                    }
                }
            }
        }

        // ------------------------------------------------------------------ unit behaviour

        private void TickUnit(PoliceUnit u, float dt)
        {
            u.StateTime += dt;
            u.OfficerTime += dt;
            var c = _s.Dispatch.GetCase(u.CaseId);
            if (u.Officer != null && u.Officer.Agent != null && u.Officer.Agent.enabled)
            {
                u.Officer.UpdatePresentation();
            }

            if (u.State == UnitState.Leaving)
            {
                TickLeaving(u);
                return;
            }

            if (c == null)
            {
                Release(u);
                return;
            }

            Protagonist suspect = null;
            if (!c.ConfirmedSuspect.IsNone)
            {
                _s.Protagonists.TryGetValue(c.ConfirmedSuspect, out suspect);
            }

            bool contact = c.Status == CaseStatus.Contact && suspect != null;
            u.Car.SirenOn = contact || c.Stage >= ResponseStage.Pursuit || c.Status == CaseStatus.Dispatched;

            if (contact)
            {
                TickContact(u, c, suspect, dt);
                return;
            }

            // No contact: drive to the goal, then search on foot around it.
            u.ChallengeIssued = false;
            u.ArrestProgress = 0f;
            Vector3 goal = Goal(c);
            if (u.OfficerInCar)
            {
                if (u.Driver.Mode != AiDriveMode.FollowRoute || Vector3.Distance(u.Driver.Destination, goal) > 20f)
                {
                    u.Driver.DriveTo(goal, urgent: true);
                }

                if (u.Driver.Arrived || Vector3.Distance(u.Car.transform.position, goal) < 14f)
                {
                    u.Driver.SafeStop();
                    if (u.Car.Controller.Speed < 0.5f)
                    {
                        u.SetOfficerInCar(false, _s);
                        u.OfficerState = OfficerState.Searching;
                        u.State = UnitState.OnScene;
                        PickSearchPoint(u, c);
                    }
                }
            }
            else if (u.OfficerState == OfficerState.Searching || u.OfficerState == OfficerState.Chasing)
            {
                u.OfficerState = OfficerState.Searching;
                if (u.Officer.Arrived || u.OfficerTime > 12f)
                {
                    PickSearchPoint(u, c);
                }
            }
            else if (u.OfficerState == OfficerState.ReturningToCar)
            {
                ReturnToCar(u);
            }
        }

        private void TickContact(PoliceUnit u, PoliceCase c, Protagonist suspect, float dt)
        {
            Vector3 sp = suspect.transform.position;
            bool suspectInVehicle = suspect.InVehicle || suspect.State == ProtagonistState.EnteringVehicle;
            float officerDist = u.OfficerInCar ? Vector3.Distance(u.Car.transform.position, sp) : Vector3.Distance(u.Officer.transform.position, sp);
            u.State = UnitState.Pursuing;

            if (suspectInVehicle && suspect.Vehicle != null)
            {
                // Vehicle pursuit: officer must be in the car.
                if (!u.OfficerInCar)
                {
                    ReturnToCar(u);
                    return;
                }

                u.Driver.Pursue(suspect.Vehicle.transform);
                return;
            }

            if (u.OfficerInCar)
            {
                if (officerDist < 28f)
                {
                    u.Driver.SafeStop();
                    if (u.Car.Controller.Speed < 1f)
                    {
                        u.SetOfficerInCar(false, _s);
                        u.OfficerState = OfficerState.Chasing;
                    }
                }
                else
                {
                    u.Driver.Pursue(suspect.transform);
                }

                return;
            }

            // On foot.
            u.OfficerState = OfficerState.Chasing;
            if (officerDist > 45f)
            {
                // Too far on foot: get back in the car and drive.
                u.OfficerState = OfficerState.ReturningToCar;
                ReturnToCar(u);
                return;
            }

            u.Officer.MoveTo(sp, officerDist < 2.5f ? 2.0f : FootChaseSpeed);
            if (officerDist < ChallengeRange && !u.ChallengeIssued)
            {
                u.ChallengeIssued = true;
                if (suspect.IsPlayerControlled)
                {
                    _s.Notify("Officer: \"Police! Stay where you are!\"  (Stand still to surrender)", 4f);
                }
            }

            float suspectSpeed = suspect.Motor.HorizontalSpeed;
            if (officerDist <= PoliceRules.ArrestRange && suspectSpeed < 1.2f)
            {
                u.ArrestProgress += dt;
                if (u.ArrestProgress >= (float)PoliceRules.ArrestHoldSeconds)
                {
                    Arrest(suspect, c);
                }
            }
            else
            {
                u.ArrestProgress = Mathf.Max(0f, u.ArrestProgress - dt);
                if (u.ChallengeIssued && !u.ResistingRecorded && suspectSpeed > 4f && officerDist < ChallengeRange)
                {
                    // Fleeing after a direct challenge is itself witnessed evidence.
                    u.ResistingRecorded = true;
                    var inc = _s.Incidents.CreateIncident(CrimeType.ResistingArrest, sp.ToCore(), _s.Now, suspect.Id, u.OfficerId);
                    suspect.Record.RecordIncident(CrimeType.ResistingArrest);
                    _s.Dispatch.ReportCrimeWitnessedByOfficer(inc, u.OfficerId, suspect.Appearance, null, _s.Now);
                }
            }
        }

        private void Arrest(Protagonist suspect, PoliceCase c)
        {
            int severity = c.TotalSeverity;
            _s.Dispatch.ReportArrest(suspect.Id, _s.Now);
            foreach (var u in _units)
            {
                if (u.CaseId == c.Id)
                {
                    Release(u);
                }
            }

            Arrested?.Invoke(suspect, severity);
        }

        private void PickSearchPoint(PoliceUnit u, PoliceCase c)
        {
            float r = _s.Dispatch.CurrentSearchRadius(c, _s.Now);
            Vector3 center = c.LastKnownPosition.ToUnity();
            for (int i = 0; i < 6; i++)
            {
                Vector3 p = center + new Vector3(_rng.Range(-r, r), 0f, _rng.Range(-r, r)) * 0.6f;
                if (NavMesh.SamplePosition(p, out var hit, 6f, NavMesh.AllAreas))
                {
                    u.SearchPoint = hit.position;
                    u.Officer.MoveTo(hit.position, _rng.Range(1.8f, 2.6f));
                    u.OfficerTime = 0f;
                    return;
                }
            }
        }

        private void ReturnToCar(PoliceUnit u)
        {
            if (u.OfficerInCar)
            {
                return;
            }

            u.OfficerState = OfficerState.ReturningToCar;
            Vector3 door = u.Car.DoorPointWorld(0);
            float d = Vector3.Distance(u.Officer.transform.position, door);
            if (d < 1.6f || (d > 40f && !IsVisible(u.Officer.Eye)))
            {
                u.SetOfficerInCar(true, _s);
            }
            else
            {
                u.Officer.MoveTo(door, 4.5f);
            }
        }

        private void TickLeaving(PoliceUnit u)
        {
            if (!u.OfficerInCar)
            {
                ReturnToCar(u);
                return;
            }

            if (u.Driver.Mode != AiDriveMode.FollowRoute)
            {
                Vector3 exit = _entryPoints.Count > 0 ? _entryPoints[0] : u.Car.transform.position;
                float best = float.MaxValue;
                foreach (var e in _entryPoints)
                {
                    float d = Vector3.Distance(e, u.Car.transform.position);
                    if (d < best)
                    {
                        best = d;
                        exit = e;
                    }
                }

                u.Driver.DriveTo(exit, urgent: false);
            }

            Vector3 player = _s.Controlled != null ? _s.Controlled.transform.position : Vector3.zero;
            bool far = Vector3.Distance(u.Car.transform.position, player) > 90f;
            if ((far && !IsVisible(u.Car.transform.position + Vector3.up)) || (u.Driver.Arrived && !IsVisible(u.Car.transform.position + Vector3.up)))
            {
                Despawn(u);
            }
        }

        private void Despawn(PoliceUnit u)
        {
            _s.Seats.Release(u.OfficerId);
            _s.UnregisterVehicle(u.Car);
            Destroy(u.Officer.gameObject);
            Destroy(u.Car.gameObject);
            u.Destroyed = true;
        }

        public void ClearAll()
        {
            foreach (var u in _units)
            {
                if (!u.Destroyed)
                {
                    Despawn(u);
                }
            }

            _units.Clear();
        }

        private bool IsVisible(Vector3 point)
        {
            var cam = _s.MainCamera;
            if (cam == null)
            {
                return false;
            }

            Vector3 vp = cam.WorldToViewportPoint(point);
            if (vp.z <= 0f || vp.x < -0.05f || vp.x > 1.05f || vp.y < -0.05f || vp.y > 1.05f)
            {
                return false;
            }

            Vector3 from = cam.transform.position;
            Vector3 to = point - from;
            return !Physics.Raycast(from, to.normalized, to.magnitude - 0.5f, GameLayers.WorldStatic, QueryTriggerInteraction.Ignore);
        }
    }
}
