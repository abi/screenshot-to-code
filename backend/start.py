import argparse

import uvicorn

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=7001)
    args = parser.parse_args()
    uvicorn.run("main:app", port=args.port, reload=True)
