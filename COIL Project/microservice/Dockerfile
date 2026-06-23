FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN echo "Creating a Docker image by COIL Team 5"
CMD ["npm", "start"]