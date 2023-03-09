import amqplib from "amqplib";
import AMQPRPCClient from "./AMQPRPCClient";

(async () => {
    const requestsQueue = "halo.halo.mietku";

    const connection = await amqplib.connect("amqp://localhost");

    const client = new AMQPRPCClient(connection, {requestsQueue});
    await client.start();
    let response: any;
    response = await client.sendCommand("hello", ["zibi1"]);
    console.log("Got response:", response);
    response = await client.sendCommand("hello", ["zibi2"]);
    console.log("Got response:", response);
    response = await client.sendCommand("hello", ["zibi3"]);
    console.log("Got response:", response);

    // client.disconnect();
})();
