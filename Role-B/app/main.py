import os
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from .database import engine
from . import models
from .routers import rooms, buildings, schedule, role_c

app = FastAPI(title="Campus Twin Role B API", version="1.0.0",
              description="Campus Twin API for room, building, schedule, utilization, dashboard, allocation, and outage simulation.")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Validation error", "detail": str(exc.errors())})

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    detail = getattr(exc, "detail", "Resource not found")
    return JSONResponse(status_code=404, content={"error": "Not found", "detail": str(detail)})

@app.get("/health", summary="Health check")
def health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return JSONResponse(status_code=503, content={"error": "Database unavailable", "detail": str(exc)})

app.include_router(rooms.router)
app.include_router(buildings.router)
app.include_router(schedule.router)
app.include_router(role_c.router)
