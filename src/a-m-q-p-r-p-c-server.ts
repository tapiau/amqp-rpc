import Command from "./command";
import CommandResult, {CommandResultState} from "./command-result";
import AMQPEndpoint, {AMQPRPCParams} from "./a-m-q-p-endpoint";
import {Connection, Message} from "amqplib";


/**
 * Implementation for an AMQP RPC server.
 *
 * @class
 */
export default class AMQPRPCServer extends AMQPEndpoint {
    /**
     * Creates a new instance of RPC server.
     *
     * @param {*} connection Connection reference created from `amqplib` library
     *
     * @param {Object} params
     * @param {String} params.requestsQueue queue when AMQPRPC client sends commands, should correspond with AMQPRPCClient
     *    default is '' which means auto-generated queue name
     */
    private _requestsQueue: string;
    private _commands: { [key: string]: any };
    private _consumerTag = "";

    constructor(
        private connection: Connection,
        private params: AMQPRPCParams = {}
    ) {
        params.requestsQueue = params.requestsQueue || "";

        super(connection, params);

        this._requestsQueue = params.requestsQueue;
        this._commands = {};
    }

    /**
     * Initialize RPC server.
     *
     * @returns {Promise}
     * @override
     */
    async start() {
        await super.start();

        if (!this._channel) {
            throw Error("Channel is not initialized");
        }

        const response = await this._channel.assertQueue(this._requestsQueue, {exclusive: true});

        if (this._requestsQueue === "") {
            this._requestsQueue = response.queue;
        }
        // if (this._requestsQueue === "") {
        //     const response = await this._channel.assertQueue("", {exclusive: true});
        //     this._requestsQueue = response.queue;
        // }

        const consumeResult = await this._channel.consume(this._requestsQueue, (message) => this._handleMsg(message));
        this._consumerTag = consumeResult.consumerTag;
    }

    /**
     * Opposite to this.start()
     *
     * @returns {Promise}
     */
    async disconnect() {
        if (!this._channel) {
            throw Error("Channel is not initialized");
        }

        await this._channel.cancel(this._consumerTag);

        if (this._params.requestsQueue === "") {
            await this._channel.deleteQueue(this._requestsQueue);
            this._requestsQueue = "";
        }

        await super.disconnect();
    }

    /**
     * Registers a new command in this RPC server instance.
     *
     * @param {String} command Command name
     * @param {Function} cb Callback that must be called when server got RPC command
     * @returns {AMQPRPCServer}
     */
    addCommand(command: string, cb: (...args: any[]) => any) {
        this._commands[command] = cb;

        return this;
    }

    /**
     *
     * @private
     */
    async _handleMsg(message: Message | null): Promise<void> {
        if (!this._channel) {
            throw Error("Channel is not initialized");
        }
        if (!message) {
            throw Error("Message is not initialized");
        }

        this._channel.ack(message);
        const replyTo = message.properties.replyTo;
        const correlationId = message.properties.correlationId;
        const persistent = message.properties.deliveryMode !== 1;

        try {
            const result = await this._dispatchCommand(message);

            const content = new CommandResult(CommandResultState.SUCCESS, result).pack();
            this._channel.sendToQueue(replyTo, content, {correlationId, persistent});

        } catch (error) {
            const content = new CommandResult(CommandResultState.ERROR, error).pack();
            this._channel.sendToQueue(replyTo, content, {correlationId, persistent});
        }
    }

    /**
     * Dispatches a command with specified message.
     *
     * @private
     * @param {Object} message
     */
    _dispatchCommand(message: Message) {
        const command = Command.fromBuffer(message.content);

        if (this._commands[command.command] && this._commands[command.command] instanceof Function) {
            return this._commands[command.command].apply(null, command.args);
        }

        throw new Error(`Unknown command ${command.command}`);
    }

    /**
     * Allows to get generated value when params.requestsQueue was set to '' (empty string) or omitted
     * @returns {String} an actual name of the queue used by the instance for receiving replies
     */
    get requestsQueue(): string {
        return this._requestsQueue;
    }
}
