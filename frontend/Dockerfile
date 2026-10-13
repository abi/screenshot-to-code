FROM node:22-bullseye-slim

# Set the working directory in the container
WORKDIR /app

# Enable Corepack for pnpm support
RUN corepack enable

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml /app/

# Set the environment variable to skip Puppeteer download
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies
RUN pnpm install

# Copy the current directory contents into the container at /app
COPY ./ /app/

# Expose port 5173 to access the server
EXPOSE 5173

# Command to run the application
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

