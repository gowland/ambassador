# Use official Node.js runtime as base image
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set working directory in the container
WORKDIR /app

# Create package.json with required dependencies
RUN npm init -y && \
    npm install express@^4.18.0 axios@^1.6.0 cors@^2.8.5 dotenv@^16.3.0 --only=production

# Copy the application code
COPY . .

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

# Expose the port the app runs on
EXPOSE 3002

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Command to run the application
CMD ["node", "index.js"]