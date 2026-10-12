using System.Collections.Generic;
using NUnit.Framework;
using PortMarlowe.Core;
using PortMarlowe.Core.Character;
using PortMarlowe.Core.Control;
using PortMarlowe.Core.Economy;
using PortMarlowe.Core.Interaction;
using PortMarlowe.Core.Partner;
using PortMarlowe.Core.Vehicles;

namespace PortMarlowe.Tests.Core
{
    public class SeatTests
    {
        private static readonly EntityId Car = new EntityId("veh.sedan");
        private static readonly EntityId Rhys = new EntityId("char.rhys");
        private static readonly EntityId Lena = new EntityId("char.lena");

        [Test]
        public void ReserveOccupyRelease_Sequence()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 4);
            Assert.AreEqual(SeatResult.Ok, seats.TryReserve(Car, 0, Rhys, 0));
            Assert.AreEqual(SeatState.Reserved, seats.GetState(Car, 0, out _));
            Assert.AreEqual(SeatResult.Ok, seats.Occupy(Car, 0, Rhys));
            Assert.AreEqual(Rhys, seats.Driver(Car));
            Assert.IsTrue(seats.IsSeated(Rhys));
            Assert.AreEqual(SeatResult.Ok, seats.Release(Rhys));
            Assert.AreEqual(SeatState.Free, seats.GetState(Car, 0, out _));
        }

        [Test]
        public void Partner_CannotTakeSeatReservedByPlayer_AndAvoidsIt()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 4);
            seats.TryReserve(Car, 1, Rhys, 0);
            Assert.AreEqual(SeatResult.SeatTaken, seats.TryReserve(Car, 1, Lena, 0));
            int free = seats.FindFreeSeat(Car, preferPassenger: true);
            Assert.AreEqual(2, free);
            Assert.AreEqual(3, seats.FindFreeSeat(Car, true, avoid: 2));
        }

        [Test]
        public void OneSeatPerOccupant()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 2);
            seats.RegisterVehicle(new EntityId("veh.other"), 2);
            seats.PlaceDirect(Car, 0, Rhys, 0);
            Assert.AreEqual(SeatResult.AlreadySeatedElsewhere, seats.TryReserve(new EntityId("veh.other"), 0, Rhys, 0));
            Assert.AreEqual(SeatResult.AlreadySeatedElsewhere, seats.TryReserve(Car, 1, Rhys, 0));
        }

        [Test]
        public void AbandonedReservation_Expires()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 2);
            seats.TryReserve(Car, 1, Lena, 0);
            Assert.AreEqual(0, seats.ExpireReservations(SeatReservationService.ReservationTimeoutSeconds - 1));
            Assert.AreEqual(1, seats.ExpireReservations(SeatReservationService.ReservationTimeoutSeconds + 1));
            Assert.AreEqual(SeatState.Free, seats.GetState(Car, 1, out _));
        }

        [Test]
        public void OccupiedSeat_DoesNotExpire()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 2);
            seats.PlaceDirect(Car, 1, Lena, 0);
            Assert.AreEqual(0, seats.ExpireReservations(1000));
            Assert.IsTrue(seats.IsSeated(Lena));
        }

        [Test]
        public void FullVehicle_HasNoFreeSeat_AndOccupyWithoutReservationFails()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 2);
            seats.PlaceDirect(Car, 0, Rhys, 0);
            seats.PlaceDirect(Car, 1, Lena, 0);
            Assert.AreEqual(-1, seats.FindFreeSeat(Car, true));
            Assert.AreEqual(SeatResult.NotReservedByRequester, seats.Occupy(Car, 1, new EntityId("ped.1")));
            Assert.AreEqual(SeatResult.InvalidSeat, seats.TryReserve(Car, 5, new EntityId("ped.1"), 0));
        }

        [Test]
        public void VacateEvent_FiresOnlyForOccupiedSeats()
        {
            var seats = new SeatReservationService();
            seats.RegisterVehicle(Car, 2);
            int vacated = 0;
            seats.SeatVacated += (v, s, who) => vacated++;
            seats.TryReserve(Car, 1, Lena, 0);
            seats.Release(Lena);
            Assert.AreEqual(0, vacated);
            seats.PlaceDirect(Car, 1, Lena, 0);
            seats.Release(Lena);
            Assert.AreEqual(1, vacated);
        }
    }

    public class VehicleModelTests
    {
        [Test]
        public void Fuel_DepletesAndStopsAtZero()
        {
            var f = new FuelModel { Litres = 0.05f };
            f.Consume(100f, true, 1f, 20f, 0f);
            Assert.AreEqual(0f, f.Litres);
            Assert.IsTrue(f.IsEmpty);
        }

        [Test]
        public void Fuel_TankLastsAboutHalfAnHourOfCruising()
        {
            var f = new FuelModel();
            float seconds = 0;
            while (!f.IsEmpty && seconds < 7200)
            {
                f.Consume(1f, true, 0.35f, 14f, 0f);
                seconds += 1f;
            }

            Assert.That(seconds, Is.InRange(1200f, 2700f), "calibration target: 20-45 minutes of ordinary driving");
        }

        [Test]
        public void Fuel_EngineOff_OnlyLeaks()
        {
            var f = new FuelModel();
            float start = f.Litres;
            f.Consume(10f, false, 1f, 0f, 0f);
            Assert.AreEqual(start, f.Litres);
            f.Consume(10f, false, 0f, 0f, 0.01f);
            Assert.AreEqual(start - 0.1f, f.Litres, 1e-4f);
        }

        [Test]
        public void Refuel_CapsAtCapacity()
        {
            var f = new FuelModel { Litres = 50f };
            Assert.AreEqual(5f, f.Refuel(20f), 1e-4f);
            Assert.AreEqual(f.CapacityLitres, f.Litres, 1e-4f);
        }

        [Test]
        public void Condition_IgnoresContactJitter()
        {
            var c = new VehicleCondition();
            for (int i = 0; i < 1000; i++)
            {
                c.ApplyImpact(1.5f, 1f);
            }

            Assert.AreEqual(VehicleCondition.MaxHealth, c.Body);
            Assert.AreEqual(VehicleHealthState.Ok, c.State);
        }

        [Test]
        public void Condition_HardFrontalHits_DisableEngine()
        {
            var c = new VehicleCondition();
            for (int i = 0; i < 4; i++)
            {
                c.ApplyImpact(16f, 1f);
            }

            Assert.AreEqual(VehicleHealthState.Disabled, c.State);
            Assert.Greater(c.FuelLeakRate, 0f);
            c.Repair();
            Assert.AreEqual(VehicleHealthState.Ok, c.State);
        }

        [Test]
        public void Security_RulesExplainBlockedEntry()
        {
            Assert.IsTrue(VehicleSecurity.CanAttempt(VehicleSecurityLevel.Low, false, out _));
            Assert.IsFalse(VehicleSecurity.CanAttempt(VehicleSecurityLevel.Mid, false, out string why));
            Assert.IsNotEmpty(why);
            Assert.IsFalse(VehicleSecurity.CanAttempt(VehicleSecurityLevel.High, true, out _));
            Assert.IsTrue(VehicleSecurity.IsCrime(VehicleSecurityLevel.Low, false));
            Assert.IsFalse(VehicleSecurity.IsCrime(VehicleSecurityLevel.Low, true));
        }
    }

    public class ControlOwnershipTests
    {
        private static readonly EntityId Rhys = new EntityId("char.rhys");
        private static readonly EntityId Lena = new EntityId("char.lena");

        private sealed class Ctx : ISwitchContext
        {
            public readonly Dictionary<EntityId, SwitchCandidateState> States = new Dictionary<EntityId, SwitchCandidateState>();
            public bool SaveInProgress { get; set; }
            public SwitchCandidateState Describe(EntityId c) => States.TryGetValue(c, out var s) ? s : default;
        }

        private static (ControlOwnershipService svc, Ctx ctx) Make()
        {
            var svc = new ControlOwnershipService();
            svc.Register(Rhys);
            svc.Register(Lena);
            svc.SetInitialOwner(Rhys);
            var ctx = new Ctx();
            ctx.States[Rhys] = new SwitchCandidateState { Exists = true };
            ctx.States[Lena] = new SwitchCandidateState { Exists = true };
            return (svc, ctx);
        }

        [Test]
        public void Switch_TransfersOwnershipExactlyOnce()
        {
            var (svc, ctx) = Make();
            int changes = 0;
            svc.OwnershipChanged += (a, b, tx) => changes++;
            var tx = svc.TryBeginSwitch(Lena, ctx, 1.0, 5f, out var reason);
            Assert.IsNotNull(tx);
            Assert.AreEqual(SwitchBlockReason.None, reason);
            Assert.AreEqual(Lena, svc.Controlled);
            Assert.IsTrue(tx.LocalHandoff);
            // A second request during the transition is rejected, not queued.
            Assert.IsNull(svc.TryBeginSwitch(Rhys, ctx, 1.1, 5f, out reason));
            Assert.AreEqual(SwitchBlockReason.SwitchInProgress, reason);
            svc.CompleteSwitch(tx.Id, 1.6);
            svc.CompleteSwitch(tx.Id, 1.7);
            Assert.AreEqual(1, svc.CompletedSwitches);
            Assert.AreEqual(1, changes);
        }

        [Test]
        public void Switch_BlockedDuringCommittedActionOrSave()
        {
            var (svc, ctx) = Make();
            ctx.States[Rhys] = new SwitchCandidateState { Exists = true, InCommittedAction = true };
            Assert.AreEqual(SwitchBlockReason.SourceCommitted, svc.Validate(Lena, ctx));
            ctx.States[Rhys] = new SwitchCandidateState { Exists = true };
            ctx.SaveInProgress = true;
            Assert.AreEqual(SwitchBlockReason.SaveInProgress, svc.Validate(Lena, ctx));
            ctx.SaveInProgress = false;
            ctx.States[Lena] = new SwitchCandidateState { Exists = true, Incapacitated = true };
            Assert.AreEqual(SwitchBlockReason.TargetIncapacitated, svc.Validate(Lena, ctx));
        }

        [Test]
        public void Switch_AuthoredLockShowsReason()
        {
            var (svc, ctx) = Make();
            svc.SetAuthoredLock("Stay with the van.");
            Assert.AreEqual(SwitchBlockReason.AuthoredLock, svc.Validate(Lena, ctx));
            Assert.AreEqual("Stay with the van.", ControlOwnershipService.Describe(SwitchBlockReason.AuthoredLock, svc.AuthoredLockReason));
            svc.ClearAuthoredLock();
            Assert.AreEqual(SwitchBlockReason.None, svc.Validate(Lena, ctx));
        }

        [Test]
        public void Switch_FarApartUsesRemoteTransition_AndRepeatedSwitchesAreStable()
        {
            var (svc, ctx) = Make();
            double t = 0;
            for (int i = 0; i < 50; i++)
            {
                var target = svc.NextCandidate();
                var tx = svc.TryBeginSwitch(target, ctx, t, i % 2 == 0 ? 500f : 10f, out _);
                Assert.IsNotNull(tx);
                Assert.AreEqual(i % 2 != 0, tx.LocalHandoff);
                svc.CompleteSwitch(tx.Id, t + 0.5);
                t += 1;
            }

            Assert.AreEqual(50, svc.CompletedSwitches);
            Assert.AreEqual(Rhys, svc.Controlled);
        }

        [Test]
        public void Switch_ToSelfIsRejected()
        {
            var (svc, ctx) = Make();
            Assert.AreEqual(SwitchBlockReason.AlreadyControlled, svc.Validate(Rhys, ctx));
        }
    }

    public class PartnerTests
    {
        [Test]
        public void Follow_UsesHysteresis()
        {
            var brain = new PartnerBrain();
            var s = new PartnerSituation { DistanceToLeader = 3.5f };
            Assert.AreEqual(Gait.Stand, brain.Decide(s).Gait, "inside start distance: stay put");
            s.DistanceToLeader = 4.5f;
            Assert.AreNotEqual(Gait.Stand, brain.Decide(s).Gait);
            s.DistanceToLeader = 3.0f;
            Assert.AreNotEqual(Gait.Stand, brain.Decide(s).Gait, "keeps moving until stop distance");
            s.DistanceToLeader = 2.0f;
            Assert.AreEqual(Gait.Stand, brain.Decide(s).Gait);
        }

        [Test]
        public void Follow_GaitScalesWithDistance()
        {
            var brain = new PartnerBrain();
            Assert.AreEqual(Gait.Walk, brain.Decide(new PartnerSituation { DistanceToLeader = 6f }).Gait);
            Assert.AreEqual(Gait.Jog, brain.Decide(new PartnerSituation { DistanceToLeader = 10f }).Gait);
            Assert.AreEqual(Gait.Sprint, brain.Decide(new PartnerSituation { DistanceToLeader = 20f }).Gait);
            Assert.AreEqual(Gait.Sprint, brain.Decide(new PartnerSituation { DistanceToLeader = 11f }).Gait, "hysteresis keeps sprint");
            Assert.AreEqual(PartnerBehavior.Regroup, brain.Decide(new PartnerSituation { DistanceToLeader = 60f }).Behavior);
        }

        [Test]
        public void LeaderInVehicle_PartnerBoards_UnlessUnsafeOrFull()
        {
            var brain = new PartnerBrain();
            var s = new PartnerSituation { LeaderInVehicle = true, LeaderVehicleHasFreeSeat = true, DistanceToLeader = 5f };
            Assert.AreEqual(PartnerBehavior.BoardVehicle, brain.Decide(s).Behavior);
            s.VehicleUnsafeToBoard = true;
            var d = brain.Decide(s);
            Assert.AreEqual(PartnerBehavior.FollowOnFoot, d.Behavior);
            Assert.IsNotEmpty(d.Explanation);
            s.VehicleUnsafeToBoard = false;
            s.LeaderVehicleHasFreeSeat = false;
            Assert.AreEqual(PartnerBehavior.FollowOnFoot, brain.Decide(s).Behavior);
        }

        [Test]
        public void SeatedPartner_StaysSeatedWhileLeaderRides_ExitsWhenLeaderLeaves()
        {
            var brain = new PartnerBrain();
            var s = new PartnerSituation { PartnerSeated = true, PartnerSeatedInLeaderVehicle = true, LeaderInVehicle = true, LeaderVehicleMoving = true };
            Assert.AreEqual(PartnerBehavior.RemainSeated, brain.Decide(s).Behavior);
            s.LeaderInVehicle = false;
            Assert.AreEqual(PartnerBehavior.ExitVehicle, brain.Decide(s).Behavior);
            s.Order = PartnerOrder.Hold;
            Assert.AreEqual(PartnerBehavior.RemainSeated, brain.Decide(s).Behavior);
        }

        [Test]
        public void PartnerLeftDriving_AfterSwitch_PullsOverSafely()
        {
            var brain = new PartnerBrain();
            var s = new PartnerSituation { PartnerSeated = true, PartnerIsDriver = true, PartnerSeatedInLeaderVehicle = true, LeaderInVehicle = true };
            Assert.AreEqual(PartnerBehavior.DriveSafeStop, brain.Decide(s).Behavior);
        }

        [Test]
        public void HoldOrder_OverridesFollow()
        {
            var brain = new PartnerBrain();
            var d = brain.Decide(new PartnerSituation { Order = PartnerOrder.Hold, DistanceToLeader = 50f });
            Assert.AreEqual(PartnerBehavior.HoldPosition, d.Behavior);
        }

        [Test]
        public void ProgressMonitor_EscalatesRepathThenRepositionOnlyWhenUnobserved()
        {
            var m = new ProgressMonitor();
            m.Reset(0);
            Assert.AreEqual(RecoveryStep.None, m.Evaluate(1, 40f, observedByPlayer: true));
            Assert.AreEqual(RecoveryStep.Repath, m.Evaluate(2, 40f, true));
            Assert.AreEqual(RecoveryStep.Repath, m.Evaluate(3, 40f, true));
            Assert.AreEqual(RecoveryStep.AskRegroup, m.Evaluate(4, 40f, true), "never teleport while observed");
            Assert.AreEqual(RecoveryStep.RepositionUnobserved, m.Evaluate(5, 40f, false));
            Assert.AreEqual(RecoveryStep.None, m.Evaluate(6, 30f, false), "progress resets");
        }
    }

    public class EconomyAndInputTests
    {
        private static readonly EntityId Rhys = new EntityId("char.rhys");
        private static readonly EntityId Lena = new EntityId("char.lena");

        [Test]
        public void Credit_IsIdempotent()
        {
            var ledger = new IdempotencyLedger();
            var w = new Wallet(Rhys, 100, ledger);
            Assert.AreEqual(WalletResult.Ok, w.Credit(50, "job:001"));
            Assert.AreEqual(WalletResult.Duplicate, w.Credit(50, "job:001"));
            Assert.AreEqual(150, w.Cash);
        }

        [Test]
        public void Debit_RespectsFunds_UnlessPartialAllowed()
        {
            var ledger = new IdempotencyLedger();
            var w = new Wallet(Rhys, 100, ledger);
            Assert.AreEqual(WalletResult.InsufficientFunds, w.Debit(500, "fine:1"));
            Assert.AreEqual(100, w.Cash);
            Assert.AreEqual(WalletResult.Ok, w.Debit(500, "fine:2", allowPartial: true));
            Assert.AreEqual(0, w.Cash);
            Assert.AreEqual(WalletResult.Duplicate, w.Debit(1, "fine:2"));
        }

        [Test]
        public void Transfer_IsAtomicAndNeverDuplicates()
        {
            var ledger = new IdempotencyLedger();
            var a = new Wallet(Rhys, 100, ledger);
            var b = new Wallet(Lena, 0, ledger);
            Assert.AreEqual(WalletResult.Ok, Wallet.Transfer(a, b, 60, "xfer:1"));
            Assert.AreEqual(WalletResult.Duplicate, Wallet.Transfer(a, b, 60, "xfer:1"));
            Assert.AreEqual(WalletResult.InsufficientFunds, Wallet.Transfer(a, b, 60, "xfer:2"));
            Assert.AreEqual(40, a.Cash);
            Assert.AreEqual(60, b.Cash);
        }

        [Test]
        public void Ranker_PrefersHigherPriority_AndHoldsTargetWithHysteresis()
        {
            var r = new InteractionRanker();
            var list = new List<InteractionCandidate>
            {
                new InteractionCandidate { Id = 1, Priority = InteractionPriority.Ambient, Distance = 0.5f, MaxDistance = 2f, AngleDegrees = 0f },
                new InteractionCandidate { Id = 2, Priority = InteractionPriority.VehicleEntry, Distance = 1.8f, MaxDistance = 3f, AngleDegrees = 40f },
            };
            Assert.AreEqual(1, r.Select(list), "vehicle entry outranks the pedestrian beside it");

            var doors = new List<InteractionCandidate>
            {
                new InteractionCandidate { Id = 10, Priority = InteractionPriority.Door, Distance = 1.0f, MaxDistance = 2f, AngleDegrees = 10f },
                new InteractionCandidate { Id = 11, Priority = InteractionPriority.Door, Distance = 1.1f, MaxDistance = 2f, AngleDegrees = 10f },
            };
            var r2 = new InteractionRanker();
            Assert.AreEqual(0, r2.Select(doors));
            doors[0] = new InteractionCandidate { Id = 10, Priority = InteractionPriority.Door, Distance = 1.15f, MaxDistance = 2f, AngleDegrees = 10f };
            Assert.AreEqual(0, r2.Select(doors), "small change does not flip the prompt");
            doors[0] = new InteractionCandidate { Id = 10, Priority = InteractionPriority.Door, Distance = 1.9f, MaxDistance = 2f, AngleDegrees = 60f };
            Assert.AreEqual(1, r2.Select(doors), "clearly better target wins");
        }

        [Test]
        public void Ranker_IgnoresOutOfRange()
        {
            var r = new InteractionRanker();
            var list = new List<InteractionCandidate>
            {
                new InteractionCandidate { Id = 1, Priority = InteractionPriority.Door, Distance = 3f, MaxDistance = 2f, AngleDegrees = 0f },
            };
            Assert.AreEqual(-1, r.Select(list));
        }

        [Test]
        public void StickShaping_DeadZoneAndCurve()
        {
            StickShaping.Shape(0.1f, 0f, 0.15f, 0.95f, 1.6f, out float x, out float y);
            Assert.AreEqual(0f, x);
            StickShaping.Shape(1f, 0f, 0.15f, 0.95f, 1.6f, out x, out y);
            Assert.AreEqual(1f, x, 1e-4f);
            StickShaping.Shape(0.55f, 0f, 0.15f, 0.95f, 1.6f, out x, out _);
            Assert.That(x, Is.InRange(0.2f, 0.45f));
        }

        [Test]
        public void ActionBuffer_ExpiresAndInvalidatesOnContextChange()
        {
            var b = new ActionBuffer();
            b.Press(BufferedAction.Interact, 1.0);
            Assert.IsTrue(b.Peek(BufferedAction.Interact, 1.1));
            Assert.IsFalse(b.Peek(BufferedAction.Interact, 1.2), "stale presses expire");
            b.Press(BufferedAction.EnterExitVehicle, 2.0);
            b.InvalidateContext();
            Assert.IsFalse(b.Consume(BufferedAction.EnterExitVehicle, 2.01), "never replay after a switch");
            b.Press(BufferedAction.Strike, 3.0);
            Assert.IsTrue(b.Consume(BufferedAction.Strike, 3.05));
            Assert.IsFalse(b.Consume(BufferedAction.Strike, 3.06), "consumed once");
        }

        [Test]
        public void ReactionGovernor_CapsCumulativeSuppression()
        {
            var g = new ReactionGovernor();
            float total = 0;
            for (int i = 0; i < 20; i++)
            {
                total += g.Request(i * 0.1, major: false);
            }

            Assert.LessOrEqual(total, g.MaxSuppressionInWindow + 1e-4f);
            Assert.Greater(g.Request(10, major: true), 0f, "window recovers");
        }

        [Test]
        public void Locomotion_TargetSpeedBands()
        {
            var t = new LocomotionTuning();
            Assert.AreEqual(0f, t.TargetSpeed(0f, false));
            Assert.That(t.TargetSpeed(0.3f, false), Is.InRange(0.4f, t.WalkSpeed));
            Assert.AreEqual(t.JogSpeed, t.TargetSpeed(1f, false), 1e-4f);
            Assert.AreEqual(t.SprintSpeed, t.TargetSpeed(1f, true));
            Assert.Greater(t.TurnRateForSpeed(t.WalkSpeed), t.TurnRateForSpeed(t.SprintSpeed));
        }

        [Test]
        public void WorldClock_AdvancesAndRollsDays()
        {
            var c = new WorldClock(23.5);
            c.Advance(WorldClock.DefaultRealSecondsPerGameHour);
            Assert.AreEqual(1, c.Day);
            Assert.AreEqual(0.5, c.TimeOfDayHours, 1e-6);
            c.Paused = true;
            c.Advance(1000);
            Assert.AreEqual(0.5, c.TimeOfDayHours, 1e-6);
            c.Paused = false;
            c.SkipGameHours(8);
            Assert.AreEqual(8.5, c.TimeOfDayHours, 1e-6);
            Assert.Throws<System.ArgumentOutOfRangeException>(() => c.SkipGameHours(30));
        }

        [Test]
        public void DeterministicRandom_IsReproducible()
        {
            var a = new DeterministicRandom(42);
            var b = new DeterministicRandom(42);
            for (int i = 0; i < 100; i++)
            {
                Assert.AreEqual(a.NextULong(), b.NextULong());
            }

            var c = new DeterministicRandom(1);
            for (int i = 0; i < 1000; i++)
            {
                float f = c.NextFloat();
                Assert.That(f, Is.GreaterThanOrEqualTo(0f).And.LessThan(1f));
                int n = c.Range(3, 7);
                Assert.That(n, Is.InRange(3, 6));
            }
        }
    }
}
