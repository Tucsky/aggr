# build stage
FROM  node:20.2.0-alpine3.17 as builder
WORKDIR '/usr/src/app'
RUN apk --no-cache add git
COPY ./package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# production stage
FROM nginx:stable-alpine as production-stage
COPY --from=build-stage /usr/src/app/dist /usr/share/nginx/html
COPY ./conf/nginx.conf /temp/nginx.conf 
RUN envsubst / < /temp/nginx.conf > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
