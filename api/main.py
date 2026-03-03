import json
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
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
