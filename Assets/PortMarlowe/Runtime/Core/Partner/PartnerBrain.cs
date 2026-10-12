using System;

namespace PortMarlowe.Core.Partner
{
    /// <summary>Explicit player orders. Optional favours/tasks come later.</summary>
    public enum PartnerOrder
    {
        Follow = 0,
        Hold = 1,
    }

    public enum PartnerBehavior
    {
        Idle = 0,
        FollowOnFoot,
        HoldPosition,
        BoardVehicle,
        RemainSeated,
        ExitVehicle,
        Regroup,
        /// <summary>The partner occupies the driver seat while the player rides: brings the vehicle to a safe stop (route driving is planned).</summary>
        DriveSafeStop,
    }

    public enum Gait
    {
        Stand = 0,
        Walk = 1,
        Jog = 2,
        Sprint = 3,
    }

    /// <summary>Inputs to a partner decision tick (4 Hz). All distances in metres.</summary>
    public struct PartnerSituation
    {
        public PartnerOrder Order;
        public float DistanceToLeader;
        public bool LeaderInVehicle;
        public bool LeaderIsDriver;
        public bool LeaderVehicleMoving;
        public bool PartnerSeated;
        public bool PartnerSeatedInLeaderVehicle;
        public bool PartnerIsDriver;
        public bool LeaderVehicleHasFreeSeat;
        public bool VehicleUnsafeToBoard;
        public bool HoldPositionReached;
    }

    public struct PartnerDecision
    {
        public PartnerBehavior Behavior;
        public Gait Gait;
        public string Explanation;
    }

    /// <summary>
    /// PartnerBrain: deterministic behaviour arbitration following the spec priority order:
    /// survival &gt; committed vehicle safety &gt; mission role &gt; player order &gt; combat support &gt;
    /// regroup &gt; optional task &gt; ambient. Combat and missions are not in this milestone, so those
    /// tiers are pass-through. Distance thresholds use hysteresis to prevent stop/start jitter.
    /// </summary>
    public sealed class PartnerBrain
    {
        public float StartFollowDistance = 4.0f;
        public float StopFollowDistance = 2.5f;
        public float JogDistance = 8f;
        public float SprintDistance = 12f;
        public float GaitHysteresis = 2f;
        public float RegroupDistance = 35f;

        private Gait _gait = Gait.Stand;
        private bool _following;

        public PartnerDecision Decide(in PartnerSituation s)
        {
            // Committed vehicle safety: never bail out of a moving vehicle the leader is driving.
            if (s.PartnerSeated)
            {
                if (s.PartnerIsDriver && s.LeaderInVehicle && s.PartnerSeatedInLeaderVehicle)
                {
                    return Make(PartnerBehavior.DriveSafeStop, Gait.Stand, "Driving: pulling over safely.");
                }

                if (s.PartnerSeatedInLeaderVehicle && s.LeaderInVehicle)
                {
                    return Make(PartnerBehavior.RemainSeated, Gait.Stand, string.Empty);
                }

                if (s.PartnerSeatedInLeaderVehicle && !s.LeaderInVehicle)
                {
                    // Leader got out: follow them out unless ordered to hold (stay in car).
                    return s.Order == PartnerOrder.Hold
                        ? Make(PartnerBehavior.RemainSeated, Gait.Stand, "Waiting in the car.")
                        : Make(PartnerBehavior.ExitVehicle, Gait.Stand, string.Empty);
                }

                if (!s.PartnerSeatedInLeaderVehicle)
                {
                    // Seated in some other vehicle (for example after a switch). Get out to regroup unless holding.
                    return s.Order == PartnerOrder.Hold
                        ? Make(PartnerBehavior.RemainSeated, Gait.Stand, "Waiting in the car.")
                        : Make(PartnerBehavior.ExitVehicle, Gait.Stand, string.Empty);
                }
            }

            if (s.Order == PartnerOrder.Hold)
            {
                _following = false;
                _gait = Gait.Stand;
                return Make(PartnerBehavior.HoldPosition, s.HoldPositionReached ? Gait.Stand : Gait.Jog, "Holding position.");
            }

            if (s.LeaderInVehicle)
            {
                if (s.VehicleUnsafeToBoard)
                {
                    return Make(PartnerBehavior.FollowOnFoot, Gait.Jog, "Won't get in while it's moving.");
                }

                if (!s.LeaderVehicleHasFreeSeat)
                {
                    return Make(PartnerBehavior.FollowOnFoot, Gait.Jog, "No free seat.");
                }

                return Make(PartnerBehavior.BoardVehicle, s.DistanceToLeader > JogDistance ? Gait.Sprint : Gait.Jog, string.Empty);
            }

            if (s.DistanceToLeader > RegroupDistance)
            {
                _following = true;
                _gait = Gait.Sprint;
                return Make(PartnerBehavior.Regroup, Gait.Sprint, "Catching up.");
            }

            // Follow with hysteresis.
            if (_following)
            {
                if (s.DistanceToLeader < StopFollowDistance)
                {
                    _following = false;
                }
            }
            else if (s.DistanceToLeader > StartFollowDistance)
            {
                _following = true;
            }

            if (!_following)
            {
                _gait = Gait.Stand;
                return Make(PartnerBehavior.FollowOnFoot, Gait.Stand, string.Empty);
            }

            _gait = SelectGait(s.DistanceToLeader, _gait);
            return Make(PartnerBehavior.FollowOnFoot, _gait, string.Empty);
        }

        public void Reset()
        {
            _gait = Gait.Stand;
            _following = false;
        }

        private Gait SelectGait(float distance, Gait current)
        {
            float h = GaitHysteresis;
            switch (current)
            {
                case Gait.Sprint:
                    if (distance < SprintDistance - h)
                    {
                        return distance < JogDistance - h ? Gait.Walk : Gait.Jog;
                    }

                    return Gait.Sprint;
                case Gait.Jog:
                    if (distance > SprintDistance)
                    {
                        return Gait.Sprint;
                    }

                    return distance < JogDistance - h ? Gait.Walk : Gait.Jog;
                default:
                    if (distance > SprintDistance)
                    {
                        return Gait.Sprint;
                    }

                    return distance > JogDistance ? Gait.Jog : Gait.Walk;
            }
        }

        private static PartnerDecision Make(PartnerBehavior b, Gait g, string why) =>
            new PartnerDecision { Behavior = b, Gait = g, Explanation = why ?? string.Empty };
    }

    public enum RecoveryStep
    {
        None = 0,
        Repath = 1,
        /// <summary>Allowed only when the partner is unobserved and far: move to a valid nearby point.</summary>
        RepositionUnobserved = 2,
        /// <summary>Ask the player to regroup (visible message); never teleport in view.</summary>
        AskRegroup = 3,
    }

    /// <summary>
    /// Escalating stuck recovery: local steering → repath → unobserved reposition → visible regroup request.
    /// Progress is measured as reduction of remaining path distance.
    /// </summary>
    public sealed class ProgressMonitor
    {
        public float CheckInterval = 1.0f;
        public float MinProgress = 0.3f;
        public int RepathsBeforeEscalation = 2;
        public float RepositionMinDistance = 25f;

        private double _lastCheck = double.NegativeInfinity;
        private float _lastRemaining = float.PositiveInfinity;
        private int _failures;

        public int Failures => _failures;

        public void Reset(double now)
        {
            _lastCheck = now;
            _lastRemaining = float.PositiveInfinity;
            _failures = 0;
        }

        /// <summary>Call every tick while the agent is trying to move.</summary>
        public RecoveryStep Evaluate(double now, float remainingDistance, bool observedByPlayer)
        {
            if (now - _lastCheck < CheckInterval)
            {
                return RecoveryStep.None;
            }

            _lastCheck = now;
            bool progressed = _lastRemaining - remainingDistance >= MinProgress || remainingDistance < 1.0f;
            _lastRemaining = remainingDistance;
            if (progressed)
            {
                _failures = 0;
                return RecoveryStep.None;
            }

            _failures++;
            if (_failures <= RepathsBeforeEscalation)
            {
                return RecoveryStep.Repath;
            }

            if (!observedByPlayer && remainingDistance >= RepositionMinDistance)
            {
                _failures = 0;
                return RecoveryStep.RepositionUnobserved;
            }

            return RecoveryStep.AskRegroup;
        }
    }
}
