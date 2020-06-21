FROM node:alpine

ADD ./ /usr/local/app
WORKDIR /usr/local/app

RUN yarn install --prod

RUN sed -i 's/1024/2048/g' /usr/local/app/node_modules/node-easy-cert/dist/certGenerator.js

EXPOSE 8001 8002 80

CMD ["yarn", "start"]