using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Game.Audio;
using PortMarlowe.Game.Vehicles;
using UnityEngine;

namespace PortMarlowe.Game.Population
{
    /// <summary>
    /// Ambient traffic (PM-024, first pass): a small day/night budget of AI-driven civilian cars
    /// that spawn on lane positions out of the player's view, drive lane routes to random far
    /// destinations, and are retired only when far away and unseen. They yield through the AI
    /// driver's forward obstacle check; there are no signals yet. Traffic cars carry a driver, so
    /// the player cannot target them for entry (carjacking is a later feature).
    /// </summary>
    public sealed class TrafficDirector : MonoBehaviour
    {
        public int DayBudget = 8;
        public int NightBudget = 4;
        public float SpawnMinDistance = 70f;
        public float SpawnMaxDistance = 150f;
        public float DespawnDistance = 185f;
        public float MinDestinationDistance = 120f;

        private sealed class Car
        {
            public VehicleEntity Vehicle;
            public VehicleAIDriver Driver;
            public float StuckTime;
            public Vector3 LastPosition;
        }

        private readonly List<Car> _cars = new List<Car>();
        private GameSession _s;
        private DeterministicRandom _rng;
        private float _tick;
        private int _serial;

        public int Count => _cars.Count;
        public int Budget => Mathf.RoundToInt(Mathf.Lerp(DayBudget, NightBudget, Vehicles.Lighting.NightFactor));

        public void Init(GameSession session)
        {
            _s = session;
            _rng = new DeterministicRandom(session.Seed ^ 0x7AFF1CUL);
        }

        private void Update()
        {
            if (_s == null || _s.Controlled == null || _s.Roads == null)
            {
                return;
            }

            _tick -= Time.deltaTime;
            if (_tick > 0f)
            {
                return;
            }

            const float interval = 1f;
            _tick = interval;
            Vector3 player = _s.Controlled.transform.position;
            for (int i = _cars.Count - 1; i >= 0; i--)
            {
                var c = _cars[i];
                if (c.Vehicle == null)
                {
                    _cars.RemoveAt(i);
                    continue;
                }

                Vector3 p = c.Vehicle.transform.position;
                bool visible = IsVisible(p);
                float moved = (p - c.LastPosition).sqrMagnitude;
                c.LastPosition = p;
                c.StuckTime = moved < 0.25f ? c.StuckTime + interval : 0f;
                bool far = (p - player).sqrMagnitude > DespawnDistance * DespawnDistance;
                bool wrecked = c.Vehicle.Condition.Engine <= 0f || c.Vehicle.Fuel.IsEmpty;
                if (!visible && (far || c.StuckTime > 25f || wrecked))
                {
                    Retire(i);
                    continue;
                }

                if (c.Driver.Arrived)
                {
                    PickDestination(c);
                }
            }

            if (_cars.Count < Budget)
            {
                TrySpawn(player);
            }
        }

        private void TrySpawn(Vector3 player)
        {
            var plan = _s.District.Plan;
            if (plan.Edges.Count == 0)
            {
                return;
            }

            for (int attempt = 0; attempt < 8; attempt++)
            {
                var edge = plan.Edges[_rng.Range(0, plan.Edges.Count)];
                Vector3 a = _s.Roads.NodePosition(edge.A);
                Vector3 b = _s.Roads.NodePosition(edge.B);
                if (_rng.Chance(0.5f))
                {
                    (a, b) = (b, a);
                }

                Vector3 dir = (b - a).Flat();
                if (dir.sqrMagnitude < 400f)
                {
                    continue; // too short to place a car mid-edge
                }

                dir.Normalize();
                Vector3 right = Vector3.Cross(Vector3.up, dir);
                Vector3 pos = Vector3.Lerp(a, b, _rng.Range(0.3f, 0.7f)) + right * _s.Roads.LaneOffset;
                pos.y = a.y;
                float d = Vector3.Distance(pos.Flat(), player.Flat());
                if (d < SpawnMinDistance || d > SpawnMaxDistance || IsVisible(pos))
                {
                    continue;
                }

                if (Physics.CheckSphere(pos + Vector3.up, 5f, GameLayers.Mask(GameLayers.Vehicle, GameLayers.Protagonist, GameLayers.PedestrianSolid), QueryTriggerInteraction.Ignore))
                {
                    continue;
                }

                Spawn(pos, Quaternion.LookRotation(dir).eulerAngles.y);
                return;
            }
        }

        private void Spawn(Vector3 pos, float yaw)
        {
            var paint = VehicleFactory.CivilianPaints[_rng.Range(0, VehicleFactory.CivilianPaints.Length)];
            var id = new StableId("veh.traffic." + (_serial++).ToString("000"));
            var v = VehicleFactory.CreateSedan(_s.Materials, _s.DynamicRoot, id, pos, yaw, paint.color, paint.family, VehicleFactory.RandomPlate(_rng), VehicleLivery.Civilian);
            v.AiDriven = true;
            v.Locked = true;
            v.Security = Core.Vehicles.VehicleSecurityLevel.High;
            _s.RegisterVehicle(v);
            v.gameObject.AddComponent<VehicleImpacts>().Init(_s);
            if (_s.Audio != null)
            {
                VehicleAudio.Attach(v, _s.Audio);
            }

            var driver = v.gameObject.AddComponent<VehicleAIDriver>();
            driver.Init(_s.Roads);
            driver.CruiseSpeed = _rng.Range(8.5f, 12.5f);
            var car = new Car { Vehicle = v, Driver = driver, LastPosition = pos };
            _cars.Add(car);
            PickDestination(car);
        }

        private void PickDestination(Car c)
        {
            Vector3 from = c.Vehicle.transform.position;
            for (int i = 0; i < 10; i++)
            {
                int n = _rng.Range(0, _s.Roads.NodeCount);
                Vector3 target = _s.Roads.NodePosition(n);
                if ((target - from).Flat().sqrMagnitude >= MinDestinationDistance * MinDestinationDistance)
                {
                    c.Driver.DriveTo(target, urgent: false);
                    return;
                }
            }

            c.Driver.DriveTo(_s.Roads.NodePosition(_rng.Range(0, _s.Roads.NodeCount)), urgent: false);
        }

        /// <summary>Conservative: anything inside the camera frustum within draw range counts as seen.</summary>
        private bool IsVisible(Vector3 p)
        {
            var cam = _s.MainCamera;
            if (cam == null)
            {
                return false;
            }

            Vector3 vp = cam.WorldToViewportPoint(p + Vector3.up);
            return vp.z > 0f && vp.z < 260f && vp.x > -0.15f && vp.x < 1.15f && vp.y > -0.15f && vp.y < 1.15f;
        }

        private void Retire(int index)
        {
            var c = _cars[index];
            _cars.RemoveAt(index);
            if (c.Vehicle != null)
            {
                // A car a protagonist ever used (e.g. after a future carjack) becomes persistent and stays.
                if (c.Vehicle.Persistent)
                {
                    return;
                }

                _s.UnregisterVehicle(c.Vehicle);
                Destroy(c.Vehicle.gameObject);
            }
        }

        public void Clear()
        {
            for (int i = _cars.Count - 1; i >= 0; i--)
            {
                Retire(i);
            }
        }
    }
}
