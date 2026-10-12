using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Character
{
    /// <summary>
    /// On-foot tuning. Values are initial hypotheses within the spec's ranges
    /// (walk 1.3–1.7, jog 3.0–4.0, sprint 5.8–7.2 m/s) and are serialized per protagonist.
    /// </summary>
    [Serializable]
    public sealed class LocomotionTuning
    {
        public float WalkSpeed = 1.5f;
        public float JogSpeed = 3.5f;
        public float SprintSpeed = 6.5f;

        /// <summary>m/s² when speeding up.</summary>
        public float Acceleration = 14f;

        /// <summary>m/s² when slowing down or stopping.</summary>
        public float Deceleration = 18f;

        /// <summary>Turn rates in degrees/second.</summary>
        public float TurnRateWalk = 720f;
        public float TurnRateJog = 540f;
        public float TurnRateSprint = 300f;

        /// <summary>Above this angle a jog/sprint reversal sheds speed (quick turn) instead of orbiting.</summary>
        public float QuickTurnAngle = 135f;

        public float Gravity = 20f;
        public float MaxFallSpeed = 45f;
        public float StepOffset = 0.35f;
        public float SlopeLimit = 46f;

        /// <summary>Stick deflection that selects walk (below) versus jog (above).</summary>
        public float WalkThreshold = 0.55f;

        public LocomotionTuning Clone() => (LocomotionTuning)MemberwiseClone();

        public float TurnRateForSpeed(float speed)
        {
            if (speed <= WalkSpeed)
            {
                return TurnRateWalk;
            }

            if (speed <= JogSpeed)
            {
                return MathUtil.Lerp(TurnRateWalk, TurnRateJog, MathUtil.InverseLerp(WalkSpeed, JogSpeed, speed));
            }

            return MathUtil.Lerp(TurnRateJog, TurnRateSprint, MathUtil.InverseLerp(JogSpeed, SprintSpeed, speed));
        }

        /// <summary>Target speed from shaped stick magnitude (0..1) and sprint input.</summary>
        public float TargetSpeed(float stick01, bool sprint)
        {
            if (stick01 <= 0f)
            {
                return 0f;
            }

            if (sprint)
            {
                return SprintSpeed;
            }

            if (stick01 < WalkThreshold)
            {
                // Analog walk: proportional within the walk band for fine positioning.
                return MathUtil.Lerp(0.4f, WalkSpeed, stick01 / WalkThreshold);
            }

            return MathUtil.Lerp(WalkSpeed, JogSpeed, MathUtil.InverseLerp(WalkThreshold, 0.9f, stick01));
        }
    }

    /// <summary>
    /// Stick shaping kept separate from acceleration: radial dead zone with rescaling, outer clamp,
    /// then a power response curve. No temporal smoothing (that would add input latency).
    /// </summary>
    public static class StickShaping
    {
        public static void Shape(float x, float y, float innerDeadZone, float outerDeadZone, float exponent, out float outX, out float outY)
        {
            float mag = (float)Math.Sqrt(x * x + y * y);
            if (mag <= innerDeadZone || mag <= 1e-6f)
            {
                outX = 0f;
                outY = 0f;
                return;
            }

            float t = MathUtil.Clamp01((mag - innerDeadZone) / Math.Max(1e-4f, outerDeadZone - innerDeadZone));
            float shaped = (float)Math.Pow(t, Math.Max(0.1f, exponent));
            outX = x / mag * shaped;
            outY = y / mag * shaped;
        }
    }

    public enum BufferedAction
    {
        Interact = 0,
        EnterExitVehicle = 1,
        Switch = 2,
        Strike = 3,
        PartnerOrder = 4,
    }

    /// <summary>
    /// Short per-action input buffer (100–150 ms). Discrete presses survive a frame or two of an
    /// incompatible state but never replay after a context change (switch, cutscene, load).
    /// </summary>
    public sealed class ActionBuffer
    {
        private readonly Dictionary<BufferedAction, double> _pressedAt = new Dictionary<BufferedAction, double>();
        private readonly Dictionary<BufferedAction, double> _window = new Dictionary<BufferedAction, double>();

        public ActionBuffer()
        {
            _window[BufferedAction.Interact] = 0.15;
            _window[BufferedAction.EnterExitVehicle] = 0.15;
            _window[BufferedAction.Switch] = 0.10;
            _window[BufferedAction.Strike] = 0.12;
            _window[BufferedAction.PartnerOrder] = 0.10;
        }

        public int ContextVersion { get; private set; }

        public void Press(BufferedAction action, double now) => _pressedAt[action] = now;

        public bool Peek(BufferedAction action, double now) =>
            _pressedAt.TryGetValue(action, out double t) && now - t <= _window[action];

        public bool Consume(BufferedAction action, double now)
        {
            if (!Peek(action, now))
            {
                return false;
            }

            _pressedAt.Remove(action);
            return true;
        }

        /// <summary>Drop all buffered intent: control changed hands or a cutscene/menu took over.</summary>
        public void InvalidateContext()
        {
            _pressedAt.Clear();
            ContextVersion++;
        }
    }

    /// <summary>
    /// Cumulative control-suppression cap so repeated small reactions cannot stun-lock the player:
    /// within a rolling window, total suppression is capped and further reactions become presentation-only.
    /// </summary>
    public sealed class ReactionGovernor
    {
        public float WindowSeconds = 3f;
        public float MaxSuppressionInWindow = 0.6f;
        public float MinorReaction = 0.18f;
        public float MajorReaction = 0.6f;

        private readonly Queue<(double time, float amount)> _history = new Queue<(double, float)>();
        private float _sum;

        /// <summary>Returns the control-loss seconds actually granted for a requested reaction.</summary>
        public float Request(double now, bool major)
        {
            while (_history.Count > 0 && now - _history.Peek().time > WindowSeconds)
            {
                _sum -= _history.Dequeue().amount;
            }

            float want = major ? MajorReaction : MinorReaction;
            float grant = Math.Max(0f, Math.Min(want, MaxSuppressionInWindow - _sum));
            if (grant > 0f)
            {
                _history.Enqueue((now, grant));
                _sum += grant;
            }

            return grant;
        }
    }
}
