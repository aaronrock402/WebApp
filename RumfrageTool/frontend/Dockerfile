FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

ENV PUBLIC_API_URL=http://localhost:3000
RUN npm run build

EXPOSE 5173

CMD ["node", "build"]