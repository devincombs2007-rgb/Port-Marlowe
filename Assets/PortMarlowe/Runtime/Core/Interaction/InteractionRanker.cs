using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Interaction
{
    /// <summary>
    /// Explicit priority classes so overloaded buttons never produce an accidental crime:
    /// a door/vehicle owned by the player outranks a pedestrian next to it, and illegal actions
    /// (break-in) rank below legal ones at equal geometry.
    /// </summary>
    public enum InteractionPriority
    {
        Ambient = 0,
        IllegalAction = 1,
        Pickup = 2,
        Service = 3,
        Door = 4,
        VehicleEntry = 5,
    }

    public struct InteractionCandidate
    {
        public int Id;
        public InteractionPriority Priority;
        public float Distance;
        public float MaxDistance;

        /// <summary>Angle between the character's facing (or camera) and the target, degrees.</summary>
        public float AngleDegrees;

        public bool Available;
        public string Label;
        public string UnavailableReason;
    }

    /// <summary>
    /// InteractionResolver core: ranks candidates by intent (priority), distance and view alignment,
    /// with hysteresis so the prompt does not flicker between two similar targets.
    /// </summary>
    public sealed class InteractionRanker
    {
        public float SwitchMargin = 0.15f;
        public float MaxAngle = 100f;

        private int _currentId = -1;

        public int CurrentId => _currentId;

        public static float Score(in InteractionCandidate c, float maxAngle)
        {
            if (c.Distance > c.MaxDistance || c.AngleDegrees > maxAngle)
            {
                return float.NegativeInfinity;
            }

            float distanceTerm = 1f - MathUtil.Clamp01(c.Distance / Math.Max(0.01f, c.MaxDistance));
            float angleTerm = 1f - MathUtil.Clamp01(c.AngleDegrees / maxAngle);
            return (int)c.Priority * 1.0f + distanceTerm * 0.6f + angleTerm * 0.4f;
        }

        /// <summary>Returns the index of the chosen candidate in <paramref name="candidates"/>, or -1.</summary>
        public int Select(IReadOnlyList<InteractionCandidate> candidates)
        {
            int bestIndex = -1;
            float bestScore = float.NegativeInfinity;
            int currentIndex = -1;
            float currentScore = float.NegativeInfinity;

            for (int i = 0; i < candidates.Count; i++)
            {
                float s = Score(candidates[i], MaxAngle);
                if (float.IsNegativeInfinity(s))
                {
                    continue;
                }

                if (candidates[i].Id == _currentId)
                {
                    currentIndex = i;
                    currentScore = s;
                }

                if (s > bestScore)
                {
                    bestScore = s;
                    bestIndex = i;
                }
            }

            if (currentIndex >= 0 && bestIndex != currentIndex && bestScore < currentScore + SwitchMargin)
            {
                bestIndex = currentIndex;
            }

            _currentId = bestIndex >= 0 ? candidates[bestIndex].Id : -1;
            return bestIndex;
        }

        public void Reset() => _currentId = -1;
    }
}
