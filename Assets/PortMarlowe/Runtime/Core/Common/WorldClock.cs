using System;

namespace PortMarlowe.Core
{
    /// <summary>
    /// Canonical simulation clock (WorldTimeService). Gameplay timers read <see cref="Now"/>;
    /// menus, photo mode and pause stop advancing it, so reload/fuel/report timings never depend
    /// on frame rate or on wall-clock time.
    /// </summary>
    public sealed class WorldClock
    {
        /// <summary>Real seconds per in-game hour at normal play speed (48 real minutes per game day).</summary>
        public const double DefaultRealSecondsPerGameHour = 120.0;

        public double Now { get; private set; }

        /// <summary>Hour of day in [0, 24).</summary>
        public double TimeOfDayHours { get; private set; }

        public int Day { get; private set; }

        public double RealSecondsPerGameHour { get; set; } = DefaultRealSecondsPerGameHour;

        public bool Paused { get; set; }

        public WorldClock(double startHour = 9.5)
        {
            TimeOfDayHours = Normalize(startHour);
        }

        /// <summary>Advance by a simulation step (seconds). Negative or non-finite steps are ignored.</summary>
        public void Advance(double deltaSeconds)
        {
            if (Paused || deltaSeconds <= 0 || double.IsNaN(deltaSeconds) || double.IsInfinity(deltaSeconds))
            {
                return;
            }

            Now += deltaSeconds;
            AddHours(deltaSeconds / RealSecondsPerGameHour);
        }

        /// <summary>
        /// Bounded time skip used by resting. Simulation time also advances so pending
        /// timers (for example a search that expires) resolve consistently.
        /// </summary>
        public void SkipGameHours(double hours)
        {
            if (hours <= 0 || hours > 24)
            {
                throw new ArgumentOutOfRangeException(nameof(hours), "Skips are bounded to (0, 24] game hours.");
            }

            Now += hours * RealSecondsPerGameHour;
            AddHours(hours);
        }

        public void Restore(double now, int day, double timeOfDayHours)
        {
            Now = Math.Max(0, now);
            Day = Math.Max(0, day);
            TimeOfDayHours = Normalize(timeOfDayHours);
        }

        public bool IsNight => TimeOfDayHours < 6.0 || TimeOfDayHours >= 20.0;

        private void AddHours(double hours)
        {
            double total = TimeOfDayHours + hours;
            while (total >= 24.0)
            {
                total -= 24.0;
                Day++;
            }

            TimeOfDayHours = total;
        }

        private static double Normalize(double h)
        {
            h %= 24.0;
            return h < 0 ? h + 24.0 : h;
        }
    }
}
