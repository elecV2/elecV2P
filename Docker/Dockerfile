FROM node:alpine

ADD ./ /usr/local/app
WORKDIR /usr/local/app

RUN yarn install --prod

RUN chmod -R 777 /usr/local/app

EXPOSE 80 8001 8002

CMD ["yarn", "start"]