using System;
using System.Globalization;
using System.IO;
using System.Text;
using PortMarlowe.Core.Save;
using PortMarlowe.Game.Rendering;
using UnityEngine;
using UnityEngine.Profiling;

namespace PortMarlowe.Game.Diagnostics
{
    /// <summary>
    /// Development telemetry: frame-time distribution, CPU/GPU frame timing (when the platform
    /// reports it), memory, simulation counts, load timings and the device's reported graphics
    /// capabilities (including ray-tracing flags, which are reported, never assumed). Shown in the
    /// overlay (View button / F3) and written as JSON to persistent storage on request or by the
    /// automated test runner. Nothing here leaves the device.
    /// </summary>
    public sealed class DiagnosticsService : MonoBehaviour
    {
        private const int Window = 600;
        private readonly float[] _frameMs = new float[Window];
        private readonly float[] _sorted = new float[Window];
        private readonly FrameTiming[] _timings = new FrameTiming[1];
        private int _count;
        private int _head;
        private float _statsTimer;
        private GameSession _s;
        private readonly StringBuilder _sb = new StringBuilder(1024);
        private string _overlay = string.Empty;

        public float AverageMs { get; private set; }
        public float P95Ms { get; private set; }
        public float P99Ms { get; private set; }
        public float WorstMs { get; private set; }
        public double CpuFrameMs { get; private set; }
        public double GpuFrameMs { get; private set; }
        public int HitchesOver50Ms { get; private set; }

        public float DistrictBuildMs;
        public float NavMeshBuildMs;
        public int NavMeshSources;
        public float SessionLoadMs;

        public static DiagnosticsService Create(Transform parent, GameSession session)
        {
            var go = new GameObject("Diagnostics");
            go.transform.SetParent(parent, false);
            var d = go.AddComponent<DiagnosticsService>();
            d._s = session;
            return d;
        }

        private void Update()
        {
            float ms = Time.unscaledDeltaTime * 1000f;
            _frameMs[_head] = ms;
            _head = (_head + 1) % Window;
            _count = Mathf.Min(_count + 1, Window);
            if (ms > 50f && Time.timeScale > 0f)
            {
                HitchesOver50Ms++;
            }

            FrameTimingManager.CaptureFrameTimings();
            if (FrameTimingManager.GetLatestTimings(1, _timings) > 0)
            {
                CpuFrameMs = _timings[0].cpuFrameTime;
                GpuFrameMs = _timings[0].gpuFrameTime;
            }

            _statsTimer -= Time.unscaledDeltaTime;
            if (_statsTimer <= 0f)
            {
                _statsTimer = 0.5f;
                ComputeStats();
                _overlay = BuildOverlay();
            }
        }

        private void ComputeStats()
        {
            if (_count == 0)
            {
                return;
            }

            Array.Copy(_frameMs, _sorted, _count);
            Array.Sort(_sorted, 0, _count);
            double sum = 0;
            for (int i = 0; i < _count; i++)
            {
                sum += _sorted[i];
            }

            AverageMs = (float)(sum / _count);
            P95Ms = _sorted[Mathf.Clamp((int)(_count * 0.95f), 0, _count - 1)];
            P99Ms = _sorted[Mathf.Clamp((int)(_count * 0.99f), 0, _count - 1)];
            WorstMs = _sorted[_count - 1];
        }

        public string OverlayText() => _overlay;

        private string BuildOverlay()
        {
            _sb.Clear();
            _sb.Append("FRAME  avg ").Append(AverageMs.ToString("0.0", CultureInfo.InvariantCulture))
                .Append(" ms (").Append(AverageMs > 0f ? (1000f / AverageMs).ToString("0", CultureInfo.InvariantCulture) : "-")
                .Append(" fps)  p95 ").Append(P95Ms.ToString("0.0", CultureInfo.InvariantCulture))
                .Append("  p99 ").Append(P99Ms.ToString("0.0", CultureInfo.InvariantCulture))
                .Append("  worst ").Append(WorstMs.ToString("0.0", CultureInfo.InvariantCulture))
                .Append("  hitches>50ms ").Append(HitchesOver50Ms).Append('\n');
            _sb.Append("CPU ").Append(CpuFrameMs > 0 ? CpuFrameMs.ToString("0.0", CultureInfo.InvariantCulture) + " ms" : "n/a")
                .Append("   GPU ").Append(GpuFrameMs > 0 ? GpuFrameMs.ToString("0.0", CultureInfo.InvariantCulture) + " ms" : "n/a (not reported)").Append('\n');
            _sb.Append("MEM  managed ").Append(Mb(GC.GetTotalMemory(false)))
                .Append("  allocated ").Append(Mb(Profiler.GetTotalAllocatedMemoryLong()))
                .Append("  reserved ").Append(Mb(Profiler.GetTotalReservedMemoryLong()));
            AppendPlatformMemory(_sb);
            _sb.Append('\n');
            _sb.Append("GFX  ").Append(SystemInfo.graphicsDeviceType).Append("  SM ").Append(SystemInfo.graphicsShaderLevel)
                .Append("  RT shaders ").Append(SystemInfo.supportsRayTracingShaders ? "reported" : "no")
                .Append("  inline RT ").Append(SystemInfo.supportsInlineRayTracing ? "reported" : "no").Append('\n');
            _sb.Append("RENDER ").Append(RenderBackends.Current.Describe()).Append('\n');
            if (_s != null)
            {
                _sb.Append("SIM  peds ").Append(_s.Pedestrians != null ? _s.Pedestrians.Active.Count : 0)
                    .Append("  vehicles ").Append(_s.Vehicles.Count)
                    .Append("  police units ").Append(_s.Police != null ? _s.Police.Units.Count : 0)
                    .Append("  open cases ").Append(CountOpenCases())
                    .Append('\n');
                _sb.Append("LOAD district ").Append(DistrictBuildMs.ToString("0", CultureInfo.InvariantCulture))
                    .Append(" ms  navmesh ").Append(NavMeshBuildMs.ToString("0", CultureInfo.InvariantCulture))
                    .Append(" ms (").Append(NavMeshSources).Append(" src)  session ")
                    .Append(SessionLoadMs.ToString("0", CultureInfo.InvariantCulture)).Append(" ms\n");
                var c = _s.Controlled;
                if (c != null)
                {
                    var pos = c.transform.position;
                    _sb.Append("POS  ").Append(pos.x.ToString("0.0", CultureInfo.InvariantCulture)).Append(", ")
                        .Append(pos.y.ToString("0.0", CultureInfo.InvariantCulture)).Append(", ")
                        .Append(pos.z.ToString("0.0", CultureInfo.InvariantCulture))
                        .Append("  state ").Append(c.State).Append('\n');
                }
            }

            return _sb.ToString();
        }

        private int CountOpenCases()
        {
            int n = 0;
            foreach (var c in _s.Dispatch.Cases)
            {
                if (c.IsOpen)
                {
                    n++;
                }
            }

            return n;
        }

        private static string Mb(long bytes) => (bytes / (1024.0 * 1024.0)).ToString("0", CultureInfo.InvariantCulture) + " MB";

        private static void AppendPlatformMemory(StringBuilder sb)
        {
#if ENABLE_WINMD_SUPPORT
            // UWP only (Xbox Dev Mode included): the title's commit usage against its limit.
            sb.Append("  app ").Append(Mb((long)Windows.System.MemoryManager.AppMemoryUsage))
                .Append(" / ").Append(Mb((long)Windows.System.MemoryManager.AppMemoryUsageLimit));
#endif
        }

        /// <summary>JSON snapshot for bug reports and automated runs. Returns the written path.</summary>
        public string WriteReport(string tag, JsonValue extra = null)
        {
            ComputeStats();
            var o = JsonValue.NewObject();
            o.Set("tag", tag ?? string.Empty);
            o.Set("utc", DateTime.UtcNow.ToString("o", CultureInfo.InvariantCulture));
            o.Set("unityVersion", Application.unityVersion);
            o.Set("appVersion", Application.version);
            o.Set("platform", Application.platform.ToString());
            o.Set("isEditor", Application.isEditor);
            o.Set("batchMode", Application.isBatchMode);

            var device = JsonValue.NewObject();
            device.Set("deviceType", SystemInfo.deviceType.ToString());
            device.Set("deviceModel", SystemInfo.deviceModel);
            device.Set("operatingSystem", SystemInfo.operatingSystem);
            device.Set("processorType", SystemInfo.processorType);
            device.Set("processorCount", SystemInfo.processorCount);
            device.Set("systemMemoryMb", SystemInfo.systemMemorySize);
            o.Set("device", device);

            var gfx = JsonValue.NewObject();
            gfx.Set("deviceType", SystemInfo.graphicsDeviceType.ToString());
            gfx.Set("deviceName", SystemInfo.graphicsDeviceName);
            gfx.Set("deviceVendor", SystemInfo.graphicsDeviceVendor);
            gfx.Set("deviceVersion", SystemInfo.graphicsDeviceVersion);
            gfx.Set("memoryMb", SystemInfo.graphicsMemorySize);
            gfx.Set("shaderLevel", SystemInfo.graphicsShaderLevel);
            gfx.Set("computeShaders", SystemInfo.supportsComputeShaders);
            gfx.Set("asyncCompute", SystemInfo.supportsAsyncCompute);
            gfx.Set("rayTracingShadersReported", SystemInfo.supportsRayTracingShaders);
            gfx.Set("inlineRayTracingReported", SystemInfo.supportsInlineRayTracing);
            gfx.Set("maxTextureSize", SystemInfo.maxTextureSize);
            gfx.Set("renderBackend", RenderBackends.Current.Describe());
            gfx.Set("qualityProfile", GameSettings.Quality.ToString());
            gfx.Set("screen", Screen.width + "x" + Screen.height);
            o.Set("graphics", gfx);

            var frame = JsonValue.NewObject();
            frame.Set("samples", _count);
            frame.Set("avgMs", AverageMs);
            frame.Set("p95Ms", P95Ms);
            frame.Set("p99Ms", P99Ms);
            frame.Set("worstMs", WorstMs);
            frame.Set("cpuFrameMs", CpuFrameMs);
            frame.Set("gpuFrameMs", GpuFrameMs);
            frame.Set("hitchesOver50Ms", HitchesOver50Ms);
            o.Set("frame", frame);

            var mem = JsonValue.NewObject();
            mem.Set("managedBytes", GC.GetTotalMemory(false));
            mem.Set("allocatedBytes", Profiler.GetTotalAllocatedMemoryLong());
            mem.Set("reservedBytes", Profiler.GetTotalReservedMemoryLong());
            o.Set("memory", mem);

            var load = JsonValue.NewObject();
            load.Set("districtMs", DistrictBuildMs);
            load.Set("navMeshMs", NavMeshBuildMs);
            load.Set("navMeshSources", NavMeshSources);
            load.Set("sessionMs", SessionLoadMs);
            o.Set("load", load);

            if (_s != null)
            {
                var sim = JsonValue.NewObject();
                sim.Set("pedestrians", _s.Pedestrians != null ? _s.Pedestrians.Active.Count : 0);
                sim.Set("vehicles", _s.Vehicles.Count);
                sim.Set("policeUnits", _s.Police != null ? _s.Police.Units.Count : 0);
                sim.Set("openCases", CountOpenCases());
                sim.Set("simTime", _s.Clock.Now);
                o.Set("simulation", sim);
            }

            if (extra != null)
            {
                o.Set("extra", extra);
            }

            string dir = Path.Combine(Application.persistentDataPath, "Diagnostics");
            Directory.CreateDirectory(dir);
            string safeTag = string.IsNullOrEmpty(tag) ? "report" : tag.Replace(' ', '_');
            string path = Path.Combine(dir, $"{safeTag}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json");
            File.WriteAllText(path, o.Serialize(true));
            Debug.Log("[PM] Diagnostics report written: " + path);
            return path;
        }
    }
}
