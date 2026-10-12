using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.Vehicles
{
    /// <summary>
    /// Identity and gameplay state of a vehicle: seats, doors, ownership, security, fuel and
    /// condition. Physics lives in <see cref="VehicleController"/>; occupancy authority lives in the
    /// shared <see cref="SeatReservationService"/>.
    /// </summary>
    public sealed class VehicleEntity : MonoBehaviour
    {
        public EntityId Id;
        public string Archetype = "sedan";
        public string ModelName = "Aldine Courier";
        public string Plate = string.Empty;
        public ColorFamily ColorFamily;
        public Color Paint;
        public VehicleSecurityLevel Security = VehicleSecurityLevel.Low;
        public EntityId Owner = EntityId.None;
        public bool Locked;
        public bool Persistent;
        public bool IsPolice;

        /// <summary>Seat anchors (0 = driver, 1 = front passenger, 2/3 = rear).</summary>
        public Transform[] Seats;

        /// <summary>Kerb-side standing positions per seat, in vehicle-local space.</summary>
        public Vector3[] DoorPointsLocal;

        public Transform[] DoorPanels;
        public FuelModel Fuel = new FuelModel();
        public VehicleCondition Condition = new VehicleCondition();
        public VehicleController Controller;
        public Renderer[] LightRenderers;
        public Material BrakeLightMaterial;
        public Material HeadLightMaterial;
        public Material BeaconMaterialA;
        public Material BeaconMaterialB;
        public Light[] HeadLights;

        /// <summary>Glass broken by a break-in (presentation + no re-break).</summary>
        public bool WindowBroken { get; set; }

        public bool SirenOn { get; set; }
        public bool AlarmActive => Time.time < _alarmUntil;

        private float _alarmUntil;
        private readonly float[] _doorOpen = new float[4];
        private readonly float[] _doorTarget = new float[4];

        public VehicleDescriptor Descriptor => new VehicleDescriptor(Archetype, ColorFamily, Plate);

        public Vector3 DoorPointWorld(int seat) => transform.TransformPoint(DoorPointsLocal[Mathf.Clamp(seat, 0, DoorPointsLocal.Length - 1)]);

        /// <summary>The exit point on the far side for a seat (used when the kerb side is blocked).</summary>
        public Vector3 OppositeDoorPointWorld(int seat)
        {
            var p = DoorPointsLocal[Mathf.Clamp(seat, 0, DoorPointsLocal.Length - 1)];
            return transform.TransformPoint(new Vector3(-p.x, p.y, p.z));
        }

        public bool IsOwnedBy(EntityId who, EntityId partner) => Owner == who || (!partner.IsNone && Owner == partner);

        public void TriggerAlarm(float seconds) => _alarmUntil = Time.time + seconds;

        public void SetDoorOpen(int seat, bool open)
        {
            if (seat >= 0 && seat < _doorTarget.Length)
            {
                _doorTarget[seat] = open ? 1f : 0f;
            }
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            if (DoorPanels != null)
            {
                for (int i = 0; i < DoorPanels.Length && i < _doorOpen.Length; i++)
                {
                    if (DoorPanels[i] == null)
                    {
                        continue;
                    }

                    _doorOpen[i] = Mathf.MoveTowards(_doorOpen[i], _doorTarget[i], dt / 0.25f);
                    float side = DoorPointsLocal[i].x < 0f ? -1f : 1f;
                    DoorPanels[i].localRotation = Quaternion.Euler(0f, side * -62f * Mathf.SmoothStep(0f, 1f, _doorOpen[i]), 0f);
                }
            }

            if (Controller != null)
            {
                bool braking = Controller.Input.Brake > 0.1f && Controller.ForwardSpeed > 0.3f;
                if (BrakeLightMaterial != null)
                {
                    BrakeLightMaterial.SetColor("_EmissionColor", new Color(1f, 0.05f, 0.03f) * (braking ? 3.2f : (Controller.EngineRunning ? 0.8f : 0f)));
                }

                bool lights = Controller.EngineRunning && Lighting.NightFactor > 0.2f;
                if (HeadLightMaterial != null)
                {
                    HeadLightMaterial.SetColor("_EmissionColor", new Color(1f, 0.95f, 0.85f) * (lights ? 3f : (Controller.EngineRunning ? 0.4f : 0f)));
                }

                if (HeadLights != null)
                {
                    foreach (var l in HeadLights)
                    {
                        if (l != null)
                        {
                            l.enabled = lights;
                        }
                    }
                }
            }

            if (IsPolice && BeaconMaterialA != null)
            {
                bool flashA = SirenOn && Mathf.Repeat(Time.time * 3.2f, 1f) < 0.5f;
                bool flashB = SirenOn && !flashA;
                BeaconMaterialA.SetColor("_EmissionColor", new Color(1f, 0.1f, 0.08f) * (flashA ? 6f : 0.1f));
                BeaconMaterialB.SetColor("_EmissionColor", new Color(0.1f, 0.25f, 1f) * (flashB ? 6f : 0.1f));
            }
            else if (AlarmActive && HeadLightMaterial != null)
            {
                bool on = Mathf.Repeat(Time.time * 2f, 1f) < 0.5f;
                HeadLightMaterial.SetColor("_EmissionColor", new Color(1f, 0.85f, 0.4f) * (on ? 3f : 0f));
            }
        }
    }

    /// <summary>Global lighting values readable by presentation code (set by the lighting rig).</summary>
    public static class Lighting
    {
        /// <summary>0 = full day, 1 = full night.</summary>
        public static float NightFactor { get; set; }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics() => NightFactor = 0f;
    }
}
