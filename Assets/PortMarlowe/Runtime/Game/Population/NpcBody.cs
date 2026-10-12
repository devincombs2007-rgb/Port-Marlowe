using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Population
{
    /// <summary>
    /// Shared physical body for NPCs (civilians and officers): NavMeshAgent locomotion, a solid
    /// capsule people bump into, a vehicle hit trigger, and the procedural rig.
    /// </summary>
    public sealed class NpcBody : MonoBehaviour
    {
        public StableId Id;
        public NavMeshAgent Agent { get; private set; }
        public CharacterRig Rig { get; private set; }
        public Appearance Appearance { get; private set; }
        public float Height { get; private set; }
        public Outfit Outfit { get; private set; }
        public bool Incapacitated { get; set; }

        public Vector3 Eye => transform.position + Vector3.up * (Height * 0.93f);
        public Vector3 Chest => transform.position + Vector3.up * (Height * 0.7f);

        public static NpcBody Create(Transform parent, StableId id, Vector3 position, float yaw, Outfit outfit, float height, float bulk,
            Color skin, Color hair, bool longHair, MaterialLibrary lib, bool castShadows)
        {
            var go = new GameObject(id.Value);
            go.layer = GameLayers.PedestrianSolid;
            go.transform.SetParent(parent, false);
            go.transform.SetPositionAndRotation(position, Quaternion.Euler(0f, yaw, 0f));
            var body = go.AddComponent<NpcBody>();
            body.Id = id;
            body.Height = height;
            body.Outfit = outfit;
            var build = bulk > 1.08f ? BuildClass.Heavy : (bulk < 0.94f ? BuildClass.Slim : BuildClass.Average);
            var hc = height > 1.82f ? HeightClass.Tall : (height < 1.62f ? HeightClass.Short : HeightClass.Average);
            body.Appearance = new Appearance(outfit.TopFamily, outfit.BottomFamily, build, hc, outfit.Headwear);

            var rb = go.AddComponent<Rigidbody>();
            rb.isKinematic = true;
            rb.useGravity = false;
            var solid = go.AddComponent<CapsuleCollider>();
            solid.height = height;
            solid.radius = 0.28f;
            solid.center = new Vector3(0f, height * 0.5f, 0f);

            var hit = new GameObject("HitTrigger");
            hit.layer = GameLayers.PedestrianHit;
            hit.transform.SetParent(go.transform, false);
            var trig = hit.AddComponent<CapsuleCollider>();
            trig.isTrigger = true;
            trig.height = height;
            trig.radius = 0.34f;
            trig.center = new Vector3(0f, height * 0.5f, 0f);

            body.Agent = go.AddComponent<NavMeshAgent>();
            body.Agent.radius = 0.3f;
            body.Agent.height = height;
            body.Agent.speed = 1.4f;
            body.Agent.acceleration = 8f;
            body.Agent.angularSpeed = 540f;
            body.Agent.stoppingDistance = 0.4f;
            body.Agent.autoBraking = true;
            body.Agent.obstacleAvoidanceType = ObstacleAvoidanceType.MedQualityObstacleAvoidance;
            body.Agent.avoidancePriority = 50;

            body.Rig = CharacterRig.Create(go.transform, id.Value, height, 0.36f + (bulk - 1f) * 0.2f + (height - 1.6f) * 0.15f, bulk, longHair, skin, hair, outfit, lib, castShadows);
            return body;
        }

        public void SetOutfitVisual(Outfit outfit, Color skin, Color hair) => Rig.ApplyOutfit(outfit, skin, hair);

        /// <summary>Drive the rig from agent velocity (presentation follows simulation).</summary>
        public void UpdatePresentation()
        {
            if (Agent != null && Agent.enabled)
            {
                Rig.Speed = Agent.velocity.magnitude;
            }
            else
            {
                Rig.Speed = 0f;
            }
        }

        public bool OnNavMesh => Agent != null && Agent.enabled && Agent.isOnNavMesh;

        public void MoveTo(Vector3 destination, float speed)
        {
            if (!OnNavMesh)
            {
                return;
            }

            Agent.isStopped = false;
            Agent.speed = speed;
            Agent.SetDestination(destination);
        }

        public void Halt()
        {
            if (OnNavMesh)
            {
                Agent.isStopped = true;
                Agent.ResetPath();
            }
        }

        public bool Arrived => OnNavMesh && !Agent.pathPending && Agent.remainingDistance <= Agent.stoppingDistance + 0.2f;
    }

    /// <summary>Line-of-sight and visibility queries shared by civilians and officers.</summary>
    public static class Perception
    {
        /// <summary>
        /// Visibility 0..1 of <paramref name="target"/> from <paramref name="eye"/>: 0 if outside range or
        /// field of view or occluded. Range shrinks at night (spec: illumination affects perception).
        /// </summary>
        public static float Visibility(Vector3 eye, Vector3 forward, Vector3 target, float range, float fovDegrees, float night01, Transform ignoreRoot)
        {
            float effectiveRange = range * Mathf.Lerp(1f, 0.6f, night01);
            Vector3 to = target - eye;
            float d = to.magnitude;
            if (d > effectiveRange || d < 0.01f)
            {
                return d < 0.01f ? 1f : 0f;
            }

            Vector3 flatFwd = forward;
            flatFwd.y = 0f;
            Vector3 flatTo = to;
            flatTo.y = 0f;
            if (d > 2.5f && Vector3.Angle(flatFwd, flatTo) > fovDegrees * 0.5f)
            {
                return 0f;
            }

            if (Physics.Raycast(eye, to / d, out var hit, d - 0.3f, GameLayers.SightBlockers, QueryTriggerInteraction.Ignore))
            {
                if (ignoreRoot == null || !hit.transform.IsChildOf(ignoreRoot))
                {
                    return 0f;
                }
            }

            return Mathf.Clamp01(1.15f - d / effectiveRange);
        }
    }
}
