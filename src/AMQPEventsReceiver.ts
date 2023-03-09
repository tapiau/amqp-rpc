import EventEmitter from "events";
import {Connection, Message} from "amqplib";
import {AMQPEventsParams} from "./AMQPEventsSender";


/**
 * @class AMQPEventsReceiver
 * Provides stream-like "endpoint" that transforms sequence of messages in amqp queue
 * into sequence of 'data' events.
 * Should be used in pair with AMQPEventsSender class
 * In such case provides end/close events that imitate nodejs's ReadableStream,
 * and cleaning of used amqp resources (queue)
 * @emits AMQPEventsReceiver#data
 * @emits AMQPEventsReceiver#close
 * @emits AMQPEventsReceiver#end
 */
//TODO think about: this class may be transformed to real ReadableStream
//when it would be required

export default class AMQPEventsReceiver extends EventEmitter {

    /**
     * @constructor
     * @param {amqplib.Connection} amqpConnection
     * @param {Object} params
     * @param {String} [params.queueName=''] queue for receiving events, should correspond with AMQPEventsSender
     *    default is '' which means auto-generated queue name, should correspond with AMQPEventsSender
     */
    private _params: AMQPEventsParams = {
        queueName: "",
        TTL: 10 * 60 * 1000,
    };
    private _queueName: string;
    private _channel: any;

    constructor(
        private _connection: Connection,
        private params: AMQPEventsParams = { queueName: ""}
    ) {
        super();

        this._params = Object.assign({
            queueName: ""
        }, params);
        this._queueName = this._params.queueName;

        this._channel = null;
    }

    /**
     * Begin to listen for messages from amqp
     * @returns {Promise<String>} name of endpoint to send messages
     * @override
     */
    async start() {
        if (this._channel) {
            throw Error("Already started");
        }

        this._channel = await this._connection.createChannel();
        const queue = await this._channel.assertQueue(this._queueName, {
            exclusive: true,
        });

        if (this._queueName === "") {
            this._queueName = queue.queue;
        }

        this._channel.consume(this._queueName, this._handleMessage.bind(this));

        return this._queueName;
    }

    /**
     * Stop listening for messages
     * @override
     */
    async disconnect() {
        if (!this._channel) {
            return;
        }
        const channel = this._channel;
        this._channel = null;
        if (this._params.queueName === "") {
            try {
                await channel.deleteQueue(this._queueName);
            } catch (e) {
                //it's ok to ignore this error, as the queue might have been deleted by by AMQPStreamSender
            }
        }
        await channel.close();

        this.emit("close");
    }

    _handleMessage(message: Message) {
        if (message === null) {
            this.emit("end");
            //FIXME disconnect returns promise
            this.disconnect();
            return;
        }
        this._channel.ack(message);

        try {
            const messageData = JSON.parse(message.content.toString());
            this.emit("data", messageData);
        } catch (e) {
            this.emit("error", e);
        }
    }

    /**
     * Allows to get generated value when params.repliesQueue was set to '' (empty string) or omitted
     * @returns {String} an actual name of the queue used by the instance for receiving replies
     */
    get queueName() {
        return this._queueName;
    }
}
