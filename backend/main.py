from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import route

# create a Socket.IO server
app = FastAPI()

# Enable CORS for the chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/hello")
async def hello():
    return {"message": "Hello World"}

app.include_router(router=route.router, prefix="/api")
