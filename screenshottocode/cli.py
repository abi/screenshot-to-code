import os
import sys
import logging
import argparse
from argparse import Namespace
import uvicorn

from .config import Config
from .main import app

def start(args: Namespace):
    host = args.host if not args.production else '0.0.0.0'
    
    Config.MODEL = args.model
    Config.IS_MODEL_GEMINI = args.model == 'gemini'
    
    if args.production:
        Config.MODEL = args.production

    uvicorn.run(    
        app, 
        host=host, 
        port=args.port,
        proxy_headers=True)

def get_arguments():
    global parser

    parser.add_argument('-m', '--model', default='gpt-4-vision', type=str, nargs='?', choices=['gpt-4-vision', 'gemini'],
                        help='Name of Model to use')
    parser.add_argument('--production', action='store_true', help='Run project in production mode')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host address to run on')
    parser.add_argument('--port', type=int, default=7001, help='Host port to run on')

    parser.add_argument('-v','--version', action='version', version=f'%(prog)s {Config.VERSION}')
    parser.set_defaults(func=start)
    return parser.parse_args()

def main():
    global parser
    try:
        parser = argparse.ArgumentParser(description="This simple app converts a screenshot to code (HTML/Tailwind CSS, or React or Bootstrap)")
        args = get_arguments()
        args.func(args)

    except Exception as e:
        logging.error(str(e))
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()