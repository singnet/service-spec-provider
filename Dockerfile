FROM ubuntu:18.04
RUN apt-get update
RUN apt-get install npm nodejs git nginx -y
RUN mkdir -p /root/service-spec-provider
RUN sed -i 's/# server_names_hash_bucket_size 64/server_names_hash_bucket_size 128/g' /etc/nginx/nginx.conf
WORKDIR /root/service-spec-provider
COPY . .
EXPOSE 80
RUN cp protobufjs.conf /etc/nginx/sites-enabled/
RUN cp protobufjs.conf /etc/nginx/sites-available/
RUN npm install
CMD ["sh", "entrypoint.sh"]

