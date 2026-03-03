from sqlalchemy import Column, Float, String, Text
from sqlalchemy.dialects.postgresql import ARRAY

from .database import Base


class Movement(Base):
    __tablename__ = "movements"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    category = Column(String, nullable=False)
    movement_patterns = Column(ARRAY(Text), nullable=False)
    equipment = Column(ARRAY(Text), default=list)
    muscle_groups = Column(ARRAY(Text), default=list)
    difficulty = Column(Float, nullable=False)
    energy_type = Column(String, nullable=False)
    energy_cost = Column(Float, nullable=False)
    movement_family = Column(ARRAY(Text), default=list)
    variations = Column(ARRAY(Text), default=list)
    progressions = Column(ARRAY(Text), default=list)
    regressions = Column(ARRAY(Text), default=list)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "category": self.category,
            "movement_patterns": self.movement_patterns or [],
            "equipment": self.equipment or [],
            "muscle_groups": self.muscle_groups or [],
            "difficulty": self.difficulty,
            "energy_type": self.energy_type,
            "energy_cost": self.energy_cost,
            "movement_family": self.movement_family or [],
            "variations": self.variations or [],
            "progressions": self.progressions or [],
            "regressions": self.regressions or [],
        }
