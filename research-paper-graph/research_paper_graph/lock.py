"""Advisory file lock for sync runs.

The sync pipeline performs read-modify-write cycles across Strapi and must not
run twice at the same time: two overlapping runs otherwise race on publication
creation and every loser gets a 400 unique-constraint response.

The lock lives in a small runtime directory (by default
``/var/run/paper-sync/sync.lock``) so it is shared by cron and manual
``docker compose run`` invocations. Override it with
``PAPER_SYNC_LOCK_PATH`` when running outside the container.
"""

import fcntl
import os


class SyncLockError(RuntimeError):
    """Raised when another sync run already holds the lock."""


class SyncLock:
    def __init__(self, path, wait=False):
        self.path = path
        self.wait = wait
        self._handle = None

    def __enter__(self):
        directory = os.path.dirname(os.path.abspath(self.path))
        os.makedirs(directory, exist_ok=True)

        handle = open(self.path, "a+", encoding="utf-8")
        flags = fcntl.LOCK_EX
        if not self.wait:
            flags |= fcntl.LOCK_NB

        try:
            fcntl.flock(handle.fileno(), flags)
        except BlockingIOError as exc:
            handle.close()
            raise SyncLockError(
                f"Another paper sync is already running (lock: {self.path})"
            ) from exc

        handle.seek(0)
        handle.truncate()
        handle.write(f"{os.getpid()}\n")
        handle.flush()
        self._handle = handle
        return self

    def __exit__(self, exc_type, exc, tb):
        if self._handle is not None:
            try:
                fcntl.flock(self._handle.fileno(), fcntl.LOCK_UN)
            finally:
                self._handle.close()
                self._handle = None
        return False
