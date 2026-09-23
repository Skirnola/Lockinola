"""Bounded local runner for Lockinola's beginner function exercises."""

import ast
import contextlib
import json
import sys
import traceback

MAX_CODE_LENGTH = 8_000
MAX_CAPTURE_LENGTH = 4_000


class LimitedWriter:
    def __init__(self, limit):
        self.limit = limit
        self.parts = []
        self.length = 0
        self.truncated = False

    def write(self, value):
        remaining = self.limit - self.length
        if remaining > 0:
            chunk = value[:remaining]
            self.parts.append(chunk)
            self.length += len(chunk)
        if len(value) > remaining:
            self.truncated = True
        return len(value)

    def flush(self):
        return None

    def getvalue(self):
        value = "".join(self.parts)
        return value + ("\n[output capped]" if self.truncated else "")

EXERCISES = {
    "intro-function": {
        "function": "make_intro",
        "tests": [
            ("Uses a regular name and year", ["Iqbal", 2027], "Hi, Iqbal! I graduate in 2027."),
            ("Works with another learner", ["Mika", 2028], "Hi, Mika! I graduate in 2028."),
            ("Keeps a short name intact", ["A", 2030], "Hi, A! I graduate in 2030."),
        ],
    },
    "grade-classifier": {
        "function": "classify_score",
        "tests": [
            ("Rejects a negative score", [-1], "Invalid score"),
            ("Finds the D boundary", [60], "D"),
            ("Finds the B boundary", [80], "B"),
            ("Finds the A boundary", [90], "A"),
            ("Accepts the maximum", [100], "A"),
            ("Rejects a score over 100", [101], "Invalid score"),
        ],
    },
    "count-even": {
        "function": "count_even",
        "tests": [
            ("Counts a mixed list", [[1, 2, 3, 4]], 2),
            ("Handles an empty list", [[]], 0),
            ("Counts zero and negatives", [[0, -2, -3, 7, 8]], 3),
            ("Does not count odd values", [[1, 3, 5]], 0),
        ],
    },
}

BLOCKED_NODES = (ast.Import, ast.ImportFrom, ast.ClassDef, ast.Global, ast.Nonlocal)
BLOCKED_CALLS = {"open", "exec", "eval", "compile", "__import__", "input", "breakpoint", "help", "exit", "quit"}

SAFE_BUILTINS = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "print": print,
    "range": range,
    "reversed": reversed,
    "round": round,
    "set": set,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "tuple": tuple,
    "zip": zip,
}


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False))


def validate_tree(tree):
    for item in tree.body:
        if isinstance(item, ast.Expr) and isinstance(item.value, ast.Constant) and isinstance(item.value.value, str):
            continue
        if not isinstance(item, ast.FunctionDef):
            return "Keep this exercise to function definitions only. Remove code that runs at the top level."

    for node in ast.walk(tree):
        if isinstance(node, BLOCKED_NODES):
            return f"{type(node).__name__} is not available in this beginner runner."
        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            return "Double-underscore attributes are blocked in this runner."
        if isinstance(node, ast.Name) and node.id.startswith("__"):
            return "Double-underscore names are blocked in this runner."
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in BLOCKED_CALLS:
            return f"{node.func.id}() is blocked in this runner."
    return None


def safe_value(value):
    text = repr(value)
    return text if len(text) <= 240 else text[:237] + "..."


def main():
    try:
        payload = json.loads(sys.stdin.read(MAX_CODE_LENGTH + 1_000))
        code = payload.get("code", "")
        exercise_id = payload.get("exerciseId", "")
    except Exception:
        emit({"status": "error", "message": "The runner could not read this submission."})
        return

    if exercise_id not in EXERCISES:
        emit({"status": "error", "message": "That exercise is not available."})
        return
    if not isinstance(code, str) or not code.strip() or len(code) > MAX_CODE_LENGTH:
        emit({"status": "blocked", "message": "Write between 1 and 8,000 characters of Python."})
        return

    try:
        tree = ast.parse(code, filename="submission.py", mode="exec")
    except SyntaxError as error:
        emit({
            "status": "failed",
            "message": f"Syntax error on line {error.lineno}: {error.msg}",
            "tests": [],
            "output": "",
        })
        return

    blocked_reason = validate_tree(tree)
    if blocked_reason:
        emit({"status": "blocked", "message": blocked_reason, "tests": [], "output": ""})
        return

    namespace = {"__builtins__": SAFE_BUILTINS}
    capture = LimitedWriter(MAX_CAPTURE_LENGTH)
    try:
        with contextlib.redirect_stdout(capture):
            exec(compile(tree, "submission.py", "exec"), namespace, namespace)
    except Exception as error:
        emit({
            "status": "failed",
            "message": f"Your file stopped before the checks: {type(error).__name__}: {error}",
            "tests": [],
            "output": capture.getvalue()[:MAX_CAPTURE_LENGTH],
        })
        return

    exercise = EXERCISES[exercise_id]
    function = namespace.get(exercise["function"])
    if not callable(function):
        emit({
            "status": "failed",
            "message": f"Define a function named {exercise['function']} exactly as shown in the task.",
            "tests": [],
            "output": capture.getvalue()[:MAX_CAPTURE_LENGTH],
        })
        return

    results = []
    for name, args, expected in exercise["tests"]:
        try:
            with contextlib.redirect_stdout(capture):
                actual = function(*args)
            passed = type(actual) is type(expected) and actual == expected
            results.append({
                "name": name,
                "passed": passed,
                "expected": safe_value(expected),
                "actual": safe_value(actual),
            })
        except Exception as error:
            results.append({
                "name": name,
                "passed": False,
                "expected": safe_value(expected),
                "actual": f"{type(error).__name__}: {error}",
            })

    passed_count = sum(1 for result in results if result["passed"])
    total = len(results)
    emit({
        "status": "passed" if passed_count == total else "failed",
        "message": "All checks passed." if passed_count == total else f"{passed_count} of {total} checks passed. Read the first mismatch and retry.",
        "tests": results,
        "passedTests": passed_count,
        "totalTests": total,
        "output": capture.getvalue()[:MAX_CAPTURE_LENGTH],
    })


if __name__ == "__main__":
    try:
        main()
    except Exception:
        emit({"status": "error", "message": "The runner stopped unexpectedly.", "detail": traceback.format_exc(limit=1)})
