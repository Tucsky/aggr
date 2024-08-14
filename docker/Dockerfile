# build stage
FROM  node:20.2.0-alpine3.17 as build-stage

WORKDIR '/usr/src/app'

# install npm dependencies for production 
COPY ./package*.json ./
COPY ./.npmrc ./
RUN npm ci

# prepare for build
COPY . .
RUN npm run build -- --mode production

# production stage
FROM nginx:stable-alpine as production-stage

# copy dist files from build-stage to workdir
COPY --from=build-stage /usr/src/app/dist /usr/share/nginx/html
COPY ./conf/nginx.conf /temp/nginx.conf 

# copy nginx confix to env variable.
RUN envsubst / < /temp/nginx.conf > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD [ "nginx", "-g", "daemon off;" ]
