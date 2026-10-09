from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

logger = logging.getLogger("fertiflow.scheduler")

scheduler = BackgroundScheduler(
    timezone="UTC",
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
    }
)


def start_scheduler():
    from app.scheduler.jobs import register_scheduled_jobs

    if not scheduler.running:
        register_scheduled_jobs(scheduler)
        scheduler.start()
        logger.info("[Scheduler] APScheduler background engine started successfully.")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] APScheduler background engine stopped.")
