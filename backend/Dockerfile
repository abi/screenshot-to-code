FROM python:3.12.3-slim-bullseye

ENV POETRY_VERSION 1.4.1

# Install system dependencies
RUN pip install "poetry==$POETRY_VERSION"

# Set work directory
WORKDIR /app

# Copy only requirements to cache them in docker layer
COPY poetry.lock pyproject.toml /app/

# Disable the creation of virtual environments
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install

# Copy the current directory contents into the container at /app
COPY ./ /app/
