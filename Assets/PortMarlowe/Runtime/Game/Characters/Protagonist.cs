using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Economy;
using PortMarlowe.Core.Police;
using PortMarlowe.Core.Vehicles;
using PortMarlowe.Game.Vehicles;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Characters
{
    public enum ProtagonistState
    {
        OnFoot = 0,
        EnteringVehicle = 1,
        InVehicle = 2,
        ExitingVehicle = 3,
        Detained = 4,
    }

    public enum TransitionPhase
    {
        Approach = 0,
        Access = 1,
        BreakIn = 2,
        Transfer = 3,
    }

    /// <summary>One seat entry or exit in progress (see Docs/Specs/VehicleEntryExit.md for timings).</summary>
    public sealed class SeatTransition
    {
        public bool Entering;
        public VehicleEntity Vehicle;
        public int Seat;
        public TransitionPhase Phase;
        public float PhaseTime;
        public float TotalTime;
        public bool Committed;
        public bool BreakIn;
        public Vector3 From;
        public Quaternion FromRot;
        public Vector3 ExitPoint;

        public const float ApproachTimeout = 6f;
        public const float AccessDuration = 0.25f;
        public const float TransferInDuration = 0.45f;
        public const float TransferOutDuration = 0.4f;
        public const float DoorReach = 0.45f;
    }

    /// <summary>
    /// A playable protagonist. Owns identity, wallet, worn outfit, criminal record and the on-foot /
    /// vehicle state machine including seat transitions. Movement intent comes from either
    /// <see cref="PlayerController"/> or <see cref="PartnerController"/>; both drive the same motor.
    /// </summary>
    public sealed class Protagonist : MonoBehaviour
    {
        public ProtagonistProfile Profile { get; private set; }
        public EntityId Id => Profile.Id;
        public CharacterMotor Motor { get; private set; }
        public CharacterRig Rig { get; private set; }
        public NavMeshAgent Agent { get; private set; }
        public Wallet Wallet { get; private set; }
        public CriminalProfile Record { get; } = new CriminalProfile();
        public int OutfitIndex { get; private set; }
        public float Health { get; set; } = 100f;

        public ProtagonistState State { get; private set; } = ProtagonistState.OnFoot;
        public VehicleEntity Vehicle { get; private set; }
        public int Seat { get; private set; } = -1;
        public SeatTransition Transition { get; private set; }
        public bool IsPlayerControlled { get; set; }

        /// <summary>Transient pose override (strike, phone...) with expiry.</summary>
        private RigPose _overridePose;
        private float _overrideUntil;

        private GameSession _session;

        public Appearance Appearance => Profile.AppearanceFor(OutfitIndex);
        public Outfit CurrentOutfit => Profile.Outfits[OutfitIndex];
        public bool InVehicle => State == ProtagonistState.InVehicle;
        public bool IsDriver => InVehicle && Seat == 0;
        public VehicleDescriptor? VehicleDescriptor => (InVehicle || State == ProtagonistState.ExitingVehicle) && Vehicle != null ? Vehicle.Descriptor : (VehicleDescriptor?)null;

        /// <summary>Committed actions block switching and saving (spec: committed transfer, break-in, detention).</summary>
        public bool InCommittedAction => State == ProtagonistState.Detained || (Transition != null && (Transition.Committed || Transition.Phase == TransitionPhase.BreakIn));

        public Vector3 ChestPosition => transform.position + Vector3.up * Profile.Height * 0.72f;

        public static Protagonist Create(GameSession session, ProtagonistProfile profile, Vector3 position, float yaw, Transform parent)
        {
            var go = new GameObject(profile.FullName);
            go.layer = GameLayers.Protagonist;
            go.transform.SetParent(parent, false);
            go.transform.SetPositionAndRotation(position, Quaternion.Euler(0f, yaw, 0f));
            go.AddComponent<CharacterController>();
            var p = go.AddComponent<Protagonist>();
            p._session = session;
            p.Profile = profile;
            p.Motor = go.AddComponent<CharacterMotor>();
            p.Motor.Tuning = profile.Locomotion;
            p.Motor.Configure(profile.Height, 0.3f);

            p.Agent = go.AddComponent<NavMeshAgent>();
            p.Agent.updatePosition = false;
            p.Agent.updateRotation = false;
            p.Agent.radius = 0.32f;
            p.Agent.height = profile.Height;
            p.Agent.speed = profile.Locomotion.SprintSpeed;
            p.Agent.acceleration = 30f;
            p.Agent.angularSpeed = 720f;
            p.Agent.autoBraking = true;
            p.Agent.stoppingDistance = 0.3f;
            p.Agent.obstacleAvoidanceType = ObstacleAvoidanceType.LowQualityObstacleAvoidance;
            p.Agent.avoidancePriority = 30;
            p.Agent.enabled = false;

            p.Rig = CharacterRig.Create(go.transform, profile.ShortName, profile.Height, profile.ShoulderWidth, profile.Bulk, profile.LongHair,
                profile.Skin, profile.Hair, profile.Outfits[0], session.Materials);
            p.Wallet = new Wallet(profile.Id, profile.StartingCash, session.Ledger);
            return p;
        }

        public void SetOutfit(int index)
        {
            OutfitIndex = Mathf.Clamp(index, 0, Profile.Outfits.Length - 1);
            Rig.ApplyOutfit(CurrentOutfit, Profile.Skin, Profile.Hair);
        }

        public void PlayPose(RigPose pose, float seconds)
        {
            _overridePose = pose;
            _overrideUntil = Time.time + seconds;
        }

        /// <summary>Enable path queries (AI) once a navmesh exists and the character is on foot.</summary>
        public void EnsureAgentOnNavMesh()
        {
            if (State != ProtagonistState.OnFoot)
            {
                return;
            }

            if (!Agent.enabled && NavMesh.SamplePosition(transform.position, out var hit, 2.5f, NavMesh.AllAreas))
            {
                Agent.enabled = true;
                Agent.Warp(hit.position);
            }

            if (Agent.enabled)
            {
                Agent.nextPosition = transform.position;
            }
        }

        // ------------------------------------------------------------------ vehicles

        /// <summary>
        /// Starts walking to the door. Returns false with a reason if entry is impossible right now.
        /// The seat is reserved immediately so the partner and civilians pick another seat.
        /// </summary>
        public bool TryBeginEnter(VehicleEntity v, int seat, out string reason)
        {
            reason = string.Empty;
            if (State != ProtagonistState.OnFoot || v == null)
            {
                reason = "Can't do that now.";
                return false;
            }

            if (v.Controller.Speed > 2.0f)
            {
                reason = "It's moving.";
                return false;
            }

            bool owned = v.IsOwnedBy(Id, _session.PartnerOf(this)?.Id ?? EntityId.None);
            bool breakIn = v.Locked && !owned && !v.WindowBroken;
            if (breakIn && !VehicleSecurity.CanAttempt(v.Security, false, out string why))
            {
                reason = why;
                return false;
            }

            var r = _session.Seats.TryReserve(v.Id, seat, Id, _session.Now);
            if (r != SeatResult.Ok)
            {
                reason = r == SeatResult.SeatTaken ? "That seat is taken." : "Can't get in.";
                return false;
            }

            Transition = new SeatTransition { Entering = true, Vehicle = v, Seat = seat, Phase = TransitionPhase.Approach, BreakIn = breakIn };
            State = ProtagonistState.EnteringVehicle;
            return true;
        }

        /// <summary>Cancel before the commit point. After commit, cancellation is refused.</summary>
        public bool CancelTransition()
        {
            if (Transition == null || Transition.Committed || Transition.Phase == TransitionPhase.BreakIn)
            {
                return false;
            }

            if (Transition.Entering)
            {
                _session.Seats.Release(Id);
                Transition.Vehicle.SetDoorOpen(Transition.Seat, false);
                State = ProtagonistState.OnFoot;
            }

            Transition = null;
            Motor.Stop();
            return true;
        }

        public bool TryBeginExit(out string reason)
        {
            reason = string.Empty;
            if (State != ProtagonistState.InVehicle || Vehicle == null)
            {
                return false;
            }

            if (Vehicle.Controller.Speed > 4f)
            {
                reason = "Too fast to get out.";
                return false;
            }

            if (!FindExitPoint(Vehicle, Seat, out var exit))
            {
                reason = "No room to get out here.";
                return false;
            }

            Transition = new SeatTransition
            {
                Entering = false, Vehicle = Vehicle, Seat = Seat, Phase = TransitionPhase.Access, Committed = true,
                ExitPoint = exit,
            };
            State = ProtagonistState.ExitingVehicle;
            if (Seat == 0)
            {
                Vehicle.Controller.Input = DriveInput.Parked;
                Vehicle.Controller.EngineRunning = false;
            }

            Vehicle.SetDoorOpen(Seat, true);
            return true;
        }

        /// <summary>Immediate seat placement (load restore, arrest release). Seat must already be reserved/occupied.</summary>
        public void PlaceInSeat(VehicleEntity v, int seat)
        {
            Transition = null;
            Vehicle = v;
            Seat = seat;
            State = ProtagonistState.InVehicle;
            Motor.Simulate = false;
            Motor.Controller.enabled = false;
            Agent.enabled = false;
            transform.SetParent(v.Seats[seat], false);
            transform.localPosition = Vector3.zero;
            transform.localRotation = Quaternion.identity;
            Rig.SetPose(RigPose.Seated);
            if (seat == 0)
            {
                OnBecameDriver();
            }
        }

        /// <summary>Immediate removal from a vehicle to a position (load, arrest, recovery).</summary>
        public void PlaceOnFoot(Vector3 position, float yaw, Transform worldParent)
        {
            if (Vehicle != null)
            {
                if (Seat == 0)
                {
                    Vehicle.Controller.Input = DriveInput.Parked;
                    Vehicle.Controller.EngineRunning = false;
                }

                _session.Seats.Release(Id);
            }
            else
            {
                _session.Seats.Release(Id);
            }

            Transition = null;
            Vehicle = null;
            Seat = -1;
            State = ProtagonistState.OnFoot;
            transform.SetParent(worldParent, true);
            Motor.Controller.enabled = true;
            Motor.Simulate = true;
            Motor.Place(position, yaw);
            Rig.SetPose(RigPose.Locomotion);
            Agent.enabled = false;
            EnsureAgentOnNavMesh();
        }

        public void SetDetained(bool detained)
        {
            if (detained)
            {
                CancelTransition();
                State = ProtagonistState.Detained;
                Motor.Stop();
            }
            else if (State == ProtagonistState.Detained)
            {
                State = ProtagonistState.OnFoot;
            }
        }

        private void OnBecameDriver()
        {
            var c = Vehicle.Controller;
            bool usable = !Vehicle.Fuel.IsEmpty && Vehicle.Condition.State != VehicleHealthState.Disabled;
            c.EngineRunning = usable;
            c.Input = DriveInput.Parked;
        }

        private bool FindExitPoint(VehicleEntity v, int seat, out Vector3 point)
        {
            foreach (var candidate in new[] { v.DoorPointWorld(seat), v.OppositeDoorPointWorld(seat) })
            {
                var p = candidate;
                // Need ground under the point and a clear capsule.
                if (!Physics.Raycast(p + Vector3.up * 1.5f, Vector3.down, out var hit, 3.5f, GameLayers.Mask(GameLayers.Ground, GameLayers.Default, GameLayers.Prop), QueryTriggerInteraction.Ignore))
                {
                    continue;
                }

                p = hit.point + Vector3.up * 0.02f;
                var bottom = p + Vector3.up * 0.35f;
                var top = p + Vector3.up * (Profile.Height - 0.3f);
                if (Physics.CheckCapsule(bottom, top, 0.28f, GameLayers.Mask(GameLayers.Building, GameLayers.Vehicle, GameLayers.Prop, GameLayers.Default), QueryTriggerInteraction.Ignore))
                {
                    continue;
                }

                point = p;
                return true;
            }

            point = Vector3.zero;
            return false;
        }

        // ------------------------------------------------------------------ per-frame

        private void Update()
        {
            float dt = Time.deltaTime;
            if (Transition != null)
            {
                TickTransition(dt);
            }

            if (State == ProtagonistState.OnFoot || State == ProtagonistState.Detained || (Transition != null && !Transition.Committed))
            {
                Motor.Step(dt);
                if (Agent.enabled)
                {
                    Agent.nextPosition = transform.position;
                }
            }

            // Presentation reads gameplay state.
            Rig.Speed = Motor.HorizontalSpeed;
            Rig.Grounded = Motor.Grounded;
            if (Time.time < _overrideUntil)
            {
                Rig.SetPose(_overridePose);
            }
            else if (State == ProtagonistState.InVehicle || (Transition != null && Transition.Committed))
            {
                Rig.SetPose(RigPose.Seated);
            }
            else if (State == ProtagonistState.Detained)
            {
                Rig.SetPose(RigPose.HandsUp);
            }
            else if (Transition != null && Transition.Phase == TransitionPhase.BreakIn)
            {
                Rig.SetPose(RigPose.BreakIn);
            }
            else
            {
                Rig.SetPose(RigPose.Locomotion);
            }
        }

        private void TickTransition(float dt)
        {
            var t = Transition;
            var v = t.Vehicle;
            if (v == null)
            {
                Transition = null;
                State = ProtagonistState.OnFoot;
                return;
            }

            t.PhaseTime += dt;
            t.TotalTime += dt;
            if (t.Entering)
            {
                switch (t.Phase)
                {
                    case TransitionPhase.Approach:
                    {
                        Vector3 door = v.DoorPointWorld(t.Seat);
                        Vector3 to = door - transform.position;
                        to.y = 0f;
                        if (v.Controller.Speed > 2.0f || t.PhaseTime > SeatTransition.ApproachTimeout)
                        {
                            CancelTransition();
                            _session.Notify(v.Controller.Speed > 2f ? "It drove off." : "Couldn't reach the door.");
                            return;
                        }

                        if (to.magnitude <= SeatTransition.DoorReach)
                        {
                            Motor.Stop();
                            t.Phase = t.BreakIn ? TransitionPhase.BreakIn : TransitionPhase.Access;
                            t.PhaseTime = 0f;
                            if (t.BreakIn)
                            {
                                _session.Crime.CommitVehicleBreakIn(this, v);
                            }
                            else
                            {
                                v.SetDoorOpen(t.Seat, true);
                            }
                        }
                        else
                        {
                            float speed = Mathf.Clamp(to.magnitude * 2.2f, 1.2f, Profile.Locomotion.JogSpeed);
                            Motor.SetIntent(to, speed);
                        }

                        break;
                    }

                    case TransitionPhase.BreakIn:
                        Motor.FaceTowards((v.transform.position - transform.position).Flat());
                        if (t.PhaseTime >= VehicleSecurity.EntryDuration(v.Security))
                        {
                            Motor.FaceTowards(null);
                            v.WindowBroken = true;
                            v.Locked = false;
                            v.SetDoorOpen(t.Seat, true);
                            t.Phase = TransitionPhase.Access;
                            t.PhaseTime = 0f;
                        }

                        break;
                    case TransitionPhase.Access:
                        if (t.PhaseTime >= SeatTransition.AccessDuration)
                        {
                            // Commit point: occupancy becomes authoritative and the capsule hands over to the seat.
                            if (_session.Seats.Occupy(v.Id, t.Seat, Id) != SeatResult.Ok)
                            {
                                CancelTransition();
                                _session.Notify("Seat was taken.");
                                return;
                            }

                            t.Committed = true;
                            t.Phase = TransitionPhase.Transfer;
                            t.PhaseTime = 0f;
                            t.From = transform.position;
                            t.FromRot = transform.rotation;
                            Motor.Simulate = false;
                            Motor.Controller.enabled = false;
                            Agent.enabled = false;
                            Motor.Stop();
                        }

                        break;
                    case TransitionPhase.Transfer:
                    {
                        float k = Mathf.Clamp01(t.PhaseTime / SeatTransition.TransferInDuration);
                        var seatT = v.Seats[t.Seat];
                        transform.position = Vector3.Lerp(t.From, seatT.position, Mathf.SmoothStep(0f, 1f, k));
                        transform.rotation = Quaternion.Slerp(t.FromRot, seatT.rotation, k);
                        if (k >= 1f)
                        {
                            v.SetDoorOpen(t.Seat, false);
                            Vehicle = v;
                            Seat = t.Seat;
                            Transition = null;
                            State = ProtagonistState.InVehicle;
                            transform.SetParent(seatT, true);
                            transform.localPosition = Vector3.zero;
                            transform.localRotation = Quaternion.identity;
                            if (Seat == 0)
                            {
                                OnBecameDriver();
                            }

                            _session.OnVehicleEntered(this, v);
                        }

                        break;
                    }
                }
            }
            else
            {
                switch (t.Phase)
                {
                    case TransitionPhase.Access:
                        if (t.PhaseTime >= 0.2f)
                        {
                            t.Phase = TransitionPhase.Transfer;
                            t.PhaseTime = 0f;
                            transform.SetParent(_session.WorldRoot, true);
                            t.From = transform.position;
                            t.FromRot = transform.rotation;
                        }

                        break;
                    case TransitionPhase.Transfer:
                    {
                        float k = Mathf.Clamp01(t.PhaseTime / SeatTransition.TransferOutDuration);
                        transform.position = Vector3.Lerp(t.From, t.ExitPoint, Mathf.SmoothStep(0f, 1f, k));
                        if (k >= 1f)
                        {
                            v.SetDoorOpen(t.Seat, false);
                            float yaw = Conv.Yaw((t.ExitPoint - v.transform.position).Flat());
                            _session.Seats.Release(Id);
                            Transition = null;
                            Vehicle = null;
                            Seat = -1;
                            State = ProtagonistState.OnFoot;
                            Motor.Controller.enabled = true;
                            Motor.Simulate = true;
                            Motor.Place(t.ExitPoint, yaw);
                            EnsureAgentOnNavMesh();
                            _session.OnVehicleExited(this, v);
                        }

                        break;
                    }
                }
            }
        }
    }

    /// <summary>Navigation area indices used by runtime NavMesh building.</summary>
    public static class NavAreas
    {
        public const int Walkable = 0;
        public const int NotWalkable = 1;
        public const int Road = 3;
        public const int Crosswalk = 4;
    }
}
