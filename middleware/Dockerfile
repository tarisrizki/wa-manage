FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 3001

# Command to run both API and Worker (for simplicity in development we can run via a script,
# but usually in production they should be separate containers. 
# Here we'll start the API by default. We can override this in docker-compose if needed).
CMD ["npm", "start"]
