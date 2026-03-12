import json
import os
import re
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator, model_validator
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Movement
from .seed import seed_db

SCHEMA_FILE = os.path.join(
    os.path.dirname(__file__), "..", "schema", "movement.schema.json"
)
DASHBOARD_DIR = os.path.join(os.path.dirname(__file__), "..", "dashboard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_db()
    yield


app = FastAPI(title="CrossFit Movement API", lifespan=lifespan)


# --- Pydantic schemas ---


VALID_CATEGORIES = {"Gymnastics", "Weightlifting", "Monostructural"}
VALID_ENERGY_TYPES = {"Fixed", "Variable"}
VALID_MOVEMENT_PATTERNS = {"Push", "Pull", "Squat", "Hinge", "Lunge", "Grip", "Core", "Jump"}
VALID_MUSCLE_GROUPS = {
    "Quads", "Hamstrings", "Glutes", "Calves", "Lats", "Traps",
    "Chest", "Shoulders", "Triceps", "Biceps", "Forearms",
    "Abs", "Upper Back", "Lower Back",
}
VALID_MOVEMENT_FAMILIES = {
    "Squat", "Press", "Jerk", "Push Up", "Dip", "Handstand Push Up",
    "Pull Up", "Muscle Up", "Row", "Rope Climb", "Clean", "Snatch",
    "Deadlift", "Thruster", "Sit Up", "Toes to Bar", "Plank",
    "Box Jump", "Jump Rope", "Lunge", "Carry", "Run", "Bike",
    "Ski", "Burpee", "Wall Ball",
}
ID_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _validate_id(v: str) -> str:
    if not ID_PATTERN.match(v):
        raise ValueError(f"ID must be kebab-case (lowercase, hyphens only): got '{v}'")
    return v


def _validate_unit_range(v: float, field_name: str) -> float:
    if not 0.0 <= v <= 1.0:
        raise ValueError(f"{field_name} must be between 0.0 and 1.0: got {v}")
    return v


def _validate_enum_list(values: list[str], valid: set[str], field_name: str) -> list[str]:
    invalid = set(values) - valid
    if invalid:
        raise ValueError(f"Invalid {field_name}: {invalid}. Valid options: {sorted(valid)}")
    return values


class MovementCreate(BaseModel):
    id: str
    name: str
    description: str = ""
    category: str
    movement_patterns: list[str]
    equipment: list[str] = []
    muscle_groups: list[str] = []
    difficulty: float
    energy_type: str
    energy_cost: float
    movement_family: list[str] = []
    variations: list[str] = []
    progressions: list[str] = []
    regressions: list[str] = []

    @field_validator("id")
    @classmethod
    def validate_id(cls, v):
        return _validate_id(v)

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Must be one of: {sorted(VALID_CATEGORIES)}")
        return v

    @field_validator("energy_type")
    @classmethod
    def validate_energy_type(cls, v):
        if v not in VALID_ENERGY_TYPES:
            raise ValueError(f"Invalid energy_type '{v}'. Must be one of: {sorted(VALID_ENERGY_TYPES)}")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        return _validate_unit_range(v, "difficulty")

    @field_validator("energy_cost")
    @classmethod
    def validate_energy_cost(cls, v):
        return _validate_unit_range(v, "energy_cost")

    @field_validator("movement_patterns")
    @classmethod
    def validate_movement_patterns(cls, v):
        if len(v) == 0:
            raise ValueError("movement_patterns must have at least one entry")
        return _validate_enum_list(v, VALID_MOVEMENT_PATTERNS, "movement_patterns")

    @field_validator("muscle_groups")
    @classmethod
    def validate_muscle_groups(cls, v):
        return _validate_enum_list(v, VALID_MUSCLE_GROUPS, "muscle_groups")

    @field_validator("movement_family")
    @classmethod
    def validate_movement_family(cls, v):
        return _validate_enum_list(v, VALID_MOVEMENT_FAMILIES, "movement_family")

    @model_validator(mode="after")
    def validate_no_self_references(self):
        for field in ("variations", "progressions", "regressions"):
            refs = getattr(self, field)
            if self.id in refs:
                raise ValueError(f"{field} cannot reference the movement itself")
        return self


def _check_dangling_refs(movement_id: str, data: dict, db: Session):
    """Check that all relationship IDs reference existing movements."""
    errors = []
    for field in ("variations", "progressions", "regressions"):
        refs = data.get(field, [])
        for ref_id in refs:
            if ref_id == movement_id:
                continue
            if not db.query(Movement).filter(Movement.id == ref_id).first():
                errors.append(f"{field} references non-existent movement '{ref_id}'")
    if errors:
        raise HTTPException(status_code=422, detail="; ".join(errors))


class BulkImport(BaseModel):
    movements: list[MovementCreate]


class BulkImportResult(BaseModel):
    created: int = 0
    updated: int = 0
    errors: list[str] = []


class MovementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    movement_patterns: Optional[list[str]] = None
    equipment: Optional[list[str]] = None
    muscle_groups: Optional[list[str]] = None
    difficulty: Optional[float] = None
    energy_type: Optional[str] = None
    energy_cost: Optional[float] = None
    movement_family: Optional[list[str]] = None
    variations: Optional[list[str]] = None
    progressions: Optional[list[str]] = None
    regressions: Optional[list[str]] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category '{v}'. Must be one of: {sorted(VALID_CATEGORIES)}")
        return v

    @field_validator("energy_type")
    @classmethod
    def validate_energy_type(cls, v):
        if v is not None and v not in VALID_ENERGY_TYPES:
            raise ValueError(f"Invalid energy_type '{v}'. Must be one of: {sorted(VALID_ENERGY_TYPES)}")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        if v is not None:
            return _validate_unit_range(v, "difficulty")
        return v

    @field_validator("energy_cost")
    @classmethod
    def validate_energy_cost(cls, v):
        if v is not None:
            return _validate_unit_range(v, "energy_cost")
        return v

    @field_validator("movement_patterns")
    @classmethod
    def validate_movement_patterns(cls, v):
        if v is not None:
            if len(v) == 0:
                raise ValueError("movement_patterns must have at least one entry")
            return _validate_enum_list(v, VALID_MOVEMENT_PATTERNS, "movement_patterns")
        return v

    @field_validator("muscle_groups")
    @classmethod
    def validate_muscle_groups(cls, v):
        if v is not None:
            return _validate_enum_list(v, VALID_MUSCLE_GROUPS, "muscle_groups")
        return v

    @field_validator("movement_family")
    @classmethod
    def validate_movement_family(cls, v):
        if v is not None:
            return _validate_enum_list(v, VALID_MOVEMENT_FAMILIES, "movement_family")
        return v


# --- API routes ---


@app.get("/api/movements")
def list_movements(
    category: Optional[str] = Query(None),
    movement_pattern: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Movement)

    if category:
        query = query.filter(Movement.category == category)
    if movement_pattern:
        query = query.filter(Movement.movement_patterns.any(movement_pattern))
    if equipment:
        query = query.filter(Movement.equipment.any(equipment))

    movements = query.order_by(Movement.name).all()
    return [m.to_dict() for m in movements]


@app.get("/api/movements/verify")
def verify_movements(db: Session = Depends(get_db)):
    movements = db.query(Movement).all()
    by_id = {m.id: m for m in movements}

    warnings = []
    checks_passed = 0

    for m in movements:
        # 1. Progression difficulty: should be >= base
        for pid in (m.progressions or []):
            p = by_id.get(pid)
            if not p:
                continue
            if p.difficulty >= m.difficulty:
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "progression_difficulty",
                    "message": f"Progression '{pid}' (difficulty {p.difficulty}) should be harder than '{m.id}' ({m.difficulty})",
                })

        # 2. Regression difficulty: should be <= base
        for rid in (m.regressions or []):
            r = by_id.get(rid)
            if not r:
                continue
            if r.difficulty <= m.difficulty:
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "regression_difficulty",
                    "message": f"Regression '{rid}' (difficulty {r.difficulty}) should be easier than '{m.id}' ({m.difficulty})",
                })

        # 3. Progression energy cost: should be >= base
        for pid in (m.progressions or []):
            p = by_id.get(pid)
            if not p:
                continue
            if p.energy_cost >= m.energy_cost:
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "progression_energy_cost",
                    "message": f"Progression '{pid}' (energy_cost {p.energy_cost}) should cost more than '{m.id}' ({m.energy_cost})",
                })

        # 4. Regression energy cost: should be <= base
        for rid in (m.regressions or []):
            r = by_id.get(rid)
            if not r:
                continue
            if r.energy_cost <= m.energy_cost:
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "regression_energy_cost",
                    "message": f"Regression '{rid}' (energy_cost {r.energy_cost}) should cost less than '{m.id}' ({m.energy_cost})",
                })

        # 5. Relationship symmetry
        for pid in (m.progressions or []):
            p = by_id.get(pid)
            if not p:
                continue
            if m.id in (p.regressions or []):
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "symmetry",
                    "message": f"'{m.id}' lists '{pid}' as progression, but '{pid}' does not list '{m.id}' as regression",
                })

        for rid in (m.regressions or []):
            r = by_id.get(rid)
            if not r:
                continue
            if m.id in (r.progressions or []):
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "symmetry",
                    "message": f"'{m.id}' lists '{rid}' as regression, but '{rid}' does not list '{m.id}' as progression",
                })

        # 6. Variation pattern overlap
        base_patterns = set(m.movement_patterns or [])
        for vid in (m.variations or []):
            v = by_id.get(vid)
            if not v:
                continue
            if base_patterns & set(v.movement_patterns or []):
                checks_passed += 1
            else:
                warnings.append({
                    "id": m.id,
                    "check": "variation_pattern_overlap",
                    "message": f"Variation '{vid}' shares no movement patterns with '{m.id}'",
                })

        # 7. Relationship muscle group overlap
        base_muscles = set(m.muscle_groups or [])
        for field, refs in [("progressions", m.progressions), ("regressions", m.regressions), ("variations", m.variations)]:
            for ref_id in (refs or []):
                ref = by_id.get(ref_id)
                if not ref:
                    continue
                if base_muscles & set(ref.muscle_groups or []):
                    checks_passed += 1
                else:
                    warnings.append({
                        "id": m.id,
                        "check": "relationship_muscle_overlap",
                        "message": f"{field.rstrip('s').title()} '{ref_id}' shares no muscle groups with '{m.id}'",
                    })

    return {
        "total_movements": len(movements),
        "checks_passed": checks_passed,
        "warnings": warnings,
    }


@app.get("/api/movements/{movement_id}")
def get_movement(movement_id: str, db: Session = Depends(get_db)):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movement not found")
    return movement.to_dict()


@app.post("/api/movements", status_code=201)
def create_movement(data: MovementCreate, db: Session = Depends(get_db)):
    existing = db.query(Movement).filter(Movement.id == data.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Movement with this ID already exists")

    _check_dangling_refs(data.id, data.model_dump(), db)

    movement = Movement(**data.model_dump())
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement.to_dict()


@app.put("/api/movements/{movement_id}")
def update_movement(
    movement_id: str, data: MovementUpdate, db: Session = Depends(get_db)
):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movement not found")

    update_data = data.model_dump(exclude_unset=True)
    _check_dangling_refs(movement_id, update_data, db)

    for key, value in update_data.items():
        setattr(movement, key, value)

    db.commit()
    db.refresh(movement)
    return movement.to_dict()


@app.post("/api/movements/bulk")
def bulk_import(data: BulkImport, db: Session = Depends(get_db)):
    result = BulkImportResult()
    for item in data.movements:
        try:
            existing = db.query(Movement).filter(Movement.id == item.id).first()
            if existing:
                for key, value in item.model_dump().items():
                    if key != "id":
                        setattr(existing, key, value)
                result.updated += 1
            else:
                movement = Movement(**item.model_dump())
                db.add(movement)
                result.created += 1
        except Exception as e:
            result.errors.append(f"{item.id}: {str(e)}")
    db.commit()
    return result.model_dump()


@app.delete("/api/movements/{movement_id}", status_code=204)
def delete_movement(movement_id: str, db: Session = Depends(get_db)):
    movement = db.query(Movement).filter(Movement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movement not found")
    db.delete(movement)
    db.commit()


@app.get("/api/schema")
def get_schema():
    with open(SCHEMA_FILE) as f:
        return json.load(f)


# --- Serve dashboard static files ---

app.mount("/css", StaticFiles(directory=os.path.join(DASHBOARD_DIR, "css")), name="css")
app.mount("/js", StaticFiles(directory=os.path.join(DASHBOARD_DIR, "js")), name="js")


@app.get("/")
def serve_dashboard():
    return FileResponse(os.path.join(DASHBOARD_DIR, "index.html"))
