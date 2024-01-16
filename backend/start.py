import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", port=7001, reload=True)
