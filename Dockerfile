# build stage
FROM node:lts-alpine as build-stage
WORKDIR '/app'
RUN apk --no-cache add git
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /temp/nginx.conf 
RUN envsubst / < /temp/nginx.conf > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
