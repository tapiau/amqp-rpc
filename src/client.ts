import amqplib from "amqplib";
import AMQPRPCClient from "./AMQPRPCClient";

(async () => {
    const requestsQueue = "halo.halo.mietku";

    const connection = await amqplib.connect("amqp://localhost");

    const client = new AMQPRPCClient(connection, {requestsQueue});
    await client.start();
    const response = await client.sendCommand("hello", ["Aliaaasa"]);
    console.log("Alisa got response:", response);
})();
