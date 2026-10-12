using System.Collections;
using NUnit.Framework;
using PortMarlowe.Game;
using PortMarlowe.Game.Characters;
using PortMarlowe.Game.Testing;
using UnityEngine;
using UnityEngine.TestTools;

namespace PortMarlowe.Tests.PlayMode
{
    /// <summary>
    /// Runs the milestone systems in a real player loop (physics, navigation, coroutines). These
    /// verify behaviour, not visuals: in batch mode with -nographics nothing is rendered.
    /// </summary>
    public sealed class SessionSmokeTests
    {
        private GameObject _root;

        [TearDown]
        public void TearDown()
        {
            if (_root != null)
            {
                Object.Destroy(_root);
            }

            Time.timeScale = 1f;
        }

        private GameBootstrap CreateBootstrap()
        {
            _root = new GameObject("PortMarlowe (test)");
            var boot = _root.AddComponent<GameBootstrap>();
            boot.Mode = StartMode.None;
            return boot;
        }

        [UnityTest]
        [Timeout(180000)]
        public IEnumerator NewGame_BuildsDistrictProtagonistsAndOwnedCar()
        {
            var boot = CreateBootstrap();
            yield return null;
            boot.NewGame();
            float end = Time.realtimeSinceStartup + 150f;
            while (!(boot.InSession && !boot.Transitioning) && Time.realtimeSinceStartup < end)
            {
                yield return null;
            }

            Assert.IsTrue(boot.InSession, "session did not start");
            var s = boot.Session;
            Assert.AreEqual(2, s.Protagonists.Count);
            Assert.AreEqual(Roster.RhysId, s.Controlled.Id);
            Assert.IsTrue(s.Vehicles.ContainsKey(GameWorld.PlayerCarId));
            Assert.AreEqual(Roster.RhysId, s.Vehicles[GameWorld.PlayerCarId].Owner);
            Assert.Greater(s.District.Lamps.Count, 0);
        }

        [UnityTest]
        [Timeout(480000)]
        public IEnumerator AutomatedScenario_AllStepsPass()
        {
            var boot = CreateBootstrap();
            var runner = _root.AddComponent<AutoTestRunner>();
            runner.QuitWhenDone = false;
            runner.Configure(boot, null);
            while (!runner.Finished)
            {
                yield return null;
            }

            var failures = new System.Text.StringBuilder();
            foreach (var r in runner.Results)
            {
                if (!r.Passed)
                {
                    failures.Append(r.Name).Append(": ").Append(r.Detail).Append('\n');
                }
            }

            Assert.AreEqual(0, runner.Failures, failures.ToString());
        }
    }
}
