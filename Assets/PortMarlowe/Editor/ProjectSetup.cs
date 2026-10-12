using System;
using System.Collections.Generic;
using System.IO;
using PortMarlowe.Game;
using PortMarlowe.Game.Rendering;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace PortMarlowe.EditorTools
{
    /// <summary>
    /// A setup step contributed by another editor assembly (for example the URP backend, which
    /// creates and assigns the pipeline asset). Discovered through TypeCache; must have a public
    /// parameterless constructor.
    /// </summary>
    public interface IProjectSetupStep
    {
        int Order { get; }
        string Name { get; }
        void Run(ProjectSetupLog log);
    }

    public sealed class ProjectSetupLog
    {
        public readonly List<string> Lines = new List<string>();
        public int Warnings;

        public void Info(string line)
        {
            Lines.Add(line);
            Debug.Log("[PM setup] " + line);
        }

        public void Warn(string line)
        {
            Warnings++;
            Lines.Add("WARNING: " + line);
            Debug.LogWarning("[PM setup] " + line);
        }
    }

    /// <summary>
    /// Idempotent project configuration, run from the menu or headless
    /// (<c>-executeMethod PortMarlowe.EditorTools.ProjectSetup.RunFromCommandLine</c>). The project is
    /// kept reproducible from source: layers, player and UWP settings, material templates, the boot
    /// scene and build-scene list are all (re)created here instead of being hand-edited. After the
    /// first licensed run, commit the generated assets and .meta files so GUIDs stay stable.
    /// </summary>
    public static class ProjectSetup
    {
        public const string Root = "Assets/PortMarlowe";
        public const string ScenesFolder = Root + "/Scenes";
        public const string BootScenePath = ScenesFolder + "/Boot.unity";
        public const string MaterialsFolder = Root + "/Content/Resources/PortMarlowe/Materials";
        public const string SettingsFolder = Root + "/Settings";
        public const string CompanyName = "Port Marlowe Project";
        public const string ProductName = "Port Marlowe";
        public const string Version = "0.1.0";

        [MenuItem("Port Marlowe/Run Project Setup")]
        public static void RunFromMenu()
        {
            var log = Run();
            EditorUtility.DisplayDialog("Port Marlowe", $"Project setup finished with {log.Warnings} warning(s).\nSee the Console for details.", "OK");
        }

        /// <summary>Headless entry point. Exits the editor with 0 on success, 1 on failure.</summary>
        public static void RunFromCommandLine()
        {
            int code = 0;
            try
            {
                var log = Run();
                File.WriteAllLines("Logs/pm-project-setup.txt", log.Lines);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                code = 1;
            }

            EditorApplication.Exit(code);
        }

        public static ProjectSetupLog Run()
        {
            var log = new ProjectSetupLog();
            EnsureFolder(ScenesFolder);
            EnsureFolder(MaterialsFolder);
            EnsureFolder(SettingsFolder);
            ConfigureLayers(log);
            ConfigurePlayer(log);
            ConfigureUwp(log);
            CreateMaterialTemplates(log);
            RunContributedSteps(log);
            CreateBootScene(log);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            log.Info($"Setup complete ({log.Warnings} warnings).");
            return log;
        }

        public static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path))
            {
                return;
            }

            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            if (!string.IsNullOrEmpty(parent))
            {
                EnsureFolder(parent);
            }

            AssetDatabase.CreateFolder(parent, Path.GetFileName(path));
        }

        // ----------------------------------------------------------------------------------------

        private static void ConfigureLayers(ProjectSetupLog log)
        {
            var tagManager = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset");
            if (tagManager == null || tagManager.Length == 0)
            {
                log.Warn("TagManager.asset not found; layers not named.");
                return;
            }

            var so = new SerializedObject(tagManager[0]);
            var layers = so.FindProperty("layers");
            for (int i = 0; i < GameLayers.Names.Length; i++)
            {
                string name = GameLayers.Names[i];
                if (string.IsNullOrEmpty(name) || i < 8)
                {
                    continue;
                }

                var element = layers.GetArrayElementAtIndex(i);
                if (element.stringValue != name)
                {
                    element.stringValue = name;
                }
            }

            so.ApplyModifiedPropertiesWithoutUndo();
            log.Info("Layers named (8-16).");
        }

        private static void ConfigurePlayer(ProjectSetupLog log)
        {
            PlayerSettings.companyName = CompanyName;
            PlayerSettings.productName = ProductName;
            PlayerSettings.bundleVersion = Version;
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.enableFrameTimingStats = true;
            PlayerSettings.runInBackground = false;
            PlayerSettings.defaultIsNativeResolution = true;
            PlayerSettings.SetStackTraceLogType(LogType.Log, StackTraceLogType.None);
            PlayerSettings.SetStackTraceLogType(LogType.Warning, StackTraceLogType.ScriptOnly);

            // Input System only. Takes effect for builds immediately and for the editor after restart.
            var playerSettings = Resources.FindObjectsOfTypeAll<PlayerSettings>();
            if (playerSettings.Length > 0)
            {
                var so = new SerializedObject(playerSettings[0]);
                var handler = so.FindProperty("activeInputHandler");
                if (handler != null && handler.intValue != 1)
                {
                    handler.intValue = 1;
                    so.ApplyModifiedPropertiesWithoutUndo();
                    log.Info("Active input handling set to Input System (restart the editor if open).");
                }
            }
            else
            {
                log.Warn("PlayerSettings object not found; set Active Input Handling to 'Input System Package' manually.");
            }

            // Desktop Linux CI player: Mono keeps builds fast and needs no extra module.
            PlayerSettings.SetScriptingBackend(UnityEditor.Build.NamedBuildTarget.Standalone, ScriptingImplementation.Mono2x);
            PlayerSettings.SetApiCompatibilityLevel(UnityEditor.Build.NamedBuildTarget.Standalone, ApiCompatibilityLevel.NET_Standard);
            log.Info("Player settings applied (linear colour, frame timing stats, Input System).");
        }

        /// <summary>
        /// UWP settings for the Xbox Dev Mode target. Direct3D 11 is listed first because UWP on
        /// Xbox runs at feature level 11; D3D12 stays available for an explicit device comparison.
        /// No signing certificate is configured here: packaging signs with a developer certificate
        /// supplied at build time and never committed.
        /// </summary>
        private static void ConfigureUwp(ProjectSetupLog log)
        {
            var wsa = UnityEditor.Build.NamedBuildTarget.WindowsStoreApps;
            PlayerSettings.SetScriptingBackend(wsa, ScriptingImplementation.IL2CPP);
            PlayerSettings.SetApiCompatibilityLevel(wsa, ApiCompatibilityLevel.NET_Standard);
            PlayerSettings.SetUseDefaultGraphicsAPIs(BuildTarget.WSAPlayer, false);
            PlayerSettings.SetGraphicsAPIs(BuildTarget.WSAPlayer, new[]
            {
                UnityEngine.Rendering.GraphicsDeviceType.Direct3D11,
                UnityEngine.Rendering.GraphicsDeviceType.Direct3D12,
            });
            PlayerSettings.WSA.packageName = "PortMarlowe";
            PlayerSettings.WSA.applicationDescription = "Port Marlowe (development build)";
            PlayerSettings.WSA.tileShortName = "Port Marlowe";
            PlayerSettings.WSA.SetTargetDeviceFamily(PlayerSettings.WSATargetFamily.Xbox, true);
            PlayerSettings.WSA.SetTargetDeviceFamily(PlayerSettings.WSATargetFamily.Desktop, true);
            PlayerSettings.WSA.SetCapability(PlayerSettings.WSACapability.InternetClient, false);
            PlayerSettings.WSA.SetCapability(PlayerSettings.WSACapability.GazeInput, false);
            EditorUserBuildSettings.wsaUWPBuildType = WSAUWPBuildType.D3D;
            EditorUserBuildSettings.wsaArchitecture = "x64";
            log.Info("UWP settings applied (IL2CPP, x64, D3D11 first, Xbox + Desktop device families).");
        }

        // ----------------------------------------------------------------------------------------

        private static void CreateMaterialTemplates(ProjectSetupLog log)
        {
            CreateTemplate(log, MaterialLibrary.LitTemplate, "Universal Render Pipeline/Lit", null);
            CreateTemplate(log, MaterialLibrary.LitNormalTemplate, "Universal Render Pipeline/Lit", new[] { "_NORMALMAP" });
            CreateTemplate(log, MaterialLibrary.LitEmissiveTemplate, "Universal Render Pipeline/Lit", new[] { "_EMISSION" });
            CreateTemplate(log, MaterialLibrary.LitPbrTemplate, "Universal Render Pipeline/Lit", new[] { "_NORMALMAP", "_METALLICSPECGLOSSMAP", "_OCCLUSIONMAP" });
            CreateTemplate(log, MaterialLibrary.UnlitTemplate, "Universal Render Pipeline/Unlit", null);
            CreateTemplate(log, MaterialLibrary.SkyTemplate, "Skybox/Procedural", null);
        }

        /// <summary>
        /// Templates live in Resources so the shader variants the runtime instantiates (normal map,
        /// emission) are guaranteed to be in the build; the runtime clones them.
        /// </summary>
        private static void CreateTemplate(ProjectSetupLog log, string name, string shaderName, string[] keywords)
        {
            var shader = Shader.Find(shaderName);
            if (shader == null)
            {
                log.Warn($"Shader '{shaderName}' not found; template {name} skipped (is URP installed?).");
                return;
            }

            string path = $"{MaterialsFolder}/{name}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null)
            {
                mat = new Material(shader) { name = name };
                AssetDatabase.CreateAsset(mat, path);
            }
            else if (mat.shader != shader)
            {
                mat.shader = shader;
            }

            if (keywords != null)
            {
                foreach (var k in keywords)
                {
                    mat.EnableKeyword(k);
                }
            }

            if (keywords != null && Array.IndexOf(keywords, "_EMISSION") >= 0)
            {
                mat.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
                mat.SetColor("_EmissionColor", Color.black);
            }

            EditorUtility.SetDirty(mat);
            log.Info($"Material template {name} ({shaderName}).");
        }

        private static void RunContributedSteps(ProjectSetupLog log)
        {
            var steps = new List<IProjectSetupStep>();
            foreach (var type in TypeCache.GetTypesDerivedFrom<IProjectSetupStep>())
            {
                if (type.IsAbstract || type.IsInterface || type.GetConstructor(Type.EmptyTypes) == null)
                {
                    continue;
                }

                steps.Add((IProjectSetupStep)Activator.CreateInstance(type));
            }

            steps.Sort((a, b) => a.Order.CompareTo(b.Order));
            if (steps.Count == 0)
            {
                log.Warn("No render-pipeline setup step found; the project will use the built-in renderer fallback.");
            }

            foreach (var step in steps)
            {
                log.Info("Step: " + step.Name);
                step.Run(log);
            }
        }

        private static void CreateBootScene(ProjectSetupLog log)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var go = new GameObject("PortMarlowe");
            go.AddComponent<GameBootstrap>();
            EditorSceneManager.SaveScene(scene, BootScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(BootScenePath, true) };
            log.Info("Boot scene written and set as the only build scene.");
        }
    }
}
