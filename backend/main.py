from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"


@app.get("/api/networks")
def get_networks():
    networks = []

    for folder in sorted(DATA_DIR.iterdir()):

        if not folder.is_dir():
            continue

        layers = []

        for file in sorted(folder.glob("*.geojson")):

            layers.append({
                "id": file.stem,
                "name": file.stem,
                "file": file.name,
                "url": f"/data/{folder.name}/{file.name}"
            })

        networks.append({
            "id": folder.name,
            "name": folder.name,
            "layers": layers
        })

    return {
        "networks": networks
    }


app.mount(
    "/data",
    StaticFiles(directory=DATA_DIR),
    name="data"
)


app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True),
    name="frontend"
)