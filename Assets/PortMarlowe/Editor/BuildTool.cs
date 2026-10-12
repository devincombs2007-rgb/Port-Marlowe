using System;
using System.Globalization;
using System.IO;
using PortMarlowe.Core.Save;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace PortMarlowe.EditorTools
{
    /// <summary>
    /// Reproducible player builds from the command line or the menu.
    ///
    ///   Unity -batchmode -quit -projectPath . -buildTarget StandaloneLinux64 \
    ///         -executeMethod PortMarlowe.EditorTools.BuildTool.BuildFromCommandLine -pmProfile LinuxDev
    ///
    /// Profiles:
    ///   LinuxDev       Linux x64 development player (CI smoke runs; Mono)
    ///   WindowsDev     Windows x64 development player (desktop testing)
    ///   UwpDiagnostic  UWP Visual Studio solution, development build with profiler connection
    ///   UwpRelease     UWP Visual Studio solution, non-development (still sideload-signed later)
    ///
    /// A UWP profile produces a Visual Studio solution only. The installable package is produced
    /// by MSBuild in a second step (see Docs/BuildAndDeploy.md); this tool never claims a package.
    /// Output path: -pmOutput, or GameCI's -customBuildPath, or Builds/&lt;profile&gt;.
    /// Exit codes: 0 success, 1 build failed, 2 bad arguments, 3 exception.
    /// </summary>
    public static class BuildTool
    {
        public enum Profile
        {
            LinuxDev,
            WindowsDev,
            UwpDiagnostic,
            UwpRelease,
        }

        [MenuItem("Port Marlowe/Build/Linux Dev")]
        public static void MenuLinux() => Build(Profile.LinuxDev, null);

        [MenuItem("Port Marlowe/Build/Windows Dev")]
        public static void MenuWindows() => Build(Profile.WindowsDev, null);

        [MenuItem("Port Marlowe/Build/UWP Diagnostic (VS solution)")]
        public static void MenuUwpDiagnostic() => Build(Profile.UwpDiagnostic, null);

        public static void BuildFromCommandLine()
        {
            int code;
            try
            {
                string profileArg = Arg("-pmProfile") ?? "LinuxDev";
                if (!Enum.TryParse(profileArg, true, out Profile profile))
                {
                    Debug.LogError("[PM build] Unknown profile: " + profileArg);
                    EditorApplication.Exit(2);
                    return;
                }

                string output = Arg("-pmOutput") ?? Arg("-customBuildPath");
                code = Build(profile, output) ? 0 : 1;
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                code = 3;
            }

            EditorApplication.Exit(code);
        }

        public static bool Build(Profile profile, string output)
        {
            ProjectSetup.Run();

            var options = new BuildPlayerOptions
            {
                scenes = new[] { ProjectSetup.BootScenePath },
                options = BuildOptions.StrictMode,
            };

            switch (profile)
            {
                case Profile.LinuxDev:
                    options.target = BuildTarget.StandaloneLinux64;
                    options.targetGroup = BuildTargetGroup.Standalone;
                    options.options |= BuildOptions.Development;
                    options.locationPathName = ExecutablePath(output, "Builds/LinuxDev", "PortMarlowe.x86_64");
                    break;
                case Profile.WindowsDev:
                    options.target = BuildTarget.StandaloneWindows64;
                    options.targetGroup = BuildTargetGroup.Standalone;
                    options.options |= BuildOptions.Development;
                    options.locationPathName = ExecutablePath(output, "Builds/WindowsDev", "PortMarlowe.exe");
                    break;
                case Profile.UwpDiagnostic:
                    options.target = BuildTarget.WSAPlayer;
                    options.targetGroup = BuildTargetGroup.WSA;
                    options.options |= BuildOptions.Development | BuildOptions.ConnectWithProfiler;
                    options.locationPathName = output ?? "Builds/UWP";
                    break;
                case Profile.UwpRelease:
                    options.target = BuildTarget.WSAPlayer;
                    options.targetGroup = BuildTargetGroup.WSA;
                    options.locationPathName = output ?? "Builds/UWP";
                    break;
            }

            Debug.Log($"[PM build] {profile} -> {options.locationPathName}");
            var report = BuildPipeline.BuildPlayer(options);
            WriteSummary(profile, options, report);
            bool ok = report.summary.result == BuildResult.Succeeded;
            Debug.Log($"[PM build] {profile}: {report.summary.result}, {report.summary.totalErrors} errors, {report.summary.totalWarnings} warnings, " +
                      $"{report.summary.totalSize / (1024.0 * 1024.0):0.0} MB, {report.summary.totalTime.TotalSeconds:0} s");
            return ok;
        }

        /// <summary>GameCI passes a directory; desktop targets need an executable path inside it.</summary>
        private static string ExecutablePath(string output, string defaultDir, string exe)
        {
            if (string.IsNullOrEmpty(output))
            {
                return Path.Combine(defaultDir, exe);
            }

            return Path.HasExtension(output) ? output : Path.Combine(output, exe);
        }

        private static void WriteSummary(Profile profile, BuildPlayerOptions options, BuildReport report)
        {
            var s = report.summary;
            var o = JsonValue.NewObject();
            o.Set("profile", profile.ToString());
            o.Set("target", options.target.ToString());
            o.Set("output", options.locationPathName);
            o.Set("result", s.result.ToString());
            o.Set("errors", s.totalErrors);
            o.Set("warnings", s.totalWarnings);
            o.Set("sizeBytes", s.totalSize);
            o.Set("seconds", s.totalTime.TotalSeconds);
            o.Set("unityVersion", Application.unityVersion);
            o.Set("utc", DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture));
            o.Set("note", options.target == BuildTarget.WSAPlayer
                ? "Visual Studio solution only. Not an installable package until MSBuild packaging succeeds."
                : "Player build.");
            Directory.CreateDirectory("Builds");
            File.WriteAllText($"Builds/build-summary-{profile}.json", o.Serialize(true));
        }

        private static string Arg(string name)
        {
            var args = Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == name)
                {
                    return args[i + 1];
                }
            }

            return null;
        }
    }
}
