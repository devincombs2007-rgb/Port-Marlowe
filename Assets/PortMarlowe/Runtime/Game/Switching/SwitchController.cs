using PortMarlowe.Core;
using PortMarlowe.Core.Control;
using PortMarlowe.Game.Cameras;
using PortMarlowe.Game.Characters;
using UnityEngine;

namespace PortMarlowe.Game.Switching
{
    /// <summary>
    /// Runs the character switch transaction: validation (core ControlOwnershipService), atomic
    /// ownership transfer, buffered-input invalidation, AI handover of the previous character, and
    /// the camera handoff. World time never pauses; wanted state, seats and vehicle physics are not touched.
    /// </summary>
    public sealed class SwitchController : ISwitchContext
    {
        public const float LocalTransitionSeconds = 0.6f;
        public const float RemoteTransitionSeconds = 1.2f;

        private readonly GameSession _s;
        private SwitchTransaction _active;
        private float _completeAt;

        public SwitchController(GameSession session)
        {
            _s = session;
        }

        public bool SaveInProgress => _s.Save != null && _s.Save.IsWriting;

        public bool Busy => _active != null;

        public SwitchCandidateState Describe(StableId character)
        {
            if (!_s.Protagonists.TryGetValue(character, out var p) || p == null)
            {
                return default;
            }

            return new SwitchCandidateState
            {
                Exists = true,
                Incapacitated = p.Health <= 0f,
                InCommittedAction = p.InCommittedAction,
                Detained = p.State == ProtagonistState.Detained,
            };
        }

        /// <summary>Attempt a switch to the other protagonist. Returns false with a player-facing reason.</summary>
        public bool RequestSwitch(out string reason)
        {
            reason = string.Empty;
            var from = _s.Controlled;
            var target = _s.Control.NextCandidate();
            if (from == null || target.IsNone || !_s.Protagonists.TryGetValue(target, out var to))
            {
                reason = "No one to switch to.";
                return false;
            }

            float distance = Vector3.Distance(from.transform.position, to.transform.position);
            var tx = _s.Control.TryBeginSwitch(target, this, _s.Now, distance, out var block);
            if (tx == null)
            {
                reason = ControlOwnershipService.Describe(block, _s.Control.AuthoredLockReason);
                return false;
            }

            _active = tx;
            ApplyOwnership(from, to);
            float duration = tx.LocalHandoff ? LocalTransitionSeconds : RemoteTransitionSeconds;
            _completeAt = Time.unscaledTime + duration;
            var body = to.InVehicle && to.Vehicle != null ? to.Vehicle.Controller.Body : null;
            _s.CameraRig.BeginTransition(to.transform, body, to.InVehicle ? CameraProfile.Vehicle : CameraProfile.OnFoot, duration);
            _s.Notify("Now playing as " + to.Profile.ShortName, 2f);
            return true;
        }

        /// <summary>Make the given protagonist the input owner without a transition (new game, load).</summary>
        public void SetInitial(Protagonist p)
        {
            _s.Control.SetInitialOwner(p.Id);
            foreach (var other in _s.Protagonists.Values)
            {
                other.IsPlayerControlled = other == p;
            }

            var body = p.InVehicle && p.Vehicle != null ? p.Vehicle.Controller.Body : null;
            _s.CameraRig.SetTarget(p.transform, body, p.InVehicle ? CameraProfile.Vehicle : CameraProfile.OnFoot, snap: true);
        }

        public void Tick()
        {
            if (_active != null && Time.unscaledTime >= _completeAt)
            {
                _s.Control.CompleteSwitch(_active.Id, _s.Now);
                _active = null;
            }
        }

        private void ApplyOwnership(Protagonist from, Protagonist to)
        {
            from.IsPlayerControlled = false;
            to.IsPlayerControlled = true;
            // The previous character's in-flight approach (not committed) is cancelled cleanly; committed
            // transfers finish under AI control.
            if (from.Transition != null && !from.Transition.Committed)
            {
                from.CancelTransition();
            }

            if (to.Transition != null && !to.Transition.Committed)
            {
                to.CancelTransition();
            }

            var partner = from.GetComponent<PartnerController>();
            partner?.OnBecameAi();
            var player = _s.Input;
            player.StopRumble();
        }
    }
}
