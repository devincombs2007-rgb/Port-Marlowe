// Browser-only helpers for Port Marlowe (Unity Web builds). Imported automatically for the
// Web platform because of the .jslib extension.
mergeInto(LibraryManager.library, {
  // Write the in-memory file system (saves, diagnostics) back to IndexedDB now.
  PM_SyncFileSystem: function () {
    if (typeof FS !== 'undefined' && FS.syncfs) {
      FS.syncfs(false, function (err) {
        if (err) { console.warn('[PM] persistent storage sync failed', err); }
      });
    }
  }
});
