from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
import uuid

from app.models.appointment import Appointment
from app.schemas.appointment import SlotOption


class SchedulingService:
    DOCTORS = [
        "Dr. Subha Fertility Specialist",
        "Dr. Karthik Senior Embryologist",
    ]

    @classmethod
    def discover_available_slots(
        cls,
        db: Session,
        preferred_day: Optional[str] = None,
        preferred_period: Optional[str] = None,
        days_ahead: int = 7,
    ) -> List[SlotOption]:
        """
        Discovers and ranks available clinic appointment slots according to clinic hours & patient preferences.
        """
        now = datetime.utcnow()
        start_date = now + timedelta(days=1)
        slots: List[SlotOption] = []

        # Standard clinic slot hours
        slot_hours = {
            "MORNING": [9, 10, 11],
            "AFTERNOON": [14, 15, 16],
            "EVENING": [17, 18],
        }

        # Fetch existing booked appointments in window
        existing_bookings = (
            db.query(Appointment)
            .filter(
                Appointment.datetime >= start_date,
                Appointment.datetime <= start_date + timedelta(days=days_ahead),
                Appointment.status == "scheduled",
            )
            .all()
        )
        booked_times = {b.datetime.strftime("%Y-%m-%d %H:00") for b in existing_bookings}

        for day_offset in range(1, days_ahead + 1):
            target_dt = now + timedelta(days=day_offset)
            weekday_name = target_dt.strftime("%A")

            # Skip Sunday (clinic closed)
            if target_dt.weekday() == 6:
                continue

            # Check day filter if specified
            if preferred_day and preferred_day.lower() not in [weekday_name.lower(), "tomorrow" if day_offset == 1 else ""]:
                continue

            for period, hours in slot_hours.items():
                if preferred_period and preferred_period.upper() != period:
                    continue

                for hour in hours:
                    slot_dt = target_dt.replace(hour=hour, minute=0, second=0, microsecond=0)
                    slot_key = slot_dt.strftime("%Y-%m-%d %H:00")

                    if slot_key not in booked_times:
                        doctor = cls.DOCTORS[0]
                        slots.append(
                            SlotOption(
                                slot_id=f"slot_{slot_dt.strftime('%Y%m%d_%H%M')}",
                                datetime=slot_dt,
                                formatted_date=slot_dt.strftime("%A, %d-%b-%Y"),
                                formatted_time=slot_dt.strftime("%I:%M %p"),
                                period=period,
                                doctor_name=doctor,
                                available=True,
                                location="Main Clinic Hub - Room 2",
                            )
                        )

        # Return top ranked slots
        return slots[:6]
