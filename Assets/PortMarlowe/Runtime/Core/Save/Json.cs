using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace PortMarlowe.Core.Save
{
    public enum JsonKind
    {
        Null = 0,
        Bool,
        Number,
        String,
        Array,
        Object,
    }

    /// <summary>
    /// Minimal JSON DOM with an explicit, reflection-free reader/writer. Chosen over reflection
    /// serializers so save data survives IL2CPP managed-code stripping on UWP unchanged, and so
    /// migrations can operate on the document before it is mapped to typed records.
    /// Object member order is preserved for stable diffs.
    /// </summary>
    public sealed class JsonValue
    {
        private readonly List<KeyValuePair<string, JsonValue>> _members;
        private readonly List<JsonValue> _items;

        public JsonKind Kind { get; }
        public bool BoolValue { get; }
        public double NumberValue { get; }
        public string StringValue { get; }

        private JsonValue(JsonKind kind, bool b = false, double n = 0, string s = null)
        {
            Kind = kind;
            BoolValue = b;
            NumberValue = n;
            StringValue = s;
            if (kind == JsonKind.Object)
            {
                _members = new List<KeyValuePair<string, JsonValue>>();
            }
            else if (kind == JsonKind.Array)
            {
                _items = new List<JsonValue>();
            }
        }

        public static readonly JsonValue Null = new JsonValue(JsonKind.Null);
        public static JsonValue From(bool b) => new JsonValue(JsonKind.Bool, b: b);

        public static JsonValue From(double n)
        {
            if (double.IsNaN(n) || double.IsInfinity(n))
            {
                throw new ArgumentException("JSON cannot represent NaN/Infinity.");
            }

            return new JsonValue(JsonKind.Number, n: n);
        }

        public static JsonValue From(string s) => s == null ? Null : new JsonValue(JsonKind.String, s: s);
        public static JsonValue NewObject() => new JsonValue(JsonKind.Object);
        public static JsonValue NewArray() => new JsonValue(JsonKind.Array);

        // ---- Object API ----
        public int Count => Kind == JsonKind.Object ? _members.Count : (Kind == JsonKind.Array ? _items.Count : 0);

        public IEnumerable<KeyValuePair<string, JsonValue>> Members
        {
            get
            {
                RequireKind(JsonKind.Object);
                return _members;
            }
        }

        public JsonValue Set(string key, JsonValue value)
        {
            RequireKind(JsonKind.Object);
            value ??= Null;
            for (int i = 0; i < _members.Count; i++)
            {
                if (_members[i].Key == key)
                {
                    _members[i] = new KeyValuePair<string, JsonValue>(key, value);
                    return this;
                }
            }

            _members.Add(new KeyValuePair<string, JsonValue>(key, value));
            return this;
        }

        public JsonValue Set(string key, string value) => Set(key, From(value));
        public JsonValue Set(string key, double value) => Set(key, From(value));
        public JsonValue Set(string key, bool value) => Set(key, From(value));

        public bool Remove(string key)
        {
            RequireKind(JsonKind.Object);
            return _members.RemoveAll(m => m.Key == key) > 0;
        }

        public bool Has(string key) => Kind == JsonKind.Object && TryGet(key, out _);

        public bool TryGet(string key, out JsonValue value)
        {
            if (Kind == JsonKind.Object)
            {
                foreach (var m in _members)
                {
                    if (m.Key == key)
                    {
                        value = m.Value;
                        return true;
                    }
                }
            }

            value = null;
            return false;
        }

        public JsonValue this[string key] => TryGet(key, out var v) ? v : Null;

        public string GetString(string key, string fallback = "") =>
            TryGet(key, out var v) && v.Kind == JsonKind.String ? v.StringValue : fallback;

        public double GetNumber(string key, double fallback = 0) =>
            TryGet(key, out var v) && v.Kind == JsonKind.Number ? v.NumberValue : fallback;

        public float GetFloat(string key, float fallback = 0f) => (float)GetNumber(key, fallback);
        public int GetInt(string key, int fallback = 0) => (int)Math.Round(GetNumber(key, fallback));
        public long GetLong(string key, long fallback = 0) => (long)Math.Round(GetNumber(key, fallback));

        public bool GetBool(string key, bool fallback = false) =>
            TryGet(key, out var v) && v.Kind == JsonKind.Bool ? v.BoolValue : fallback;

        public JsonValue GetArray(string key) =>
            TryGet(key, out var v) && v.Kind == JsonKind.Array ? v : NewArray();

        public JsonValue GetObject(string key) =>
            TryGet(key, out var v) && v.Kind == JsonKind.Object ? v : null;

        // ---- Array API ----
        public IReadOnlyList<JsonValue> Items
        {
            get
            {
                RequireKind(JsonKind.Array);
                return _items;
            }
        }

        public JsonValue Add(JsonValue v)
        {
            RequireKind(JsonKind.Array);
            _items.Add(v ?? Null);
            return this;
        }

        public JsonValue Add(string s) => Add(From(s));

        // ---- Serialization ----
        public override string ToString() => Serialize(false);

        public string Serialize(bool pretty)
        {
            var sb = new StringBuilder(256);
            Write(sb, pretty, 0);
            return sb.ToString();
        }

        private void Write(StringBuilder sb, bool pretty, int depth)
        {
            switch (Kind)
            {
                case JsonKind.Null:
                    sb.Append("null");
                    break;
                case JsonKind.Bool:
                    sb.Append(BoolValue ? "true" : "false");
                    break;
                case JsonKind.Number:
                    sb.Append(NumberValue.ToString("R", CultureInfo.InvariantCulture));
                    break;
                case JsonKind.String:
                    WriteString(sb, StringValue);
                    break;
                case JsonKind.Array:
                    sb.Append('[');
                    for (int i = 0; i < _items.Count; i++)
                    {
                        if (i > 0)
                        {
                            sb.Append(',');
                        }

                        NewLine(sb, pretty, depth + 1);
                        _items[i].Write(sb, pretty, depth + 1);
                    }

                    if (_items.Count > 0)
                    {
                        NewLine(sb, pretty, depth);
                    }

                    sb.Append(']');
                    break;
                case JsonKind.Object:
                    sb.Append('{');
                    for (int i = 0; i < _members.Count; i++)
                    {
                        if (i > 0)
                        {
                            sb.Append(',');
                        }

                        NewLine(sb, pretty, depth + 1);
                        WriteString(sb, _members[i].Key);
                        sb.Append(pretty ? ": " : ":");
                        _members[i].Value.Write(sb, pretty, depth + 1);
                    }

                    if (_members.Count > 0)
                    {
                        NewLine(sb, pretty, depth);
                    }

                    sb.Append('}');
                    break;
            }
        }

        private static void NewLine(StringBuilder sb, bool pretty, int depth)
        {
            if (!pretty)
            {
                return;
            }

            sb.Append('\n');
            sb.Append(' ', depth * 2);
        }

        private static void WriteString(StringBuilder sb, string s)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    default:
                        if (c < 0x20)
                        {
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        }
                        else
                        {
                            sb.Append(c);
                        }

                        break;
                }
            }

            sb.Append('"');
        }

        private void RequireKind(JsonKind kind)
        {
            if (Kind != kind)
            {
                throw new InvalidOperationException($"JSON value is {Kind}, expected {kind}.");
            }
        }

        // ---- Parsing ----
        public static JsonValue Parse(string text)
        {
            if (text == null)
            {
                throw new JsonParseException("null input", 0);
            }

            var p = new Parser(text);
            p.SkipWs();
            var v = p.ParseValue(0);
            p.SkipWs();
            if (!p.AtEnd)
            {
                throw new JsonParseException("trailing characters", p.Position);
            }

            return v;
        }

        public static bool TryParse(string text, out JsonValue value, out string error)
        {
            try
            {
                value = Parse(text);
                error = null;
                return true;
            }
            catch (JsonParseException e)
            {
                value = null;
                error = e.Message;
                return false;
            }
        }

        private sealed class Parser
        {
            private const int MaxDepth = 64;
            private readonly string _s;
            private int _i;

            public Parser(string s)
            {
                _s = s;
            }

            public int Position => _i;
            public bool AtEnd => _i >= _s.Length;

            public void SkipWs()
            {
                while (_i < _s.Length && (_s[_i] == ' ' || _s[_i] == '\t' || _s[_i] == '\n' || _s[_i] == '\r'))
                {
                    _i++;
                }
            }

            public JsonValue ParseValue(int depth)
            {
                if (depth > MaxDepth)
                {
                    throw new JsonParseException("nesting too deep", _i);
                }

                if (AtEnd)
                {
                    throw new JsonParseException("unexpected end", _i);
                }

                char c = _s[_i];
                switch (c)
                {
                    case '{': return ParseObject(depth);
                    case '[': return ParseArray(depth);
                    case '"': return From(ParseString());
                    case 't': Expect("true"); return From(true);
                    case 'f': Expect("false"); return From(false);
                    case 'n': Expect("null"); return Null;
                    default:
                        if (c == '-' || (c >= '0' && c <= '9'))
                        {
                            return ParseNumber();
                        }

                        throw new JsonParseException($"unexpected '{c}'", _i);
                }
            }

            private JsonValue ParseObject(int depth)
            {
                var obj = NewObject();
                _i++; // {
                SkipWs();
                if (!AtEnd && _s[_i] == '}')
                {
                    _i++;
                    return obj;
                }

                while (true)
                {
                    SkipWs();
                    if (AtEnd || _s[_i] != '"')
                    {
                        throw new JsonParseException("expected key", _i);
                    }

                    string key = ParseString();
                    SkipWs();
                    if (AtEnd || _s[_i] != ':')
                    {
                        throw new JsonParseException("expected ':'", _i);
                    }

                    _i++;
                    SkipWs();
                    obj.Set(key, ParseValue(depth + 1));
                    SkipWs();
                    if (AtEnd)
                    {
                        throw new JsonParseException("unterminated object", _i);
                    }

                    if (_s[_i] == ',')
                    {
                        _i++;
                        continue;
                    }

                    if (_s[_i] == '}')
                    {
                        _i++;
                        return obj;
                    }

                    throw new JsonParseException("expected ',' or '}'", _i);
                }
            }

            private JsonValue ParseArray(int depth)
            {
                var arr = NewArray();
                _i++; // [
                SkipWs();
                if (!AtEnd && _s[_i] == ']')
                {
                    _i++;
                    return arr;
                }

                while (true)
                {
                    SkipWs();
                    arr.Add(ParseValue(depth + 1));
                    SkipWs();
                    if (AtEnd)
                    {
                        throw new JsonParseException("unterminated array", _i);
                    }

                    if (_s[_i] == ',')
                    {
                        _i++;
                        continue;
                    }

                    if (_s[_i] == ']')
                    {
                        _i++;
                        return arr;
                    }

                    throw new JsonParseException("expected ',' or ']'", _i);
                }
            }

            private string ParseString()
            {
                _i++; // opening quote
                var sb = new StringBuilder();
                while (true)
                {
                    if (AtEnd)
                    {
                        throw new JsonParseException("unterminated string", _i);
                    }

                    char c = _s[_i++];
                    if (c == '"')
                    {
                        return sb.ToString();
                    }

                    if (c != '\\')
                    {
                        if (c < 0x20)
                        {
                            throw new JsonParseException("control character in string", _i - 1);
                        }

                        sb.Append(c);
                        continue;
                    }

                    if (AtEnd)
                    {
                        throw new JsonParseException("bad escape", _i);
                    }

                    char e = _s[_i++];
                    switch (e)
                    {
                        case '"': sb.Append('"'); break;
                        case '\\': sb.Append('\\'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            if (_i + 4 > _s.Length)
                            {
                                throw new JsonParseException("bad unicode escape", _i);
                            }

                            if (!int.TryParse(_s.Substring(_i, 4), NumberStyles.HexNumber, CultureInfo.InvariantCulture, out int code))
                            {
                                throw new JsonParseException("bad unicode escape", _i);
                            }

                            sb.Append((char)code);
                            _i += 4;
                            break;
                        default:
                            throw new JsonParseException($"bad escape '\\{e}'", _i - 1);
                    }
                }
            }

            private JsonValue ParseNumber()
            {
                int start = _i;
                if (_s[_i] == '-')
                {
                    _i++;
                }

                while (!AtEnd)
                {
                    char c = _s[_i];
                    if ((c >= '0' && c <= '9') || c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-')
                    {
                        _i++;
                    }
                    else
                    {
                        break;
                    }
                }

                string token = _s.Substring(start, _i - start);
                if (!double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out double d) ||
                    double.IsNaN(d) || double.IsInfinity(d))
                {
                    throw new JsonParseException($"bad number '{token}'", start);
                }

                return From(d);
            }

            private void Expect(string literal)
            {
                if (_i + literal.Length > _s.Length || string.CompareOrdinal(_s, _i, literal, 0, literal.Length) != 0)
                {
                    throw new JsonParseException($"expected '{literal}'", _i);
                }

                _i += literal.Length;
            }
        }
    }

    public sealed class JsonParseException : Exception
    {
        public JsonParseException(string message, int position)
            : base($"JSON parse error at {position}: {message}")
        {
            Position = position;
        }

        public int Position { get; }
    }
}
