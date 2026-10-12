using PortMarlowe.Core.Character;
using PortMarlowe.Core.Partner;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Cameras;
using PortMarlowe.Game.Interaction;
using PortMarlowe.Game.Population;
using PortMarlowe.Game.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.Characters
{
    /// <summary>
    /// Routes the single input owner's commands to whichever protagonist is controlled. Movement and
    /// steering are applied on the frame they are read; discrete actions use a short buffer that is
    /// invalidated whenever control changes hands.
    /// </summary>
    public sealed class PlayerController : MonoBehaviour
    {
        public const float VehicleSearchRadius = 4.5f;
        public const float StrikeRange = 1.7f;
        public const float StrikeCooldown = 0.6f;

        private GameSession _s;
        private readonly ActionBuffer _buffer = new ActionBuffer();
        private readonly InteractionResolver _interactions = new InteractionResolver();
        private float _nextStrike;
        private Protagonist _lastControlled;

        public InteractionResolver Interactions => _interactions;
        public VehicleEntity TargetVehicle { get; private set; }
        public int TargetSeat { get; private set; } = -1;
        public string TargetVehicleReason { get; private set; } = string.Empty;

        public void Init(GameSession session) => _s = session;

        private void Update()
        {
            if (_s == null)
            {
                return;
            }

            var input = _s.Input;
            input.Tick();
            input.InvertY = GameSettings.InvertY;
            input.LookSensitivity = GameSettings.LookSensitivity;
            input.VibrationEnabled = GameSettings.Vibration;
            _s.Switcher?.Tick();

            var p = _s.Controlled;
            if (p != _lastControlled)
            {
                _buffer.InvalidateContext();
                _lastControlled = p;
            }

            if (p == null || !input.GameplayEnabled)
            {
                return;
            }

            double now = _s.Now;
            float dt = Time.deltaTime;
            if (input.Pause.WasPressedThisFrame())
            {
                _s.Hud.OpenPauseMenu();
                return;
            }

            if (input.Diagnostics.WasPressedThisFrame())
            {
                GameSettings.ShowDiagnostics = !GameSettings.ShowDiagnostics;
            }

            if (input.ShoulderSwap.WasPressedThisFrame())
            {
                _s.CameraRig.SwapShoulder();
            }

            if (input.Switch.WasPressedThisFrame())
            {
                _buffer.Press(BufferedAction.Switch, now);
            }

            if (input.Interact.WasPressedThisFrame())
            {
                _buffer.Press(BufferedAction.Interact, now);
            }

            if (input.EnterExit.WasPressedThisFrame())
            {
                _buffer.Press(BufferedAction.EnterExitVehicle, now);
            }

            if (input.Strike.WasPressedThisFrame())
            {
                _buffer.Press(BufferedAction.Strike, now);
            }

            if (input.PartnerOrder.WasPressedThisFrame())
            {
                _buffer.Press(BufferedAction.PartnerOrder, now);
            }

            _s.CameraRig.Look(input.ReadLookDegrees(dt));

            if (_buffer.Consume(BufferedAction.Switch, now))
            {
                if (!_s.Switcher.RequestSwitch(out string reason))
                {
                    _s.Notify(reason, 2f);
                }

                return;
            }

            if (_buffer.Consume(BufferedAction.PartnerOrder, now))
            {
                TogglePartnerOrder();
            }

            switch (p.State)
            {
                case ProtagonistState.OnFoot:
                    OnFoot(p, input, now);
                    break;
                case ProtagonistState.EnteringVehicle:
                    p.Motor.FaceTowards(null);
                    if (_buffer.Consume(BufferedAction.EnterExitVehicle, now) || _buffer.Consume(BufferedAction.Strike, now))
                    {
                        p.CancelTransition();
                    }

                    break;
                case ProtagonistState.InVehicle:
                    InVehicle(p, input, now);
                    break;
                default:
                    p.Motor.SetIntent(Vector3.zero, 0f);
                    break;
            }
        }

        private void OnFoot(Protagonist p, Input.GameInput input, double now)
        {
            Vector2 move = input.ReadMove();
            Vector3 dir = _s.CameraRig.FlatForward * move.y + _s.CameraRig.FlatRight * move.x;
            float magnitude = Mathf.Clamp01(move.magnitude);
            bool sprint = input.Sprint.IsPressed();
            p.Motor.SetIntent(dir, p.Profile.Locomotion.TargetSpeed(magnitude, sprint && magnitude > 0.3f));

            _interactions.Update(p);
            FindVehicleTarget(p);

            if (_buffer.Consume(BufferedAction.EnterExitVehicle, now))
            {
                if (TargetVehicle != null && TargetSeat >= 0)
                {
                    if (!p.TryBeginEnter(TargetVehicle, TargetSeat, out string why))
                    {
                        _s.Notify(why, 2f);
                    }
                }
                else if (!string.IsNullOrEmpty(TargetVehicleReason))
                {
                    _s.Notify(TargetVehicleReason, 2f);
                }
            }

            if (_buffer.Consume(BufferedAction.Interact, now))
            {
                if (!_interactions.TryActivate(p, out string blocked) && !string.IsNullOrEmpty(blocked))
                {
                    _s.Notify(blocked, 2.5f);
                }
            }

            if (_buffer.Consume(BufferedAction.Strike, now) && Time.time >= _nextStrike)
            {
                Strike(p);
            }

            // Inside the safehouse, tighter interior framing.
            bool inside = _s.Safehouse != null && _s.Safehouse.IsInside(p.transform.position);
            _s.CameraRig.SetProfile(inside ? CameraProfile.Interior : CameraProfile.OnFoot);
        }

        private void InVehicle(Protagonist p, Input.GameInput input, double now)
        {
            var v = p.Vehicle;
            _s.CameraRig.SetProfile(CameraProfile.Vehicle);
            if (p.IsDriver && v != null)
            {
                v.Controller.Input = new DriveInput
                {
                    Throttle = input.ReadThrottle(),
                    Brake = input.ReadBrake(),
                    Steer = input.ReadSteer(),
                    Handbrake = input.Handbrake.IsPressed(),
                };
                var audio = v.GetComponent<VehicleAudio>();
                if (audio != null)
                {
                    audio.HornPressed = input.Horn.IsPressed();
                }

                if (!v.Controller.EngineRunning && (input.ReadThrottle() > 0.2f) && Time.frameCount % 120 == 0)
                {
                    _s.Notify(v.Fuel.IsEmpty ? "Out of fuel." : (v.Condition.State == VehicleHealthState.Disabled ? "Engine's dead." : "Engine off."), 2f);
                }
            }

            if (_buffer.Consume(BufferedAction.EnterExitVehicle, now))
            {
                if (v != null && p.IsDriver)
                {
                    var audio = v.GetComponent<VehicleAudio>();
                    if (audio != null)
                    {
                        audio.HornPressed = false;
                    }
                }

                if (!p.TryBeginExit(out string why) && !string.IsNullOrEmpty(why))
                {
                    _s.Notify(why, 2f);
                }
            }
        }

        private void FindVehicleTarget(Protagonist p)
        {
            TargetVehicle = null;
            TargetSeat = -1;
            TargetVehicleReason = string.Empty;
            float best = VehicleSearchRadius;
            Vector3 pos = p.transform.position;
            foreach (var v in _s.Vehicles.Values)
            {
                if (v == null || v.AiDriven)
                {
                    continue;
                }

                float centre = Vector3.Distance(pos, v.transform.position);
                if (centre > VehicleSearchRadius + 3f)
                {
                    continue;
                }

                for (int seat = 0; seat < v.Seats.Length; seat++)
                {
                    float d = Vector3.Distance(pos, v.DoorPointWorld(seat)) + (seat == 0 ? -0.6f : 0f);
                    if (d >= best)
                    {
                        continue;
                    }

                    var state = _s.Seats.GetState(v.Id, seat, out var holder);
                    if (state != SeatState.Free && holder != p.Id)
                    {
                        continue;
                    }

                    best = d;
                    TargetVehicle = v;
                    TargetSeat = seat;
                }
            }

            if (TargetVehicle != null)
            {
                bool owned = TargetVehicle.IsOwnedBy(p.Id, _s.PartnerOf(p)?.Id ?? PortMarlowe.Core.StableId.None);
                if (TargetVehicle.Locked && !owned && !TargetVehicle.WindowBroken &&
                    !VehicleSecurity.CanAttempt(TargetVehicle.Security, false, out string why))
                {
                    TargetVehicleReason = why;
                    TargetVehicle = null;
                    TargetSeat = -1;
                }
            }
        }

        private void Strike(Protagonist p)
        {
            _nextStrike = Time.time + StrikeCooldown;
            p.PlayPose(RigPose.Strike, 0.42f);
            var victim = _s.Pedestrians != null ? _s.Pedestrians.NearestInFront(p.transform.position, p.transform.forward, StrikeRange, 80f) : null;
            if (victim != null)
            {
                p.Motor.FaceTowards((victim.transform.position - p.transform.position).Flat());
                _s.Crime.CommitAssault(p, victim);
                _s.Audio?.PlayOneShot(SfxKind.Punch, victim.transform.position);
                _s.Input.Rumble(0.4f, 0.3f, 0.12f);
            }
            else if (_s.Police != null && _s.Police.TryStrikeOfficer(p, StrikeRange))
            {
                _s.Audio?.PlayOneShot(SfxKind.Punch, p.transform.position + p.transform.forward);
                _s.Input.Rumble(0.4f, 0.3f, 0.12f);
            }

            Invoke(nameof(ClearFacing), 0.3f);
        }

        private void ClearFacing() => _s?.Controlled?.Motor.FaceTowards(null);

        private void TogglePartnerOrder()
        {
            var partner = _s.Partner;
            if (partner == null)
            {
                return;
            }

            var pc = partner.GetComponent<PartnerController>();
            if (pc == null)
            {
                return;
            }

            pc.Order = pc.Order == PartnerOrder.Follow ? PartnerOrder.Hold : PartnerOrder.Follow;
            _s.Notify(pc.Order == PartnerOrder.Hold ? $"{partner.Profile.ShortName}: \"I'll wait here.\"" : $"{partner.Profile.ShortName}: \"Right behind you.\"", 2.5f);
        }
    }
}
