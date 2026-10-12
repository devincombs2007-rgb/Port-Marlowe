using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace PortMarlowe.Core.Save
{
    /// <summary>Storage abstraction so the commit protocol can be tested with injected failures.</summary>
    public interface ISaveStorage
    {
        bool Exists(string name);
        string Read(string name);
        void Write(string name, string text);
        void Delete(string name);
        void Move(string from, string to);
        void Copy(string from, string to);
        IEnumerable<string> List();
    }

    /// <summary>System.IO storage rooted in the platform's writable app folder (UWP: LocalState).</summary>
    public sealed class FileSaveStorage : ISaveStorage
    {
        private readonly string _root;

        public FileSaveStorage(string root)
        {
            _root = root ?? throw new ArgumentNullException(nameof(root));
            Directory.CreateDirectory(_root);
        }

        public string Root => _root;

        public bool Exists(string name) => File.Exists(PathOf(name));
        public string Read(string name) => File.ReadAllText(PathOf(name), Encoding.UTF8);

        public void Write(string name, string text)
        {
            var bytes = new UTF8Encoding(false).GetBytes(text);
            using (var fs = new FileStream(PathOf(name), FileMode.Create, FileAccess.Write, FileShare.None))
            {
                fs.Write(bytes, 0, bytes.Length);
                fs.Flush(true);
            }
        }

        public void Delete(string name)
        {
            string p = PathOf(name);
            if (File.Exists(p))
            {
                File.Delete(p);
            }
        }

        public void Move(string from, string to) => File.Move(PathOf(from), PathOf(to));

        public void Copy(string from, string to) => File.Copy(PathOf(from), PathOf(to), true);

        public IEnumerable<string> List()
        {
            foreach (var f in Directory.GetFiles(_root))
            {
                yield return Path.GetFileName(f);
            }
        }

        private string PathOf(string name)
        {
            if (string.IsNullOrEmpty(name) || name.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0 || name.Contains(".."))
            {
                throw new ArgumentException($"Invalid save file name '{name}'.");
            }

            return Path.Combine(_root, name);
        }
    }

    /// <summary>Ordered migrations from version N to N+1 operating on the JSON payload.</summary>
    public sealed class SaveMigrator
    {
        private readonly Dictionary<int, Func<JsonValue, JsonValue>> _steps = new Dictionary<int, Func<JsonValue, JsonValue>>();

        public int TargetVersion { get; }

        public SaveMigrator(int targetVersion = SaveSchema.CurrentVersion)
        {
            TargetVersion = targetVersion;
        }

        public void Register(int fromVersion, Func<JsonValue, JsonValue> step) => _steps[fromVersion] = step;

        public JsonValue Migrate(JsonValue payload, out int fromVersion)
        {
            fromVersion = payload.GetInt("schemaVersion");
            int v = fromVersion;
            if (v > TargetVersion)
            {
                throw new InvalidOperationException($"Save schema {v} is newer than this build supports ({TargetVersion}).");
            }

            while (v < TargetVersion)
            {
                if (!_steps.TryGetValue(v, out var step))
                {
                    throw new InvalidOperationException($"No migration registered from schema {v}.");
                }

                payload = step(payload) ?? throw new InvalidOperationException($"Migration from {v} returned null.");
                v++;
                payload.Set("schemaVersion", v);
            }

            return payload;
        }
    }

    public sealed class SaveSlotInfo
    {
        public string Slot = string.Empty;
        public string Label = string.Empty;
        public string SavedAtUtc = string.Empty;
        public int SchemaVersion;
        public bool Valid;
        public string Problem = string.Empty;
    }

    public sealed class SaveResult
    {
        public bool Success;
        public bool Deferred;
        public string Error = string.Empty;
        public int Bytes;
    }

    public sealed class LoadResult
    {
        public bool Success;
        public SaveGame Game;
        public string Error = string.Empty;

        /// <summary>"main", "tmp" (interrupted commit) or "bak" (previous save).</summary>
        public string Source = string.Empty;

        public int MigratedFromVersion;
        public List<string> Warnings = new List<string>();
    }

    /// <summary>Reports whether a save may be written right now and why not.</summary>
    public interface ISaveGate
    {
        bool CanSave(out string reason);
    }

    /// <summary>
    /// SaveCoordinator: versioned snapshots, checksummed envelope, atomic-style commit with backup,
    /// recovery from interrupted writes, migrations, and deferral to the next safe boundary.
    ///
    /// File layout per slot: "&lt;slot&gt;.pms" (committed), ".bak" (previous), ".tmp" (in-flight).
    /// Envelope: line 1 = header JSON (format, schema, length, FNV-1a 64 checksum, label),
    /// remainder = payload JSON text exactly as checksummed.
    /// </summary>
    public sealed class SaveCoordinator
    {
        public const string Extension = ".pms";

        private readonly ISaveStorage _storage;
        private readonly SaveMigrator _migrator;
        private readonly EventLog _log;
        private string _pendingSlot;
        private Func<SaveGame> _pendingSnapshot;

        public SaveCoordinator(ISaveStorage storage, SaveMigrator migrator = null, EventLog log = null)
        {
            _storage = storage ?? throw new ArgumentNullException(nameof(storage));
            _migrator = migrator ?? new SaveMigrator();
            _log = log;
        }

        public bool IsWriting { get; private set; }
        public bool HasPending => _pendingSlot != null;
        public string PendingSlot => _pendingSlot;

        public static string MainName(string slot) => slot + Extension;
        public static string BackupName(string slot) => slot + Extension + ".bak";
        public static string TempName(string slot) => slot + Extension + ".tmp";

        /// <summary>
        /// Save now if the gate allows; otherwise queue (latest request wins) and complete at the next
        /// <see cref="Tick"/> where the gate opens. The snapshot is taken when the write actually happens.
        /// </summary>
        public SaveResult RequestSave(string slot, Func<SaveGame> snapshot, ISaveGate gate)
        {
            if (gate != null && !gate.CanSave(out string reason))
            {
                _pendingSlot = slot;
                _pendingSnapshot = snapshot;
                _log?.Record(0, LogCategory.Save, StableId.None, $"save to {slot} deferred: {reason}");
                return new SaveResult { Deferred = true, Error = reason };
            }

            _pendingSlot = null;
            _pendingSnapshot = null;
            return Save(slot, snapshot());
        }

        /// <summary>Completes a deferred save once the gate opens. Returns the result if one was written.</summary>
        public SaveResult Tick(ISaveGate gate)
        {
            if (_pendingSlot == null || gate == null || !gate.CanSave(out _))
            {
                return null;
            }

            string slot = _pendingSlot;
            var snap = _pendingSnapshot;
            _pendingSlot = null;
            _pendingSnapshot = null;
            return Save(slot, snap());
        }

        public void CancelPending()
        {
            _pendingSlot = null;
            _pendingSnapshot = null;
        }

        public SaveResult Save(string slot, SaveGame game)
        {
            if (game == null)
            {
                return new SaveResult { Error = "nothing to save" };
            }

            var problems = game.Validate();
            if (problems.Count > 0)
            {
                // Never commit a structurally invalid snapshot over a good save.
                string msg = "invalid snapshot: " + string.Join("; ", problems);
                _log?.Record(game.SimTime, LogCategory.Save, StableId.None, msg);
                return new SaveResult { Error = msg };
            }

            IsWriting = true;
            try
            {
                string text = Encode(game);
                string tmp = TempName(slot);
                string main = MainName(slot);
                string bak = BackupName(slot);

                _storage.Write(tmp, text);

                // Verify the bytes we just wrote decode before touching the committed file.
                if (!TryDecode(_storage.Read(tmp), out _, out string verifyError))
                {
                    _storage.Delete(tmp);
                    return new SaveResult { Error = "verification failed: " + verifyError };
                }

                if (_storage.Exists(main) && TryDecode(SafeRead(main), out _, out _))
                {
                    // Only a valid committed save may replace the backup.
                    _storage.Copy(main, bak);
                }

                _storage.Delete(main);
                _storage.Move(tmp, main);
                _log?.Record(game.SimTime, LogCategory.Save, new StableId(game.Controlled), $"saved {slot} ({text.Length} chars, reason={game.Reason})");
                return new SaveResult { Success = true, Bytes = Encoding.UTF8.GetByteCount(text) };
            }
            catch (Exception e)
            {
                _log?.Record(game.SimTime, LogCategory.Save, StableId.None, $"save {slot} failed: {e.Message}");
                return new SaveResult { Error = e.Message };
            }
            finally
            {
                IsWriting = false;
            }
        }

        public LoadResult Load(string slot)
        {
            var result = new LoadResult();
            var attempts = new[] { ("main", MainName(slot)), ("tmp", TempName(slot)), ("bak", BackupName(slot)) };
            var errors = new List<string>();
            foreach (var (label, name) in attempts)
            {
                if (!_storage.Exists(name))
                {
                    continue;
                }

                if (!TryDecode(SafeRead(name), out var payload, out string error))
                {
                    errors.Add($"{label}: {error}");
                    continue;
                }

                try
                {
                    var migrated = _migrator.Migrate(payload, out int fromVersion);
                    var game = SaveGame.FromJson(migrated);
                    var problems = game.Validate();
                    if (problems.Count > 0)
                    {
                        errors.Add($"{label}: invalid ({string.Join("; ", problems)})");
                        continue;
                    }

                    result.Success = true;
                    result.Game = game;
                    result.Source = label;
                    result.MigratedFromVersion = fromVersion;
                    result.Warnings.AddRange(errors);
                    if (label != "main")
                    {
                        result.Warnings.Add($"recovered from {label} copy");
                        Repair(slot, name);
                    }

                    _log?.Record(game.SimTime, LogCategory.Save, new StableId(game.Controlled), $"loaded {slot} from {label} (schema {fromVersion})");
                    return result;
                }
                catch (Exception e)
                {
                    errors.Add($"{label}: {e.Message}");
                }
            }

            result.Error = errors.Count == 0 ? "no save in slot" : string.Join(" | ", errors);
            return result;
        }

        public SaveSlotInfo Inspect(string slot)
        {
            var info = new SaveSlotInfo { Slot = slot };
            string main = MainName(slot);
            if (!_storage.Exists(main))
            {
                info.Problem = _storage.Exists(TempName(slot)) || _storage.Exists(BackupName(slot)) ? "only recovery copies present" : "empty";
                return info;
            }

            string text = SafeRead(main);
            if (!TryReadHeader(text, out var header, out string payloadText, out string err))
            {
                info.Problem = err;
                return info;
            }

            info.Label = header.GetString("label");
            info.SavedAtUtc = header.GetString("savedAtUtc");
            info.SchemaVersion = header.GetInt("schemaVersion");
            info.Valid = Checksum(payloadText) == header.GetString("checksum");
            if (!info.Valid)
            {
                info.Problem = "checksum mismatch";
            }

            return info;
        }

        public bool Delete(string slot)
        {
            bool any = false;
            foreach (var n in new[] { MainName(slot), BackupName(slot), TempName(slot) })
            {
                if (_storage.Exists(n))
                {
                    _storage.Delete(n);
                    any = true;
                }
            }

            return any;
        }

        public static string Encode(SaveGame game)
        {
            string payload = game.ToJson().Serialize(true);
            var header = JsonValue.NewObject();
            header.Set("format", SaveSchema.Format);
            header.Set("schemaVersion", game.SchemaVersion);
            header.Set("length", payload.Length);
            header.Set("checksum", Checksum(payload));
            header.Set("label", game.Label ?? string.Empty);
            header.Set("savedAtUtc", game.SavedAtUtc ?? string.Empty);
            return header.Serialize(false) + "\n" + payload;
        }

        public static bool TryDecode(string text, out JsonValue payload, out string error)
        {
            payload = null;
            if (!TryReadHeader(text, out var header, out string payloadText, out error))
            {
                return false;
            }

            if (header.GetInt("length", -1) != payloadText.Length)
            {
                error = "length mismatch (truncated write?)";
                return false;
            }

            if (Checksum(payloadText) != header.GetString("checksum"))
            {
                error = "checksum mismatch";
                return false;
            }

            if (!JsonValue.TryParse(payloadText, out payload, out error))
            {
                return false;
            }

            if (payload.Kind != JsonKind.Object)
            {
                error = "payload is not an object";
                payload = null;
                return false;
            }

            return true;
        }

        /// <summary>FNV-1a 64-bit over UTF-16 code units, hex. Detects truncation/corruption, not tampering.</summary>
        public static string Checksum(string text)
        {
            const ulong offset = 14695981039346656037UL;
            const ulong prime = 1099511628211UL;
            ulong h = offset;
            foreach (char c in text)
            {
                h ^= (byte)(c & 0xFF);
                h *= prime;
                h ^= (byte)(c >> 8);
                h *= prime;
            }

            return h.ToString("x16", CultureInfo.InvariantCulture);
        }

        private static bool TryReadHeader(string text, out JsonValue header, out string payloadText, out string error)
        {
            header = null;
            payloadText = null;
            if (string.IsNullOrEmpty(text))
            {
                error = "empty file";
                return false;
            }

            int nl = text.IndexOf('\n');
            if (nl < 0)
            {
                error = "missing header";
                return false;
            }

            if (!JsonValue.TryParse(text.Substring(0, nl), out header, out error))
            {
                error = "bad header: " + error;
                return false;
            }

            if (header.Kind != JsonKind.Object || header.GetString("format") != SaveSchema.Format)
            {
                error = "not a Port Marlowe save";
                return false;
            }

            payloadText = text.Substring(nl + 1);
            error = null;
            return true;
        }

        private string SafeRead(string name)
        {
            try
            {
                return _storage.Read(name);
            }
            catch (Exception)
            {
                return null;
            }
        }

        private void Repair(string slot, string recoveredName)
        {
            try
            {
                string main = MainName(slot);
                if (recoveredName == main)
                {
                    return;
                }

                _storage.Copy(recoveredName, main + ".repair");
                _storage.Delete(main);
                _storage.Move(main + ".repair", main);
            }
            catch (Exception e)
            {
                _log?.Record(0, LogCategory.Save, StableId.None, $"repair of {slot} failed: {e.Message}");
            }
        }
    }
}
