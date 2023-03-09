import amqplib from "amqplib";
import AMQPRPCClient from "./AMQPRPCClient";
import AMQPEventsSender from "./AMQPEventsSender";
import * as process from "process";

(async () => {
    const requestsQueue = "halo.halo.mietku";

    const connection = await amqplib.connect("amqp://localhost");

    const client = new AMQPEventsSender(connection, { queueName: "halo.halo.mietku" });
    await client.start();

    client.send({
        aaa: "bbb",
        ccc: "ddd",
        time: Date.now(),
    }).then();

    console.log("Sent event");
    await client.disconnect();
    process.exit(0);
})();
