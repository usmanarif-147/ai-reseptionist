FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# Enable polling for hot reload in Docker (Linux)
ENV WATCHPACK_POLLING=true

CMD ["npm", "run", "dev"]
