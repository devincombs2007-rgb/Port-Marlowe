using PortMarlowe.Core.Character;
using UnityEngine;

namespace PortMarlowe.Game.Characters
{
    /// <summary>
    /// CharacterMotor: the one authority for a protagonist's capsule. Both player input and partner AI
    /// express intent as (direction, target speed); the motor applies acceleration, turn-rate limits,
    /// gravity, step/slope handling and collision. Animation reads <see cref="HorizontalSpeed"/>.
    /// Input is applied on the same frame it is read (no added latency).
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class CharacterMotor : MonoBehaviour
    {
        private CharacterController _cc;
        private Vector3 _velocity;
        private float _verticalSpeed;
        private Vector3 _desiredDirection;
        private float _targetSpeed;
        private bool _faceMoveDirection = true;
        private Vector3? _faceOverride;

        public LocomotionTuning Tuning { get; set; } = new LocomotionTuning();
        public Vector3 Velocity => _velocity + Vector3.up * _verticalSpeed;
        public float HorizontalSpeed => new Vector3(_velocity.x, 0f, _velocity.z).magnitude;
        public bool Grounded { get; private set; } = true;
        public float AirTime { get; private set; }
        public CharacterController Controller => _cc;

        /// <summary>When false the motor does nothing (seated in a vehicle, scripted transfer).</summary>
        public bool Simulate { get; set; } = true;

        public void Configure(float height, float radius)
        {
            _cc = GetComponent<CharacterController>();
            _cc.height = height;
            _cc.radius = radius;
            _cc.center = new Vector3(0f, height * 0.5f, 0f);
            _cc.stepOffset = Tuning.StepOffset;
            _cc.slopeLimit = Tuning.SlopeLimit;
            _cc.skinWidth = 0.04f;
            _cc.minMoveDistance = 0f;
        }

        /// <summary>Set this frame's intent. Direction is world-space (y ignored); speed in m/s.</summary>
        public void SetIntent(Vector3 direction, float targetSpeed, bool faceMoveDirection = true)
        {
            direction.y = 0f;
            _desiredDirection = direction.sqrMagnitude > 1e-6f ? direction.normalized : Vector3.zero;
            _targetSpeed = Mathf.Max(0f, targetSpeed);
            _faceMoveDirection = faceMoveDirection;
        }

        public void FaceTowards(Vector3? worldDirection) => _faceOverride = worldDirection;

        /// <summary>Teleport with velocity reset (load, arrest release, vehicle exit placement).</summary>
        public void Place(Vector3 position, float yawDegrees)
        {
            bool was = _cc.enabled;
            _cc.enabled = false;
            transform.SetPositionAndRotation(position, Quaternion.Euler(0f, yawDegrees, 0f));
            _cc.enabled = was;
            _velocity = Vector3.zero;
            _verticalSpeed = 0f;
        }

        public void Stop()
        {
            _velocity = Vector3.zero;
            _targetSpeed = 0f;
            _desiredDirection = Vector3.zero;
        }

        /// <summary>Advance one step. Called by the owning controller (player or AI) once per frame.</summary>
        public void Step(float dt)
        {
            if (!Simulate || _cc == null || !_cc.enabled || dt <= 0f)
            {
                return;
            }

            var t = Tuning;
            Vector3 flat = new Vector3(_velocity.x, 0f, _velocity.z);
            float speed = flat.magnitude;
            Vector3 heading = speed > 0.05f ? flat / speed : transform.forward;

            if (_desiredDirection != Vector3.zero && _targetSpeed > 0f)
            {
                float angle = Vector3.SignedAngle(heading, _desiredDirection, Vector3.up);
                float turnRate = t.TurnRateForSpeed(speed);
                // Quick turn: a near-reversal at jog/sprint sheds speed instead of orbiting widely.
                if (Mathf.Abs(angle) > t.QuickTurnAngle && speed > t.WalkSpeed)
                {
                    speed = Mathf.MoveTowards(speed, 0f, t.Deceleration * 1.6f * dt);
                    turnRate *= 2.2f;
                }

                float step = Mathf.Clamp(angle, -turnRate * dt, turnRate * dt);
                heading = Quaternion.Euler(0f, step, 0f) * heading;
                // Below walking speed, direction snaps (precise positioning; no orbiting while starting).
                if (speed < 0.6f)
                {
                    heading = _desiredDirection;
                }

                float accel = _targetSpeed > speed ? t.Acceleration : t.Deceleration;
                speed = Mathf.MoveTowards(speed, _targetSpeed, accel * dt);
            }
            else
            {
                speed = Mathf.MoveTowards(speed, 0f, t.Deceleration * dt);
            }

            _velocity = heading * speed;

            // Gravity and grounding.
            if (Grounded && _verticalSpeed <= 0f)
            {
                _verticalSpeed = -2f; // keep contact on slopes/steps
            }
            else
            {
                _verticalSpeed = Mathf.Max(_verticalSpeed - t.Gravity * dt, -t.MaxFallSpeed);
            }

            var flags = _cc.Move((_velocity + Vector3.up * _verticalSpeed) * dt);
            Grounded = (flags & CollisionFlags.Below) != 0 || _cc.isGrounded;
            AirTime = Grounded ? 0f : AirTime + dt;
            if ((flags & CollisionFlags.Sides) != 0)
            {
                // Hitting a wall sheds speed instead of building it up against geometry.
                _velocity *= 0.6f;
            }

            Vector3 face = _faceOverride ?? (_faceMoveDirection && speed > 0.1f ? heading : Vector3.zero);
            if (face.sqrMagnitude > 1e-4f)
            {
                var target = Quaternion.LookRotation(new Vector3(face.x, 0f, face.z), Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, target, t.TurnRateForSpeed(speed) * 1.2f * dt);
            }
        }

        private void Awake()
        {
            _cc = GetComponent<CharacterController>();
        }
    }
}
