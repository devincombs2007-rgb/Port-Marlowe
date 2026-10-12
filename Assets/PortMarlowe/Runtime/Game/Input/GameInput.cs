using System;
using PortMarlowe.Core.Character;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PortMarlowe.Game.Input
{
    /// <summary>
    /// The single player-input owner. Actions are built in code (no generated asset) with Xbox
    /// controller bindings first; keyboard/mouse bindings exist for desktop development only and are
    /// never required by the shipped flow. Gameplay code polls this object; nothing else reads devices.
    /// </summary>
    public sealed class GameInput : IDisposable
    {
        public const float StickInnerDeadZone = 0.15f;
        public const float StickOuterDeadZone = 0.95f;
        public const float MoveResponseExponent = 1.0f;
        public const float LookResponseExponent = 1.6f;

        private readonly InputActionAsset _asset;
        private readonly InputActionMap _gameplay;
        private readonly InputActionMap _menu;

        public readonly InputAction Move;
        public readonly InputAction Look;
        public readonly InputAction LookMouse;
        public readonly InputAction Sprint;
        public readonly InputAction Interact;
        public readonly InputAction EnterExit;
        public readonly InputAction Strike;
        public readonly InputAction Switch;
        public readonly InputAction PartnerOrder;
        public readonly InputAction ShoulderSwap;
        public readonly InputAction Pause;
        public readonly InputAction Diagnostics;
        public readonly InputAction Throttle;
        public readonly InputAction Brake;
        public readonly InputAction Handbrake;
        public readonly InputAction Horn;

        public readonly InputAction MenuNavigate;
        public readonly InputAction MenuConfirm;
        public readonly InputAction MenuBack;
        public readonly InputAction MenuPause;

        private float _rumbleUntil;

        public GameInput()
        {
            _asset = ScriptableObject.CreateInstance<InputActionAsset>();
            _asset.name = "PortMarloweInput";
            _gameplay = new InputActionMap("Gameplay");
            _menu = new InputActionMap("Menu");

            Move = _gameplay.AddAction("Move", InputActionType.Value, "<Gamepad>/leftStick");
            Move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");

            Look = _gameplay.AddAction("Look", InputActionType.Value, "<Gamepad>/rightStick");
            LookMouse = _gameplay.AddAction("LookMouse", InputActionType.Value, "<Mouse>/delta");

            Sprint = _gameplay.AddAction("Sprint", InputActionType.Button, "<Gamepad>/buttonSouth");
            Sprint.AddBinding("<Keyboard>/leftShift");
            Interact = _gameplay.AddAction("Interact", InputActionType.Button, "<Gamepad>/buttonWest");
            Interact.AddBinding("<Keyboard>/e");
            EnterExit = _gameplay.AddAction("EnterExit", InputActionType.Button, "<Gamepad>/buttonNorth");
            EnterExit.AddBinding("<Keyboard>/f");
            Strike = _gameplay.AddAction("Strike", InputActionType.Button, "<Gamepad>/buttonEast");
            Strike.AddBinding("<Mouse>/leftButton");
            Switch = _gameplay.AddAction("Switch", InputActionType.Button, "<Gamepad>/dpad/down");
            Switch.AddBinding("<Keyboard>/tab");
            PartnerOrder = _gameplay.AddAction("PartnerOrder", InputActionType.Button, "<Gamepad>/dpad/up");
            PartnerOrder.AddBinding("<Keyboard>/g");
            ShoulderSwap = _gameplay.AddAction("ShoulderSwap", InputActionType.Button, "<Gamepad>/rightStickPress");
            ShoulderSwap.AddBinding("<Keyboard>/c");
            Pause = _gameplay.AddAction("Pause", InputActionType.Button, "<Gamepad>/start");
            Pause.AddBinding("<Keyboard>/escape");
            Diagnostics = _gameplay.AddAction("Diagnostics", InputActionType.Button, "<Gamepad>/select");
            Diagnostics.AddBinding("<Keyboard>/f3");

            Throttle = _gameplay.AddAction("Throttle", InputActionType.Value, "<Gamepad>/rightTrigger");
            Throttle.AddBinding("<Keyboard>/w");
            Brake = _gameplay.AddAction("Brake", InputActionType.Value, "<Gamepad>/leftTrigger");
            Brake.AddBinding("<Keyboard>/s");
            Handbrake = _gameplay.AddAction("Handbrake", InputActionType.Button, "<Gamepad>/rightShoulder");
            Handbrake.AddBinding("<Keyboard>/space");
            Horn = _gameplay.AddAction("Horn", InputActionType.Button, "<Gamepad>/leftStickPress");
            Horn.AddBinding("<Keyboard>/h");

            MenuNavigate = _menu.AddAction("Navigate", InputActionType.Value, "<Gamepad>/dpad");
            MenuNavigate.AddBinding("<Gamepad>/leftStick");
            MenuNavigate.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/upArrow").With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/leftArrow").With("Right", "<Keyboard>/rightArrow");
            MenuConfirm = _menu.AddAction("Confirm", InputActionType.Button, "<Gamepad>/buttonSouth");
            MenuConfirm.AddBinding("<Keyboard>/enter");
            MenuBack = _menu.AddAction("Back", InputActionType.Button, "<Gamepad>/buttonEast");
            MenuBack.AddBinding("<Keyboard>/backspace");
            MenuPause = _menu.AddAction("Pause", InputActionType.Button, "<Gamepad>/start");
            MenuPause.AddBinding("<Keyboard>/escape");

            _asset.AddActionMap(_gameplay);
            _asset.AddActionMap(_menu);
            _asset.Enable();

            InputSystem.onDeviceChange += OnDeviceChange;
        }

        /// <summary>Raised when the active gamepad disconnects (true) or reconnects (false).</summary>
        public event Action<bool> GamepadConnectionChanged;

        public bool GameplayEnabled { get; private set; } = true;

        public bool VibrationEnabled { get; set; } = true;
        public bool InvertY { get; set; }
        public float LookSensitivity { get; set; } = 1f;

        /// <summary>
        /// Analog values injected by the automated smoke test (no device). When set, they replace
        /// the device readings for move/throttle/brake/steer; buttons are unaffected.
        /// </summary>
        public ScriptedInput Scripted { get; set; }

        /// <summary>Enable gameplay actions (menus closed) or menu-only.</summary>
        public void SetGameplayEnabled(bool enabled)
        {
            GameplayEnabled = enabled;
            if (enabled)
            {
                _gameplay.Enable();
            }
            else
            {
                _gameplay.Disable();
                StopRumble();
            }
        }

        /// <summary>Shaped move vector (dead zone + curve, no smoothing).</summary>
        public Vector2 ReadMove()
        {
            if (!GameplayEnabled)
            {
                return Vector2.zero;
            }

            Vector2 raw = Scripted != null ? Scripted.Move : Move.ReadValue<Vector2>();
            StickShaping.Shape(raw.x, raw.y, StickInnerDeadZone, StickOuterDeadZone, MoveResponseExponent, out float x, out float y);
            return new Vector2(x, y);
        }

        /// <summary>
        /// Look input in degrees per second for sticks (scaled by rates) plus mouse deltas converted
        /// to degrees. Stick and mouse sensitivities are separate.
        /// </summary>
        public Vector2 ReadLookDegrees(float dt, float yawRate = 220f, float pitchRate = 150f, float mouseDegreesPerCount = 0.08f)
        {
            if (!GameplayEnabled)
            {
                return Vector2.zero;
            }

            Vector2 raw = Look.ReadValue<Vector2>();
            StickShaping.Shape(raw.x, raw.y, StickInnerDeadZone, StickOuterDeadZone, LookResponseExponent, out float x, out float y);
            Vector2 stick = new Vector2(x * yawRate, y * pitchRate) * (dt * LookSensitivity);
            Vector2 mouse = LookMouse.ReadValue<Vector2>() * mouseDegreesPerCount;
            Vector2 total = stick + mouse;
            if (InvertY)
            {
                total.y = -total.y;
            }

            return total;
        }

        public float ReadThrottle() => GameplayEnabled ? Mathf.Clamp01(Scripted != null ? Scripted.Throttle : Throttle.ReadValue<float>()) : 0f;
        public float ReadBrake() => GameplayEnabled ? Mathf.Clamp01(Scripted != null ? Scripted.Brake : Brake.ReadValue<float>()) : 0f;

        public float ReadSteer()
        {
            if (!GameplayEnabled)
            {
                return 0f;
            }

            Vector2 raw = Scripted != null ? new Vector2(Scripted.Steer, 0f) : Move.ReadValue<Vector2>();
            float a = Mathf.Abs(raw.x);
            if (a < StickInnerDeadZone)
            {
                return 0f;
            }

            return Mathf.Sign(raw.x) * Mathf.Clamp01((a - StickInnerDeadZone) / (StickOuterDeadZone - StickInnerDeadZone));
        }

        public Vector2 ReadMenuNavigate() => MenuNavigate.ReadValue<Vector2>();

        public bool HasGamepad => Gamepad.current != null;

        /// <summary>Short impact rumble, bounded in duration and disabled by the vibration setting.</summary>
        public void Rumble(float low, float high, float seconds)
        {
            if (!VibrationEnabled || Gamepad.current == null)
            {
                return;
            }

            Gamepad.current.SetMotorSpeeds(Mathf.Clamp01(low), Mathf.Clamp01(high));
            _rumbleUntil = Time.unscaledTime + Mathf.Min(seconds, 0.6f);
        }

        public void Tick()
        {
            if (_rumbleUntil > 0f && Time.unscaledTime >= _rumbleUntil)
            {
                StopRumble();
            }
        }

        public void StopRumble()
        {
            _rumbleUntil = 0f;
            Gamepad.current?.SetMotorSpeeds(0f, 0f);
        }

        public void Dispose()
        {
            InputSystem.onDeviceChange -= OnDeviceChange;
            StopRumble();
            _asset.Disable();
            UnityEngine.Object.Destroy(_asset);
        }

        private void OnDeviceChange(InputDevice device, InputDeviceChange change)
        {
            if (!(device is Gamepad))
            {
                return;
            }

            if (change == InputDeviceChange.Disconnected || change == InputDeviceChange.Removed)
            {
                GamepadConnectionChanged?.Invoke(true);
            }
            else if (change == InputDeviceChange.Reconnected || change == InputDeviceChange.Added)
            {
                GamepadConnectionChanged?.Invoke(false);
            }
        }

        /// <summary>Human-readable controller map for the pause menu and docs.</summary>
        public static readonly string[,] ControllerMap =
        {
            { "Left stick", "Move / steer" },
            { "Right stick", "Camera" },
            { "A (hold)", "Sprint" },
            { "B", "Strike / shove" },
            { "X", "Interact (doors, bed, wardrobe)" },
            { "Y", "Enter / exit vehicle" },
            { "RT / LT", "Accelerate / brake-reverse" },
            { "RB", "Handbrake" },
            { "L-stick click", "Horn" },
            { "R-stick click", "Swap camera shoulder" },
            { "D-pad down", "Switch character" },
            { "D-pad up", "Partner: follow / hold" },
            { "Menu", "Pause" },
            { "View", "Diagnostics overlay" },
        };
    }

    /// <summary>Device-free analog input for automated runs.</summary>
    public sealed class ScriptedInput
    {
        public Vector2 Move;
        public float Throttle;
        public float Brake;
        public float Steer;
    }
}
