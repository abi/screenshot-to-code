FROM python:3.12.3-slim-bookworm

ENV POETRY_VERSION 1.8.0

# Install system dependencies including build tools for Playwright
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install "poetry==$POETRY_VERSION"

# Set work directory
WORKDIR /app

# Copy only requirements to cache them in docker layer
COPY poetry.lock pyproject.toml /app/

# Disable the creation of virtual environments
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install

# Install Chromium and Linux libraries needed by Playwright screenshot previews.
RUN apt-get update && apt-get install -y \
    libxss1 \
    libgconf-2-4 \
    libnss3 \
    libxext6 \
    libx11-6 \
    libxcb1 \
    libxkbcommon0 \
    libxdamage1 \
    libxfixes3 \
    libxi6 \
    libxtst6 \
    && rm -rf /var/lib/apt/lists/*

RUN playwright install --with-deps chromium

# Copy the current directory contents into the container at /app
COPY ./ /app/
