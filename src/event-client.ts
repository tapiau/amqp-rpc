import amqplib from "amqplib";
import AMQPEventsSender from "./AMQPEventsSender";
import AMQPEventsReceiver from "./AMQPEventsReceiver";

(async () => {
    const requestsQueue = "halo.halo.mietku";
    const responseQueue = "halo.halo.mietku.response";
    const connection = await amqplib.connect("amqp://localhost");


    const receiver = new AMQPEventsReceiver(connection, { queueName: responseQueue});
    await receiver.start();

    receiver.setHandler((data) => {
        console.log("RESPONSE: ", data);
    });


    const sender = new AMQPEventsSender(connection, { queueName: requestsQueue });
    await sender.start();

    sender.send({
        aaa: "bbb",
        ccc: "ddd",
        time: Date.now(),
    }).then();

    console.log("Sent event");
})();
