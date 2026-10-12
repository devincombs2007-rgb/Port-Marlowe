using PortMarlowe.Core;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Population;
using PortMarlowe.Game.Vehicles;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Law
{
    public enum UnitState
    {
        Responding = 0,
        OnScene = 1,
        Pursuing = 2,
        Leaving = 3,
    }

    public enum OfficerState
    {
        InCar = 0,
        Searching = 1,
        Chasing = 2,
        ReturningToCar = 3,
    }

    /// <summary>
    /// One patrol unit: a police car (shared vehicle physics + AI driver) and one officer (shared NPC
    /// body). Behaviour is goal-driven from the dispatch case it is assigned to.
    /// </summary>
    public sealed class PoliceUnit
    {
        public int CaseId;
        public UnitState State;
        public VehicleEntity Car;
        public VehicleAIDriver Driver;
        public NpcBody Officer;
        public OfficerState OfficerState;
        public float StateTime;
        public float OfficerTime;
        public Vector3 SearchPoint;
        public bool ChallengeIssued;
        public float ArrestProgress;
        public bool ResistingRecorded;
        public float LastSawSuspect = -999f;
        public StableId OfficerId;
        public bool Destroyed;

        public bool OfficerInCar => OfficerState == OfficerState.InCar;

        public void SetOfficerInCar(bool inCar, GameSession s)
        {
            if (inCar)
            {
                Officer.Halt();
                Officer.Agent.enabled = false;
                Officer.transform.SetParent(Car.Seats[0], false);
                Officer.transform.localPosition = Vector3.zero;
                Officer.transform.localRotation = Quaternion.identity;
                Officer.Rig.SetPose(RigPose.Seated);
                OfficerState = OfficerState.InCar;
                SetSolid(false);
            }
            else
            {
                Vector3 door = Car.DoorPointWorld(0);
                Officer.transform.SetParent(s.DynamicRoot, true);
                if (NavMesh.SamplePosition(door, out var hit, 4f, NavMesh.AllAreas))
                {
                    door = hit.position;
                }

                Officer.transform.position = door;
                Officer.transform.rotation = Quaternion.LookRotation((door - Car.transform.position).Flat().normalized + Vector3.forward * 0.001f);
                Officer.Agent.enabled = true;
                Officer.Agent.Warp(door);
                Officer.Rig.SetPose(RigPose.Locomotion);
                SetSolid(true);
            }

            OfficerTime = 0f;
        }

        private void SetSolid(bool solid)
        {
            foreach (var c in Officer.GetComponentsInChildren<Collider>())
            {
                c.enabled = solid;
            }
        }
    }
}
