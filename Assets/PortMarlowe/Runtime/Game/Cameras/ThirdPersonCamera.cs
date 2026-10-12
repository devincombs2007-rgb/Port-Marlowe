using UnityEngine;

namespace PortMarlowe.Game.Cameras
{
    /// <summary>Per-context framing (see Docs/Specs/Camera.md). Distances in metres, damping in seconds.</summary>
    public sealed class CameraProfile
    {
        public string Name;
        public float Distance;
        public float PivotHeight;
        public float ShoulderOffset;
        public float Fov;
        public float MinPitch;
        public float MaxPitch;
        public float FollowDamping;
        public float RecenterDelay;
        public float RecenterSpeed;
        public float SpeedFovBonus;

        public static readonly CameraProfile OnFoot = new CameraProfile
        {
            Name = "OnFoot", Distance = 3.3f, PivotHeight = 1.58f, ShoulderOffset = 0.48f, Fov = 58f,
            MinPitch = -40f, MaxPitch = 68f, FollowDamping = 0.05f, RecenterDelay = -1f, RecenterSpeed = 0f, SpeedFovBonus = 3f,
        };

        public static readonly CameraProfile Vehicle = new CameraProfile
        {
            Name = "Vehicle", Distance = 6.6f, PivotHeight = 1.9f, ShoulderOffset = 0f, Fov = 60f,
            MinPitch = -15f, MaxPitch = 55f, FollowDamping = 0.08f, RecenterDelay = 1.4f, RecenterSpeed = 140f, SpeedFovBonus = 9f,
        };

        public static readonly CameraProfile Interior = new CameraProfile
        {
            Name = "Interior", Distance = 2.4f, PivotHeight = 1.5f, ShoulderOffset = 0.35f, Fov = 62f,
            MinPitch = -40f, MaxPitch = 60f, FollowDamping = 0.04f, RecenterDelay = -1f, RecenterSpeed = 0f, SpeedFovBonus = 0f,
        };
    }

    /// <summary>
    /// Orbit camera with swept collision. Deliberate stick input rotates the camera directly (no
    /// smoothing on rotation); follow smoothing uses frame-rate independent exponential damping.
    /// Collision compresses instantly and recovers with a slower time constant (hysteresis), so the
    /// camera never clips through walls and does not oscillate at corners.
    /// </summary>
    public sealed class ThirdPersonCamera : MonoBehaviour
    {
        public const float CollisionRadius = 0.22f;
        public const float RecoverTimeConstant = 0.35f;

        private Camera _camera;
        private Transform _target;
        private Rigidbody _targetBody;
        private CameraProfile _profile = CameraProfile.OnFoot;
        private CameraProfile _fromProfile;
        private float _profileBlend = 1f;
        private float _yaw;
        private float _pitch = 12f;
        private float _currentDistance;
        private Vector3 _pivot;
        private float _shoulderSide = 1f;
        private float _shoulderLerp = 1f;
        private float _sinceLookInput;
        private float _transitionTime;
        private float _transitionDuration;
        private Vector3 _transitionFromPos;
        private Quaternion _transitionFromRot;
        private float _shake;

        public Camera Camera => _camera;
        public float Yaw => _yaw;
        public bool InTransition => _transitionTime < _transitionDuration;

        public static ThirdPersonCamera Create(Transform parent)
        {
            var go = new GameObject("MainCamera");
            go.transform.SetParent(parent, false);
            var cam = go.AddComponent<Camera>();
            cam.nearClipPlane = 0.08f;
            cam.farClipPlane = 1800f;
            cam.fieldOfView = CameraProfile.OnFoot.Fov;
            go.AddComponent<AudioListener>();
            var rig = go.AddComponent<ThirdPersonCamera>();
            rig._camera = cam;
            go.tag = "MainCamera";
            return rig;
        }

        public void SetTarget(Transform target, Rigidbody body, CameraProfile profile, bool snap)
        {
            _target = target;
            _targetBody = body;
            SetProfile(profile);
            if (snap && target != null)
            {
                _yaw = target.eulerAngles.y;
                _pitch = 12f;
                _pivot = target.position + Vector3.up * _profile.PivotHeight;
                _currentDistance = _profile.Distance;
                Apply(1f, true);
            }
        }

        public void SetProfile(CameraProfile profile)
        {
            if (profile == _profile)
            {
                return;
            }

            _fromProfile = _profile;
            _profile = profile;
            _profileBlend = 0f;
        }

        /// <summary>Begin a smooth handoff to a new target (character switch). Control is already transferred.</summary>
        public void BeginTransition(Transform newTarget, Rigidbody body, CameraProfile profile, float duration)
        {
            _transitionFromPos = transform.position;
            _transitionFromRot = transform.rotation;
            _transitionTime = 0f;
            _transitionDuration = Mathf.Max(0.05f, duration);
            _target = newTarget;
            _targetBody = body;
            _profile = profile;
            _profileBlend = 1f;
            if (newTarget != null)
            {
                _yaw = newTarget.eulerAngles.y;
                _pitch = Mathf.Clamp(_pitch, 0f, 25f);
                _pivot = newTarget.position + Vector3.up * profile.PivotHeight;
                _currentDistance = profile.Distance;
            }
        }

        public void SwapShoulder() => _shoulderSide = -_shoulderSide;

        public void AddShake(float amount) => _shake = Mathf.Min(1f, _shake + amount);

        /// <summary>Apply look input (degrees this frame). Called by the player controller before LateUpdate.</summary>
        public void Look(Vector2 degrees)
        {
            if (degrees.sqrMagnitude > 1e-6f)
            {
                _sinceLookInput = 0f;
            }

            _yaw += degrees.x;
            _pitch = Mathf.Clamp(_pitch - degrees.y, _profile.MinPitch, _profile.MaxPitch);
        }

        /// <summary>World-space forward on the ground plane (movement is camera-relative).</summary>
        public Vector3 FlatForward => Quaternion.Euler(0f, _yaw, 0f) * Vector3.forward;
        public Vector3 FlatRight => Quaternion.Euler(0f, _yaw, 0f) * Vector3.right;

        private void LateUpdate()
        {
            if (_target == null)
            {
                return;
            }

            float dt = Time.unscaledDeltaTime;
            if (Time.timeScale <= 0f)
            {
                return;
            }

            _sinceLookInput += dt;
            _profileBlend = Mathf.MoveTowards(_profileBlend, 1f, dt / 0.35f);
            Apply(dt, false);
        }

        private void Apply(float dt, bool snap)
        {
            var p = _profile;
            var from = _fromProfile ?? p;
            float b = Mathf.SmoothStep(0f, 1f, _profileBlend);
            float distance = Mathf.Lerp(from.Distance, p.Distance, b);
            float pivotHeight = Mathf.Lerp(from.PivotHeight, p.PivotHeight, b);
            float shoulder = Mathf.Lerp(from.ShoulderOffset, p.ShoulderOffset, b);
            float speed = _targetBody != null ? _targetBody.linearVelocity.magnitude : 0f;
            float fov = Mathf.Lerp(from.Fov, p.Fov, b) + p.SpeedFovBonus * Mathf.Clamp01((speed - 8f) / 30f);

            // Vehicle recentre: after a pause in look input, swing behind the direction of travel.
            if (p.RecenterDelay >= 0f && _sinceLookInput > p.RecenterDelay && speed > 3f)
            {
                Vector3 vel = _targetBody.linearVelocity;
                vel.y = 0f;
                float targetYaw = vel.sqrMagnitude > 1f ? Mathf.Atan2(vel.x, vel.z) * Mathf.Rad2Deg : _target.eulerAngles.y;
                _yaw = Mathf.MoveTowardsAngle(_yaw, targetYaw, p.RecenterSpeed * dt * Mathf.Clamp01(speed / 12f));
                _pitch = Mathf.MoveTowards(_pitch, 10f, 20f * dt);
            }

            Vector3 desiredPivot = _target.position + Vector3.up * pivotHeight;
            float follow = snap ? 1f : 1f - Mathf.Exp(-dt / Mathf.Max(0.001f, p.FollowDamping));
            _pivot = Vector3.Lerp(_pivot, desiredPivot, follow);

            _shoulderLerp = Mathf.MoveTowards(_shoulderLerp, _shoulderSide, dt / 0.2f);
            var rot = Quaternion.Euler(_pitch, _yaw, 0f);
            Vector3 shoulderOffset = rot * Vector3.right * (shoulder * _shoulderLerp);

            // Swept collision from pivot (via shoulder) to desired position.
            Vector3 origin = _pivot;
            Vector3 shoulderPoint = origin + shoulderOffset;
            if (Physics.SphereCast(origin, CollisionRadius * 0.8f, shoulderOffset.normalized, out var sh, shoulderOffset.magnitude, GameLayers.CameraBlockers, QueryTriggerInteraction.Ignore))
            {
                shoulderPoint = origin + shoulderOffset.normalized * Mathf.Max(0f, sh.distance - 0.05f);
            }

            Vector3 back = rot * Vector3.back;
            float allowed = distance;
            if (Physics.SphereCast(shoulderPoint, CollisionRadius, back, out var hit, distance, GameLayers.CameraBlockers, QueryTriggerInteraction.Ignore))
            {
                allowed = Mathf.Max(0.35f, hit.distance - 0.05f);
            }

            // Compress immediately, recover slowly.
            if (snap || allowed < _currentDistance)
            {
                _currentDistance = allowed;
            }
            else
            {
                _currentDistance = Mathf.Lerp(_currentDistance, allowed, 1f - Mathf.Exp(-dt / RecoverTimeConstant));
            }

            Vector3 pos = shoulderPoint + back * _currentDistance;
            var look = rot;

            if (_shake > 0f)
            {
                _shake = Mathf.MoveTowards(_shake, 0f, dt * 2.5f);
                float s = _shake * _shake * (GameSettings.ReducedCameraShake ? 0.25f : 1f);
                look *= Quaternion.Euler(Mathf.PerlinNoise(Time.time * 25f, 0f) * 2f * s - s, Mathf.PerlinNoise(0f, Time.time * 25f) * 2f * s - s, 0f);
            }

            if (_transitionTime < _transitionDuration)
            {
                _transitionTime += dt;
                float k = Mathf.SmoothStep(0f, 1f, Mathf.Clamp01(_transitionTime / _transitionDuration));
                pos = Vector3.Lerp(_transitionFromPos, pos, k);
                look = Quaternion.Slerp(_transitionFromRot, look, k);
            }

            transform.SetPositionAndRotation(pos, look);
            _camera.fieldOfView = Mathf.Lerp(_camera.fieldOfView, fov, snap ? 1f : 1f - Mathf.Exp(-dt / 0.3f));
        }
    }
}
