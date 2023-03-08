import amqplib from "amqplib";
import AMQPRPCClient from "./AMQPRPCClient";

(async () => {
    const requestsQueue = "amq.gen-vNAkzdpvOn-CAb6GHGtVyA";

    const connection = await amqplib.connect("amqp://localhost");

    const client = new AMQPRPCClient(connection, {requestsQueue});
    await client.start();
    const response = await client.sendCommand("hello", ["Alisa"]);
    console.log("Alisa got response:", response);
})();
