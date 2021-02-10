FROM node:alpine

ADD ./ /usr/local/app
WORKDIR /usr/local/app

RUN yarn install --prod

RUN chmod -R 777 /usr/local/app

ENV PATH /usr/local/app/node_modules/.bin:$PATH

EXPOSE 80 8001 8002

CMD ["pm2-runtime", "index.js"]