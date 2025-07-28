# Use the official Node.js image as a base
FROM node:23-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json from express-api
COPY express-api/package*.json ./

# Install production dependencies and global TypeScript tools
RUN npm install --production && npm install -g ts-node typescript

# Copy the source files and config files explicitly to avoid clutter
COPY express-api/tsconfig.json ./tsconfig.json
COPY express-api/uploads ./uploads
COPY express-api/src ./src

# Ensure the uploads directory exists with correct permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Set environment variables externally (.env or docker-compose)

# Expose the application port
EXPOSE 3000

# Start the server with ts-node
CMD ["npx", "ts-node", "src/server.ts"]
