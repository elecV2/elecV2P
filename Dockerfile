FROM node:13.1.0-alpine

ADD ./ /usr/local/app
WORKDIR /usr/local/app
RUN yarn \
    && sed -i 's/1024/2048/g' /usr/local/app/node_modules/node-easy-cert/dist/certGenerator.js

# COPY ./init/certGenerator.js /usr/local/app/node_modules/node-easy-cert/dist/certGenerator.js

EXPOSE 8001 8002 8004

CMD ["yarn", "start"]