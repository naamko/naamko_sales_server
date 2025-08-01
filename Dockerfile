# Use the official Node.js image as a base
FROM node:23-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json files from express-api directory
COPY express-api/package*.json ./

# Install dependencies and TypeScript tools
RUN npm install --production && npm install -g ts-node typescript

# Copy the rest of the application code from express-api directory
COPY express-api/ ./

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Environment variables will be set via .env file or docker-compose

# Expose port 3000
EXPOSE 3000

# Start the application with ts-node
CMD ["npx", "ts-node", "src/server.ts"]
