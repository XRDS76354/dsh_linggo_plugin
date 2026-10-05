"""One interface for built-in and user-registered algorithms.

An algorithm module defines META (id, name, kind, description, inputs, params) and
run(inputs, params, ctx) -> result dict. Inputs are pandas DataFrames of standard entities read
from the confirmed data version (all columns as strings). Results of kind drt, fleet and tripgen
are checked by the built-in validators, which do not trust the algorithm. Passing the interface
and validation does not make user code safe: it runs with the user's permissions.
"""
import hashlib
import importlib.util
import json
import os
import sys

import pandas as pd

from . import drt, fleet, tripgen
from .geo import km, travel_s
from .schema import ENTITIES

BUILTINS = {m.META["id"]: m for m in (drt, fleet, tripgen)}
VALIDATORS = {"drt": drt.validate, "fleet": fleet.validate, "tripgen": tripgen.validate}
KINDS = ["drt", "fleet", "tripgen", "custom"]
PARAM_TYPES = ["integer", "number", "boolean", "string", "enum"]


class Context:
    """What an algorithm may use besides its inputs."""

    def __init__(self, progress):
        self._progress = progress

    def progress(self, value, message=""):
        self._progress(max(0.0, min(1.0, float(value))), str(message)[:200])

    km = staticmethod(km)
    travel_s = staticmethod(travel_s)


def check_meta(meta):
    if not isinstance(meta, dict):
        raise ValueError("算法模块必须定义 META 字典")
    for key in ("id", "name", "kind"):
        if not isinstance(meta.get(key), str) or not meta[key].strip():
            raise ValueError(f"META.{key} 必须是非空字符串")
    if meta["kind"] not in KINDS:
        raise ValueError(f"META.kind 必须是 {'/'.join(KINDS)} 之一")
    inputs = meta.get("inputs", [])
    if not isinstance(inputs, list):
        raise ValueError("META.inputs 必须是列表")
    for i in inputs:
        if not isinstance(i, dict) or i.get("entity") not in ENTITIES:
            raise ValueError(f"META.inputs 中的数据类型无效：{i}")
    params = meta.get("params", {})
    if not isinstance(params, dict) or len(params) > 50:
        raise ValueError("META.params 必须是不超过 50 项的字典")
    for name, spec in params.items():
        if not isinstance(spec, dict) or spec.get("type") not in PARAM_TYPES:
            raise ValueError(f"参数 {name} 的 type 必须是 {'/'.join(PARAM_TYPES)} 之一")
        if spec["type"] == "enum" and not (isinstance(spec.get("options"), list) and spec["options"]):
            raise ValueError(f"参数 {name} 缺少 options")
        clean_param(name, spec, spec.get("default"))
    return {
        "id": meta["id"], "name": meta["name"], "kind": meta["kind"], "description": str(meta.get("description", ""))[:1000],
        "inputs": [{"entity": i["entity"], "required": bool(i.get("required"))} for i in inputs], "params": params,
    }


def clean_param(name, spec, value):
    t = spec["type"]
    if value is None:
        value = spec.get("default")
    if t == "boolean":
        if not isinstance(value, bool):
            raise ValueError(f"参数 {name} 应为布尔值")
        return value
    if t in ("integer", "number"):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or (t == "integer" and int(value) != value):
            raise ValueError(f"参数 {name} 应为{'整数' if t == 'integer' else '数值'}")
        if "min" in spec and value < spec["min"] or "max" in spec and value > spec["max"]:
            raise ValueError(f"参数 {name} 应在 {spec.get('min')}–{spec.get('max')} 之间")
        return int(value) if t == "integer" else float(value)
    if t == "enum":
        if value not in spec["options"]:
            raise ValueError(f"参数 {name} 应为 {spec['options']} 之一")
        return value
    if not isinstance(value, str) or len(value) > 500:
        raise ValueError(f"参数 {name} 应为不超过 500 字的字符串")
    return value


def clean_params(meta, params):
    params = params or {}
    unknown = [k for k in params if k not in meta["params"]]
    if unknown:
        raise ValueError("未知参数：" + "、".join(unknown))
    return {k: clean_param(k, spec, params.get(k)) for k, spec in meta["params"].items()}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read())
    return h.hexdigest()


def load_user(path, expected_sha):
    """Execute a registered module after checking it is byte-identical to what the user confirmed."""
    if sha256(path) != expected_sha:
        raise ValueError("算法文件与注册时确认的内容不一致，请重新注册")
    spec = importlib.util.spec_from_file_location("linggo_user_algorithm", path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["linggo_user_algorithm"] = mod
    spec.loader.exec_module(mod)
    if not callable(getattr(mod, "run", None)):
        raise ValueError("算法模块必须定义 run(inputs, params, ctx)")
    return mod, check_meta(getattr(mod, "META", None))


def module_of(algorithm):
    if "builtin" in algorithm:
        mod = BUILTINS.get(algorithm["builtin"])
        if not mod:
            raise ValueError("未知内置算法")
        return mod, check_meta(mod.META)
    return load_user(algorithm["path"], algorithm["sha256"])


def load_inputs(version_dir, meta):
    out = {}
    for i in meta["inputs"]:
        p = os.path.join(version_dir, i["entity"] + ".csv")
        if os.path.exists(p):
            df = pd.read_csv(p, dtype=str, keep_default_na=False)
            if not df.empty:
                out[i["entity"]] = df
        if i["required"] and i["entity"] not in out:
            raise ValueError(f"缺少必需数据：{ENTITIES[i['entity']]['label']}")
    return out


def describe(req):
    if "path" in req:
        _mod, meta = load_user(req["path"], req["sha256"])
        return meta
    return [check_meta(m.META) for m in BUILTINS.values()]


def run(req, progress):
    mod, meta = module_of(req["algorithm"])
    params = clean_params(meta, req.get("params"))
    inputs = load_inputs(req["versionDir"], meta)
    progress(0.02, "读取数据")
    result = mod.run(inputs, params, Context(progress))
    if not isinstance(result, dict):
        raise ValueError("算法 run() 必须返回字典")
    result.setdefault("kind", meta["kind"])
    result.setdefault("summary", {})
    if result["kind"] != meta["kind"]:
        raise ValueError("结果 kind 与 META.kind 不一致")
    validator = VALIDATORS.get(meta["kind"])
    errors = validator(result, params) if validator else []
    result["validation"] = {"ok": not errors, "count": len(errors), "violations": errors[:50], "checked": bool(validator)}
    result["params"] = params
    os.makedirs(req["resultDir"], exist_ok=True)
    with open(os.path.join(req["resultDir"], "result.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, default=str)
    return {
        "kind": meta["kind"], "summary": result["summary"], "validation": {k: v for k, v in result["validation"].items() if k != "violations"},
        "synthetic": bool(result.get("synthetic")), "params": params,
    }
