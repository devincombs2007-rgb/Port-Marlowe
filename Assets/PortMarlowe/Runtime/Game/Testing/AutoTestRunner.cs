using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using PortMarlowe.Core;
using PortMarlowe.Core.Crime;
using PortMarlowe.Core.Save;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Input;
using PortMarlowe.Game.SaveSystem;
using UnityEngine;
using UnityEngine.AI;

namespace PortMarlowe.Game.Testing
{
    /// <summary>
    /// Device-free smoke scenario for the first playable milestone, runnable in a player build
    /// (<c>-pmAutotest results.json</c>, including headless <c>-batchmode -nographics</c>) and from
    /// PlayMode tests. It drives the real systems through the same entry points the controller
    /// uses, with analog input injected through <see cref="ScriptedInput"/>. A pass here proves
    /// the systems connect; it says nothing about rendering quality or GPU performance.
    /// </summary>
    public sealed class AutoTestRunner : MonoBehaviour
    {
        public const float OverallTimeoutSeconds = 420f;

        public sealed class StepResult
        {
            public string Name;
            public bool Passed;
            public string Detail;
            public float Seconds;
        }

        private GameBootstrap _boot;
        private string _outputPath;
        private readonly List<StepResult> _results = new List<StepResult>();
        private readonly ScriptedInput _scripted = new ScriptedInput();
        private float _startedAt;

        public bool QuitWhenDone = true;
        public bool Finished { get; private set; }
        public int Failures { get; private set; }
        public IReadOnlyList<StepResult> Results => _results;

        private GameSession S => _boot.Session;

        public void Configure(GameBootstrap boot, string outputPath)
        {
            _boot = boot;
            _outputPath = outputPath;
        }

        private IEnumerator Start()
        {
            _startedAt = Time.realtimeSinceStartup;
            yield return Run();
            Finish();
        }

        private void Update()
        {
            if (!Finished && Time.realtimeSinceStartup - _startedAt > OverallTimeoutSeconds)
            {
                Record("overall_timeout", false, $"scenario exceeded {OverallTimeoutSeconds:0} s", 0f);
                StopAllCoroutines();
                Finish();
            }
        }

        private IEnumerator Run()
        {
            // 1. New game.
            float t = Time.realtimeSinceStartup;
            _boot.NewGame();
            yield return WaitUntil(() => _boot.InSession && !_boot.Transitioning, 120f);
            bool ok = _boot.InSession && S.Protagonists.Count == 2 && S.Controlled != null && S.Controlled.Id == Roster.RhysId &&
                      S.Vehicles.ContainsKey(GameWorld.PlayerCarId);
            if (!Record("new_game", ok, $"protagonists={S?.Protagonists.Count} controlled={S?.Controlled?.Id.Value} car={S != null && S.Vehicles.ContainsKey(GameWorld.PlayerCarId)}", t))
            {
                yield break;
            }

            S.Input.Scripted = _scripted;
            var rhys = S.Protagonists[Roster.RhysId];
            var lena = S.Protagonists[Roster.LenaId];
            var car = S.Vehicles[GameWorld.PlayerCarId];

            // 2. Navigation mesh under the start position.
            t = Time.realtimeSinceStartup;
            ok = NavMesh.SamplePosition(rhys.transform.position, out var hit, 1.5f, NavMesh.AllAreas);
            Record("navmesh", ok, ok ? $"sample {hit.position} build {S.Diagnostics.NavMeshBuildMs:0} ms" : "no navmesh near start", t);

            // 3. Pedestrians.
            t = Time.realtimeSinceStartup;
            yield return WaitUntil(() => S.Pedestrians.Active.Count > 0, 15f);
            Record("pedestrians", S.Pedestrians.Active.Count > 0, $"active={S.Pedestrians.Active.Count} budget={S.Pedestrians.Budget}", t);

            // 4. On-foot movement from stick input.
            t = Time.realtimeSinceStartup;
            Vector3 before = rhys.transform.position;
            _scripted.Move = new Vector2(0f, 1f);
            yield return new WaitForSeconds(2.5f);
            _scripted.Move = Vector2.zero;
            float moved = Flat(rhys.transform.position - before);
            Record("on_foot_move", moved > 2f, $"moved {moved:0.0} m in 2.5 s", t);

            // 5. Partner follows.
            t = Time.realtimeSinceStartup;
            _scripted.Move = new Vector2(0.3f, 1f);
            yield return new WaitForSeconds(3f);
            _scripted.Move = Vector2.zero;
            yield return WaitUntil(() => Flat(lena.transform.position - rhys.transform.position) < 6f, 12f);
            float gap = Flat(lena.transform.position - rhys.transform.position);
            Record("partner_follow", gap < 6f, $"gap {gap:0.0} m", t);

            // 6. Switch to Lena and back.
            t = Time.realtimeSinceStartup;
            bool requested = S.Switcher.RequestSwitch(out string reason);
            yield return WaitUntil(() => !S.Switcher.Busy && S.Controlled == lena, 5f);
            bool toLena = S.Controlled == lena && lena.IsPlayerControlled && !rhys.IsPlayerControlled;
            yield return new WaitForSeconds(0.5f);
            bool requestedBack = S.Switcher.RequestSwitch(out string reasonBack);
            yield return WaitUntil(() => !S.Switcher.Busy && S.Controlled == rhys, 5f);
            bool back = S.Controlled == rhys && rhys.IsPlayerControlled;
            Record("switch", requested && toLena && requestedBack && back, $"toLena={toLena} back={back} {reason}{reasonBack}", t);

            // 7. Enter the owned car as driver (placed beside the door to keep the run short).
            t = Time.realtimeSinceStartup;
            Vector3 door = car.DoorPointWorld(0);
            Vector3 outward = (door - car.transform.position);
            outward.y = 0f;
            rhys.PlaceOnFoot(GameWorld.SnapToNavMesh(door + outward.normalized * 1.2f), Quaternion.LookRotation(-outward).eulerAngles.y, S.DynamicRoot);
            yield return null;
            bool began = rhys.TryBeginEnter(car, 0, out string enterReason);
            yield return WaitUntil(() => rhys.InVehicle, 12f);
            Record("enter_vehicle", began && rhys.InVehicle && rhys.IsDriver && rhys.Vehicle == car, $"began={began} state={rhys.State} {enterReason}", t);
            if (!rhys.InVehicle)
            {
                yield break;
            }

            // 8. Drive and stop.
            t = Time.realtimeSinceStartup;
            Vector3 carStart = car.transform.position;
            _scripted.Throttle = 1f;
            float topSpeed = 0f;
            float driveEnd = Time.realtimeSinceStartup + 4f;
            while (Time.realtimeSinceStartup < driveEnd)
            {
                topSpeed = Mathf.Max(topSpeed, car.Controller.Speed);
                yield return null;
            }

            _scripted.Throttle = 0f;
            _scripted.Brake = 1f;
            yield return WaitUntil(() => car.Controller.Speed < 0.5f, 10f);
            _scripted.Brake = 0f;
            float driven = Flat(car.transform.position - carStart);
            Record("drive", driven > 8f && topSpeed > 5f && car.Controller.Speed < 0.5f,
                $"distance {driven:0.0} m, top {topSpeed * 3.6f:0} km/h, fuel {car.Fuel.Litres:0.0} L", t);

            // 9. Manual save (deferred until both characters are settled, e.g. partner boarding).
            t = Time.realtimeSinceStartup;
            yield return new WaitForSeconds(1f);
            string before9 = S.Save.Inspect(SaveService.ManualSlot)?.SavedAtUtc ?? string.Empty;
            var saveResult = S.Save.RequestSave(SaveService.ManualSlot, "autotest");
            yield return WaitUntil(() => !S.Save.HasPending && !S.Save.IsWriting && SavedAfter(before9), 20f);
            var info = S.Save.Inspect(SaveService.ManualSlot);
            bool saved = info != null && info.Valid && SavedAfter(before9);
            Record("save", saved, $"immediate={saveResult.Success} deferred={saveResult.Deferred} {saveResult.Error}", t);
            if (!saved)
            {
                yield break;
            }

            var snapshot = new
            {
                CarPos = car.transform.position,
                RhysInCar = rhys.InVehicle,
                LenaInCar = lena.InVehicle,
                Clock = S.Clock.Now,
                Cash = rhys.Wallet.Cash,
                Fuel = car.Fuel.Litres,
            };

            // 10. Load into a fresh session and compare.
            t = Time.realtimeSinceStartup;
            int sessions = _boot.SessionsStarted;
            _boot.LoadSlot(SaveService.ManualSlot);
            yield return WaitUntil(() => _boot.SessionsStarted > sessions && _boot.InSession && !_boot.Transitioning, 120f);
            S.Input.Scripted = _scripted;
            rhys = S.Protagonists[Roster.RhysId];
            lena = S.Protagonists[Roster.LenaId];
            car = S.Vehicles[GameWorld.PlayerCarId];
            float carDelta = Vector3.Distance(car.transform.position, snapshot.CarPos);
            ok = rhys.InVehicle && rhys.Vehicle == car && rhys.IsDriver && lena.InVehicle == snapshot.LenaInCar &&
                 carDelta < 1.5f && Math.Abs(S.Clock.Now - snapshot.Clock) < 2.0 && rhys.Wallet.Cash == snapshot.Cash &&
                 Mathf.Abs(car.Fuel.Litres - snapshot.Fuel) < 0.05f && S.Controlled == rhys;
            Record("load", ok, $"rhysInCar={rhys.InVehicle} lenaInCar={lena.InVehicle}/{snapshot.LenaInCar} carDelta={carDelta:0.00} m clockDelta={S.Clock.Now - snapshot.Clock:0.00} cash={rhys.Wallet.Cash}/{snapshot.Cash}", t);

            // 11. A witnessed, reported assault opens a case and police respond from it.
            t = Time.realtimeSinceStartup;
            var where = rhys.transform.position.ToCore();
            var incident = S.Incidents.CreateIncident(CrimeType.Assault, where, S.Now, rhys.Id, new StableId("npc.autotest.victim"));
            var description = ObservationModel.Observe(rhys.Appearance, rhys.VehicleDescriptor, 4f, 1f, false, false, new DeterministicRandom(7));
            var report = S.Incidents.RecordObservation(incident.Id, new StableId("npc.autotest.witness"), description, where, S.Now, false);
            bool calling = report != null && S.Incidents.BeginCall(report.Id, S.Now, 5);
            yield return WaitUntil(() => S.Dispatch.FindCaseForIncident(incident.Id) != null, 40f);
            var policeCase = S.Dispatch.FindCaseForIncident(incident.Id);
            yield return WaitUntil(() => S.Police.Units.Count > 0, 45f);
            Record("police_response", calling && policeCase != null && S.Police.Units.Count > 0,
                $"case={(policeCase != null ? "#" + policeCase.Id + " " + policeCase.Stage : "none")} units={S.Police.Units.Count}", t);

            // 12. Heat is visible to the player once reported.
            t = Time.realtimeSinceStartup;
            var heat = Core.Police.HeatEvaluator.Evaluate(rhys.Id, rhys.Appearance, rhys.VehicleDescriptor, S.Incidents, S.Dispatch, S.Now);
            Record("heat", heat.Level >= Core.Police.HeatLevel.Reported, $"{heat.Level}: {heat.Headline}", t);
        }

        private bool SavedAfter(string previous)
        {
            var info = S.Save.Inspect(SaveService.ManualSlot);
            return info != null && info.Valid && string.CompareOrdinal(info.SavedAtUtc, previous) > 0;
        }

        private static float Flat(Vector3 v)
        {
            v.y = 0f;
            return v.magnitude;
        }

        private static IEnumerator WaitUntil(Func<bool> condition, float timeoutSeconds)
        {
            float end = Time.realtimeSinceStartup + timeoutSeconds;
            while (Time.realtimeSinceStartup < end)
            {
                bool done;
                try
                {
                    done = condition();
                }
                catch (Exception)
                {
                    done = false;
                }

                if (done)
                {
                    yield break;
                }

                yield return null;
            }
        }

        private bool Record(string name, bool passed, string detail, float startedAt)
        {
            float seconds = startedAt > 0f ? Time.realtimeSinceStartup - startedAt : 0f;
            _results.Add(new StepResult { Name = name, Passed = passed, Detail = detail, Seconds = seconds });
            if (!passed)
            {
                Failures++;
            }

            Debug.Log($"[PM][autotest] {(passed ? "PASS" : "FAIL")} {name} ({seconds:0.0} s): {detail}");
            return passed;
        }

        private void Finish()
        {
            if (Finished)
            {
                return;
            }

            Finished = true;
            if (S != null && S.Input != null)
            {
                S.Input.Scripted = null;
            }

            var root = JsonValue.NewObject();
            root.Set("passed", Failures == 0 && _results.Count > 0);
            root.Set("failures", Failures);
            root.Set("seconds", Time.realtimeSinceStartup - _startedAt);
            root.Set("unityVersion", Application.unityVersion);
            root.Set("platform", Application.platform.ToString());
            root.Set("graphicsDevice", SystemInfo.graphicsDeviceType.ToString());
            root.Set("note", "Systems smoke test. Rendering quality, GPU performance and ray tracing are not measured here.");
            var steps = JsonValue.NewArray();
            foreach (var r in _results)
            {
                var o = JsonValue.NewObject();
                o.Set("name", r.Name);
                o.Set("passed", r.Passed);
                o.Set("detail", r.Detail ?? string.Empty);
                o.Set("seconds", r.Seconds);
                steps.Add(o);
            }

            root.Set("steps", steps);
            string json = root.Serialize(true);
            try
            {
                if (!string.IsNullOrEmpty(_outputPath))
                {
                    string dir = Path.GetDirectoryName(Path.GetFullPath(_outputPath));
                    if (!string.IsNullOrEmpty(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }

                    File.WriteAllText(_outputPath, json);
                }

                S?.Diagnostics?.WriteReport("autotest", root);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }

            Debug.Log("[PM][autotest] " + (Failures == 0 ? "ALL PASSED" : Failures + " FAILED") + "\n" + json);
            if (QuitWhenDone && !Application.isEditor)
            {
                Application.Quit(Failures == 0 && _results.Count > 0 ? 0 : 2);
            }
        }
    }
}
