import amqplib from "amqplib";
import AMQPRPCServer from "./AMQPRPCServer";



(async () => {
    const connection = await amqplib.connect("amqp://localhost");

    // server start
    const server = new AMQPRPCServer(connection, {requestsQueue: "halo.halo.mietku"});
    server.addCommand("hello", (name) => ({message: `Hello, ${name}!`}));
    await server.start();

    // name of temporary queue, has to be passed somehow to client by external service
    const requestsQueue = server.requestsQueue;

    console.log("server queue", requestsQueue);
})();
