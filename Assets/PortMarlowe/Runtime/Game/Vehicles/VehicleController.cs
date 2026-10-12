using System;
using UnityEngine;

namespace PortMarlowe.Game.Vehicles
{
    /// <summary>Normalised driver commands for one physics step.</summary>
    public struct DriveInput
    {
        public float Throttle;
        public float Brake;
        public float Steer;
        public bool Handbrake;

        public static readonly DriveInput Parked = new DriveInput { Handbrake = true };
    }

    /// <summary>Data-driven handling class (see Docs/Specs/Vehicles.md for the full table).</summary>
    [Serializable]
    public sealed class HandlingData
    {
        public string ClassName = "Sedan";
        public float Mass = 1450f;
        public float MaxMotorTorque = 1900f;      // N·m at the driven axle (sum)
        public float MaxBrakeTorque = 3200f;      // per wheel
        public float HandbrakeTorque = 5000f;     // rear wheels
        public float MaxSpeed = 46f;              // m/s (~165 km/h)
        public float MaxReverseSpeed = 9f;
        public float MaxSteerAngle = 34f;         // degrees at standstill
        public float HighSpeedSteerAngle = 9f;    // degrees at MaxSpeed
        public float SteerRate = 140f;            // degrees/s of wheel angle change (input smoothing, separate from grip)
        public float Downforce = 3.2f;            // N per (m/s)^2
        public float AntiRoll = 6500f;            // N per unit compression difference
        public bool FrontWheelDrive = true;
        public float WheelRadius = 0.34f;
        public float SuspensionDistance = 0.18f;
        public float Spring = 38000f;
        public float Damper = 4200f;
        public float ForwardStiffness = 1.6f;
        public float SidewaysStiffness = 1.9f;
    }

    /// <summary>
    /// VehicleController: physical car simulation built on PhysX WheelColliders. Simulated: suspension,
    /// tyre friction (Unity's slip model), drive/brake torque, speed-sensitive steering, anti-roll and
    /// downforce. Approximated: engine as a torque curve over speed, single-speed automatic with reverse.
    /// Omitted for now: gearbox simulation, tyre temperature, aerodynamic drag model beyond damping.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class VehicleController : MonoBehaviour
    {
        public HandlingData Handling = new HandlingData();

        private Rigidbody _rb;
        private WheelCollider[] _wheels = Array.Empty<WheelCollider>();
        private Transform[] _wheelVisuals = Array.Empty<Transform>();
        private float _steerAngle;
        private bool _reversing;

        /// <summary>Set by whoever currently drives (player, AI, nobody). Read in FixedUpdate.</summary>
        public DriveInput Input { get; set; } = DriveInput.Parked;

        public bool EngineRunning { get; set; }

        /// <summary>When false (no fuel / disabled engine) torque is zero; steering and brakes still work.</summary>
        public bool PowerAvailable { get; set; } = true;

        public Rigidbody Body => _rb;
        public float ForwardSpeed { get; private set; }
        public float Speed => _rb != null ? _rb.linearVelocity.magnitude : 0f;
        public float EngineLoad { get; private set; }

        /// <summary>Normalised engine speed for audio/UI (0 idle .. 1 redline).</summary>
        public float Rpm01 { get; private set; }

        public void Initialise(WheelCollider[] wheels, Transform[] visuals)
        {
            _rb = GetComponent<Rigidbody>();
            _wheels = wheels;
            _wheelVisuals = visuals;
            _rb.mass = Handling.Mass;
            _rb.interpolation = RigidbodyInterpolation.Interpolate;
            _rb.collisionDetectionMode = CollisionDetectionMode.ContinuousDynamic;
            _rb.linearDamping = 0.02f;
            _rb.angularDamping = 0.6f;
            foreach (var w in _wheels)
            {
                w.mass = 22f;
                w.radius = Handling.WheelRadius;
                w.suspensionDistance = Handling.SuspensionDistance;
                w.forceAppPointDistance = 0.1f;
                var spring = w.suspensionSpring;
                spring.spring = Handling.Spring;
                spring.damper = Handling.Damper;
                spring.targetPosition = 0.45f;
                w.suspensionSpring = spring;
                var fwd = w.forwardFriction;
                fwd.stiffness = Handling.ForwardStiffness;
                w.forwardFriction = fwd;
                var side = w.sidewaysFriction;
                side.stiffness = Handling.SidewaysStiffness;
                w.sidewaysFriction = side;
                w.ConfigureVehicleSubsteps(5f, 12, 15);
            }
        }

        /// <summary>Scale tyre grip (wet roads later; 1 = dry).</summary>
        public void SetGrip(float multiplier)
        {
            foreach (var w in _wheels)
            {
                var fwd = w.forwardFriction;
                fwd.stiffness = Handling.ForwardStiffness * multiplier;
                w.forwardFriction = fwd;
                var side = w.sidewaysFriction;
                side.stiffness = Handling.SidewaysStiffness * multiplier;
                w.sidewaysFriction = side;
            }
        }

        private void FixedUpdate()
        {
            if (_rb == null || _wheels.Length < 4)
            {
                return;
            }

            float dt = Time.fixedDeltaTime;
            var h = Handling;
            var input = Input;
            ForwardSpeed = Vector3.Dot(_rb.linearVelocity, transform.forward);
            float speed = Mathf.Abs(ForwardSpeed);

            // Steering: speed-sensitive limit, rate-limited wheel angle (input itself is not delayed).
            float limit = Mathf.Lerp(h.MaxSteerAngle, h.HighSpeedSteerAngle, Mathf.Clamp01(speed / h.MaxSpeed));
            float targetSteer = Mathf.Clamp(input.Steer, -1f, 1f) * limit;
            _steerAngle = Mathf.MoveTowards(_steerAngle, targetSteer, h.SteerRate * dt);
            _wheels[0].steerAngle = _steerAngle;
            _wheels[1].steerAngle = _steerAngle;

            // Brake pedal doubles as reverse once nearly stopped (arcade convention, documented).
            float throttle = Mathf.Clamp01(input.Throttle);
            float brake = Mathf.Clamp01(input.Brake);
            if (!_reversing && brake > 0.2f && throttle < 0.1f && ForwardSpeed < 0.6f)
            {
                _reversing = true;
            }
            else if (_reversing && (throttle > 0.1f || brake < 0.05f) && ForwardSpeed > -0.6f)
            {
                _reversing = false;
            }

            float drive = 0f;
            float brakeTorque = 0f;
            if (_reversing)
            {
                drive = -brake * (ForwardSpeed > -h.MaxReverseSpeed ? 1f : 0f);
            }
            else
            {
                drive = throttle;
                brakeTorque = brake * h.MaxBrakeTorque;
                // Throttle against motion (e.g. rolling backwards) also brakes.
                if (throttle > 0.1f && ForwardSpeed < -0.5f)
                {
                    brakeTorque = Mathf.Max(brakeTorque, throttle * h.MaxBrakeTorque);
                }
            }

            bool canDrive = EngineRunning && PowerAvailable;
            // Torque falls off towards top speed.
            float torqueCurve = Mathf.Clamp01(1f - speed / h.MaxSpeed) * 0.85f + 0.15f;
            float motor = canDrive ? drive * h.MaxMotorTorque * torqueCurve : 0f;
            if (speed > h.MaxSpeed && drive > 0f)
            {
                motor = 0f;
            }

            EngineLoad = canDrive ? Mathf.Abs(drive) : 0f;
            Rpm01 = EngineRunning ? Mathf.Clamp01(0.12f + speed / h.MaxSpeed * 0.7f + EngineLoad * 0.18f) : 0f;

            int driven0 = h.FrontWheelDrive ? 0 : 2;
            for (int i = 0; i < 4; i++)
            {
                bool driven = i == driven0 || i == driven0 + 1;
                _wheels[i].motorTorque = driven ? motor * 0.5f : 0f;
                float b = brakeTorque;
                if (input.Handbrake && i >= 2)
                {
                    b = Mathf.Max(b, h.HandbrakeTorque);
                }

                // Parked with nobody driving: hold the car.
                if (!EngineRunning && input.Handbrake)
                {
                    b = Mathf.Max(b, h.HandbrakeTorque);
                }

                _wheels[i].brakeTorque = b;
            }

            ApplyAntiRoll(_wheels[0], _wheels[1]);
            ApplyAntiRoll(_wheels[2], _wheels[3]);
            _rb.AddForce(-transform.up * h.Downforce * speed * speed, ForceMode.Force);
        }

        private void ApplyAntiRoll(WheelCollider left, WheelCollider right)
        {
            float travelL = 1f;
            float travelR = 1f;
            bool groundedL = left.GetGroundHit(out var hitL);
            bool groundedR = right.GetGroundHit(out var hitR);
            if (groundedL)
            {
                travelL = (-left.transform.InverseTransformPoint(hitL.point).y - left.radius) / left.suspensionDistance;
            }

            if (groundedR)
            {
                travelR = (-right.transform.InverseTransformPoint(hitR.point).y - right.radius) / right.suspensionDistance;
            }

            float force = (travelL - travelR) * Handling.AntiRoll;
            if (groundedL)
            {
                _rb.AddForceAtPosition(left.transform.up * -force, left.transform.position);
            }

            if (groundedR)
            {
                _rb.AddForceAtPosition(right.transform.up * force, right.transform.position);
            }
        }

        private void LateUpdate()
        {
            for (int i = 0; i < _wheels.Length && i < _wheelVisuals.Length; i++)
            {
                if (_wheelVisuals[i] == null)
                {
                    continue;
                }

                _wheels[i].GetWorldPose(out var pos, out var rot);
                _wheelVisuals[i].SetPositionAndRotation(pos, rot);
            }
        }

        public bool AllWheelsGrounded()
        {
            foreach (var w in _wheels)
            {
                if (!w.isGrounded)
                {
                    return false;
                }
            }

            return true;
        }

        public bool IsUpsideDown => Vector3.Dot(transform.up, Vector3.up) < 0.1f;
    }
}
