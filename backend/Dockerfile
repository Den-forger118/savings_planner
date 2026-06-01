#base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .


# let docker know the port this container will run on
EXPOSE 5001


# Start the application
CMD ["node", "src/index.js"]

