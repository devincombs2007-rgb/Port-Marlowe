using System.Collections.Generic;
using PortMarlowe.Core;
using PortMarlowe.Core.World;
using PortMarlowe.Game.Characters;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Population
{
    /// <summary>
    /// PopulationDirector for civilians. Keeps a time-of-day density budget around the player,
    /// spawning only where the camera cannot see and retiring only distant, unobserved, non-critical
    /// civilians (a witness mid-call is demoted, which keeps the report alive in the registry).
    /// </summary>
    public sealed class PedestrianDirector : MonoBehaviour
    {
        public int DayBudget = 26;
        public int NightBudget = 12;
        public float SpawnMinDistance = 30f;
        public float SpawnMaxDistance = 85f;
        public float DespawnDistance = 115f;

        private readonly List<Civilian> _active = new List<Civilian>();
        private readonly List<Vector3> _destinations = new List<Vector3>();
        private GameSession _s;
        private DeterministicRandom _rng;
        private int _nextId = 1;
        private float _tick;

        public IReadOnlyList<Civilian> Active => _active;
        public List<Vector3> Destinations => _destinations;
        public int Budget => Mathf.RoundToInt(Mathf.Lerp(DayBudget, NightBudget, Vehicles.Lighting.NightFactor));

        public void Init(GameSession session)
        {
            _s = session;
            _rng = new DeterministicRandom(session.Seed ^ 0x9EDUL);
            foreach (var p in session.District.Plan.Pois)
            {
                if (p.Kind == PoiKind.PedestrianSpot || p.Kind == PoiKind.Bench || p.Kind == PoiKind.ShopFront)
                {
                    if (NavMesh.SamplePosition(p.Position.ToUnity() + Vector3.up * 0.2f, out var hit, 4f, NavMesh.AllAreas))
                    {
                        _destinations.Add(hit.position);
                    }
                }
            }
        }

        /// <summary>Initial fill at load: spawns anywhere in range except directly in view.</summary>
        public void Populate()
        {
            for (int i = 0; i < Budget * 3 && _active.Count < Budget; i++)
            {
                TrySpawn(initial: true);
            }
        }

        private void Update()
        {
            if (_s == null || _s.Controlled == null)
            {
                return;
            }

            _tick -= Time.deltaTime;
            if (_tick > 0f)
            {
                return;
            }

            _tick = 0.5f;
            Vector3 player = _s.Controlled.transform.position;

            // Retire far, unobserved civilians (never visibly).
            for (int i = _active.Count - 1; i >= 0; i--)
            {
                var c = _active[i];
                if (c == null)
                {
                    _active.RemoveAt(i);
                    continue;
                }

                float d = Vector3.Distance(c.transform.position, player);
                bool tooMany = _active.Count > Budget + 4;
                if ((d > DespawnDistance || (tooMany && d > 60f)) && !IsVisible(c.transform.position + Vector3.up) && c.State != CivilianState.Knocked)
                {
                    c.OnDemoted();
                    _active.RemoveAt(i);
                    Destroy(c.gameObject);
                }
            }

            if (_active.Count < Budget)
            {
                TrySpawn(initial: false);
            }
        }

        private bool TrySpawn(bool initial)
        {
            if (_destinations.Count == 0 || _s.Controlled == null)
            {
                return false;
            }

            Vector3 player = _s.Controlled.transform.position;
            for (int attempt = 0; attempt < 6; attempt++)
            {
                Vector3 p = _destinations[_rng.Range(0, _destinations.Count)] + new Vector3(_rng.Range(-3f, 3f), 0f, _rng.Range(-3f, 3f));
                float d = Vector3.Distance(p, player);
                if (d > SpawnMaxDistance || (!initial && d < SpawnMinDistance) || (initial && d < 8f))
                {
                    continue;
                }

                if (!NavMesh.SamplePosition(p, out var hit, 3f, NavMesh.AllAreas))
                {
                    continue;
                }

                if (IsVisible(hit.position + Vector3.up) && (!initial || d < 40f))
                {
                    continue;
                }

                Spawn(hit.position);
                return true;
            }

            return false;
        }

        private Civilian Spawn(Vector3 position)
        {
            var id = new StableId("ped." + _nextId++.ToString("0000"));
            var outfit = Roster.CivilianOutfit(_rng);
            float height = _rng.Range(1.55f, 1.93f);
            float bulk = _rng.Range(0.88f, 1.18f);
            var skin = Roster.SkinTones[_rng.Range(0, Roster.SkinTones.Length)];
            var hair = Roster.HairColors[_rng.Range(0, Roster.HairColors.Length)];
            bool longHair = _rng.Chance(0.4f);
            var body = NpcBody.Create(transform, id, position, _rng.Range(0f, 360f), outfit, height, bulk, skin, hair, longHair, _s.Materials, castShadows: true);
            var c = body.gameObject.AddComponent<Civilian>();
            c.Init(_s, body, _rng.NextULong());
            _active.Add(c);
            return c;
        }

        private bool IsVisible(Vector3 point)
        {
            var cam = _s.MainCamera;
            if (cam == null)
            {
                return false;
            }

            Vector3 vp = cam.WorldToViewportPoint(point);
            if (vp.z <= 0f || vp.x < -0.1f || vp.x > 1.1f || vp.y < -0.1f || vp.y > 1.1f)
            {
                return false;
            }

            // In the frustum: visible unless occluded by world geometry.
            Vector3 from = cam.transform.position;
            Vector3 to = point - from;
            return !Physics.Raycast(from, to.normalized, to.magnitude - 0.5f, GameLayers.WorldStatic, QueryTriggerInteraction.Ignore);
        }

        public Civilian NearestInFront(Vector3 position, Vector3 forward, float range, float coneDegrees)
        {
            Civilian best = null;
            float bestD = range;
            foreach (var c in _active)
            {
                if (c == null || c.State == CivilianState.Knocked)
                {
                    continue;
                }

                Vector3 to = c.transform.position - position;
                to.y = 0f;
                float d = to.magnitude;
                if (d < bestD && Vector3.Angle(forward, to) < coneDegrees * 0.5f)
                {
                    best = c;
                    bestD = d;
                }
            }

            return best;
        }

        public void Clear()
        {
            foreach (var c in _active)
            {
                if (c != null)
                {
                    Destroy(c.gameObject);
                }
            }

            _active.Clear();
        }
    }
}
