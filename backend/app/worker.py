import time
import logging
from app.db.database import init_db
from app.scheduler.config import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fertiflow.worker")


def run_worker():
    logger.info("Initializing database for FertiFlow background worker...")
    init_db()
    logger.info("Starting FertiFlow scheduler worker daemon...")
    start_scheduler()

    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopping FertiFlow background worker...")
        stop_scheduler()


if __name__ == "__main__":
    run_worker()
