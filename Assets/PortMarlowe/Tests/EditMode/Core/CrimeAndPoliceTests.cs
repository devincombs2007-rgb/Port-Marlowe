using NUnit.Framework;
using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Police;

namespace PortMarlowe.Tests.Core
{
    public class CrimeAndPoliceTests
    {
        private static readonly EntityId Rhys = new EntityId("char.rhys");
        private static readonly EntityId Lena = new EntityId("char.lena");
        private static readonly EntityId Witness = new EntityId("ped.0001");
        private static readonly EntityId Officer = new EntityId("cop.0001");

        private static readonly Appearance RhysOutfitA = new Appearance(ColorFamily.Red, ColorFamily.Blue, BuildClass.Average, HeightClass.Tall, false);
        private static readonly Appearance RhysOutfitB = new Appearance(ColorFamily.Grey, ColorFamily.Black, BuildClass.Average, HeightClass.Tall, true);

        private IncidentRegistry _reg;
        private PoliceDispatchCoordinator _dispatch;

        [SetUp]
        public void SetUp()
        {
            _reg = new IncidentRegistry(new EventLog());
            _dispatch = new PoliceDispatchCoordinator(_reg, new EventLog());
        }

        private static SuspectDescription GoodDescription(Appearance a)
        {
            var d = new SuspectDescription();
            d.ReplacePersonFrom(a, 0.9f);
            return d;
        }

        private WitnessReport WitnessAssault(double now, out Incident incident)
        {
            incident = _reg.CreateIncident(CrimeType.Assault, new Vec3(10, 0, 10), now, Rhys, new EntityId("ped.victim"));
            return _reg.RecordObservation(incident.Id, Witness, GoodDescription(RhysOutfitA), incident.Location, now, byOfficer: false);
        }

        [Test]
        public void Report_IsDeliveredOnlyAfterCallCompletes()
        {
            var r = WitnessAssault(0, out _);
            Assert.AreEqual(ReportState.Observed, r.State);
            Assert.IsTrue(_reg.BeginCall(r.Id, 2.0, 6.0));
            _reg.Tick(7.9);
            Assert.AreEqual(ReportState.Calling, r.State);
            _reg.Tick(8.0);
            Assert.AreEqual(ReportState.Delivered, r.State);
            Assert.IsTrue(_reg.TryDequeueDelivered(out var delivered));
            Assert.AreEqual(r.Id, delivered.Id);
        }

        [Test]
        public void UnobservedCrime_SummonsNobody()
        {
            _reg.CreateIncident(CrimeType.VehicleBreakIn, new Vec3(0, 0, 0), 0, Rhys, EntityId.None);
            Step(1000);
            Assert.AreEqual(0, _dispatch.Cases.Count);
            var heat = HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, 1000);
            Assert.AreEqual(HeatLevel.Unseen, heat.Level);
        }

        [Test]
        public void WitnessIncapacitatedMidCall_ReportFails()
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 1, 6);
            Assert.IsTrue(_reg.FailReport(r.Id, 3, "witness knocked down"));
            _reg.Tick(100);
            Assert.AreEqual(ReportState.Failed, r.State);
            Assert.IsFalse(_reg.TryDequeueDelivered(out _));
        }

        [Test]
        public void WitnessDemoted_ReportStillReachesDispatch()
        {
            var r = WitnessAssault(0, out _);
            _reg.OnWitnessDemoted(Witness, 1.0);
            Assert.AreEqual(ReportState.Calling, r.State);
            _reg.Tick(1.0 + IncidentRegistry.AggregateCallSeconds);
            Assert.AreEqual(ReportState.Delivered, r.State);
        }

        [Test]
        public void DeliveredReport_CannotBeFailedLater()
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 0, 1);
            _reg.Tick(2);
            Assert.IsFalse(_reg.FailReport(r.Id, 3, "despawned"));
            Assert.AreEqual(ReportState.Delivered, r.State);
        }

        [Test]
        public void SameWitness_ReportsIncidentOnce()
        {
            WitnessAssault(0, out var inc);
            var dup = _reg.RecordObservation(inc.Id, Witness, new SuspectDescription(), inc.Location, 1, false);
            Assert.IsNull(dup);
        }

        [Test]
        public void ObservedButNeverCalled_Expires()
        {
            var r = WitnessAssault(0, out _);
            _reg.Tick(IncidentRegistry.ObservationExpirySeconds + 1);
            Assert.AreEqual(ReportState.Failed, r.State);
        }

        [Test]
        public void DeliveredReport_OpensCalloutCase_ThenInvestigatesThenCools()
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 0, 5);
            Step(5);
            Assert.AreEqual(1, _dispatch.Cases.Count);
            var c = _dispatch.Cases[0];
            Assert.AreEqual(ResponseStage.Callout, c.Stage);
            Assert.AreEqual(CaseStatus.Dispatched, c.Status);
            Assert.AreEqual(0, _dispatch.DesiredUnits(c, 5));

            double available = c.UnitsAvailableAt;
            Step(available);
            Assert.AreEqual(CaseStatus.Investigating, c.Status);
            Assert.AreEqual(1, _dispatch.DesiredUnits(c, available));

            Step(c.SearchEndsAt);
            Assert.AreEqual(CaseStatus.Cooling, c.Status);
            Assert.AreEqual(0, _dispatch.DesiredUnits(c, c.SearchEndsAt));

            Step(c.RecognitionEndsAt);
            Assert.AreEqual(CaseStatus.Closed, c.Status);
        }

        [Test]
        public void Sighting_MatchingDescription_IsContactAndPursuit()
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 0, 5);
            Step(5);
            var c = _dispatch.Cases[0];
            float match = DescriptorMatcher.Match(c.Description, RhysOutfitA, null);
            Assert.Greater(match, PoliceRules.ContactMatchThreshold);
            Assert.IsTrue(_dispatch.ReportSighting(c, Rhys, RhysOutfitA, match, new Vec3(20, 0, 20), 30, false));
            Assert.AreEqual(CaseStatus.Contact, c.Status);
            Assert.AreEqual(ResponseStage.Pursuit, c.Stage);
            Assert.AreEqual(Rhys, c.ConfirmedSuspect);
        }

        [Test]
        public void Sighting_OfDifferentlyDressedPerson_IsNotContact()
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 0, 5);
            Step(5);
            var c = _dispatch.Cases[0];
            float match = DescriptorMatcher.Match(c.Description, RhysOutfitB, null);
            Assert.Less(match, PoliceRules.ContactMatchThreshold);
            Assert.IsFalse(_dispatch.ReportSighting(c, Rhys, RhysOutfitB, match, new Vec3(20, 0, 20), 30, false));
            Assert.AreNotEqual(CaseStatus.Contact, c.Status);
        }

        [Test]
        public void ContactLost_BecomesSearch_ThenCooling()
        {
            var c = OpenContactCase(30);
            Step(30 + PoliceRules.ContactLostAfterSeconds - 0.1);
            Assert.AreEqual(CaseStatus.Contact, c.Status);
            Step(30 + PoliceRules.ContactLostAfterSeconds);
            Assert.AreEqual(CaseStatus.Search, c.Status);
            Step(c.SearchEndsAt);
            Assert.AreEqual(CaseStatus.Cooling, c.Status);
        }

        [Test]
        public void LongChase_WithoutNewEvidence_DoesNotEscalate()
        {
            var c = OpenContactCase(30);
            for (double t = 31; t < 400; t += 1)
            {
                _dispatch.ReportSighting(c, Rhys, RhysOutfitA, 1f, new Vec3((float)t, 0, 0), t, false);
                Step(t);
            }

            Assert.AreEqual(ResponseStage.Pursuit, c.Stage);
        }

        [Test]
        public void NewSeriousCrime_EscalatesStage()
        {
            var c = OpenContactCase(30);
            var hit = _reg.CreateIncident(CrimeType.HitPedestrian, new Vec3(40, 0, 0), 31, Rhys, new EntityId("ped.2"));
            var hitReport = _reg.RecordObservation(hit.Id, new EntityId("ped.3"), GoodDescription(RhysOutfitA), hit.Location, 31, false);
            _reg.BeginCall(hitReport.Id, 31, 4);
            Step(35);
            var officerHit = _reg.CreateIncident(CrimeType.AssaultOfficer, new Vec3(40, 0, 0), 36, Rhys, Officer);
            _dispatch.ReportCrimeWitnessedByOfficer(officerHit, Officer, RhysOutfitA, null, 36);
            Step(36);
            Assert.GreaterOrEqual((int)c.Stage, (int)ResponseStage.Cordon, "severity 2+3+4 must escalate beyond Pursuit");
        }

        [Test]
        public void OfficerWitnessedCrime_IsImmediateContact()
        {
            var inc = _reg.CreateIncident(CrimeType.VehicleBreakIn, new Vec3(5, 0, 5), 10, Rhys, EntityId.None);
            var c = _dispatch.ReportCrimeWitnessedByOfficer(inc, Officer, RhysOutfitA, null, 10);
            Assert.IsNotNull(c);
            Assert.AreEqual(CaseStatus.Contact, c.Status);
            Assert.AreEqual(Rhys, c.ConfirmedSuspect);
        }

        [Test]
        public void Recognition_DuringCooling_RequiresHigherMatch()
        {
            var c = OpenContactCase(30);
            Step(40);
            Step(c.SearchEndsAt);
            Assert.AreEqual(CaseStatus.Cooling, c.Status);
            // A moderately similar stranger is not recognised during cooling.
            Assert.IsFalse(_dispatch.ReportSighting(c, Lena, RhysOutfitA, 0.7f, Vec3.Zero, c.SearchEndsAt + 1, false));
            Assert.IsTrue(_dispatch.ReportSighting(c, Lena, RhysOutfitA, 0.8f, Vec3.Zero, c.SearchEndsAt + 1, false));
        }

        [Test]
        public void Arrest_ClosesCasesForThatSuspectOnly()
        {
            var c = OpenContactCase(30);
            Assert.AreEqual(1, _dispatch.ReportArrest(Rhys, 50));
            Assert.AreEqual(CaseStatus.Closed, c.Status);
            Assert.AreEqual(0, _dispatch.ReportArrest(Lena, 50));
        }

        [Test]
        public void Heat_ProgressesWitnessedReportedSearchingContact()
        {
            var r = WitnessAssault(0, out _);
            Assert.AreEqual(HeatLevel.Witnessed, HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, 0).Level);
            _reg.BeginCall(r.Id, 0, 5);
            Step(5);
            Assert.AreEqual(HeatLevel.Reported, HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, 5).Level);
            var c = _dispatch.Cases[0];
            Step(c.UnitsAvailableAt);
            Assert.AreEqual(HeatLevel.Searching, HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, c.UnitsAvailableAt).Level);
            _dispatch.ReportSighting(c, Rhys, RhysOutfitA, 0.9f, Vec3.Zero, c.UnitsAvailableAt + 1, false);
            Assert.AreEqual(HeatLevel.Contact, HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, c.UnitsAvailableAt + 1).Level);
            // The uninvolved partner inherits nothing.
            Assert.AreEqual(HeatLevel.Unseen, HeatEvaluator.Evaluate(Lena, RhysOutfitB, null, _reg, _dispatch, c.UnitsAvailableAt + 1).Level);
        }

        [Test]
        public void ChangingClothes_ClearsDescriptionOnFile_ButNotActiveContact()
        {
            var c = OpenContactCase(30);
            // Changing clothes in front of an officer does not clear contact.
            Assert.AreEqual(HeatLevel.Contact, HeatEvaluator.Evaluate(Rhys, RhysOutfitB, null, _reg, _dispatch, 31).Level);
            Step(40);
            Step(c.SearchEndsAt);
            Assert.AreEqual(HeatLevel.DescriptionOnFile, HeatEvaluator.Evaluate(Rhys, RhysOutfitA, null, _reg, _dispatch, c.SearchEndsAt).Level);
            Assert.AreEqual(HeatLevel.Unseen, HeatEvaluator.Evaluate(Rhys, RhysOutfitB, null, _reg, _dispatch, c.SearchEndsAt).Level);
        }

        [Test]
        public void KnownPlate_KeepsVehicleRecognisableDespiteOutfitChange()
        {
            var d = GoodDescription(RhysOutfitA);
            d.VehicleClass = "sedan";
            d.VehicleColor = ColorFamily.Green;
            d.VehicleConfidence = 0.8f;
            d.Plate = "PM 4471";
            var car = new VehicleDescriptor("sedan", ColorFamily.Green, "PM 4471");
            Assert.Greater(DescriptorMatcher.Match(d, RhysOutfitB, car), 0.9f);
            Assert.Less(DescriptorMatcher.Match(d, RhysOutfitB, null), PoliceRules.ContactMatchThreshold);
        }

        [Test]
        public void DistantObserver_ProducesNoDescription()
        {
            var rng = new DeterministicRandom(7);
            var d = ObservationModel.Observe(RhysOutfitA, null, 60f, 1f, false, false, rng);
            Assert.IsFalse(d.HasPerson);
            var close = ObservationModel.Observe(RhysOutfitA, null, 5f, 1f, false, false, rng);
            Assert.IsTrue(close.HasPerson);
        }

        [Test]
        public void Descriptions_Merge_ReinforcesAgreement()
        {
            var a = GoodDescription(RhysOutfitA);
            a.TopConfidence = 0.5f;
            var b = GoodDescription(RhysOutfitA);
            b.TopConfidence = 0.5f;
            a.MergeFrom(b);
            Assert.AreEqual(0.75f, a.TopConfidence, 1e-4f);
            Assert.AreEqual(ColorFamily.Red, a.Top);
        }

        [Test]
        public void SecondReport_NearbyAndCompatible_MergesIntoSameCase()
        {
            var r1 = WitnessAssault(0, out _);
            _reg.BeginCall(r1.Id, 0, 3);
            var inc2 = _reg.CreateIncident(CrimeType.Assault, new Vec3(30, 0, 10), 10, Rhys, new EntityId("ped.v2"));
            var r2 = _reg.RecordObservation(inc2.Id, new EntityId("ped.0002"), GoodDescription(RhysOutfitA), inc2.Location, 10, false);
            _reg.BeginCall(r2.Id, 10, 3);
            Step(3);
            Step(13);
            Assert.AreEqual(1, _dispatch.Cases.Count);
            Assert.AreEqual(2, _dispatch.Cases[0].IncidentIds.Count);
            Assert.AreEqual(ResponseStage.Pursuit, _dispatch.Cases[0].Stage, "two assaults (2+2) reach severity 4");
        }

        private void Step(double now)
        {
            _reg.Tick(now);
            _dispatch.Tick(now);
        }

        private PoliceCase OpenContactCase(double contactTime)
        {
            var r = WitnessAssault(0, out _);
            _reg.BeginCall(r.Id, 0, 5);
            Step(5);
            var c = _dispatch.Cases[0];
            Step(c.UnitsAvailableAt);
            _dispatch.ReportSighting(c, Rhys, RhysOutfitA, 0.95f, new Vec3(20, 0, 20), contactTime, false);
            return c;
        }
    }
}
