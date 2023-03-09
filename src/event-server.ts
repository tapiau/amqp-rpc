import amqplib from "amqplib";
import AMQPEventsReceiver from "./a-m-q-p-events-receiver";
import AMQPEventsSender from "./a-m-q-p-events-sender";


(async () => {
    const requestsQueue = "halo.halo.mietku";
    const responseQueue = "halo.halo.mietku.response";

    const connection = await amqplib.connect("amqp://localhost");

    const receiver = new AMQPEventsReceiver(connection, { queueName: requestsQueue });
    await receiver.start();

    const sender = new AMQPEventsSender(
        connection,
        {
            queueName: responseQueue,
        }
    );
    await sender.start();

    const handler = (data: any) => {
        setTimeout(() => {
            data.time1 = Date.now();
            sender.send(data)
                .then(() => {
                    console.log("Response sent");
                })
            ;
        }, 5000);
    };

    receiver.setHandler(handler);


    // name of temporary queue, has to be passed somehow to client by external service
})();

