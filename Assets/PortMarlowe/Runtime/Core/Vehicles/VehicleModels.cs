using System;

namespace PortMarlowe.Core.Vehicles
{
    /// <summary>
    /// Game-scale fuel model. Initial hypothesis: a full 55 L tank lasts roughly 30 minutes of
    /// ordinary urban driving, so fuel creates occasional decisions without constant refuelling.
    /// All rates are litres per simulation second.
    /// </summary>
    [Serializable]
    public sealed class FuelModel
    {
        public float CapacityLitres = 55f;
        public float Litres = 55f;
        public float IdleRate = 0.004f;
        public float CruiseRatePerMps = 0.0016f;
        public float ThrottleRate = 0.012f;
        public float ReserveFraction = 0.15f;

        /// <summary>Vehicle-specific efficiency multiplier (trucks &gt; 1, compacts &lt; 1).</summary>
        public float ClassMultiplier = 1f;

        public bool IsEmpty => Litres <= 0f;
        public bool InReserve => Litres <= CapacityLitres * ReserveFraction;
        public float Fraction => CapacityLitres <= 0f ? 0f : Litres / CapacityLitres;

        /// <summary>Consume fuel for one step. Returns litres consumed.</summary>
        public float Consume(float deltaSeconds, bool engineRunning, float throttle01, float speedMps, float leakLitresPerSecond)
        {
            if (deltaSeconds <= 0f)
            {
                return 0f;
            }

            float rate = Math.Max(0f, leakLitresPerSecond);
            if (engineRunning)
            {
                rate += (IdleRate + CruiseRatePerMps * Math.Abs(speedMps) + ThrottleRate * MathUtil.Clamp01(throttle01)) * ClassMultiplier;
            }

            float used = Math.Min(Litres, rate * deltaSeconds);
            Litres -= used;
            if (Litres < 1e-4f)
            {
                Litres = 0f;
            }

            return used;
        }

        /// <summary>Add fuel up to capacity; returns litres actually added.</summary>
        public float Refuel(float litres)
        {
            float add = Math.Max(0f, Math.Min(litres, CapacityLitres - Litres));
            Litres += add;
            return add;
        }
    }

    public enum VehicleHealthState
    {
        Ok = 0,
        Damaged = 1,
        /// <summary>Engine will not run. Repair/tow route required (planned services).</summary>
        Disabled = 2,
    }

    /// <summary>
    /// Damage bookkeeping separated from presentation. Impact filtering ignores small contact jitter so
    /// parked vehicles do not accumulate fictitious damage. Fire/explosion is not part of this milestone.
    /// </summary>
    [Serializable]
    public sealed class VehicleCondition
    {
        public const float MaxHealth = 1000f;

        /// <summary>Relative impact speeds below this (m/s) cause no damage.</summary>
        public float ImpactThreshold = 3.0f;

        /// <summary>Health lost per (m/s above threshold) of impact speed.</summary>
        public float DamagePerMps = 22f;

        public float Body = MaxHealth;
        public float Engine = MaxHealth;

        public VehicleHealthState State =>
            Engine <= 100f ? VehicleHealthState.Disabled :
            (Engine < 600f || Body < 500f ? VehicleHealthState.Damaged : VehicleHealthState.Ok);

        /// <summary>Litres/s leaked when the engine bay is badly damaged.</summary>
        public float FuelLeakRate => Engine < 250f ? 0.01f : 0f;

        /// <summary>Applies an impact. <paramref name="frontal01"/> is how much the hit was on the engine end.</summary>
        public float ApplyImpact(float relativeSpeedMps, float frontal01)
        {
            float excess = relativeSpeedMps - ImpactThreshold;
            if (excess <= 0f)
            {
                return 0f;
            }

            float damage = excess * DamagePerMps;
            Body = Math.Max(0f, Body - damage);
            Engine = Math.Max(0f, Engine - damage * MathUtil.Lerp(0.25f, 0.9f, frontal01));
            return damage;
        }

        public void Repair()
        {
            Body = MaxHealth;
            Engine = MaxHealth;
        }
    }

    public enum VehicleSecurityLevel
    {
        /// <summary>Owned by the player or left unlocked.</summary>
        Unlocked = 0,
        /// <summary>Simple entry: break the window (witnessable, triggers alarm).</summary>
        Low = 1,
        /// <summary>Needs a fictional tool and a short abstract hotwire (tool not yet in game).</summary>
        Mid = 2,
        /// <summary>Needs a key/access token route (not yet in game).</summary>
        High = 3,
    }

    public static class VehicleSecurity
    {
        public static bool CanAttempt(VehicleSecurityLevel level, bool hasTool, out string reason)
        {
            switch (level)
            {
                case VehicleSecurityLevel.Unlocked:
                case VehicleSecurityLevel.Low:
                    reason = string.Empty;
                    return true;
                case VehicleSecurityLevel.Mid:
                    reason = hasTool ? string.Empty : "Needs a bypass tool.";
                    return hasTool;
                default:
                    reason = "High-security vehicle: needs its key.";
                    return false;
            }
        }

        /// <summary>Seconds of committed break-in before the door opens.</summary>
        public static float EntryDuration(VehicleSecurityLevel level)
        {
            switch (level)
            {
                case VehicleSecurityLevel.Low: return 1.2f;
                case VehicleSecurityLevel.Mid: return 3.5f;
                case VehicleSecurityLevel.High: return 6f;
                default: return 0f;
            }
        }

        public static bool IsCrime(VehicleSecurityLevel level, bool ownedByActor) => !ownedByActor && level != VehicleSecurityLevel.Unlocked;
    }
}
