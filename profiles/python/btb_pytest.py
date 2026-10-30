"""pytest plugin that writes the verdict as btb-json, so btb can read it without parsing pytest's output."""

import json
import re

import pytest


def pytest_addoption(parser):
    parser.addoption("--btb-report", required=True, help="where to write the btb-json report")


def _test_name(item):
    """The test's docstring first line when it has one, its function name otherwise."""
    doc = getattr(item.obj, "__doc__", None)
    if doc and doc.strip():
        return doc.strip().splitlines()[0]
    return item.name


def _failure_message(report):
    crash = getattr(report.longrepr, "reprcrash", None)
    return crash.message if crash else str(report.longrepr)


SOLUTION_FRAME = re.compile(r"(?<![\w.])solution\.py:(\d+)")


def _failure_line(report):
    """The solution's line the traceback points at, the deepest one, None when it never got there."""
    lines = SOLUTION_FRAME.findall(str(report.longrepr))
    return int(lines[-1]) if lines else None


class BtbReport:
    """Collects one result per test and any collection error, then writes them on exit."""

    def __init__(self, path):
        self.path = path
        self.names = {}
        self.results = {}
        self.crashes = []

    def pytest_collection_modifyitems(self, items):
        self.names = {item.nodeid: _test_name(item) for item in items}

    def pytest_collectreport(self, report):
        if report.failed:
            self.crashes.append(str(report.longrepr))

    def pytest_runtest_logreport(self, report):
        # a failing setup or teardown fails the test too, a passing one must not hide a failing call
        if report.when != "call" and report.passed:
            return
        if self.results.get(report.nodeid, {}).get("ok") is False:
            return
        message = None if report.passed else _failure_message(report)
        name = self.names.get(report.nodeid, report.nodeid)
        result = {"name": name, "ok": report.passed, "message": message}
        line = None if report.passed else _failure_line(report)
        if line:
            result["line"] = line
        self.results[report.nodeid] = result

    def pytest_sessionfinish(self):
        report = {"tests": list(self.results.values()), "crash": "\n".join(self.crashes)}
        with open(self.path, "w", encoding="utf-8") as file:
            json.dump(report, file)


@pytest.hookimpl(trylast=True)
def pytest_configure(config):
    config.pluginmanager.register(BtbReport(config.getoption("--btb-report")), "btb-report")
