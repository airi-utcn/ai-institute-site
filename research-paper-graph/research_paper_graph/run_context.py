"""Run-scoped logging context.

Each sync invocation gets a short run id so concurrent or scheduled runs can be
told apart in logs and in the JSON run report.  The id is stored in a
contextvar and injected into every log record by ``RunIdFilter``.
"""

import contextvars
import logging

_run_id = contextvars.ContextVar("paper_sync_run_id", default="-")


def set_run_id(value):
    """Set the run id for the current context and return it."""
    _run_id.set(value or "-")
    return _run_id.get()


def get_run_id():
    return _run_id.get()


class RunIdFilter(logging.Filter):
    """Attach the current run id to every log record."""

    def filter(self, record):
        record.run_id = _run_id.get()
        return True
