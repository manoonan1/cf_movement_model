import json
import os

from .database import SessionLocal
from .models import Movement

SEED_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "movements.json")


def seed_db():
    db = SessionLocal()
    try:
        if db.query(Movement).count() > 0:
            return

        if not os.path.exists(SEED_FILE):
            print(f"Seed file not found: {SEED_FILE}")
            return

        with open(SEED_FILE) as f:
            data = json.load(f)

        for m in data.get("movements", []):
            movement = Movement(
                id=m["id"],
                name=m["name"],
                description=m.get("description", ""),
                category=m["category"],
                movement_patterns=m.get("movement_patterns", []),
                equipment=m.get("equipment", []),
                muscle_groups=m.get("muscle_groups", []),
                difficulty=m["difficulty"],
                energy_type=m["energy_type"],
                energy_cost=m["energy_cost"],
                movement_family=m.get("movement_family", []),
                variations=m.get("variations", []),
                progressions=m.get("progressions", []),
                regressions=m.get("regressions", []),
            )
            db.add(movement)

        db.commit()
        print(f"Seeded {len(data.get('movements', []))} movements")
    finally:
        db.close()
