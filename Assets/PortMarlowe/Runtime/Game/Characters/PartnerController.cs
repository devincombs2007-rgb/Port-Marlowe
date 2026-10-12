using PortMarlowe.Core.Partner;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Vehicles;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Characters
{
    /// <summary>
    /// AI control of the non-player protagonist. Decisions come from the core <see cref="PartnerBrain"/>
    /// (priority order and hysteresis) at 4 Hz; execution uses the same motor as the player, with
    /// NavMesh paths for routing and escalating stuck recovery (never teleporting in view).
    /// </summary>
    [RequireComponent(typeof(Protagonist))]
    public sealed class PartnerController : MonoBehaviour
    {
        public PartnerOrder Order = PartnerOrder.Follow;

        private GameSession _s;
        private Protagonist _self;
        private readonly PartnerBrain _brain = new PartnerBrain();
        private readonly ProgressMonitor _progress = new ProgressMonitor();
        private PartnerDecision _decision;
        private float _thinkTimer;
        private float _repathTimer;
        private Vector3 _holdPoint;
        private Vector3 _currentGoal;
        private float _lastRegroupNotice;

        public PartnerDecision Decision => _decision;
        public string StatusText { get; private set; } = string.Empty;

        public void Init(GameSession session)
        {
            _s = session;
            _self = GetComponent<Protagonist>();
            _holdPoint = transform.position;
        }

        /// <summary>Called when this character has just been handed to AI by a switch.</summary>
        public void OnBecameAi()
        {
            _brain.Reset();
            _progress.Reset(_s.Now);
            _holdPoint = transform.position;
            _thinkTimer = 0f;
            _self.EnsureAgentOnNavMesh();
        }

        private void Update()
        {
            if (_s == null || _self.IsPlayerControlled)
            {
                return;
            }

            var leader = _s.Controlled;
            if (leader == null || leader == _self)
            {
                return;
            }

            _thinkTimer -= Time.deltaTime;
            if (_thinkTimer <= 0f)
            {
                _thinkTimer = 0.25f;
                Think(leader);
            }

            Execute(leader);
        }

        private void Think(Protagonist leader)
        {
            if (Order == PartnerOrder.Hold && _decision.Behavior != PartnerBehavior.HoldPosition)
            {
                _holdPoint = transform.position;
            }

            var lv = leader.Vehicle;
            bool leaderInVehicle = leader.InVehicle || leader.State == ProtagonistState.EnteringVehicle;
            var leaderVehicle = leader.InVehicle ? lv : (leader.Transition != null ? leader.Transition.Vehicle : null);
            var situation = new PartnerSituation
            {
                Order = Order,
                DistanceToLeader = Vector3.Distance(transform.position, leader.transform.position),
                LeaderInVehicle = leaderInVehicle,
                LeaderIsDriver = leader.IsDriver,
                LeaderVehicleMoving = leaderVehicle != null && leaderVehicle.Controller.Speed > 1.5f,
                PartnerSeated = _self.InVehicle,
                PartnerSeatedInLeaderVehicle = _self.InVehicle && leaderVehicle != null && _self.Vehicle == leaderVehicle,
                PartnerIsDriver = _self.IsDriver,
                LeaderVehicleHasFreeSeat = leaderVehicle != null && FreeSeatFor(leaderVehicle, leader) >= 0,
                VehicleUnsafeToBoard = leaderVehicle != null && leaderVehicle.Controller.Speed > 1.5f,
                HoldPositionReached = Vector3.Distance(transform.position, _holdPoint) < 1.5f,
            };
            _decision = _brain.Decide(situation);
            StatusText = BuildStatus();
        }

        private void Execute(Protagonist leader)
        {
            switch (_decision.Behavior)
            {
                case PartnerBehavior.FollowOnFoot:
                case PartnerBehavior.Regroup:
                {
                    if (_self.State != ProtagonistState.OnFoot)
                    {
                        break;
                    }

                    if (_decision.Gait == Gait.Stand)
                    {
                        _self.Motor.SetIntent(Vector3.zero, 0f);
                        _progress.Reset(_s.Now);
                        break;
                    }

                    // Aim slightly behind and beside the leader so the pair does not collide.
                    Vector3 goal = leader.transform.position - leader.transform.forward * 1.6f + leader.transform.right * 1.1f;
                    MoveTowards(goal, SpeedFor(_decision.Gait));
                    break;
                }

                case PartnerBehavior.HoldPosition:
                    if (_self.State == ProtagonistState.OnFoot)
                    {
                        if (Vector3.Distance(transform.position, _holdPoint) > 1.2f)
                        {
                            MoveTowards(_holdPoint, SpeedFor(Gait.Jog));
                        }
                        else
                        {
                            _self.Motor.SetIntent(Vector3.zero, 0f);
                        }
                    }

                    break;
                case PartnerBehavior.BoardVehicle:
                {
                    var v = leader.InVehicle ? leader.Vehicle : leader.Transition?.Vehicle;
                    if (v == null || _self.State != ProtagonistState.OnFoot)
                    {
                        break;
                    }

                    int seat = FreeSeatFor(v, leader);
                    if (seat < 0)
                    {
                        break;
                    }

                    Vector3 door = v.DoorPointWorld(seat);
                    if (Vector3.Distance(transform.position, door) < 6f)
                    {
                        if (!_self.TryBeginEnter(v, seat, out _))
                        {
                            _self.Motor.SetIntent(Vector3.zero, 0f);
                        }
                    }
                    else
                    {
                        MoveTowards(door, SpeedFor(_decision.Gait));
                    }

                    break;
                }

                case PartnerBehavior.ExitVehicle:
                    if (_self.State == ProtagonistState.InVehicle)
                    {
                        _self.TryBeginExit(out _);
                    }

                    break;
                case PartnerBehavior.DriveSafeStop:
                    if (_self.IsDriver && _self.Vehicle != null)
                    {
                        var c = _self.Vehicle.Controller;
                        c.Input = new DriveInput { Brake = c.Speed > 0.3f ? 0.7f : 0f, Handbrake = c.Speed <= 0.3f };
                    }

                    break;
                case PartnerBehavior.RemainSeated:
                    if (_self.IsDriver && _self.Vehicle != null)
                    {
                        _self.Vehicle.Controller.Input = DriveInput.Parked;
                    }

                    break;
            }
        }

        /// <summary>Seat for the partner: never the one the leader holds or is heading for.</summary>
        private int FreeSeatFor(VehicleEntity v, Protagonist leader)
        {
            if (_s.Seats.TryGetSeatOf(_self.Id, out var vid, out int mine) && vid == v.Id)
            {
                return mine;
            }

            int avoid = -1;
            if (_s.Seats.TryGetSeatOf(leader.Id, out var lvid, out int ls) && lvid == v.Id)
            {
                avoid = ls;
            }

            return _s.Seats.FindFreeSeat(v.Id, preferPassenger: true, avoid: avoid);
        }

        private void MoveTowards(Vector3 goal, float speed)
        {
            _self.EnsureAgentOnNavMesh();
            var agent = _self.Agent;
            Vector3 direction;
            float remaining;
            if (agent.enabled && agent.isOnNavMesh)
            {
                _repathTimer -= Time.deltaTime;
                if (_repathTimer <= 0f || Vector3.Distance(goal, _currentGoal) > 2f)
                {
                    _repathTimer = 0.5f;
                    _currentGoal = goal;
                    if (NavMesh.SamplePosition(goal, out var hit, 3f, NavMesh.AllAreas))
                    {
                        agent.SetDestination(hit.position);
                    }
                }

                Vector3 next = agent.hasPath ? agent.steeringTarget : goal;
                direction = (next - transform.position).Flat();
                remaining = agent.hasPath ? agent.remainingDistance : direction.magnitude;
            }
            else
            {
                direction = (goal - transform.position).Flat();
                remaining = direction.magnitude;
            }

            _self.Motor.SetIntent(direction, remaining < 0.6f ? 0f : speed);
            HandleProgress(remaining, goal);
        }

        private void HandleProgress(float remaining, Vector3 goal)
        {
            bool observed = IsObserved();
            switch (_progress.Evaluate(_s.Now, remaining, observed))
            {
                case RecoveryStep.Repath:
                    if (_self.Agent.enabled && _self.Agent.isOnNavMesh)
                    {
                        _self.Agent.ResetPath();
                        _repathTimer = 0f;
                    }

                    if (_s.Safehouse != null && _s.Safehouse.IsInside(transform.position))
                    {
                        _s.Safehouse.HoldOpen(4f);
                    }

                    break;
                case RecoveryStep.RepositionUnobserved:
                    TryRepositionNear(goal);
                    break;
                case RecoveryStep.AskRegroup:
                    if (Time.time - _lastRegroupNotice > 15f)
                    {
                        _lastRegroupNotice = Time.time;
                        _s.Notify($"{_self.Profile.ShortName} can't reach you. Wait for them, or press D-pad up to have them hold.", 4f);
                    }

                    break;
            }
        }

        /// <summary>Only when nobody can see either spot: move to a valid navmesh point near the goal.</summary>
        private void TryRepositionNear(Vector3 goal)
        {
            var cam = _s.MainCamera;
            for (int i = 0; i < 8; i++)
            {
                Vector3 candidate = goal + Quaternion.Euler(0f, i * 45f, 0f) * Vector3.forward * 14f;
                if (!NavMesh.SamplePosition(candidate, out var hit, 4f, NavMesh.AllAreas))
                {
                    continue;
                }

                if (cam != null)
                {
                    Vector3 vp = cam.WorldToViewportPoint(hit.position + Vector3.up);
                    if (vp.z > 0f && vp.x > -0.1f && vp.x < 1.1f && vp.y > -0.1f && vp.y < 1.1f)
                    {
                        continue;
                    }
                }

                _self.Motor.Place(hit.position, transform.eulerAngles.y);
                _self.Agent.Warp(hit.position);
                _s.Log.Record(_s.Now, PortMarlowe.Core.LogCategory.Partner, _self.Id, $"unobserved reposition to {hit.position}");
                return;
            }
        }

        private bool IsObserved()
        {
            var cam = _s.MainCamera;
            if (cam == null)
            {
                return false;
            }

            Vector3 vp = cam.WorldToViewportPoint(transform.position + Vector3.up);
            if (vp.z <= 0f || vp.x < -0.05f || vp.x > 1.05f || vp.y < -0.05f || vp.y > 1.05f)
            {
                return false;
            }

            Vector3 from = cam.transform.position;
            Vector3 to = transform.position + Vector3.up - from;
            return !Physics.Raycast(from, to.normalized, to.magnitude - 0.3f, GameLayers.WorldStatic, QueryTriggerInteraction.Ignore);
        }

        private float SpeedFor(Gait gait)
        {
            var t = _self.Profile.Locomotion;
            switch (gait)
            {
                case Gait.Walk: return t.WalkSpeed;
                case Gait.Jog: return t.JogSpeed;
                case Gait.Sprint: return t.SprintSpeed;
                default: return 0f;
            }
        }

        private string BuildStatus()
        {
            string name = _self.Profile.ShortName;
            switch (_decision.Behavior)
            {
                case PartnerBehavior.HoldPosition: return name + ": holding";
                case PartnerBehavior.BoardVehicle: return name + ": getting in";
                case PartnerBehavior.RemainSeated: return name + ": in the car";
                case PartnerBehavior.DriveSafeStop: return name + ": pulling over";
                case PartnerBehavior.Regroup: return name + ": catching up";
                default: return string.IsNullOrEmpty(_decision.Explanation) ? name + ": following" : name + ": " + _decision.Explanation;
            }
        }
    }
}
