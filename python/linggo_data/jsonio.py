"""Strict JSON at the worker and persisted-result boundaries."""
import json
import math
from numbers import Integral, Real


def clean(value):
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(item) for item in value]
    if isinstance(value, bool):
        return value
    if isinstance(value, Integral):
        return int(value)
    if isinstance(value, Real):
        return float(value) if math.isfinite(value) else None
    return value


def dumps(value, **options):
    return json.dumps(clean(value), **{**options, "allow_nan": False, "default": str})


def dump(value, stream, **options):
    # Serialize fully before writing, so an unsupported object cannot leave half a JSON document.
    stream.write(dumps(value, **options))
