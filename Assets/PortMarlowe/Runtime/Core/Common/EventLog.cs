using System;
using System.Collections.Generic;
using System.Text;

namespace PortMarlowe.Core
{
    public enum LogCategory
    {
        General,
        Control,
        Crime,
        Police,
        Vehicle,
        Partner,
        Save,
        World,
        Diagnostics,
    }

    public readonly struct LogEntry
    {
        public readonly double Time;
        public readonly LogCategory Category;
        public readonly StableId Entity;
        public readonly string Message;

        public LogEntry(double time, LogCategory category, StableId entity, string message)
        {
            Time = time;
            Category = category;
            Entity = entity;
            Message = message;
        }

        public override string ToString() => $"[{Time,9:0.00}] {Category,-11} {Entity} {Message}";
    }

    /// <summary>
    /// Bounded in-memory event log (ring buffer). Systems record decisions with timestamps and entity
    /// IDs so a diagnostic report can explain why police escalated, why a save was deferred, etc.
    /// </summary>
    public sealed class EventLog
    {
        private readonly LogEntry[] _buffer;
        private int _next;
        private int _count;

        public EventLog(int capacity = 512)
        {
            if (capacity < 1)
            {
                throw new ArgumentOutOfRangeException(nameof(capacity));
            }

            _buffer = new LogEntry[capacity];
        }

        public int Count => _count;
        public int Capacity => _buffer.Length;

        /// <summary>Raised for every entry; the Unity layer mirrors entries to the player log.</summary>
        public event Action<LogEntry> Recorded;

        public void Record(double time, LogCategory category, StableId entity, string message)
        {
            var entry = new LogEntry(time, category, entity, message ?? string.Empty);
            _buffer[_next] = entry;
            _next = (_next + 1) % _buffer.Length;
            if (_count < _buffer.Length)
            {
                _count++;
            }

            Recorded?.Invoke(entry);
        }

        /// <summary>Entries oldest-first.</summary>
        public List<LogEntry> Snapshot()
        {
            var list = new List<LogEntry>(_count);
            int start = (_next - _count + _buffer.Length) % _buffer.Length;
            for (int i = 0; i < _count; i++)
            {
                list.Add(_buffer[(start + i) % _buffer.Length]);
            }

            return list;
        }

        public string Dump(int maxEntries = 200)
        {
            var sb = new StringBuilder();
            var all = Snapshot();
            int from = Math.Max(0, all.Count - maxEntries);
            for (int i = from; i < all.Count; i++)
            {
                sb.AppendLine(all[i].ToString());
            }

            return sb.ToString();
        }

        public void Clear()
        {
            _next = 0;
            _count = 0;
        }
    }
}
