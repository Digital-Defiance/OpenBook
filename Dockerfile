# Builder stage
FROM node:20 AS builder

WORKDIR /usr/src/app

# Install Node.js and npm
RUN apt-get update && apt-get install -y curl gnupg \
    && apt-get install -y git

# Check if nx is installed, if not, install it
RUN if ! command -v nx &> /dev/null; then npm install -g nx; fi

# Copy OpenBook
COPY ./ ./openbook/

WORKDIR /usr/src/app/openbook

# Install all dependencies
RUN npm install

# Build the project. This will create the JavaScript version of your code in the dist/ directory.
RUN nx build openbook

# Final stage
FROM node:20 AS final

# Set the working directory
WORKDIR /usr/src/app/openbook

# Copy package.json and yarn.lock from the build stage
COPY --from=builder /usr/src/app/openbook/package*.json /usr/src/app/openbook/yarn.lock ./


# Install production dependencies
RUN npm install --only=production

# Copy the compiled JavaScript code from the build stage
COPY --from=builder /usr/src/app/openbook/dist ./dist

# Expose the listening port
EXPOSE 3000

# Command to run the application
CMD ["node", "./dist/openbook/src/main.js"]