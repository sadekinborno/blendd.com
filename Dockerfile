# Use Node.js base image
FROM node:20-bullseye-slim

# Install Python 3 and ffmpeg (needed by yt-dlp)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip
RUN pip3 install --no-cache-dir yt-dlp

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy codebase
COPY . .

# Expose port and start server
EXPOSE 3000
CMD ["node", "server.js"]