using System;
using System.Collections.Generic;

namespace PortMarlowe.Core.Control
{
    public enum SwitchBlockReason
    {
        None = 0,
        AlreadyControlled,
        UnknownTarget,
        TargetIncapacitated,
        /// <summary>The current character is inside a committed action (entering a seat, mid break-in).</summary>
        SourceCommitted,
        TargetCommitted,
        /// <summary>A save or load transaction is writing state.</summary>
        SaveInProgress,
        /// <summary>Authored lock (mission scene). Always shown with its reason text.</summary>
        AuthoredLock,
        SwitchInProgress,
        /// <summary>Target being arrested or otherwise held by an unresolved world transaction.</summary>
        TargetDetained,
    }

    /// <summary>Per-character facts the switch validator needs, supplied by the runtime layer.</summary>
    public struct SwitchCandidateState
    {
        public bool Exists;
        public bool Incapacitated;
        public bool InCommittedAction;
        public bool Detained;
    }

    public interface ISwitchContext
    {
        SwitchCandidateState Describe(StableId character);
        bool SaveInProgress { get; }
    }

    public sealed class SwitchTransaction
    {
        public int Id;
        public StableId From;
        public StableId To;
        public double StartedAt;
        public bool LocalHandoff;
        public bool Completed;
    }

    /// <summary>
    /// ControlOwnershipService: exactly one input owner. A switch transfers ownership atomically at
    /// <see cref="TryBeginSwitch"/>; presentation (camera blend) then completes the transaction.
    /// Both characters stay in the same world time; nothing about wanted state, ammo, seats or
    /// physics is reset by switching.
    /// </summary>
    public sealed class ControlOwnershipService
    {
        /// <summary>Characters further apart than this use the longer streaming-aware transition.</summary>
        public const float LocalHandoffDistance = 60f;

        private readonly List<StableId> _roster = new List<StableId>();
        private readonly EventLog _log;
        private int _nextTx = 1;
        private string _authoredLockReason = string.Empty;

        public ControlOwnershipService(EventLog log = null)
        {
            _log = log;
        }

        public StableId Controlled { get; private set; } = StableId.None;
        public SwitchTransaction Active { get; private set; }
        public int CompletedSwitches { get; private set; }

        public IReadOnlyList<StableId> Roster => _roster;

        /// <summary>Raised once per ownership change: (from, to, transaction).</summary>
        public event Action<StableId, StableId, SwitchTransaction> OwnershipChanged;

        public void Register(StableId character)
        {
            if (!_roster.Contains(character))
            {
                _roster.Add(character);
            }
        }

        /// <summary>Initial ownership (new game / load). Not a switch: no transaction is created.</summary>
        public void SetInitialOwner(StableId character)
        {
            if (!_roster.Contains(character))
            {
                throw new ArgumentException($"{character} is not a registered protagonist.");
            }

            var previous = Controlled;
            Controlled = character;
            Active = null;
            OwnershipChanged?.Invoke(previous, character, null);
        }

        public void SetAuthoredLock(string reason) => _authoredLockReason = reason ?? string.Empty;
        public void ClearAuthoredLock() => _authoredLockReason = string.Empty;
        public string AuthoredLockReason => _authoredLockReason;

        /// <summary>The other roster member (two-protagonist game) or None.</summary>
        public StableId NextCandidate()
        {
            if (_roster.Count < 2)
            {
                return StableId.None;
            }

            int i = _roster.IndexOf(Controlled);
            return _roster[(i + 1) % _roster.Count];
        }

        public SwitchBlockReason Validate(StableId target, ISwitchContext context)
        {
            if (Active != null && !Active.Completed)
            {
                return SwitchBlockReason.SwitchInProgress;
            }

            if (!string.IsNullOrEmpty(_authoredLockReason))
            {
                return SwitchBlockReason.AuthoredLock;
            }

            if (!_roster.Contains(target))
            {
                return SwitchBlockReason.UnknownTarget;
            }

            if (target == Controlled)
            {
                return SwitchBlockReason.AlreadyControlled;
            }

            if (context.SaveInProgress)
            {
                return SwitchBlockReason.SaveInProgress;
            }

            var t = context.Describe(target);
            if (!t.Exists)
            {
                return SwitchBlockReason.UnknownTarget;
            }

            if (t.Incapacitated)
            {
                return SwitchBlockReason.TargetIncapacitated;
            }

            if (t.Detained)
            {
                return SwitchBlockReason.TargetDetained;
            }

            if (t.InCommittedAction)
            {
                return SwitchBlockReason.TargetCommitted;
            }

            if (!Controlled.IsNone && context.Describe(Controlled).InCommittedAction)
            {
                return SwitchBlockReason.SourceCommitted;
            }

            return SwitchBlockReason.None;
        }

        /// <summary>
        /// Validates and, if allowed, transfers ownership immediately. Returns the transaction or null
        /// with <paramref name="reason"/> explaining the block.
        /// </summary>
        public SwitchTransaction TryBeginSwitch(StableId target, ISwitchContext context, double now, float distanceBetween, out SwitchBlockReason reason)
        {
            reason = Validate(target, context);
            if (reason != SwitchBlockReason.None)
            {
                _log?.Record(now, LogCategory.Control, target, $"switch blocked: {reason}");
                return null;
            }

            var tx = new SwitchTransaction
            {
                Id = _nextTx++,
                From = Controlled,
                To = target,
                StartedAt = now,
                LocalHandoff = distanceBetween <= LocalHandoffDistance,
            };
            Active = tx;
            Controlled = target;
            _log?.Record(now, LogCategory.Control, target, $"switch #{tx.Id} {tx.From} -> {tx.To} ({(tx.LocalHandoff ? "local" : "remote")})");
            OwnershipChanged?.Invoke(tx.From, tx.To, tx);
            return tx;
        }

        /// <summary>Presentation finished (camera arrived). Idempotent.</summary>
        public void CompleteSwitch(int transactionId, double now)
        {
            if (Active == null || Active.Id != transactionId || Active.Completed)
            {
                return;
            }

            Active.Completed = true;
            CompletedSwitches++;
            _log?.Record(now, LogCategory.Control, Active.To, $"switch #{Active.Id} complete");
        }

        public static string Describe(SwitchBlockReason reason, string authoredLockText = null)
        {
            switch (reason)
            {
                case SwitchBlockReason.None: return string.Empty;
                case SwitchBlockReason.AlreadyControlled: return "Already in control.";
                case SwitchBlockReason.UnknownTarget: return "Partner unavailable.";
                case SwitchBlockReason.TargetIncapacitated: return "Partner is down.";
                case SwitchBlockReason.SourceCommitted: return "Finish the current action first.";
                case SwitchBlockReason.TargetCommitted: return "Partner is mid-action.";
                case SwitchBlockReason.SaveInProgress: return "Saving...";
                case SwitchBlockReason.AuthoredLock: return string.IsNullOrEmpty(authoredLockText) ? "Switching is locked here." : authoredLockText;
                case SwitchBlockReason.SwitchInProgress: return "Switch in progress.";
                case SwitchBlockReason.TargetDetained: return "Partner is being detained.";
                default: return reason.ToString();
            }
        }
    }
}
