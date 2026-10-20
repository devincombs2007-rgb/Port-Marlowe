"""Validate pack JSON against Mojang's official JSON schemas shipped in bedrock-samples/metadata.

The schema root is located through the HOLLOW_SCHEMAS environment variable or the default
checkout path used during development. Validation is skipped (and reported) if unavailable.
"""
import json
import os
import urllib.parse

DEFAULT_ROOT = os.environ.get(
    "HOLLOW_SCHEMAS",
    os.path.join(os.path.dirname(__file__), "..", "..", "build", "bedrock-samples", "metadata", "json_schemas"),
)

DOCS = {
    "entity": "/server/entity/1.26.50/ActorDocument.json",
    "item": "/server/item/1.26.30/ItemDocument.json",
    "manifest": "/client_server/packaging/3.0.0/Manifest.json",
    "block": "/server/block/1.26.20/Blocks.json",
    "particle": "/client/particles/1.21.10/Particle%20Effect%20Data.json",
    "client_biome": "/client/biome/1.21.130/Client%20Biome%20Document.json",
}


def _lenient(node):
    """Mojang's filter schema uses oneOf where a plain filter test also matches the all-optional
    group map, so every valid filter fails oneOf. Rewrite oneOf -> anyOf on load: instances that
    match no alternative are still reported."""
    if isinstance(node, dict):
        return {("anyOf" if k == "oneOf" else k): _lenient(v) for k, v in node.items()}
    if isinstance(node, list):
        return [_lenient(v) for v in node]
    return node


class SchemaSet:
    def __init__(self, root=DEFAULT_ROOT):
        self.root = os.path.abspath(root)
        self.available = os.path.isdir(self.root)
        self._cache = {}
        if self.available:
            import referencing
            from referencing import Registry, Resource
            from referencing.jsonschema import DRAFT7

            def retrieve(uri):
                path = urllib.parse.unquote(uri.split("#")[0])
                full = os.path.join(self.root, path.lstrip("/"))
                with open(full) as f:
                    contents = _lenient(json.load(f))
                return Resource.from_contents(contents, default_specification=DRAFT7)

            self.registry = Registry(retrieve=retrieve)

    def validator(self, doc_uri):
        import jsonschema
        if doc_uri in self._cache:
            return self._cache[doc_uri]
        resource = self.registry.get_or_retrieve(doc_uri).value
        v = jsonschema.Draft7Validator(resource.contents, registry=self.registry)
        self._cache[doc_uri] = v
        return v

    def validate(self, kind, instance):
        """Returns list of error strings."""
        if not self.available:
            return [f"schemas unavailable at {self.root}"]
        v = self.validator(DOCS[kind])
        errs = []
        for e in sorted(v.iter_errors(instance), key=lambda e: list(e.absolute_path)):
            path = "/".join(str(p) for p in e.absolute_path)
            errs.append(f"{path}: {e.message[:300]}")
        return errs
