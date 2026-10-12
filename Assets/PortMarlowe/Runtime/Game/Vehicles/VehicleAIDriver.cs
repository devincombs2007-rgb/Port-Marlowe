using System.Collections.Generic;
using PortMarlowe.Game.World;
using UnityEngine;

namespace PortMarlowe.Game.Vehicles
{
    public enum AiDriveMode
    {
        Parked = 0,
        FollowRoute = 1,
        Pursue = 2,
        SafeStop = 3,
    }

    /// <summary>
    /// AI driver producing <see cref="DriveInput"/> for the shared vehicle physics (no special
    /// movement rules for AI). Pure-pursuit steering on lane waypoints, curvature-limited speed,
    /// forward obstacle braking, and a bounded reverse-and-retry recovery when stuck.
    /// </summary>
    [RequireComponent(typeof(VehicleController))]
    public sealed class VehicleAIDriver : MonoBehaviour
    {
        private VehicleController _c;
        private RoadNetwork _roads;
        private readonly List<Vector3> _route = new List<Vector3>();
        private int _index;
        private Transform _pursueTarget;
        private float _replanTimer;
        private float _stuckTimer;
        private float _reverseUntil;
        private float _reverseSteer;

        public AiDriveMode Mode { get; private set; } = AiDriveMode.Parked;
        public float CruiseSpeed = 12f;
        public float UrgentSpeed = 19f;
        public bool Urgent;
        public bool Arrived { get; private set; }
        public Vector3 Destination { get; private set; }

        public void Init(RoadNetwork roads)
        {
            _roads = roads;
            _c = GetComponent<VehicleController>();
        }

        public void DriveTo(Vector3 destination, bool urgent)
        {
            Urgent = urgent;
            Destination = destination;
            _route.Clear();
            _route.AddRange(_roads.Route(transform.position, transform.forward, destination));
            _index = 0;
            Arrived = false;
            Mode = AiDriveMode.FollowRoute;
            _pursueTarget = null;
            _c.EngineRunning = true;
        }

        public void Pursue(Transform target)
        {
            _pursueTarget = target;
            Urgent = true;
            Mode = AiDriveMode.Pursue;
            _replanTimer = 0f;
            Arrived = false;
            _c.EngineRunning = true;
        }

        public void SafeStop() => Mode = AiDriveMode.SafeStop;

        public void Park()
        {
            Mode = AiDriveMode.Parked;
            _c.Input = DriveInput.Parked;
        }

        private void FixedUpdate()
        {
            if (_c == null || _roads == null)
            {
                return;
            }

            switch (Mode)
            {
                case AiDriveMode.Parked:
                    return;
                case AiDriveMode.SafeStop:
                    _c.Input = new DriveInput { Brake = _c.Speed > 0.3f ? 0.8f : 0f, Handbrake = _c.Speed < 0.3f };
                    if (_c.Speed < 0.2f)
                    {
                        Mode = AiDriveMode.Parked;
                        _c.Input = DriveInput.Parked;
                    }

                    return;
                case AiDriveMode.Pursue:
                    TickPursue();
                    break;
                case AiDriveMode.FollowRoute:
                    TickRoute(Urgent ? UrgentSpeed : CruiseSpeed);
                    break;
            }
        }

        private void TickPursue()
        {
            if (_pursueTarget == null)
            {
                SafeStop();
                return;
            }

            Vector3 target = _pursueTarget.position;
            float d = Vector3.Distance(transform.position, target);
            _replanTimer -= Time.fixedDeltaTime;
            bool direct = d < 30f && !Physics.Linecast(transform.position + Vector3.up, target + Vector3.up, GameLayers.Mask(GameLayers.Building), QueryTriggerInteraction.Ignore);
            if (direct)
            {
                float desired = Mathf.Clamp(d * 0.9f, 0f, UrgentSpeed);
                Steer(target, desired, stopDistance: 7f);
                return;
            }

            if (_replanTimer <= 0f || _index >= _route.Count)
            {
                _replanTimer = 2f;
                _route.Clear();
                _route.AddRange(_roads.Route(transform.position, transform.forward, target));
                _index = 0;
            }

            TickRoute(UrgentSpeed);
        }

        private void TickRoute(float cruise)
        {
            if (_index >= _route.Count)
            {
                Arrived = true;
                _c.Input = new DriveInput { Brake = 1f, Handbrake = _c.Speed < 0.5f };
                return;
            }

            // Advance past reached waypoints.
            while (_index < _route.Count && Vector3.Distance(transform.position.Flat(), _route[_index]) < Mathf.Max(4f, _c.Speed * 0.45f))
            {
                _index++;
            }

            if (_index >= _route.Count)
            {
                Arrived = true;
                return;
            }

            // Slow for corners: angle between this leg and the next.
            float target = cruise;
            if (_index + 1 < _route.Count)
            {
                Vector3 a = (_route[_index] - transform.position).Flat();
                Vector3 b = (_route[_index + 1] - _route[_index]).Flat();
                float turn = Vector3.Angle(a, b);
                float dist = a.magnitude;
                if (dist < 30f)
                {
                    target = Mathf.Min(target, Mathf.Lerp(cruise, 5.5f, turn / 90f));
                }
            }

            bool last = _index == _route.Count - 1;
            Steer(_route[_index], target, last ? 2f : 0f);
        }

        private void Steer(Vector3 point, float desiredSpeed, float stopDistance)
        {
            float dt = Time.fixedDeltaTime;
            Vector3 to = (point - transform.position).Flat();
            float dist = to.magnitude;
            float angle = Vector3.SignedAngle(transform.forward.Flat(), to, Vector3.up);
            float steer = Mathf.Clamp(angle / Mathf.Max(10f, _c.Handling.MaxSteerAngle), -1f, 1f);

            if (stopDistance > 0f && dist < stopDistance)
            {
                desiredSpeed = 0f;
            }

            // Forward obstacle check (vehicles, people).
            float look = 6f + _c.Speed * 1.3f;
            if (Physics.SphereCast(transform.position + Vector3.up * 0.8f + transform.forward * 2.6f, 0.9f, transform.forward, out var hit, look,
                    GameLayers.Mask(GameLayers.Vehicle, GameLayers.PedestrianSolid, GameLayers.Protagonist), QueryTriggerInteraction.Ignore))
            {
                bool isTarget = _pursueTarget != null && hit.transform.IsChildOf(_pursueTarget.root);
                if (!isTarget || hit.distance < 5f)
                {
                    desiredSpeed = Mathf.Min(desiredSpeed, Mathf.Max(0f, (hit.distance - 3f) * 0.8f));
                }
            }

            // Big heading errors: slow down to turn instead of overshooting.
            if (Mathf.Abs(angle) > 60f)
            {
                desiredSpeed = Mathf.Min(desiredSpeed, 5f);
            }

            float speed = _c.ForwardSpeed;
            var input = new DriveInput { Steer = steer };

            // Stuck recovery: wanted to move but not moving.
            if (Time.time < _reverseUntil)
            {
                input.Steer = _reverseSteer;
                input.Brake = 0.8f;
                input.Throttle = 0f;
                _c.Input = input;
                return;
            }

            if (desiredSpeed > 1f && Mathf.Abs(speed) < 0.5f)
            {
                _stuckTimer += dt;
                if (_stuckTimer > 2.5f)
                {
                    _stuckTimer = 0f;
                    _reverseUntil = Time.time + 1.6f;
                    _reverseSteer = -Mathf.Sign(steer == 0f ? 1f : steer);
                }
            }
            else
            {
                _stuckTimer = 0f;
            }

            float error = desiredSpeed - speed;
            if (error > 0.5f)
            {
                input.Throttle = Mathf.Clamp01(error / 4f + 0.25f);
            }
            else if (error < -1f)
            {
                input.Brake = Mathf.Clamp01(-error / 6f);
            }

            input.Handbrake = desiredSpeed <= 0f && Mathf.Abs(speed) < 0.4f;
            _c.Input = input;
        }
    }
}
