import io
import json
import unittest
from unittest.mock import patch

import numpy as np

from linggo_data import jsonio
from linggo_data.__main__ import emit


class JsonBoundaryTest(unittest.TestCase):
    def test_emit_cleans_nested_numbers_but_preserves_text_and_finite_values(self):
        stream = io.StringIO()
        with patch("sys.stdout", stream):
            emit({"event": "result", "value": {"geometry": float("nan"), "nested": (np.float32("inf"), {"v": -float("inf")}), "count": np.int64(3), "text": "NaN", "finite": 1.5, "flag": True}})
        value = json.loads(stream.getvalue(), parse_constant=lambda value: self.fail(value))
        self.assertEqual(value["value"], {"geometry": None, "nested": [None, {"v": None}], "count": 3, "text": "NaN", "finite": 1.5, "flag": True})
        self.assertEqual(stream.getvalue().count("\n"), 1)

    def test_dump_serializes_before_writing_on_failure(self):
        stream = io.StringIO()
        with self.assertRaises(ValueError):
            jsonio.dump({float("nan"): 1}, stream)
        self.assertEqual(stream.getvalue(), "")


if __name__ == "__main__":
    unittest.main()
