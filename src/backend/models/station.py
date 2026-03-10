from pydantic import BaseModel


class Station(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    bikes: int
    docks: int
