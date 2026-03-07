from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import route
import image_route
from dotenv import load_dotenv

# Load environment variables at the entry point
load_dotenv()

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
app.include_router(router=image_route.router, prefix="/api")
<<<<<<< HEAD
=======

>>>>>>> a35b2f0b01ad76ea1d0decb518c58015f55e2573
