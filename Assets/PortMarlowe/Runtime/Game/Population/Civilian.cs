using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Game.Characters;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Population
{
    public enum CivilianState
    {
        Wander = 0,
        Idle = 1,
        Alarmed = 2,
        Flee = 3,
        Calling = 4,
        Cower = 5,
        Knocked = 6,
    }

    /// <summary>A crime event as perceived by the world (position, type, who did it, how loud).</summary>
    public struct CrimeStimulus
    {
        public Incident Incident;
        public Protagonist Offender;
        public Vector3 Position;
        public float AudibleRadius;
        public Transform OffenderVehicle;
    }

    /// <summary>
    /// Civilian pedestrian: schedule-lite wandering between district points, and a fear/report
    /// response to crimes it actually perceives (sight or sound, delayed reaction, flight, phone call).
    /// Reports are owned by the IncidentRegistry, so they survive this object being despawned.
    /// </summary>
    public sealed class Civilian : MonoBehaviour
    {
        private GameSession _s;
        private NpcBody _body;
        private DeterministicRandom _rng;
        private float _thinkTimer;
        private float _stateTimer;
        private Vector3 _threat;
        private long _pendingReportId = -1;
        private bool _willReport;
        private float _bravery;
        private float _calmUntil;

        public CivilianState State { get; private set; } = CivilianState.Wander;
        public NpcBody Body => _body;
        public bool IsCritical => State == CivilianState.Calling || State == CivilianState.Knocked;

        public void Init(GameSession session, NpcBody body, ulong seed)
        {
            _s = session;
            _body = body;
            _rng = new DeterministicRandom(seed);
            _bravery = _rng.NextFloat();
            _thinkTimer = _rng.Range(0f, 0.2f);
            PickDestination();
        }

        private void Update()
        {
            if (_s == null)
            {
                return;
            }

            float dt = Time.deltaTime;
            _stateTimer += dt;
            _thinkTimer -= dt;
            _body.UpdatePresentation();
            if (_thinkTimer > 0f)
            {
                return;
            }

            // Decisions at ~5 Hz, staggered by the random initial offset.
            _thinkTimer = 0.2f;
            Think();
        }

        private void Think()
        {
            switch (State)
            {
                case CivilianState.Wander:
                    if (_body.Arrived)
                    {
                        Enter(CivilianState.Idle);
                        _body.Halt();
                    }

                    break;
                case CivilianState.Idle:
                    if (_stateTimer > _rng.Range(2f, 8f))
                    {
                        PickDestination();
                        Enter(CivilianState.Wander);
                    }

                    break;
                case CivilianState.Alarmed:
                    if (_stateTimer >= _rng.Range(0.3f, 0.9f))
                    {
                        StartFleeing();
                    }

                    break;
                case CivilianState.Flee:
                {
                    float away = Vector3.Distance(transform.position, _threat);
                    if ((away > 18f && _stateTimer > 3f) || _stateTimer > 8f || _body.Arrived)
                    {
                        if (_willReport && _pendingReportId >= 0)
                        {
                            if (_s.Incidents.BeginCall(_pendingReportId, _s.Now, _rng.Range(6f, 10f)))
                            {
                                Enter(CivilianState.Calling);
                                _body.Halt();
                                FaceAwayFromThreat();
                                break;
                            }
                        }

                        _calmUntil = Time.time + 20f;
                        PickDestination();
                        Enter(CivilianState.Wander);
                    }

                    break;
                }

                case CivilianState.Calling:
                {
                    var r = _s.Incidents.GetReport(_pendingReportId);
                    if (r == null || r.State == ReportState.Delivered || r.State == ReportState.Failed)
                    {
                        _pendingReportId = -1;
                        _calmUntil = Time.time + 25f;
                        PickDestination();
                        Enter(CivilianState.Wander);
                    }

                    break;
                }

                case CivilianState.Cower:
                    if (_stateTimer > 6f)
                    {
                        StartFleeing();
                    }

                    break;
                case CivilianState.Knocked:
                    if (_stateTimer > 9f)
                    {
                        _body.Incapacitated = false;
                        _body.Agent.enabled = true;
                        StartFleeing();
                    }

                    break;
            }

            ApplyPose();
        }

        private void ApplyPose()
        {
            switch (State)
            {
                case CivilianState.Calling: _body.Rig.SetPose(Characters.RigPose.Phone); break;
                case CivilianState.Cower: _body.Rig.SetPose(Characters.RigPose.Cower); break;
                case CivilianState.Knocked: _body.Rig.SetPose(Characters.RigPose.Knocked); break;
                default: _body.Rig.SetPose(Characters.RigPose.Locomotion); break;
            }
        }

        /// <summary>
        /// Perception of a crime event. Returns true if this civilian noticed it. Sound alone gives a
        /// location but a poor description; sight gives a description with distance-based confidence.
        /// </summary>
        public bool Perceive(in CrimeStimulus e)
        {
            if (State == CivilianState.Knocked || e.Offender == null)
            {
                return false;
            }

            if (e.Incident.Victim == _body.Id)
            {
                return false; // the victim is handled by Knockdown
            }

            Vector3 eye = _body.Eye;
            float distance = Vector3.Distance(eye, e.Position);
            float night = Vehicles.Lighting.NightFactor;
            Transform ignore = e.OffenderVehicle;
            float vis = Perception.Visibility(eye, transform.forward, e.Offender.ChestPosition, 40f, 150f, night, ignore);
            bool heard = distance <= e.AudibleRadius;
            if (vis <= 0f && !heard)
            {
                return false;
            }

            var desc = vis > 0f
                ? ObservationModel.Observe(e.Offender.Appearance, e.Offender.VehicleDescriptor, distance, vis, night > 0.5f, false, _rng)
                : new SuspectDescription();
            var report = _s.Incidents.RecordObservation(e.Incident.Id, _body.Id, desc, e.Position.ToCore(), _s.Now, false);
            if (report == null)
            {
                return false;
            }

            _pendingReportId = report.Id;
            // Bravery and evidence quality decide whether this person calls it in.
            float chance = vis > 0f ? 0.55f + 0.3f * vis : 0.3f;
            if (Time.time < _calmUntil)
            {
                chance *= 0.7f;
            }

            _willReport = _rng.NextFloat() < chance;
            _threat = e.Position;
            if (State != CivilianState.Calling)
            {
                Enter(distance < 6f && _bravery < 0.35f ? CivilianState.Cower : CivilianState.Alarmed);
                _body.Halt();
            }

            return true;
        }

        /// <summary>Struck by a protagonist or a vehicle.</summary>
        public void Knockdown(Vector3 from)
        {
            if (State == CivilianState.Calling && _pendingReportId >= 0)
            {
                _s.Incidents.FailReport(_pendingReportId, _s.Now, "witness knocked down mid-call");
                _pendingReportId = -1;
            }

            _threat = from;
            _willReport = true;
            _body.Incapacitated = true;
            _body.Halt();
            _body.Agent.enabled = false;
            Enter(CivilianState.Knocked);
            ApplyPose();
        }

        /// <summary>The victim reports their own assault once they recover (reported to dispatch like a witness).</summary>
        public void RecordAsVictim(Incident incident, Protagonist offender)
        {
            var desc = ObservationModel.Observe(offender.Appearance, offender.VehicleDescriptor, 1.5f, 1f, Vehicles.Lighting.NightFactor > 0.5f, false, _rng);
            var report = _s.Incidents.RecordObservation(incident.Id, _body.Id, desc, transform.position.ToCore(), _s.Now, false);
            if (report != null)
            {
                _pendingReportId = report.Id;
                _willReport = _rng.NextFloat() < 0.8f;
            }
        }

        /// <summary>Leaving full simulation: any report intent becomes an aggregate call (spec 4.2).</summary>
        public void OnDemoted()
        {
            if (_pendingReportId >= 0 && _willReport)
            {
                _s.Incidents.OnWitnessDemoted(_body.Id, _s.Now);
            }
        }

        private void StartFleeing()
        {
            Vector3 away = (transform.position - _threat).Flat();
            if (away.sqrMagnitude < 0.01f)
            {
                away = transform.forward;
            }

            away = Quaternion.Euler(0f, _rng.Range(-35f, 35f), 0f) * away.normalized;
            Vector3 goal = transform.position + away * _rng.Range(25f, 40f);
            if (NavMesh.SamplePosition(goal, out var hit, 10f, NavMesh.AllAreas))
            {
                _body.MoveTo(hit.position, _rng.Range(4.2f, 5.6f));
            }

            Enter(CivilianState.Flee);
        }

        private void FaceAwayFromThreat()
        {
            Vector3 away = (transform.position - _threat).Flat();
            if (away.sqrMagnitude > 0.01f)
            {
                transform.rotation = Quaternion.LookRotation(away.normalized);
            }
        }

        private void PickDestination()
        {
            var spots = _s.Pedestrians.Destinations;
            if (spots.Count == 0)
            {
                return;
            }

            for (int attempt = 0; attempt < 4; attempt++)
            {
                var p = spots[_rng.Range(0, spots.Count)];
                if (Vector3.Distance(p, transform.position) > 12f || attempt == 3)
                {
                    _body.MoveTo(p, _rng.Range(1.15f, 1.6f));
                    return;
                }
            }
        }

        private void Enter(CivilianState s)
        {
            State = s;
            _stateTimer = 0f;
        }
    }
}
