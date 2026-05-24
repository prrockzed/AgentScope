_cancelled: set[str] = set()


class CancellationError(Exception):
    pass


def cancel_run(run_id: str) -> None:
    _cancelled.add(run_id)


def is_cancelled(run_id: str) -> bool:
    return run_id in _cancelled


def clear_run(run_id: str) -> None:
    _cancelled.discard(run_id)
