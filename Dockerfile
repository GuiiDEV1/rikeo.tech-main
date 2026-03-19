FROM node:18-alpine

WORKDIR /app

# Copy entire project
COPY . .

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
