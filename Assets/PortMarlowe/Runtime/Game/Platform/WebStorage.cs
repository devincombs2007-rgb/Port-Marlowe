#if UNITY_WEBGL && !UNITY_EDITOR
using System.Runtime.InteropServices;
#endif

namespace PortMarlowe.Game.Platform
{
    /// <summary>
    /// Browser builds keep Application.persistentDataPath in an IndexedDB-backed file system that is
    /// written back asynchronously. Flushing after each completed save means closing the tab right
    /// after "Saved." does not lose it. A no-op on every other platform.
    /// </summary>
    public static class WebStorage
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void PM_SyncFileSystem();
#endif

        public static void Flush()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            PM_SyncFileSystem();
#endif
        }
    }
}
