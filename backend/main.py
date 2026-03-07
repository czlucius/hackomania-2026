from fastapi import FastAPI

import route

# create a Socket.IO server
app = FastAPI()


@app.get("/hello")
async def hello():
    return {"message": "Hello World"}


app.include_router(router=route.router, prefix="/api")
