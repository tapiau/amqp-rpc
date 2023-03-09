import amqplib from "amqplib";
import AMQPRPCServer from "./AMQPRPCServer";
import AMQPEventsReceiver from "./AMQPEventsReceiver";



(async () => {
    const connection = await amqplib.connect("amqp://localhost");

    const server = new AMQPEventsReceiver(connection, { queueName: "halo.halo.mietku" });

    server.on("data", (data) => {
        console.log("Got hello event", data);
    });

    await server.start();

    // name of temporary queue, has to be passed somehow to client by external service
    const requestsQueue = server.queueName;

    console.log("server queue", requestsQueue);
})();
