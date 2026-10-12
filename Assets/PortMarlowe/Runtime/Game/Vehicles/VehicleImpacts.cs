using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Population;
using UnityEngine;

namespace PortMarlowe.Game.Vehicles
{
    /// <summary>
    /// Collision consequences: filtered damage (core VehicleCondition ignores contact jitter), impact
    /// audio/rumble for the player, fuel consumption, and pedestrian strikes (hit triggers) that become
    /// HitPedestrian incidents when a protagonist is driving above walking pace.
    /// </summary>
    [RequireComponent(typeof(VehicleEntity))]
    public sealed class VehicleImpacts : MonoBehaviour
    {
        public const float PedestrianStrikeSpeed = 4f;

        private VehicleEntity _v;
        private GameSession _s;
        private float _lastImpactSound;

        public void Init(GameSession session)
        {
            _s = session;
            _v = GetComponent<VehicleEntity>();
        }

        private void FixedUpdate()
        {
            if (_v == null || _v.Controller == null)
            {
                return;
            }

            var c = _v.Controller;
            _v.Fuel.Consume(Time.fixedDeltaTime, c.EngineRunning, c.Input.Throttle, c.Speed, _v.Condition.FuelLeakRate);
            c.PowerAvailable = !_v.Fuel.IsEmpty && _v.Condition.State != VehicleHealthState.Disabled;
        }

        private void OnCollisionEnter(Collision collision)
        {
            if (_v == null || _s == null)
            {
                return;
            }

            float rel = collision.relativeVelocity.magnitude;
            Vector3 n = collision.contactCount > 0 ? collision.GetContact(0).normal : -transform.forward;
            float frontal = Mathf.Clamp01(Vector3.Dot(-n, transform.forward));
            float before = _v.Condition.Engine;
            float damage = _v.Condition.ApplyImpact(rel, frontal);
            if (damage <= 0f)
            {
                return;
            }

            if (Time.time - _lastImpactSound > 0.25f)
            {
                _lastImpactSound = Time.time;
                _s.Audio?.PlayOneShot(SfxKind.Impact, collision.GetContact(0).point, Mathf.Clamp01(rel / 15f));
            }

            var driver = DriverProtagonist();
            if (driver != null && driver.IsPlayerControlled)
            {
                _s.Input.Rumble(Mathf.Clamp01(rel / 20f), Mathf.Clamp01(rel / 12f), 0.25f);
                _s.CameraRig?.AddShake(Mathf.Clamp01(rel / 25f) * 0.6f);
                if (before > 100f && _v.Condition.State == VehicleHealthState.Disabled)
                {
                    _s.Notify("Engine's dead. It won't start.");
                }
                else if (before >= 600f && _v.Condition.Engine < 600f)
                {
                    _s.Notify("Engine damaged.");
                }
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_s == null || other.gameObject.layer != GameLayers.PedestrianHit)
            {
                return;
            }

            var civ = other.GetComponentInParent<Civilian>();
            if (civ == null || civ.State == CivilianState.Knocked)
            {
                return;
            }

            float speed = _v.Controller.Speed;
            if (speed < PedestrianStrikeSpeed)
            {
                return;
            }

            var driver = DriverProtagonist();
            if (driver != null)
            {
                _s.Crime.CommitHitPedestrian(driver, _v, civ);
                if (driver.IsPlayerControlled)
                {
                    _s.Input.Rumble(0.6f, 0.4f, 0.2f);
                }
            }
            else
            {
                civ.Knockdown(transform.position);
            }

            _s.Audio?.PlayOneShot(SfxKind.Impact, other.transform.position, 0.6f);
        }

        private Protagonist DriverProtagonist()
        {
            var driverId = _s.Seats.Driver(_v.Id);
            return !driverId.IsNone && _s.Protagonists.TryGetValue(driverId, out var p) ? p : null;
        }
    }
}
