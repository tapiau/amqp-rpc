import Command from "./Command";
import CommandResult from "./CommandResult";
import AMQPEndpoint, {AMQPRPCParams} from "./AMQPEndpoint";
import {Connection, Message} from "amqplib";
import {v4 as uuid} from "uuid";

/**
 * This class is responsible for sending commands to the RPC server.
 *
 * @class
 */
export default class AMQPRPCClient extends AMQPEndpoint {
    /**
     * Creates a new instance of an RPC client.
     *
     * @param {*} connection Instance of `amqplib` library
     *
     * @param {Object} params
     * @param {String} params.requestsQueue queue for sending commands, should correspond with AMQPRPCServer
     * @param {String} [params.repliesQueue=''] queue for feedback from AMQPRPCServer,
     *    default is '' which means auto-generated queue name
     * @param {Number} [params.timeout=60000] Timeout for cases when server is not responding
     * @param {Object} [params.defaultMessageOptions] additional options for publishing the request to the queue
     */
    private _repliesQueue: string;
    private _cmdNumber: number;
    private _requests: Map<string, any>;
    private _defaultMessageOptions: any;
    private _consumerTag = "";

    constructor(
        connection: Connection,
        params: AMQPRPCParams = {}
    ) {

        console.log("AMQPRPCClient/constructor::params", params);

        params.repliesQueue = params.repliesQueue || "";
        params.timeout = params.timeout || AMQPRPCClient.TIMEOUT;

        if (!params.requestsQueue) {
            throw new Error("params.requestsQueue is required");
        }
        super(connection, params);

        this._repliesQueue = params.repliesQueue;

        this._cmdNumber = 0;
        this._requests = new Map();
        this._defaultMessageOptions = params.defaultMessageOptions || {};
    }

    /**
     * Send a command into RPC queue.
     *
     * @param {String} command Command name
     * @param [Array<*>] args Array of any arguments provided to the RPC server callback
     * @param [Object] messageOptions options for publishing the request to the queue
     * @returns {Promise<*>}
     * @example
     * client.sendCommand('some-command-name', [{foo: 'bar'}, [1, 2, 3]]);
     */
    async sendCommand(command: string, args: Array<any>, messageOptions: object = {}) {
        if (!this._channel) {
            throw Error("Channel is not initialized");
        }
        if (!this._params.requestsQueue) {
            throw Error("params.requestsQueue is required");
        }

        const cmd = new Command(command, args);

        console.log("AMQPRPCClient/sendCommand::this._repliesQueue", this._repliesQueue);

        const correlationId = (this._cmdNumber++).toString();
        const replyTo = this._repliesQueue;
        const timeout = this._params.timeout;
        const requestsQueue = this._params.requestsQueue;
        const commonProperties = { replyTo, correlationId };

        console.log("AMQPRPCClient/sendCommand::messageOptions", messageOptions);
        console.log("AMQPRPCClient/sendCommand::this._defaultMessageOptions", this._defaultMessageOptions);
        console.log("AMQPRPCClient/sendCommand::commonProperties", commonProperties);


        const properties = Object.assign(
            {},
            messageOptions,
            this._defaultMessageOptions,
            commonProperties);

        let resolve;
        let reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });

        const timer = setTimeout(() => this._cancel(correlationId, `timeout (${timeout})`), timeout);
        this._requests.set(correlationId, {
            timer,
            resolve,
            reject,
            command,
        });

        console.log("AMQPRPCClient/sendCommand::requestsQueue", requestsQueue);
        console.log("AMQPRPCClient/sendCommand::cmd", cmd);
        console.log("AMQPRPCClient/sendCommand::properties", properties);

        this._channel.sendToQueue(
            requestsQueue,
            cmd.pack(),
            properties
        );

        return promise;
    }

    /**
     * Initialize RPC client.
     *
     * @returns {Promise}
     * @override
     */
    async start() {
        await super.start();

        if (!this._channel) {
            throw new Error("Channel is already initialized");
        }

        console.log("AMQPRPCClient/start::this", this._repliesQueue);

        if (this._params.repliesQueue === "") {
            this._repliesQueue = this._params.requestsQueue + "." + uuid();
        }

        await this._channel.assertQueue(this._repliesQueue, {exclusive: true});

        // if (this._params.repliesQueue === "") {
        //     const response = await this._channel.assertQueue("", {exclusive: true});
        //     this._repliesQueue = response.queue;
        // }

        const consumeResult = await this._channel.consume(this._repliesQueue, (message) => this._dispatchReply(message));
        this._consumerTag = consumeResult.consumerTag;
    }

    /**
     * Opposite to this.start()
     *
     * @returns {Promise}
     */
    async disconnect() {
        if (!this._channel) {
            throw new Error("Channel is not initialized");
        }

        await this._channel.cancel(this._consumerTag);

        if (this._params.repliesQueue === "") {
            await this._channel.deleteQueue(this._repliesQueue);
            this._repliesQueue = "";
        }

        this._requests.forEach((context, correlationId) => this._cancel(correlationId, "client disconnect"));
        await super.disconnect();
    }


    /**
     * Replies handler
     * @param {Object} message, returned by channel.consume
     * @private
     * @returns {Promise}
     */
    async _dispatchReply(message: Message | null) {
        if (!this._channel) {
            throw new Error("Channel is not initialized");
        }

        if (!message) {
            console.debug("AMQPRPCClient: got null message, probably channel is closed", message);
            //skip, it's queue close message
            return;
        }
        this._channel.ack(message);

        const correlationId = message.properties.correlationId;
        const context = this._requests.get(correlationId);
        this._requests.delete(correlationId);
        if (!context) {
            //it would be good to notice somehow, but we don't have logger or something here at all
            return;
        }

        const {resolve, timer, reject} = context;
        clearTimeout(timer);

        try {
            const response = CommandResult.fromBuffer(message.content);

            if (response.state === CommandResult.STATES.ERROR) {
                reject(response.data);
            } else {
                resolve(response.data);
            }
        } catch (e) {
            reject(e);
        }
    }

    _cancel(correlationId: string, reason: string) {
        const context = this._requests.get(correlationId);
        const {timer, reject, command} = context;
        clearTimeout(timer);
        this._requests.delete(correlationId);
        reject(new Error(`sendCommand canceled due to ${reason}, command:${command}, correlationId:${correlationId}`));
    }

    /**
     * Returns a timeout for a command result retrieval.
     *
     * @static
     * @returns {Number}
     */
    static get TIMEOUT() {
        return 60 * 1000;
    }

    /**
     * Allows to get generated value when params.repliesQueue was set to '' (empty string) or omitted
     * @returns {String} an actual name of the queue used by the instance for receiving replies
     */
    get repliesQueue() {
        return this._repliesQueue;
    }
}
