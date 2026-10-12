using System;
using System.Collections.Generic;
using PortMarlowe.Core.Interaction;
using PortMarlowe.Game.Characters;
using UnityEngine;

namespace PortMarlowe.Game.Interaction
{
    /// <summary>
    /// A world object the X button can act on (doors, bed, wardrobe...). Availability is evaluated
    /// per actor so locked or unavailable actions show a readable reason instead of a false prompt.
    /// </summary>
    public sealed class Interactable : MonoBehaviour
    {
        private static readonly List<Interactable> All = new List<Interactable>();
        private static int _nextId = 1;

        public int Id { get; private set; }
        public InteractionPriority Priority = InteractionPriority.Service;
        public float MaxDistance = 1.8f;
        public Func<Protagonist, string> Label = _ => "Interact";

        /// <summary>Returns null/empty when available, otherwise the reason shown to the player.</summary>
        public Func<Protagonist, string> Unavailable = _ => null;

        public Action<Protagonist> Activate = _ => { };

        public static IReadOnlyList<Interactable> Registry => All;

        private void OnEnable()
        {
            if (Id == 0)
            {
                Id = _nextId++;
            }

            All.Add(this);
        }

        private void OnDisable() => All.Remove(this);

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics()
        {
            All.Clear();
            _nextId = 1;
        }
    }

    /// <summary>
    /// InteractionResolver (Unity side): gathers nearby interactables, ranks them with the core
    /// <see cref="InteractionRanker"/> (priority, distance, facing, hysteresis) and exposes one stable target.
    /// </summary>
    public sealed class InteractionResolver
    {
        private readonly InteractionRanker _ranker = new InteractionRanker();
        private readonly List<InteractionCandidate> _candidates = new List<InteractionCandidate>();
        private readonly List<Interactable> _sources = new List<Interactable>();

        public Interactable Current { get; private set; }
        public string CurrentLabel { get; private set; } = string.Empty;
        public string CurrentBlockedReason { get; private set; } = string.Empty;

        public void Update(Protagonist actor)
        {
            _candidates.Clear();
            _sources.Clear();
            Current = null;
            CurrentLabel = string.Empty;
            CurrentBlockedReason = string.Empty;
            if (actor == null || actor.State != ProtagonistState.OnFoot)
            {
                _ranker.Reset();
                return;
            }

            Vector3 pos = actor.transform.position;
            Vector3 fwd = actor.transform.forward;
            foreach (var it in Interactable.Registry)
            {
                if (it == null || !it.isActiveAndEnabled)
                {
                    continue;
                }

                Vector3 to = it.transform.position - pos;
                float vertical = Mathf.Abs(to.y);
                to.y = 0f;
                float d = to.magnitude;
                if (d > it.MaxDistance + 0.5f || vertical > 2f)
                {
                    continue;
                }

                string reason = it.Unavailable(actor);
                _candidates.Add(new InteractionCandidate
                {
                    Id = it.Id,
                    Priority = it.Priority,
                    Distance = d,
                    MaxDistance = it.MaxDistance,
                    AngleDegrees = d < 0.4f ? 0f : Vector3.Angle(fwd, to),
                    Available = string.IsNullOrEmpty(reason),
                    Label = it.Label(actor),
                    UnavailableReason = reason,
                });
                _sources.Add(it);
            }

            int i = _ranker.Select(_candidates);
            if (i >= 0)
            {
                Current = _sources[i];
                CurrentLabel = _candidates[i].Label;
                CurrentBlockedReason = _candidates[i].Available ? string.Empty : _candidates[i].UnavailableReason;
            }
        }

        public bool TryActivate(Protagonist actor, out string blockedReason)
        {
            blockedReason = CurrentBlockedReason;
            if (Current == null || !string.IsNullOrEmpty(CurrentBlockedReason))
            {
                return false;
            }

            Current.Activate(actor);
            return true;
        }
    }
}
