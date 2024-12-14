FROM node:22.12.0-alpine

ADD ./ /usr/local/app

WORKDIR /usr/local/app
RUN apk add --update --no-cache tzdata \
    && chmod -R 777 /usr/local/app \
    && yarn install --prod

ENV TZ=Asia/Shanghai PATH=/usr/local/app/script/Shell:/usr/local/app/node_modules/.bin:$PATH

EXPOSE 80 8001 8002

CMD ["pm2-runtime", "index.js", "-n", "elecV2P"]