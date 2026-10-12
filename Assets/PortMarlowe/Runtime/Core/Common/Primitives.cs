using System;
using System.Globalization;

namespace PortMarlowe.Core
{
    /// <summary>
    /// Stable, save-safe entity identifier. Values are short human-readable strings
    /// ("char.rhys", "veh.player.sedan", "ped.0042") so save files and logs stay inspectable.
    /// </summary>
    [Serializable]
    public readonly struct StableId : IEquatable<StableId>
    {
        public readonly string Value;

        public StableId(string value)
        {
            Value = value ?? string.Empty;
        }

        public static readonly StableId None = new StableId(string.Empty);

        public bool IsNone => string.IsNullOrEmpty(Value);

        public bool Equals(StableId other) => string.Equals(Value ?? string.Empty, other.Value ?? string.Empty, StringComparison.Ordinal);
        public override bool Equals(object obj) => obj is StableId other && Equals(other);
        public override int GetHashCode() => (Value ?? string.Empty).GetHashCode();
        public override string ToString() => IsNone ? "<none>" : Value;

        public static bool operator ==(StableId a, StableId b) => a.Equals(b);
        public static bool operator !=(StableId a, StableId b) => !a.Equals(b);
    }

    /// <summary>Engine-independent 3D vector used by simulation code (metres, Y up).</summary>
    [Serializable]
    public struct Vec3 : IEquatable<Vec3>
    {
        public float X;
        public float Y;
        public float Z;

        public Vec3(float x, float y, float z)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public static readonly Vec3 Zero = new Vec3(0f, 0f, 0f);

        public float Magnitude => (float)Math.Sqrt(X * X + Y * Y + Z * Z);
        public float SqrMagnitude => X * X + Y * Y + Z * Z;

        public static Vec3 operator +(Vec3 a, Vec3 b) => new Vec3(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
        public static Vec3 operator -(Vec3 a, Vec3 b) => new Vec3(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
        public static Vec3 operator *(Vec3 a, float s) => new Vec3(a.X * s, a.Y * s, a.Z * s);

        public static float Distance(Vec3 a, Vec3 b) => (a - b).Magnitude;

        /// <summary>Horizontal (XZ-plane) distance; vertical offsets such as stairs do not count.</summary>
        public static float FlatDistance(Vec3 a, Vec3 b)
        {
            float dx = a.X - b.X;
            float dz = a.Z - b.Z;
            return (float)Math.Sqrt(dx * dx + dz * dz);
        }

        public bool Equals(Vec3 other) => X == other.X && Y == other.Y && Z == other.Z;
        public override bool Equals(object obj) => obj is Vec3 other && Equals(other);
        public override int GetHashCode() => (X.GetHashCode() * 397 ^ Y.GetHashCode()) * 397 ^ Z.GetHashCode();

        public override string ToString() =>
            string.Format(CultureInfo.InvariantCulture, "({0:0.##}, {1:0.##}, {2:0.##})", X, Y, Z);
    }

    /// <summary>
    /// Small deterministic PRNG (xorshift64*) so district layout, pedestrian rolls and test
    /// scenarios are reproducible from a recorded seed on any platform.
    /// </summary>
    public sealed class DeterministicRandom
    {
        private ulong _state;

        public DeterministicRandom(ulong seed)
        {
            _state = seed == 0 ? 0x9E3779B97F4A7C15UL : seed;
        }

        public ulong State => _state;

        public ulong NextULong()
        {
            ulong x = _state;
            x ^= x >> 12;
            x ^= x << 25;
            x ^= x >> 27;
            _state = x;
            return x * 0x2545F4914F6CDD1DUL;
        }

        /// <summary>Uniform float in [0, 1).</summary>
        public float NextFloat() => (NextULong() >> 40) / (float)(1UL << 24);

        public float Range(float minInclusive, float maxExclusive) => minInclusive + (maxExclusive - minInclusive) * NextFloat();

        /// <summary>Uniform int in [minInclusive, maxExclusive).</summary>
        public int Range(int minInclusive, int maxExclusive)
        {
            if (maxExclusive <= minInclusive)
            {
                return minInclusive;
            }

            ulong span = (ulong)(maxExclusive - minInclusive);
            return minInclusive + (int)(NextULong() % span);
        }

        public bool Chance(float probability) => NextFloat() < probability;
    }

    public static class MathUtil
    {
        public static float Clamp(float v, float min, float max) => v < min ? min : (v > max ? max : v);
        public static float Clamp01(float v) => Clamp(v, 0f, 1f);
        public static float Lerp(float a, float b, float t) => a + (b - a) * Clamp01(t);

        public static float InverseLerp(float a, float b, float v)
        {
            if (Math.Abs(b - a) < 1e-6f)
            {
                return 0f;
            }

            return Clamp01((v - a) / (b - a));
        }

        /// <summary>
        /// Frame-rate independent exponential smoothing factor for a time constant in seconds.
        /// Use as: value = Lerp(value, target, ExpSmoothing(dt, tau)).
        /// </summary>
        public static float ExpSmoothing(float deltaTime, float timeConstant)
        {
            if (timeConstant <= 0f)
            {
                return 1f;
            }

            return 1f - (float)Math.Exp(-deltaTime / timeConstant);
        }

        public static float MoveTowards(float current, float target, float maxDelta)
        {
            if (Math.Abs(target - current) <= maxDelta)
            {
                return target;
            }

            return current + Math.Sign(target - current) * maxDelta;
        }
    }
}
