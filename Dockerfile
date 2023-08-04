# Builder stage
FROM node:20 AS builder

WORKDIR /usr/src/app

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl gnupg \
    && apt-get install -y git

# Check if nx is installed, if not, install it
RUN if ! command -v nx &> /dev/null; then npm install -g nx; fi

# Copy the node-gitdb
COPY ./ ./node-gitdb/

WORKDIR /usr/src/app/node-gitdb

# Install all dependencies
RUN npm install

# Build the project. This will create the JavaScript version of your code in the dist/ directory.
RUN nx build node-gitdb

# Final stage
FROM node:20 AS final

# Set the working directory
WORKDIR /usr/src/app/node-gitdb

# Copy package.json and yarn.lock from the build stage
COPY --from=builder /usr/src/app/node-gitdb/package*.json /usr/src/app/node-gitdb/yarn.lock ./


# Install production dependencies
RUN npm install --only=production

# Copy the compiled JavaScript code from the build stage
COPY --from=builder /usr/src/app/node-gitdb/dist ./dist

# Expose the listening port
EXPOSE 3000

# Command to run the application
CMD ["node", "./dist/node-gitdb/src/main.js"]