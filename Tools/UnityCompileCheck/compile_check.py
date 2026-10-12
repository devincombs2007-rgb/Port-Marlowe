#!/usr/bin/env python3
"""
Port Marlowe: Unity script compile check WITHOUT running (or licensing) the Unity editor.

Compiles the project's assembly definitions, and the package assemblies they depend on, with
Roslyn against the managed assemblies shipped in a Unity editor installation (extracted from the
GameCI editor image in CI). This verifies C# against the exact Unity 6000.x API surface; it does
NOT import assets, run the editor, run tests, or prove a build works.

Limitations (reported, not hidden): define symbols approximate Unity's; source generators are
passed as analyzers best-effort; package assemblies that rely on editor-only codegen may fail and
are reported separately from project assemblies.

Usage:
  compile_check.py --data <Editor/Data> --project <repo> --work <dir> --unity-version 6000.6.5f1
"""
import argparse
import glob
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.request

ROOT_SKIP = re.compile(r"(^\.|~$)")


def log(msg):
    print(msg, flush=True)


# ----------------------------------------------------------------------------- versions

def parse_version(v):
    m = re.match(r"(\d+)(?:\.(\d+))?(?:\.(\d+))?", v.strip())
    if not m:
        return (0, 0, 0)
    return tuple(int(x) if x else 0 for x in m.groups())


def version_matches(expr, version):
    """Unity asmdef versionDefines expression: '1.2.3' (>=), '[a,b)', '(a,b]', '[a]'."""
    expr = expr.strip()
    v = parse_version(version)
    if not expr:
        return True
    if expr[0] in "[(":
        lo_inc = expr[0] == "["
        hi_inc = expr[-1] == "]"
        body = expr[1:-1]
        if "," not in body:
            return v == parse_version(body)
        lo, hi = body.split(",", 1)
        if lo.strip():
            lv = parse_version(lo)
            if v < lv or (v == lv and not lo_inc):
                return False
        if hi.strip():
            hv = parse_version(hi)
            if v > hv or (v == hv and not hi_inc):
                return False
        return True
    return v >= parse_version(expr)


def unity_defines(unity_version):
    major, minor, patch = parse_version(unity_version)
    d = {f"UNITY_{major}_{minor}_{patch}", f"UNITY_{major}_{minor}", f"UNITY_{major}"}
    for y, m in [(5, 3), (5, 4), (5, 5), (5, 6), (2017, 1), (2017, 2), (2017, 3), (2017, 4), (2018, 1), (2018, 2), (2018, 3), (2018, 4),
                 (2019, 1), (2019, 2), (2019, 3), (2019, 4), (2020, 1), (2020, 2), (2020, 3), (2021, 1), (2021, 2), (2021, 3),
                 (2022, 1), (2022, 2), (2022, 3), (2023, 1), (2023, 2), (2023, 3)]:
        d.add(f"UNITY_{y}_{m}_OR_NEWER")
    for mi in range(0, minor + 1):
        d.add(f"UNITY_{major}_{mi}_OR_NEWER")
    d |= {
        "UNITY_64", "UNITY_ASSERTIONS", "UNITY_INCLUDE_TESTS_PLACEHOLDER",
        "NET_STANDARD_2_0", "NET_STANDARD_2_1", "NET_STANDARD", "NETSTANDARD2_1", "NETSTANDARD",
        "CSHARP_7_3_OR_NEWER", "CSHARP_7_OR_LATER",
        "ENABLE_INPUT_SYSTEM", "ENABLE_LEGACY_INPUT_MANAGER", "ENABLE_AUDIO", "ENABLE_CLOTH", "ENABLE_DIRECTOR",
        "ENABLE_PHYSICS", "ENABLE_UNITYEVENTS", "ENABLE_UNITYWEBREQUEST", "ENABLE_VIDEO", "ENABLE_RUNTIME_GI",
        "ENABLE_TEXTURE_STREAMING", "ENABLE_MANAGED_JOBS", "ENABLE_MANAGED_TRANSFORM_JOBS", "ENABLE_MANAGED_ANIMATION_JOBS",
        "ENABLE_MANAGED_AUDIO_JOBS", "ENABLE_UNITY_COLLECTIONS_CHECKS", "ENABLE_BURST_AOT", "ENABLE_PROFILER",
        "ENABLE_NAVIGATION_PACKAGE_DEBUG_VISUALIZATION", "ENABLE_NAVIGATION_UI_REQUIRES_PACKAGE",
        "PLATFORM_STANDALONE", "PLATFORM_STANDALONE_LINUX", "UNITY_STANDALONE", "UNITY_STANDALONE_LINUX",
        "UNITY_STANDALONE_LINUX_API", "ENABLE_MONO", "UNITY_POST_PROCESSING_STACK_V2_PLACEHOLDER",
    }
    return d


# ----------------------------------------------------------------------------- packages

class Package:
    def __init__(self, name, version, path):
        self.name = name
        self.version = version
        self.path = path


def fetch_registry_tarball(name, version, dest):
    url = f"https://packages.unity.com/{name}"
    with urllib.request.urlopen(url, timeout=60) as r:
        meta = json.load(r)
    if version not in meta.get("versions", {}):
        raise RuntimeError(f"{name}@{version} not in registry")
    tarball = meta["versions"][version]["dist"]["tarball"]
    with urllib.request.urlopen(tarball, timeout=120) as r:
        data = r.read()
    extract_tgz(data, dest)


def extract_tgz(data, dest):
    os.makedirs(dest, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as t:
        for m in t.getmembers():
            if m.name.startswith("package/"):
                m.name = m.name[len("package/"):]
                if not m.name or ".." in m.name.split("/"):
                    continue
                t.extract(m, dest)


def resolve_packages(data_dir, project, work):
    manifest = json.load(open(os.path.join(project, "Packages", "manifest.json")))
    builtin_dir = os.path.join(data_dir, "Resources", "PackageManager", "BuiltInPackages")
    bundled_dir = os.path.join(data_dir, "Resources", "PackageManager", "Editor")
    pkg_dir = os.path.join(work, "packages")
    os.makedirs(pkg_dir, exist_ok=True)
    wanted = dict(manifest.get("dependencies", {}))
    resolved = {}
    queue = list(wanted.items())
    while queue:
        name, ver = queue.pop(0)
        if name.startswith("com.unity.modules."):
            resolved[name] = Package(name, "1.0.0", None)
            continue
        if name in resolved and parse_version(resolved[name].version) >= parse_version(ver):
            continue
        path = None
        builtin = os.path.join(builtin_dir, name)
        if os.path.isfile(os.path.join(builtin, "package.json")):
            path = builtin
            ver = json.load(open(os.path.join(builtin, "package.json")))["version"]
            source = "builtin"
        else:
            dest = os.path.join(pkg_dir, f"{name}@{ver}")
            tgz = os.path.join(bundled_dir, f"{name}-{ver}.tgz")
            if not os.path.isdir(dest):
                if os.path.isfile(tgz):
                    extract_tgz(open(tgz, "rb").read(), dest)
                    source = "bundled"
                else:
                    fetch_registry_tarball(name, ver, dest)
                    source = "registry"
            else:
                source = "cached"
            path = dest
        resolved[name] = Package(name, ver, path)
        log(f"  package {name}@{ver} ({source})")
        pj = json.load(open(os.path.join(path, "package.json")))
        for dn, dv in pj.get("dependencies", {}).items():
            queue.append((dn, dv))
    return resolved


# ----------------------------------------------------------------------------- asmdefs

class Asmdef:
    def __init__(self, path, data, package):
        self.path = path
        self.dir = os.path.dirname(path)
        self.data = data
        self.name = data["name"]
        self.package = package
        self.sources = []
        self.extra_dirs = []

    @property
    def editor_only(self):
        return self.data.get("includePlatforms") == ["Editor"]

    @property
    def is_test(self):
        return "UNITY_INCLUDE_TESTS" in self.data.get("defineConstraints", [])


def read_guid(meta_path):
    try:
        for line in open(meta_path, encoding="utf-8", errors="ignore"):
            if line.startswith("guid:"):
                return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return None


def discover(roots):
    asmdefs = {}
    guid_to_name = {}
    asmrefs = []
    for root, package in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if not ROOT_SKIP.search(d)]
            for f in filenames:
                p = os.path.join(dirpath, f)
                if f.endswith(".asmdef"):
                    try:
                        data = json.load(open(p, encoding="utf-8-sig"))
                    except Exception as e:
                        log(f"  ! bad asmdef {p}: {e}")
                        continue
                    a = Asmdef(p, data, package)
                    if a.name in asmdefs:
                        continue
                    asmdefs[a.name] = a
                    g = read_guid(p + ".meta")
                    if g:
                        guid_to_name[g] = a.name
                elif f.endswith(".asmref"):
                    asmrefs.append(p)
    for p in asmrefs:
        try:
            ref = json.load(open(p, encoding="utf-8-sig")).get("reference", "")
        except Exception:
            continue
        name = guid_to_name.get(ref[5:], None) if ref.startswith("GUID:") else ref
        if name in asmdefs:
            asmdefs[name].extra_dirs.append(os.path.dirname(p))
    owner_dirs = {a.dir for a in asmdefs.values()}
    for p in asmrefs:
        owner_dirs.add(os.path.dirname(p))
    for a in asmdefs.values():
        for d in [a.dir] + a.extra_dirs:
            for dirpath, dirnames, filenames in os.walk(d):
                if dirpath != d and dirpath in owner_dirs:
                    dirnames[:] = []
                    continue
                dirnames[:] = [x for x in dirnames if not ROOT_SKIP.search(x) and os.path.join(dirpath, x) not in owner_dirs]
                a.sources += [os.path.join(dirpath, f) for f in filenames if f.endswith(".cs")]
    return asmdefs, guid_to_name


# Provisional aliases for assembly names that differ between a referencing package and the
# version actually bundled. Each is reported in the log; confirm against the printed inventory.
ALIASES = {"Unity.ugui": ["UnityEngine.UI", "UnityEditor.UI"]}


def ref_names(a, guid_to_name):
    out = []
    for r in a.data.get("references", []):
        if r.startswith("GUID:"):
            n = guid_to_name.get(r[5:])
            if n:
                out.append(n)
        else:
            alias = ALIASES.get(r, r)
            out.extend(alias if isinstance(alias, list) else [alias])
    return out


def constraint_ok(c, defines):
    c = c.strip()
    if "||" in c:
        return any(constraint_ok(x, defines) for x in c.split("||"))
    if c.startswith("!"):
        return c[1:] not in defines
    return c in defines


# ----------------------------------------------------------------------------- compile

def find_csc():
    dotnet = shutil.which("dotnet")
    if not dotnet:
        raise RuntimeError("dotnet not found")
    base = os.path.dirname(os.path.realpath(dotnet))
    cands = sorted(glob.glob(os.path.join(base, "sdk", "*", "Roslyn", "bincore", "csc.dll")))
    if not cands:
        raise RuntimeError("csc.dll not found in dotnet SDK")
    return dotnet, cands[-1]


def engine_refs(data_dir, editor):
    managed = os.path.join(data_dir, "Managed")
    mods = glob.glob(os.path.join(managed, "UnityEngine", "*.dll"))
    refs = [m for m in mods if editor or not os.path.basename(m).startswith("UnityEditor")]
    if editor:
        has_editor_modules = any(os.path.basename(m).startswith("UnityEditor.") for m in mods)
        if not has_editor_modules and os.path.isfile(os.path.join(managed, "UnityEditor.dll")):
            refs.append(os.path.join(managed, "UnityEditor.dll"))
        for extra in ("UnityEditor.Graphs.dll",):
            p = os.path.join(managed, extra)
            if os.path.isfile(p):
                refs.append(p)
    ns = os.path.join(data_dir, "NetStandard")
    std = glob.glob(os.path.join(ns, "ref", "2.1.0", "netstandard.dll"))
    shims = glob.glob(os.path.join(ns, "compat", "2.1.0", "shims", "netfx", "*.dll"))
    ext = glob.glob(os.path.join(ns, "Extensions", "2.0.0", "*.dll"))
    # Unity references System.Runtime.CompilerServices.Unsafe for all script assemblies (used by
    # Collections); the editor ships it with the other editor extensions.
    ext += glob.glob(os.path.join(ns, "EditorExtensions", "System.Runtime.CompilerServices.Unsafe.dll"))
    seen = set()
    out = []
    for r in std + shims + ext + refs:
        b = os.path.basename(r).lower()
        if b in seen:
            continue
        seen.add(b)
        out.append(r)
    return out


def analyzers(data_dir):
    return sorted(glob.glob(os.path.join(data_dir, "Tools", "Unity.SourceGenerators", "*.dll")))


def is_managed_dll(path):
    """True if the PE file has a CLI (.NET) header."""
    try:
        with open(path, "rb") as f:
            data = f.read(4096)
        if data[:2] != b"MZ":
            return False
        pe = int.from_bytes(data[0x3C:0x40], "little")
        if data[pe:pe + 4] != b"PE\0\0":
            return False
        opt = pe + 24
        magic = int.from_bytes(data[opt:opt + 2], "little")
        dd = opt + (96 if magic == 0x10B else 112)
        clr = dd + 14 * 8
        return int.from_bytes(data[clr:clr + 4], "little") != 0
    except Exception:
        return False


_AUTO_DLLS = {}


def auto_referenced_dlls(packages, editor):
    """Unity auto-references precompiled managed assemblies in packages (unless overrideReferences)."""
    key = editor
    if key in _AUTO_DLLS:
        return _AUTO_DLLS[key]
    out = []
    for p in packages.values():
        if not p.path:
            continue
        for dirpath, dirnames, filenames in os.walk(p.path):
            dirnames[:] = [d for d in dirnames if not ROOT_SKIP.search(d) and d not in ("Tests",)]
            for f in filenames:
                if not f.endswith(".dll"):
                    continue
                full = os.path.join(dirpath, f)
                rel = full.replace("\\", "/")
                if not editor and "/Editor/" in rel:
                    continue
                meta = full + ".meta"
                if os.path.isfile(meta):
                    txt = open(meta, encoding="utf-8", errors="ignore").read()
                    if "isExplicitlyReferenced: 1" in txt:
                        continue
                if is_managed_dll(full):
                    out.append(full)
    _AUTO_DLLS[key] = out
    return out


def precompiled(a, packages, data_dir):
    out = []
    names = list(a.data.get("precompiledReferences", []))
    if a.is_test and "nunit.framework.dll" not in names:
        names.append("nunit.framework.dll")
    for n in names:
        hits = []
        for p in packages.values():
            if p.path:
                hits += glob.glob(os.path.join(p.path, "**", n), recursive=True)
        hits = [h for h in hits if "~" not in h]
        if hits:
            out.append(sorted(hits)[0])
    return out


def compile_pass(label, asmdefs, guid_to_name, packages, data_dir, work, project_names, editor, unity_version, include_tests):
    defines = unity_defines(unity_version)
    if editor:
        # The editor compiles scripts with DEBUG and TRACE defined (some packages guard editor-used
        # types with #if DEBUG, e.g. Input System's InputSystemState).
        defines |= {"UNITY_EDITOR", "UNITY_EDITOR_64", "UNITY_EDITOR_LINUX", "DEBUG", "TRACE"}
        if include_tests:
            defines.add("UNITY_INCLUDE_TESTS")
    pkg_versions = {n: p.version for n, p in packages.items()}

    # Required closure from project assemblies.
    def eligible(a):
        if a.editor_only and not editor:
            return False
        excl = a.data.get("excludePlatforms", [])
        incl = a.data.get("includePlatforms", [])
        if editor and "Editor" in excl:
            return False
        if not editor and incl and "LinuxStandalone64" not in incl and "Editor" in incl:
            return False
        return True

    needed = []
    seen = set()

    def visit(n, chain):
        if n in seen or n not in asmdefs:
            return
        a = asmdefs[n]
        if not eligible(a):
            return
        seen.add(n)
        for r in ref_names(a, guid_to_name):
            visit(r, chain + [n])
        needed.append(n)

    for n in project_names:
        a = asmdefs.get(n)
        if a and (include_tests or not a.is_test):
            visit(n, [])

    dotnet, csc = find_csc()
    out_dir = os.path.join(work, "out", label)
    os.makedirs(out_dir, exist_ok=True)
    base_refs = engine_refs(data_dir, editor)
    gens = analyzers(data_dir)
    built = {}
    results = []
    for n in needed:
        a = asmdefs[n]
        d = set(defines)
        for vd in a.data.get("versionDefines", []):
            res = vd.get("name", "")
            ver = unity_version if res == "Unity" else pkg_versions.get(res)
            if ver is not None and version_matches(vd.get("expression", ""), ver):
                d.add(vd.get("define", ""))
        d |= set(a.data.get("defines", []))
        if not all(constraint_ok(c, d) for c in a.data.get("defineConstraints", [])):
            results.append((n, "skipped", "define constraints not met", a))
            continue
        missing = [r for r in ref_names(a, guid_to_name) if r in asmdefs and eligible(asmdefs[r]) and r not in built]
        failed_deps = [r for r in missing if any(x[0] == r and x[1] in ("FAIL", "BLOCKED", "skipped") for x in results)]
        if failed_deps:
            results.append((n, "BLOCKED", "dependency failed: " + ", ".join(failed_deps), a))
            continue
        if not a.sources:
            results.append((n, "skipped", "no sources", a))
            continue
        refs = list(base_refs)
        refs += [built[r] for r in ref_names(a, guid_to_name) if r in built]
        if not a.data.get("overrideReferences", False):
            refs += [d for d in auto_referenced_dlls(packages, editor) if os.path.basename(d).lower() not in {os.path.basename(x).lower() for x in refs}]
        refs += precompiled(a, packages, data_dir)
        engine_names = {os.path.splitext(os.path.basename(x))[0] for x in base_refs}
        unresolved = [r for r in a.data.get("references", []) if (r.startswith("GUID:") and r[5:] not in guid_to_name) or (not r.startswith("GUID:") and r not in asmdefs and r not in engine_names)]
        if unresolved:
            log(f"      note: {n} has unresolved references: {', '.join(unresolved)}")
        if editor and a.is_test:
            for tr in ("UnityEngine.TestRunner", "UnityEditor.TestRunner"):
                if tr in built and built[tr] not in refs:
                    refs.append(built[tr])
        outp = os.path.join(out_dir, n + ".dll")
        rsp = os.path.join(out_dir, n + ".rsp")
        with open(rsp, "w") as f:
            f.write("-target:library\n-nologo\n-noconfig\n-nostdlib+\n-langversion:9.0\n-deterministic\n-debug-\n")
            f.write("-nowarn:0169,0649,0414,1701,1702,1705,8019,0618,0612,0672,0067\n")
            if a.data.get("allowUnsafeCode"):
                f.write("-unsafe\n")
            f.write(f"-out:{outp}\n")
            f.write("-define:" + ";".join(sorted(x for x in d if x)) + "\n")
            for r in refs:
                f.write(f"-r:{r}\n")
            for g in gens:
                f.write(f"-analyzer:{g}\n")
            for s in sorted(set(a.sources)):
                f.write(f"\"{s}\"\n")
        proc = subprocess.run([dotnet, csc, "@" + rsp], capture_output=True, text=True)
        text = (proc.stdout or "") + (proc.stderr or "")
        errors = [l for l in text.splitlines() if ": error " in l]
        if proc.returncode == 0:
            built[n] = outp
            warns = [l for l in text.splitlines() if ": warning " in l and "CS8785" not in l]
            results.append((n, "ok", f"{len(a.sources)} files, {len(warns)} warnings", a))
            if n in project_names:
                for w in warns[:40]:
                    log("      " + w)
        else:
            results.append((n, "FAIL", "\n".join(errors[:80]) or text[-4000:], a))
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--project", required=True)
    ap.add_argument("--work", required=True)
    ap.add_argument("--unity-version", required=True)
    args = ap.parse_args()

    log("== resolving packages")
    packages = resolve_packages(args.data, args.project, args.work)
    roots = [(os.path.join(args.project, "Assets"), None)]
    roots += [(p.path, p) for p in packages.values() if p.path]
    log("== discovering assembly definitions")
    asmdefs, guid_to_name = discover(roots)
    project_names = [n for n, a in asmdefs.items() if a.package is None]
    for pkg in ("com.unity.ugui", "com.unity.collections", "com.unity.mathematics", "com.unity.inputsystem"):
        names = sorted(f"{a.name} ({os.path.relpath(a.path, a.package.path)})" for a in asmdefs.values() if a.package is not None and a.package.name == pkg)
        log(f"  asmdefs in {pkg}: {names}")
    engine_dir = os.path.join(args.data, "Managed", "UnityEngine")
    interesting = sorted(f for f in os.listdir(engine_dir) if re.search(r"(Mathematics|Properties|Collections|Burst|ugui|UI|Unsafe)", f))
    log(f"  engine assemblies of interest: {interesting}")
    log(f"  project assemblies: {', '.join(sorted(project_names))}")
    log(f"  asmdefs discovered: {len(asmdefs)}, GUIDs mapped: {len(guid_to_name)}")

    exit_code = 0
    summary = []
    for label, editor, tests in (("editor", True, True), ("player", False, False)):
        log(f"== compile pass: {label}")
        results = compile_pass(label, asmdefs, guid_to_name, packages, args.data, args.work, project_names, editor, args.unity_version, tests)
        for n, status, detail, a in results:
            scope = "project" if a.package is None else "package"
            log(f"  [{status:7}] {scope:7} {n}: {detail.splitlines()[0] if detail else ''}")
            if status in ("FAIL", "BLOCKED"):
                for line in detail.splitlines()[1:] if status == "FAIL" else []:
                    log("      " + line)
                if status == "FAIL":
                    for line in detail.splitlines()[:1]:
                        pass
                if scope == "project":
                    exit_code = 1
        for n, status, detail, a in results:
            if a.package is None:
                summary.append(f"  {label:6} {status:7} {n}: {detail.splitlines()[0] if detail else ''}")
        # Full error text for failures.
        for n, status, detail, a in results:
            if status == "FAIL":
                log(f"--- errors: {n}  (asmdef references: {a.data.get('references', [])}; versionDefines: {a.data.get('versionDefines', [])})")
                for line in detail.splitlines():
                    log("    " + line)
    log("== project assembly summary")
    for line in summary:
        log(line)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
