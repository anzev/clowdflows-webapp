FROM node:8-alpine as dev
COPY ./package.json /app/package.json
COPY ./package-lock.json /app/package-lock.json
WORKDIR /app
RUN npm install
COPY ./ /app

FROM node:8-alpine as build
WORKDIR /app
COPY --from=dev /app /app
RUN npm run build

FROM nginx:1.17.5-alpine as prod
COPY --from=build /app/dist /app
COPY nginx.conf /etc/nginx/nginx.conf