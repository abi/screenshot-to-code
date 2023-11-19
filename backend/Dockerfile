FROM python:3.11
MAINTAINER label="Rohan Rustagi"
WORKDIR /app/backend
COPY . .
EXPOSE 7000
ENV OPENAI_API_KEY
RUN pip install poetry && \
    poetry install
CMD ["poetry", "run", "uvicorn", "main:app", "--reload", "--port", "7000"]
