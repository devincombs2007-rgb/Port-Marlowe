using UnityEngine;

namespace PortMarlowe.Game
{
    public enum QualityProfile
    {
        /// <summary>Target 60 FPS: lower render scale/shadow distance. Default on Xbox until measured.</summary>
        Performance = 0,
        /// <summary>Target 30 FPS: higher render scale and shadow distance. Enable only after device measurement.</summary>
        Fidelity = 1,
        /// <summary>Desktop development with headroom (not a console profile).</summary>
        DesktopHigh = 2,
    }

    /// <summary>
    /// Player options persisted with PlayerPrefs (UWP: app-local settings). Options change behaviour
    /// identically in free roam and missions. Saved separately from game saves.
    /// </summary>
    public static class GameSettings
    {
        private const string Prefix = "pm.settings.";

        public static bool InvertY { get; set; }
        public static float LookSensitivity { get; set; } = 1f;
        public static bool Vibration { get; set; } = true;
        public static bool ReducedCameraShake { get; set; }
        public static bool ShowDiagnostics { get; set; }
        public static bool HoldToSprint { get; set; } = true;
        public static QualityProfile Quality { get; set; } = QualityProfile.Performance;

        public static void Load()
        {
            InvertY = PlayerPrefs.GetInt(Prefix + "invertY", 0) == 1;
            LookSensitivity = Mathf.Clamp(PlayerPrefs.GetFloat(Prefix + "lookSensitivity", 1f), 0.3f, 2.5f);
            Vibration = PlayerPrefs.GetInt(Prefix + "vibration", 1) == 1;
            ReducedCameraShake = PlayerPrefs.GetInt(Prefix + "reducedShake", 0) == 1;
            ShowDiagnostics = PlayerPrefs.GetInt(Prefix + "diagnostics", 0) == 1;
            HoldToSprint = PlayerPrefs.GetInt(Prefix + "holdToSprint", 1) == 1;
            int defaultQuality = Application.isConsolePlatform || Application.platform == RuntimePlatform.WSAPlayerX64 ? 0 : 2;
            Quality = (QualityProfile)Mathf.Clamp(PlayerPrefs.GetInt(Prefix + "quality", defaultQuality), 0, 2);
        }

        public static void Save()
        {
            PlayerPrefs.SetInt(Prefix + "invertY", InvertY ? 1 : 0);
            PlayerPrefs.SetFloat(Prefix + "lookSensitivity", LookSensitivity);
            PlayerPrefs.SetInt(Prefix + "vibration", Vibration ? 1 : 0);
            PlayerPrefs.SetInt(Prefix + "reducedShake", ReducedCameraShake ? 1 : 0);
            PlayerPrefs.SetInt(Prefix + "diagnostics", ShowDiagnostics ? 1 : 0);
            PlayerPrefs.SetInt(Prefix + "holdToSprint", HoldToSprint ? 1 : 0);
            PlayerPrefs.SetInt(Prefix + "quality", (int)Quality);
            PlayerPrefs.Save();
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics()
        {
            InvertY = false;
            LookSensitivity = 1f;
            Vibration = true;
            ReducedCameraShake = false;
            ShowDiagnostics = false;
            HoldToSprint = true;
            Quality = QualityProfile.Performance;
        }
    }
}
