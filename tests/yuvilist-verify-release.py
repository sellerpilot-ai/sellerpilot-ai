"""Verify a downloaded YuviList candidate ZIP without extracting or deploying it."""
import argparse
import hashlib
import json
import pathlib
import re
import stat
import tempfile
import zipfile

COUNT = 55
MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024
HEX = re.compile(r"[0-9a-f]{64}")
SHA = re.compile(r"[0-9a-f]{40}")
PATH = re.compile(r"(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)?")

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def fingerprint(rows):
    value = hashlib.sha256()
    for path, size, checksum in sorted(rows):
        value.update((json.dumps([path, size, checksum], separators=(",", ":")) + "\n").encode())
    return value.hexdigest()

def verify(archive, manifest_path, expected_sha):
    require(bool(SHA.fullmatch(expected_sha)), "Expected candidate SHA is required")
    require(manifest_path.stat().st_size <= 128 * 1024, "Manifest too large")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest.get("format") == "sellerpilot-cloudflare-release-evidence-v2", "Unexpected manifest format")
    require(manifest.get("status") == "DEVELOPMENT CANDIDATE — NOT APPROVED FOR DEPLOYMENT", "Unexpected release status")
    require(manifest.get("candidate_sha") == expected_sha, "Candidate SHA mismatch")
    require(bool(SHA.fullmatch(manifest.get("checkout_sha", ""))), "Invalid checkout SHA")
    rows = manifest.get("files")
    require(isinstance(rows, list) and len(rows) == manifest.get("file_count") == COUNT, "Incorrect file count")
    expected = {}
    for row in rows:
        path, size, checksum = row["path"], row["bytes"], row["sha256"]
        require(isinstance(path, str) and bool(PATH.fullmatch(path)), "Unsafe manifest path")
        require(path not in expected, "Duplicate manifest path")
        require(type(size) is int and 0 <= size <= MAX_FILE, "Invalid file size")
        require(isinstance(checksum, str) and bool(HEX.fullmatch(checksum)), "Invalid file hash")
        expected[path] = (size, checksum)
    require({"index.html", "app.html", "_headers", "404.html"} <= expected.keys(), "Missing required file")
    require(sum(size for size, _ in expected.values()) <= MAX_TOTAL, "Package too large")
    require(fingerprint([(p, *v) for p, v in expected.items()]) == manifest.get("fingerprint_sha256"), "Manifest fingerprint mismatch")
    require(archive.stat().st_size <= MAX_TOTAL, "ZIP too large")
    with zipfile.ZipFile(archive) as z:
        info = z.infolist()
        require(len(info) == COUNT and {i.filename for i in info} == expected.keys(), "Unexpected or duplicate ZIP entries")
        for i in info:
            mode = (i.external_attr >> 16) & 0xffff
            require(not i.is_dir() and not stat.S_ISLNK(mode) and not (i.flag_bits & 1), "Unsafe ZIP entry")
            size, checksum = expected[i.filename]
            require(i.file_size == size, "ZIP size mismatch: " + i.filename)
            with z.open(i) as f:
                data = f.read(size + 1)
            require(len(data) == size and digest(data) == checksum, "ZIP hash mismatch: " + i.filename)
    return manifest["fingerprint_sha256"]

def self_test():
    sha = "a" * 40
    files = {p: p.encode() for p in ["index.html", "app.html", "_headers", "404.html"] + [f"js/fixture-{i}.js" for i in range(50)]}
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        archive, mp = root / "candidate.zip", root / "manifest.json"
        rows = [{"path": p, "bytes": len(v), "sha256": digest(v)} for p, v in files.items()]
        m = {"format": "sellerpilot-cloudflare-release-evidence-v2", "status": "DEVELOPMENT CANDIDATE — NOT APPROVED FOR DEPLOYMENT", "candidate_sha": sha, "checkout_sha": sha, "file_count": COUNT, "files": rows, "fingerprint_sha256": fingerprint([(r["path"], r["bytes"], r["sha256"]) for r in rows])}
        def write_zip(values):
            with zipfile.ZipFile(archive, "w") as z:
                for p, v in values.items():
                    z.writestr(p, v)
        def write_manifest(value):
            mp.write_text(json.dumps(value), encoding="utf-8")
        def denied(fn):
            try:
                fn()
            except ValueError:
                return
            raise AssertionError("Unsafe candidate was accepted")
        write_zip(files)
        write_manifest(m)
        require(verify(archive, mp, sha) == m["fingerprint_sha256"], "Good fixture rejected")
        denied(lambda: verify(archive, mp, "b" * 40))
        write_manifest({**m, "fingerprint_sha256": "0" * 64})
        denied(lambda: verify(archive, mp, sha))
        write_manifest(m)
        write_zip({**files, "index.html": b"x" * len(files["index.html"])})
        denied(lambda: verify(archive, mp, sha))
        write_zip({**files, "../unexpected": b"x"})
        denied(lambda: verify(archive, mp, sha))
        write_zip({p: v for p, v in files.items() if p != "404.html"})
        denied(lambda: verify(archive, mp, sha))
        write_zip(files)
        write_manifest({**m, "files": rows[:-1] + [rows[0]]})
        denied(lambda: verify(archive, mp, sha))
    print("PASS: valid release and six rejected integrity fixtures.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("archive", nargs="?", type=pathlib.Path)
    parser.add_argument("manifest", nargs="?", type=pathlib.Path)
    parser.add_argument("expected_sha", nargs="?")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        if not all((args.archive, args.manifest, args.expected_sha)):
            parser.error("provide archive, manifest and expected candidate SHA")
        print("Verified candidate fingerprint: " + verify(args.archive, args.manifest, args.expected_sha))
        print("Integrity only; deployment is not authorised.")
