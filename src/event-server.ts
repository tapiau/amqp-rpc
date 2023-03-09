import amqplib from "amqplib";
import AMQPRPCServer from "./AMQPRPCServer";
import AMQPEventsReceiver from "./AMQPEventsReceiver";
import AMQPEventsSender from "./AMQPEventsSender";



(async () => {
    const requestsQueue = "halo.halo.mietku";
    const responseQueue = "halo.halo.mietku.response";

    const connection = await amqplib.connect("amqp://localhost");

    const receiver = new AMQPEventsReceiver(connection, { queueName: requestsQueue });
    await receiver.start();

    const sender = new AMQPEventsSender(connection, { queueName: responseQueue });
    await sender.start();

    receiver.setHandler((data: any) => {
        console.log("Got hello event", data);

        setTimeout(() => {
            data.time1 = Date.now();
            sender.send(data)
                .then(() => {
                    console.log("Response sent");
                })
            ;
        }, 5000);

    });


    // name of temporary queue, has to be passed somehow to client by external service
})();

